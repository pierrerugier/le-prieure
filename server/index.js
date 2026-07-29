/* Le Prieuré, serveur du domaine.
   Express sert le jeu, ws tient le monde. Une seule adresse pour tout le monde.

   Le serveur est autoritaire sur trois choses :
     - qui joue quel personnage de la bande,
     - l'heure du domaine, la même pour tous,
     - ce que font les personnages que personne ne joue.
   Un personnage laissé sans nouvelles pendant trente secondes repasse en PNJ. */
'use strict';
const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8090;
const PUBLIC = path.join(__dirname, '..', 'public');

/* ---------- l'heure du domaine ---------- */
/* une journée complète dure environ quarante minutes, comme côté client */
let min = 13 * 60 + 30;
const TICK_MS = 50;
const FRAMES = TICK_MS / (1000 / 60);
function heure() { return min / 60; }
function phase() { const h = heure(); return (h >= 8 && h < 16) ? 'g' : ((h >= 21 || h < 6) ? 'f' : 'h'); }
function hhmm() {
  const h = Math.floor(min / 60), m = Math.floor(min % 60);
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}

/* ---------- la bande ---------- */
/* Un personnage = une place à prendre. Tant que personne ne le joue, le serveur
   lui donne un endroit où être, et les clients l'y emmènent. */
const FEU = { x: 109, y: 33 };
const BANDE = [
  { id: 'moi', nom: 'PIERRE', jour: [108, 7], hameau: [108, 7], feu: [109, 36] },
  { id: 'charles', nom: 'CHARLES', jour: [55, 58], hameau: [16, 8, 'lutreau'], feu: [107, 33] },
  { id: 'victor', nom: 'VICTOR', jour: [50, 50], hameau: [99, 9], feu: [108, 31] },
  { id: 'oscar', nom: 'OSCAR', jour: [24, 42], hameau: [94, 65], feu: [110, 31] },
  { id: 'antoine', nom: 'ANTOINE', jour: [60, 58], hameau: [105, 9], feu: [111, 33] },
  { id: 'kuperfils', nom: 'KUPI', jour: [45, 48], hameau: [102, 16], feu: [110, 35] },
  { id: 'louis', nom: 'LOUIS', jour: [70, 29], hameau: [112, 15], feu: [108, 35] },
  { id: 'paul', nom: 'PAUL', jour: [96, 24], hameau: [107, 21], feu: [109, 30] }
];
/* Charles ne fait jamais deux fois la même chose au même moment */
const ACTES_CHARLES = [
  { act: 'mamou', p: [98, 23] },
  { act: 'gamecube', p: [16, 8, 'lutreau'] },
  { act: 'pente', p: [109, 26] },
  { act: 'hameau', p: [99, 9] }
];

const perso = {};
BANDE.forEach(b => {
  perso[b.id] = {
    id: b.id, nom: b.nom, def: b,
    x: b.jour[0], y: b.jour[1], inside: null, dir: 0, bike: 0,
    par: null,            /* la connexion qui le joue */
    vu: 0,                /* dernières nouvelles */
    cible: null, act: ''
  };
});

const clients = new Map();   /* ws -> {id, persoId, vu} */
const verres = [];
let nextId = 1;
let derniereePhase = '';

function libre(id) { return perso[id] && !perso[id].par; }
function roster() {
  return BANDE.map(b => ({ id: b.id, nom: b.nom, pris: !libre(b.id) }));
}

/* ---------- où doivent être les personnages que personne ne joue ---------- */
function replacer() {
  const ph = phase();
  for (const b of BANDE) {
    const p = perso[b.id];
    if (p.par) { p.cible = null; continue; }
    let dest;
    if (b.id === 'charles' && ph !== 'f') {
      const a = ACTES_CHARLES[Math.floor(seededRandom() * ACTES_CHARLES.length)];
      p.act = a.act; dest = a.p;
    } else {
      p.act = '';
      dest = (ph === 'g') ? b.jour : (ph === 'h') ? b.hameau : b.feu;
    }
    p.cible = { x: dest[0], y: dest[1], inside: dest[2] || null };
  }
}
/* pas de Math.random dans les boucles de rendu, mais ici c'est sans conséquence */
let graine = 20050714;
function seededRandom() {
  graine = (graine * 1664525 + 1013904223) >>> 0;
  return graine / 4294967296;
}

/* ---------- le monde retouche dans l'atelier ----------
   On ne garde jamais la carte entiere, seulement l'ecart avec ce que le code
   fabrique. Le fichier vit dans data/, et public/monde.json sert de secours
   quand la machine repart de zero apres un deploiement. */
const DATA = path.join(__dirname, '..', 'data');
const FMONDE = path.join(DATA, 'monde.json');
const FSECOURS = path.join(PUBLIC, 'monde.json');
const MONDE_VIDE = { v: 1, carte: {}, tuiles: {}, persos: { fiches: {}, corps: {} }, pnj: {}, objets: {} };
function lireMonde() {
  for (const f of [FMONDE, FSECOURS]) {
    try { if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { /* tant pis */ }
  }
  return MONDE_VIDE;
}
let monde = lireMonde();
function ecrisMonde(m) {
  try {
    if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });
    fs.writeFileSync(FMONDE, JSON.stringify(m));
    return true;
  } catch (e) { return false; }
}

/* ---------- Claude ecrit le maillage d'une mission ----------
   L'atelier envoie une phrase en francais, le serveur la donne a Claude avec
   tout le contexte du jeu, et recupere une mission deja cablee. La cle vit
   dans l'environnement, jamais dans la page. */
const MODELE = process.env.CLAUDE_MODELE || 'claude-opus-5';
const CONSIGNE = [
  "Tu ecris des missions pour Le Prieure, un jeu d'aventure et de golf en pixel art",
  "calque sur les Pokemon Game Boy Advance. On est au Golf du Prieure, a Sailly dans le",
  "Vexin, ete 2005, et on a treize ans. La bande passe ses week-ends sur le domaine.",
  '',
  'LE TON, non negociable :',
  "- drole, sec, jamais nostalgique a voix haute. Le sentiment passe par le detail concret.",
  '- une idee par phrase. Des phrases courtes.',
  "- JAMAIS de tiret cadratin. JAMAIS l'antithese binaire du genre \"X, pas Y\".",
  "- on ecrit comme des gamins de treize ans qui se croient grands, pas comme un narrateur.",
  '',
  'UNE MISSION est un objet JSON :',
  '  a  : le numero de l acte (1 a 6)',
  '  t  : le titre, court, a l infinitif ou nominal. Pas de point final.',
  '  d  : ce que le joueur doit faire, une phrase, a la deuxieme personne.',
  '  ev : le nom de l evenement que le jeu declenche quand c est fait',
  '  qui: seulement si ev vaut "parle", l identifiant du personnage a qui parler',
  '  n  : seulement si il faut le faire plusieurs fois (un nombre)',
  '  f  : le texte qui tombe quand la mission est finie. Une ou deux phrases.',
  '',
  'REGLES DURES :',
  "- ev doit etre pris DANS LA LISTE fournie, jamais invente : le jeu ne saurait pas le",
  '  declencher. Si rien ne colle, prends le plus proche et dis-le dans "note".',
  '- qui doit etre un identifiant de la liste des personnages.',
  '- si la mission demandee tient en plusieurs etapes, renvoie plusieurs missions a la suite.',
  '',
  'Tu peux aussi ajouter des repliques a un personnage : "dialogues" associe un identifiant',
  'a une liste de repliques, chaque replique etant une liste de phrases (une par boite de',
  'dialogue). Elles s ajoutent a ce qu il dit deja.',
  '',
  'Tu reponds UNIQUEMENT avec un objet JSON, sans texte autour, sans balises :',
  '{"missions":[...], "dialogues":{}, "note":"une phrase sur ce que tu as choisi"}'
].join('\n');

async function demandeClaude(corps) {
  const cle = process.env.ANTHROPIC_API_KEY;
  if (!cle) return { ok: false, raison: 'sans_cle' };
  const ctx = corps.contexte || {};
  const invite = [
    'LES ACTES : ' + JSON.stringify(ctx.actes || []),
    'LES EVENEMENTS DISPONIBLES : ' + JSON.stringify(ctx.evenements || []),
    'LES PERSONNAGES : ' + JSON.stringify(ctx.pnj || []),
    '',
    'LES MISSIONS QUI EXISTENT DEJA, dans l ordre (pour le ton et pour ne pas repeter) :',
    JSON.stringify(ctx.missions || [], null, 1),
    '',
    'La nouvelle mission s inserera apres la mission numero ' + (corps.apres == null ? 'la derniere' : corps.apres) + '.',
    '',
    'CE QUE PIERRE DEMANDE :',
    String(corps.desc || '').slice(0, 4000)
  ].join('\n');
  let r;
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': cle,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODELE, max_tokens: 4000, system: CONSIGNE,
        messages: [{ role: 'user', content: invite }]
      })
    });
  } catch (e) { return { ok: false, raison: 'reseau', detail: String(e && e.message) }; }
  if (!r.ok) {
    let d = '';
    try { d = (await r.text()).slice(0, 400); } catch (e) { /* tant pis */ }
    return { ok: false, raison: 'api', code: r.status, detail: d };
  }
  const rep = await r.json();
  const txt = (rep.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  const a = txt.indexOf('{'), b = txt.lastIndexOf('}');
  if (a < 0 || b < a) return { ok: false, raison: 'illisible', detail: txt.slice(0, 400) };
  let out;
  try { out = JSON.parse(txt.slice(a, b + 1)); }
  catch (e) { return { ok: false, raison: 'illisible', detail: txt.slice(0, 400) }; }
  return { ok: true, missions: out.missions || [], dialogues: out.dialogues || {}, note: out.note || '' };
}

/* ---------- express + websocket ---------- */
const app = express();
app.use(express.json({ limit: '6mb' }));
app.post('/api/claude', async (req, res) => {
  try { res.json(await demandeClaude(req.body || {})); }
  catch (e) { res.status(500).json({ ok: false, raison: 'serveur', detail: String(e && e.message) }); }
});
app.get('/api/monde', (req, res) => res.json(monde));
app.post('/api/monde', (req, res) => {
  const m = req.body;
  if (!m || typeof m !== 'object' || !m.carte) { res.status(400).json({ ok: false }); return; }
  /* Une version plus ancienne ne recouvre jamais une plus recente. C'est arrive
     une fois : un navigateur reste ouvert sur une vieille carte, on enregistre,
     et le travail de la journee disparait. Plus maintenant. */
  const dnew = typeof m.t === 'number' ? m.t : 0;
  const dold = typeof (monde && monde.t) === 'number' ? monde.t : 0;
  if (dold && dnew && dnew < dold && !m.force) {
    res.status(409).json({
      ok: false, raison: 'plus ancienne',
      serveur: dold, envoye: dnew
    });
    return;
  }
  monde = {
    v: 1,
    t: dnew || Date.now(),
    carte: m.carte || {},
    tuiles: m.tuiles || {},
    persos: m.persos || { fiches: {}, corps: {} },
    pnj: m.pnj || {},
    objets: m.objets || {}
  };
  /* la trame, les actes, les lieux et la lettre ne voyagent que s'ils ont bouge */
  if (Array.isArray(m.missions)) monde.missions = m.missions;
  if (Array.isArray(m.actes)) monde.actes = m.actes;
  if (Array.isArray(m.lieux)) monde.lieux = m.lieux;
  if (Array.isArray(m.lettre)) monde.lettre = m.lettre;
  if (Array.isArray(m.trous)) monde.trous = m.trous;
  if (Array.isArray(m.portes)) monde.portes = m.portes;
  if (Array.isArray(m.blocs)) monde.blocs = m.blocs;
  const surDisque = ecrisMonde(monde);
  diffuse({ t: 'monde', monde: monde });
  res.json({ ok: true, disque: surDisque });
});
app.get('/sante', (req, res) => {
  res.json({
    ok: true, heure: hhmm(), phase: phase(),
    joueurs: clients.size,
    pris: BANDE.filter(b => !libre(b.id)).map(b => b.nom)
  });
});
app.use(express.static(PUBLIC, { extensions: ['html'] }));
app.get('*', (req, res) => res.sendFile(path.join(PUBLIC, 'index.html')));

const srv = http.createServer(app);
const wss = new WebSocketServer({ server: srv });

function envoi(ws, o) {
  if (ws.readyState === 1) { try { ws.send(JSON.stringify(o)); } catch (e) { /* tant pis */ } }
}
function diffuse(o, sauf) {
  const s = JSON.stringify(o);
  for (const [ws] of clients) {
    if (ws === sauf || ws.readyState !== 1) continue;
    try { ws.send(s); } catch (e) { /* tant pis */ }
  }
}
function nombre(v, lo, hi, def) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : def;
}
function texte(v, max) { return (typeof v === 'string') ? v.slice(0, max) : ''; }

/* ---------- les parties de golf a plusieurs ----------
   Le serveur est l'arbitre. Il tient la liste des joueurs, ou est chaque balle,
   combien de coups, et a qui c'est. Un client ne fait que jouer sa balle et dire
   ou elle s'est arretee. Deux ecrans ne peuvent donc pas raconter deux parties
   differentes.

   Plusieurs parties tournent en meme temps : chacune a son numero, et un joueur
   n'appartient qu'a une seule. Un groupe qui part sur le 1 n'empeche pas les
   suivants de monter la leur.

   Les coordonnees des trous viennent du client qui ouvre : c'est son parcours que
   tout le monde joue, meme celui qui a une carte plus ancienne.

   Une socket qui tombe ne fait pas sortir de la partie : on est mis hors ligne,
   on garde sa place et sa balle, et on revient quand le reseau revient. */
const parties = new Map();
let partieNo = 0;
const PARTIE_MAX = 4;
const PARTIE_OUBLI = 5 * 60 * 1000;   /* cinq minutes sans le moindre coup */
const OUVERT_MAX = 45 * 1000;         /* une partie ouverte n'attend pas la nuit */
const TOUR_PATIENCE = 60 * 1000;      /* soixante secondes pour jouer son coup */
const HS_SORTIE = 90 * 1000;          /* une minute et demie hors ligne, et on sort */

function etatPartie(P) {
  if (!P) return null;
  return {
    id: P.id, seq: P.seq, trou: P.trou, tour: P.tour,
    ouvert: P.ouvert ? 1 : 0, fini: P.fini ? 1 : 0,
    par: P.par, trous: P.trous,
    joueurs: P.joueurs.map(j => ({
      pk: j.pk, nom: j.nom, bx: j.bx, by: j.by, lie: j.lie,
      coups: j.coups, fini: j.fini ? 1 : 0, parti: j.parti ? 1 : 0, hs: j.ws ? 0 : 1,
      carte: j.carte
    }))
  };
}
function diffusePartie(P, mot) {
  if (!P) return;
  P.seq++;
  const o = { t: 'golf', p: etatPartie(P) };
  if (mot) o.mot = mot;
  const s = JSON.stringify(o);
  for (const j of P.joueurs) {
    if (j.ws && j.ws.readyState === 1) { try { j.ws.send(s); } catch (e) { /* tant pis */ } }
  }
}
/* a qui appartient cette socket : on cherche par personnage, pas par socket,
   comme ca une reconnexion retrouve sa place */
function partieDe(pk) {
  if (!pk) return null;
  for (const P of parties.values())
    if (P.joueurs.some(j => j.pk === pk && !j.parti)) return P;
  return null;
}
function joueurDe(P, pk) { return P ? P.joueurs.find(j => j.pk === pk) || null : null; }
/* qui peut jouer maintenant : on saute ceux qui sont hors ligne, sinon le tour
   revient a un fantome et plus personne n'avance. S'ils sont tous hors ligne, on
   garde la liste entiere et la patience finira par trancher. */
function enJeu(P) {
  const l = P.joueurs.filter(j => !j.fini && !j.parti);
  const la = l.filter(j => j.ws);
  return la.length ? la : l;
}
/* a qui de jouer : le plus loin du drapeau parmi ceux qui n'ont pas fini.
   Au depart, personne n'a joue, alors c'est l'honneur du trou precedent. */
function aQuiDeJouer(P) {
  const h = P.trous[P.trou];
  const l = enJeu(P);
  if (!l.length) return -1;
  if (l.every(j => j.coups === 0)) {
    let best = l[0], bs = 1e9;
    l.forEach((j) => {
      const r = (P.trou > 0) ? (j.carte[P.trou - 1] || 99) : P.joueurs.indexOf(j) * 0.001;
      if (r < bs) { bs = r; best = j; }
    });
    return P.joueurs.indexOf(best);
  }
  let best = null, bd = -1;
  for (const j of l) {
    const d = Math.hypot(j.bx - (h.gx + 0.5), j.by - (h.gy + 0.5));
    if (d > bd) { bd = d; best = j; }
  }
  return P.joueurs.indexOf(best);
}
function passeLaMain(P) {
  P.tour = aQuiDeJouer(P);
  P.tourVu = Date.now();
}
function poseAuDepart(P) {
  const h = P.trous[P.trou];
  P.joueurs.forEach((j, i) => {
    if (j.parti) { j.fini = true; return; }   /* un parti reste parti, sinon le trou ne finit jamais */
    j.bx = h.tx + 0.5 + ((i % 2) ? 0.6 : -0.6);
    j.by = h.ty + 0.5 + (i > 1 ? 0.8 : 0);
    j.coups = 0; j.fini = false; j.lie = 'tee';
  });
  passeLaMain(P);
}
function trouFini(P) { return P.joueurs.every(j => j.fini || j.parti); }
function trouSuivant(P) {
  P.trou++;
  if (P.trou >= P.trous.length) { P.fini = true; P.tour = -1; return; }
  poseAuDepart(P);
}
/* on remplit la carte de celui qui s'en va : le score maximum jusqu'au bout */
function boucheLaCarte(P, j) {
  for (let t = P.trou; t < P.trous.length; t++)
    if (!j.carte[t]) j.carte[t] = P.trous[t].par + 6;
}
function sortDeLaPartie(P, j, mot) {
  if (!P || !j || j.parti) return;
  j.parti = true; j.fini = true; j.ws = null;
  boucheLaCarte(P, j);
  if (P.joueurs.every(x => x.parti)) { parties.delete(P.id); return; }
  if (!P.ouvert) { if (trouFini(P)) trouSuivant(P); else passeLaMain(P); }
  diffusePartie(P, mot);
}
/* une socket tombe : on ne sort pas de la partie, on est juste hors ligne */
function deconnecte(pk) {
  const P = partieDe(pk); if (!P) return;
  const j = joueurDe(P, pk); if (!j || !j.ws) return;
  j.ws = null; j.hsDepuis = Date.now();
  if (!P.ouvert && P.tour === P.joueurs.indexOf(j)) passeLaMain(P);
  diffusePartie(P, (j.nom || j.pk) + ' a perdu le reseau.');
}
/* et quand il revient, il reprend sa place et sa balle */
function reconnecte(pk, ws) {
  const P = partieDe(pk); if (!P) return null;
  const j = joueurDe(P, pk); if (!j) return null;
  j.ws = ws; j.hsDepuis = 0;
  envoi(ws, { t: 'golf', p: etatPartie(P), mot: 'Te revoila.' });
  diffusePartie(P);
  return P;
}
setInterval(() => {
  const now = Date.now();
  for (const P of Array.from(parties.values())) {
    /* une partie ouverte que personne ne lance : on la lance ou on l'oublie */
    if (P.ouvert && now - P.ne > OUVERT_MAX) {
      if (P.joueurs.length > 1) { P.ouvert = false; poseAuDepart(P); diffusePartie(P, 'On y va.'); }
      else { parties.delete(P.id); diffusePartie(P); }
      continue;
    }
    if (P.ouvert) continue;
    /* celui qui ne joue pas son coup ne bloque pas les autres */
    if (P.tour >= 0 && now - P.tourVu > TOUR_PATIENCE) {
      const j = P.joueurs[P.tour];
      if (j) {
        j.coups = Math.min(P.trous[P.trou].par + 6, j.coups + 1);
        if (j.coups >= P.trous[P.trou].par + 6) { j.fini = true; j.carte[P.trou] = j.coups; }
        if (trouFini(P)) trouSuivant(P); else passeLaMain(P);
        diffusePartie(P, (j.nom || j.pk) + ' ne joue pas. Un coup de penalite.');
      } else passeLaMain(P);
    }
    /* hors ligne depuis trop longtemps : on sort de la partie */
    for (const j of P.joueurs)
      if (!j.ws && !j.parti && j.hsDepuis && now - j.hsDepuis > HS_SORTIE)
        sortDeLaPartie(P, j, (j.nom || j.pk) + ' ne revient pas.');
    /* plus personne, ou plus rien depuis longtemps */
    if (P.joueurs.every(j => j.parti) || now - P.vu > PARTIE_OUBLI) parties.delete(P.id);
  }
}, 5000);

function relacher(c) {
  if (!c || !c.persoId) return;
  const p = perso[c.persoId];
  if (p && p.par === c.ws) { p.par = null; p.bike = 0; }
  c.persoId = null;
  replacer();
}

wss.on('connection', (ws) => {
  const c = { ws, id: 'j' + (nextId++), persoId: null, vu: Date.now() };
  clients.set(ws, c);
  envoi(ws, { t: 'welcome', id: c.id, min, verres, roster: roster() });

  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(String(raw).slice(0, 2000)); } catch (e) { return; }
    c.vu = Date.now();

    if (m.t === 'claim') {
      const id = texte(m.pk, 16);
      if (!perso[id]) { envoi(ws, { t: 'refus', roster: roster() }); return; }
      if (!libre(id) && perso[id].par !== ws) { envoi(ws, { t: 'refus', pk: id, roster: roster() }); return; }
      relacher(c);
      c.persoId = id;
      const p = perso[id];
      p.par = ws; p.vu = Date.now(); p.cible = null; p.act = '';
      p.x = nombre(m.x, 0, 119, p.x); p.y = nombre(m.y, 0, 95, p.y);
      p.inside = texte(m.inside, 16) || null;
      envoi(ws, { t: 'pris', pk: id, min });
      diffuse({ t: 'roster', roster: roster() });
      /* si une partie l'attendait, il y retrouve sa balle et ses coups */
      reconnecte(id, ws);
      return;
    }
    if (m.t === 'pos') {
      const p = c.persoId && perso[c.persoId];
      if (!p || p.par !== ws) return;
      p.vu = Date.now();
      p.x = nombre(m.x, 0, 119, p.x);
      p.y = nombre(m.y, 0, 95, p.y);
      p.dir = nombre(m.dir, 0, 3, p.dir);
      p.inside = texte(m.inside, 16) || null;
      p.bike = m.bike ? 1 : 0;
      return;
    }
    if (m.t === 'invite') {
      const kind = texte(m.kind, 12);
      if (['cours', 'pente', 'mamou', 'piscine', 'partie'].indexOf(kind) < 0) return;
      const o = { t: 'invite', kind: kind, from: texte(m.from, 12) || 'Quelqu\'un' };
      if (kind === 'partie') o.pid = nombre(m.pid, 0, 1e9, 0);
      diffuse(o, ws);
      return;
    }
    /* quelqu'un accepte la partie : on previent celui qui l'a proposee */
    if (m.t === 'rejoint') {
      diffuse({ t: 'rejoint', pk: texte(m.pk, 16) }, ws);
      return;
    }
    /* ce qu'un joueur lance a un autre en le croisant : on relaie, c'est tout */
    if (m.t === 'dit') {
      diffuse({ t: 'dit', de: String(m.de || '').slice(0, 16),
                vers: String(m.vers || '').slice(0, 16), i: m.i | 0 }, ws);
      return;
    }
    /* ---------- les parties a plusieurs ----------
       On ne fait jamais confiance au pk annonce : le personnage d'une socket est
       celui qu'elle a reclame, et rien d'autre. Sans personnage, pas de partie. */
    if (m.t === 'golf') {
      const pk = c.persoId;
      if (!pk) { envoi(ws, { t: 'golf', p: null, refus: 'sans perso' }); return; }
      const nom = texte(m.nom, 14) || pk.toUpperCase();
      const P0 = partieDe(pk);

      if (m.a === 'ping') { if (P0) P0.vu = Date.now(); return; }

      if (m.a === 'ouvre') {
        if (P0) { envoi(ws, { t: 'golf', p: etatPartie(P0), refus: 'deja' }); return; }
        const trous = Array.isArray(m.trous) ? m.trous.slice(0, 24).map(h => ({
          n: nombre(h.n, 1, 99, 1), tx: nombre(h.tx, 0, 119, 0), ty: nombre(h.ty, 0, 95, 0),
          gx: nombre(h.gx, 0, 119, 0), gy: nombre(h.gy, 0, 95, 0), par: nombre(h.par, 3, 6, 4)
        })) : [];
        if (!trous.length) { envoi(ws, { t: 'golf', p: null, refus: 'parcours' }); return; }
        const P = {
          id: ++partieNo, seq: 0, trou: 0, tour: 0, ouvert: true, fini: false,
          ne: Date.now(), vu: Date.now(), tourVu: Date.now(),
          trous: trous, par: trous.reduce((a, h) => a + h.par, 0),
          joueurs: [{ pk: pk, nom: nom, ws: ws, bx: trous[0].tx + 0.5, by: trous[0].ty + 0.5,
                      coups: 0, fini: false, parti: false, lie: 'tee', carte: [], hsDepuis: 0 }]
        };
        parties.set(P.id, P);
        diffusePartie(P);
        return;
      }

      if (m.a === 'rejoint') {
        const P = parties.get(nombre(m.id, 1, 1e9, 0)) ||
                  Array.from(parties.values()).find(x => x.ouvert);
        if (!P) { envoi(ws, { t: 'golf', p: null, refus: 'fermee' }); return; }
        if (P0 && P0 !== P) { envoi(ws, { t: 'golf', p: etatPartie(P0), refus: 'deja' }); return; }
        if (!P.ouvert) { envoi(ws, { t: 'golf', p: etatPartie(P), refus: 'fermee' }); return; }
        if (P.joueurs.some(j => j.pk === pk)) { envoi(ws, { t: 'golf', p: etatPartie(P) }); return; }
        if (P.joueurs.length >= PARTIE_MAX) { envoi(ws, { t: 'golf', p: etatPartie(P), refus: 'complet' }); return; }
        const h = P.trous[0];
        P.joueurs.push({ pk: pk, nom: nom, ws: ws, bx: h.tx + 0.5, by: h.ty + 0.5,
                         coups: 0, fini: false, parti: false, lie: 'tee', carte: [], hsDepuis: 0 });
        P.vu = Date.now();
        diffusePartie(P);
        return;
      }

      if (!P0) { envoi(ws, { t: 'golf', p: null, refus: 'pas dedans' }); return; }
      const j0 = joueurDe(P0, pk);
      if (j0 && j0.ws !== ws) j0.ws = ws;   /* meme personnage, nouvelle socket */

      if (m.a === 'lance') {
        if (!P0.ouvert) { envoi(ws, { t: 'golf', p: etatPartie(P0) }); return; }
        if (P0.joueurs[0].pk !== pk) { envoi(ws, { t: 'golf', p: etatPartie(P0), refus: 'pas hote' }); return; }
        P0.ouvert = false; P0.vu = Date.now();
        poseAuDepart(P0);
        diffusePartie(P0);
        return;
      }

      /* un coup joue : on ne croit que celui dont c'est le tour, et une seule fois */
      if (m.a === 'coup') {
        if (P0.ouvert || P0.fini) { envoi(ws, { t: 'golf', p: etatPartie(P0), refus: 'fermee' }); return; }
        const j = j0;
        if (!j || P0.joueurs[P0.tour] !== j) {
          envoi(ws, { t: 'golf', p: etatPartie(P0), refus: 'pas ton tour' }); return;
        }
        const seq = nombre(m.seq, 0, 1e9, -1);
        if (seq !== P0.seq) { envoi(ws, { t: 'golf', p: etatPartie(P0), refus: 'coup douteux' }); return; }
        P0.vu = Date.now();
        j.bx = nombre(m.bx, 0, 119, j.bx);
        j.by = nombre(m.by, 0, 95, j.by);
        j.lie = texte(m.lie, 10) || j.lie;
        const plafond = P0.trous[P0.trou].par + 6;
        j.coups = Math.min(plafond, nombre(m.coups, 0, 99, j.coups + 1));
        if (m.fini || j.coups >= plafond) { j.fini = true; j.carte[P0.trou] = j.coups; }
        if (trouFini(P0)) trouSuivant(P0); else passeLaMain(P0);
        diffusePartie(P0);
        return;
      }

      if (m.a === 'reprend') { envoi(ws, { t: 'golf', p: etatPartie(P0) }); return; }
      if (m.a === 'quitte') { sortDeLaPartie(P0, j0, (j0 && (j0.nom || j0.pk)) + ' rentre au club house.'); return; }
      envoi(ws, { t: 'golf', p: etatPartie(P0), refus: 'inconnu' });
      return;
    }
    if (m.t === 'verre') {
      const x = nombre(m.x, 0, 119, -1), y = nombre(m.y, 0, 95, -1);
      if (x < 0 || y < 0) return;
      if (!verres.some(v => v[0] === x && v[1] === y)) verres.push([x, y]);
      diffuse({ t: 'verre', x: x, y: y }, ws);
      return;
    }
  });

  const fin = () => { deconnecte(c.persoId); relacher(c); clients.delete(ws); diffuse({ t: 'roster', roster: roster() }); };
  ws.on('close', fin);
  ws.on('error', fin);
});

/* ---------- l'horloge tourne pour tout le monde ---------- */
setInterval(() => {
  const h = heure(), nuit = (h >= 20 || h < 7);
  min += (nuit ? 0.018 : 0.0075) * FRAMES;
  if (min >= 1440) min -= 1440;
  const ph = phase();
  if (ph !== derniereePhase) { derniereePhase = ph; replacer(); }
}, TICK_MS);

/* ---------- dix instantanés par seconde ---------- */
setInterval(() => {
  const now = Date.now();
  /* un personnage sans nouvelles depuis trente secondes repasse en PNJ */
  let bouge = false;
  for (const b of BANDE) {
    const p = perso[b.id];
    if (p.par && now - p.vu > 30000) { p.par = null; p.bike = 0; bouge = true; }
  }
  for (const [ws, c] of clients) {
    if (now - c.vu > 60000) { try { ws.close(); } catch (e) { /* tant pis */ } relacher(c); clients.delete(ws); bouge = true; }
  }
  if (bouge) { replacer(); diffuse({ t: 'roster', roster: roster() }); }

  const joues = [], pnj = [];
  for (const b of BANDE) {
    const p = perso[b.id];
    if (p.par) {
      const c = clients.get(p.par);
      joues.push({ id: c ? c.id : b.id, pk: b.id, name: b.nom, x: p.x, y: p.y, dir: p.dir, inside: p.inside, bike: p.bike });
    } else if (p.cible) {
      pnj.push({ pk: b.id, x: p.cible.x, y: p.cible.y, inside: p.cible.inside, act: p.act });
    }
  }
  diffuse({ t: 'world', min: min, phase: phase(), p: joues, pnj: pnj });
}, 100);

replacer();
srv.listen(PORT, () => { console.log('Le Prieuré écoute sur ' + PORT); });
