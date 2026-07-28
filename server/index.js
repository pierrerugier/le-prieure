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
  { id: 'kuperfils', nom: 'KUPERFILS', jour: [45, 48], hameau: [102, 16], feu: [110, 35] },
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
  monde = {
    v: 1,
    carte: m.carte || {},
    tuiles: m.tuiles || {},
    persos: m.persos || { fiches: {}, corps: {} },
    pnj: m.pnj || {},
    objets: m.objets || {}
  };
  /* la trame, les actes et les lieux ne voyagent que s'ils ont bouge */
  if (Array.isArray(m.missions)) monde.missions = m.missions;
  if (Array.isArray(m.actes)) monde.actes = m.actes;
  if (Array.isArray(m.lieux)) monde.lieux = m.lieux;
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
      if (['cours', 'pente', 'mamou'].indexOf(kind) < 0) return;
      diffuse({ t: 'invite', kind: kind, from: texte(m.from, 12) || 'Quelqu\'un' }, ws);
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

  const fin = () => { relacher(c); clients.delete(ws); diffuse({ t: 'roster', roster: roster() }); };
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
