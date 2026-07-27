/* Harnais de test : on extrait le script du index.html, on stubbe le DOM,
   et on pilote update() image par image. Lancer avec : node tests/harness.js */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..', 'public');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
let src = html.match(/<script>([\s\S]*)<\/script>/)[1];

if (src.indexOf('load().finally(loop);') < 0) throw new Error('point de sortie introuvable');
src = src.replace('load().finally(loop);', `globalThis.__t={game,golf,net,update,render,map,MW,MH,T,at,put,NPCS,ITEMS,
  HOLES,PICKS,INT,DOORS,LOCKED,cars,shards,keys,press,release,consume,MAMOU,MAMOU_WIN,FEU,
  players,P_:()=>players,goInside,goOutside,zoneAt,menuList,buildMini,SOLID,getTile,S,ballSpots,updatePick,
  startHole,save,load,solidAt,placeGang,phaseOf,BALLS,updateCars,timeStep,breakWindow,velo,updateVelo,leaves,inBrush,ballVisible,estVitre,estCassee,FICHES,fiche,skillDe,vitPuissance,vitPrecision,longueurDe,cours,startCours,INVITES,inviteRecue,FEU,
  pers,dogSpr,BODY_SIDE,DOG_SIDE};`);

/* ---------- faux canvas ---------- */
function fakeCtx() {
  const noop = () => {};
  return {
    canvas: null, font: '', fillStyle: '', strokeStyle: '', globalAlpha: 1,
    textBaseline: '', imageSmoothingEnabled: false, lineWidth: 1,
    fillRect: noop, strokeRect: noop, clearRect: noop, drawImage: noop,
    save: noop, restore: noop, translate: noop, scale: noop, rotate: noop,
    beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop, stroke: noop,
    arc: noop, ellipse: noop, rect: noop, fill: noop, clip: noop,
    fillText: noop, strokeText: noop,
    measureText: s => ({ width: String(s).length * 5 }),
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }), putImageData: noop
  };
}
function fakeCanvas(w, h) {
  const c = { width: w || 16, height: h || 16, style: {}, dataset: {},
    getContext: () => fakeCtx(), addEventListener: () => {} };
  return c;
}
const screen = fakeCanvas(240, 160);
const store = {};
const sandbox = {
  console,
  document: {
    getElementById: id => (id === 'screen' ? screen : null),
    createElement: t => fakeCanvas(16, 16),
    querySelectorAll: () => [],
    addEventListener: () => {}
  },
  location: { search: '', protocol: 'file:', href: 'file:///index.html' },
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  },
  addEventListener: () => {},
  requestAnimationFrame: () => 0,
  setInterval: () => 0, clearInterval: () => {},
  setTimeout: () => 0, clearTimeout: () => {},
  URLSearchParams, Math, Date, JSON, Object, Array, String, Number, Uint8Array,
  Uint8ClampedArray, Set, Map, isNaN, parseInt, parseFloat, WebSocket: undefined,
  AudioContext: undefined, webkitAudioContext: undefined
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'prieure.js' });
const t = sandbox.__t;
if (!t) throw new Error('export du harnais absent');

/* ---------- petit cadre de test ---------- */
let ok = 0, ko = 0;
const fails = [];
function check(nom, cond, detail) {
  if (cond) { ok++; }
  else { ko++; fails.push(nom + (detail ? ' -> ' + detail : '')); }
}
function frames(n) { for (let i = 0; i < n; i++) { t.update(); t.render(); } }
function tap(k, n) { t.press(k); frames(n || 2); t.release(k); frames(2); }
/* vide tout dialogue ou question en cours */
function clear(max) {
  for (let i = 0; i < (max || 400); i++) {
    if (game.state === t.S.WORLD) return true;
    t.press('a'); frames(3); t.release('a'); frames(1);
  }
  return game.state === t.S.WORLD;
}
function hold(k, n) { t.press(k); frames(n); t.release(k); frames(2); }

/* ---------- 1. la carte ---------- */
const { game, T, at, MW, MH } = t;
check('carte batie', t.map.length === MW * MH);
check('route en x=31', at(31, 20) === T.LINE);
check('passerelle en y=44', at(30, 44) === T.BRIDGE);
check('passage cloute en y=57', at(31, 57) === T.ZEBRA && at(33, 57) === T.ZEBRA);
check('trois courts de tennis', at(14, 60) === T.TENN && at(23, 60) === T.TENN && at(18, 67) === T.TENN);
check('piscine au sud-est', at(83, 50) === T.POOL);
check('putting green au sud', at(63, 61) === T.FLAG);
check('portes du club house', !!t.DOORS.find(d => d.to === 'club'));
const noms = ['club', 'lutreau', 'lebel', 'webb', 'jungers'];
noms.forEach(n => check('interieur ' + n, !!t.INT[n]));
noms.forEach(n => check('porte vers ' + n, n === 'club' || !!t.DOORS.find(d => d.to === n)));
check('vitres Mamoumani', t.MAMOU_WIN.every(w => t.estVitre(at(w[0], w[1]))));
check('portillon du jardin Lebel', at(94, 78) === T.PATH && at(94, 79) === T.TEE);
check('jacuzzi des Webb', at(97, 63) === T.JACU);
check('villa forestiere en lambris', at(96, 6) === T.WOOD || at(96, 6) === T.BAIE || at(96, 6) === T.STONEW);

/* les objets doivent tous etre ramassables */
t.ITEMS.forEach(it => {
  if (it.inside) return;
  check('objet accessible : ' + it.id, !t.SOLID.has(at(it.x, it.y)), 'tuile ' + at(it.x, it.y));
});
/* les PNJ du dehors ne doivent pas etre plantes dans un mur */
t.NPCS.forEach(n => {
  if (n.inside) return;
  check('pnj pose : ' + n.id, !t.SOLID.has(at(n.x, n.y)), 'tuile ' + at(n.x, n.y));
});

/* ---------- 1 bis. le sens des sprites de profil ---------- */
/* BODY_SIDE et DOG_SIDE sont dessines tournes vers la DROITE : la meche et la casquette
   sont a gauche, l oeil et la main a droite. Le miroir doit donc s appliquer a GAUCHE
   (dir===2) et jamais a droite (dir===3). Si un jour on redessine le sprite dans l autre
   sens, ces deux tests tombent ensemble et rappellent qu il faut inverser les appels. */
const profil = t.pers(2, 0);
const rangeeVisage = profil.find(r => r.indexOf('H') >= 0 && r.indexOf('S') >= 0);
check('le sprite de profil a bien une rangee de visage', !!rangeeVisage);
if (rangeeVisage) {
  const xCheveux = rangeeVisage.indexOf('H');
  const xPeau = rangeeVisage.split('').map((c, i) => (c === 'S' ? i : -1)).filter(i => i >= 0);
  const moyPeau = xPeau.reduce((a, b) => a + b, 0) / xPeau.length;
  check('le perso de profil regarde vers la droite', xCheveux < moyPeau,
    'cheveux en ' + xCheveux + ', peau moyenne en ' + moyPeau.toFixed(1));
}
const chien = t.dogSpr(2, 0);
const rangeeTruffe = chien.find(r => r.indexOf('N') >= 0);
check('le chien a une truffe', !!rangeeTruffe);
if (rangeeTruffe) check('le chien de profil regarde vers la droite', rangeeTruffe.indexOf('N') > 8,
  'truffe en ' + rangeeTruffe.indexOf('N'));

/* et maintenant, tous les appels de rendu doivent miroiter sur la gauche */
const appels = src.match(/drawSprite\([^;]*?\);/g) || [];
const versDroite = appels.filter(a => /dir===3\s*\)\s*;$/.test(a));
const versGauche = appels.filter(a => /dir===2\s*\)\s*;$/.test(a));
check('aucun sprite miroite quand on va a droite', versDroite.length === 0,
  versDroite.join(' | '));
check('les sprites miroitent quand on va a gauche', versGauche.length >= 6,
  versGauche.length + ' appel(s)');

/* ---------- 1 ter. les fiches de personnage ---------- */
t.PICKS.forEach(p => {
  const f = t.fiche(p.id);
  check('fiche de ' + p.id, !!t.FICHES[p.id] && f.n === p.n, JSON.stringify(f && f.n));
  check('stats de ' + p.id + ' dans les clous', f.prec >= 1 && f.prec <= 5 && f.puis >= 1 && f.puis <= 5);
});
/* precis = jauge de precision plus lente, puissant = jauge de puissance plus lente */
check('Louis vise plus lentement que Charles', t.vitPrecision('louis') < t.vitPrecision('charles'),
  t.vitPrecision('louis').toFixed(4) + ' contre ' + t.vitPrecision('charles').toFixed(4));
check('Oscar arme plus lentement que Louis', t.vitPuissance('oscar') < t.vitPuissance('louis'),
  t.vitPuissance('oscar').toFixed(4) + ' contre ' + t.vitPuissance('louis').toFixed(4));
check('Oscar tape plus loin que Louis', t.longueurDe('oscar') > t.longueurDe('louis'),
  t.longueurDe('oscar').toFixed(2) + ' contre ' + t.longueurDe('louis').toFixed(2));
check('Louis se trompe moins que Charles en IA', t.skillDe('louis') < t.skillDe('charles'),
  t.skillDe('louis').toFixed(3) + ' contre ' + t.skillDe('charles').toFixed(3));
check('Charles est le seul a faire des air shots',
  t.PICKS.filter(p => t.fiche(p.id).airshot).map(p => p.id).join(',') === 'charles');
/* tous les persos doivent avoir une allure differente */
const allures = t.PICKS.map(p => { const f = t.fiche(p.id);
  return [f.haut, f.bas, f.chev, f.coupe, f.taille, f.corps, f.short, f.lunettes].join('|'); });
check('chaque perso a une allure unique', new Set(allures).size === allures.length,
  allures.length - new Set(allures).size + ' doublon(s)');

/* ---------- 2. titre et choix du perso ---------- */
check('demarre sur le titre', game.state === t.S.TITLE);
frames(4); tap('start', 3);
check('ecran de choix', game.state === t.S.PICK, 'etat ' + game.state);
tap('right', 2); tap('down', 2);
const attendu = t.PICKS[game.pick].n;
tap('a', 3);
check('perso choisi', game.hero.name === attendu, game.hero.name + ' vs ' + attendu);
check('intro jouee', game.state === t.S.DIALOG);
/* START doit couper court a l'intro d'un coup */
tap('start', 3);
check('START saute les textes', game.state !== t.S.DIALOG, 'etat ' + game.state);
check('on est dans le monde', clear(600), 'etat ' + game.state);
const sp = t.PICKS[game.pick].sp;
check('on demarre devant chez soi',
  (game.inside || null) === (sp[2] || null) && Math.abs(game.px - sp[0]) <= 2 && Math.abs(game.py - sp[1]) <= 2,
  game.px + ',' + game.py + ' inside=' + game.inside + ' attendu ' + sp);
game.inside = null;
check('le double a disparu', t.PICKS[game.pick].npc ? !!t.NPCS.find(n => n.id === t.PICKS[game.pick].npc).gone : true);

/* ---------- 3. deplacement et entree dans les maisons ---------- */
function tp(x, y, ins) { game.inside = ins || null; game.px = x; game.py = y; game.ox = 0; game.oy = 0; game.moving = false; }
function entre(dx, dy, id) {
  clear();
  tp(dx, dy + 1); game.dir = 1;
  /* on pousse vers la porte jusqu a entrer, sans dependre de la vitesse de marche */
  for (let i = 0; i < 6 && game.inside !== id; i++) { hold('up', 20); clear(); }
  const dedans = game.inside === id;
  check('on entre chez ' + id, dedans, 'inside=' + game.inside + ' px=' + game.px + ' py=' + game.py);
  if (!dedans) return;
  const spawn = [game.px, game.py];
  check('spawn valide chez ' + id, !t.solidAt(spawn[0], spawn[1]));
  for (let i = 0; i < 12 && game.inside === id; i++) { hold('down', 20); clear(); }
  check('on ressort de chez ' + id, game.inside === null, 'inside=' + game.inside);
  clear();
}
/* on ne rentre pas a velo : il doit se ranger tout seul */
clear(); tp(97, 7); game.bike = true; game.dir = 1;
for (let i = 0; i < 6 && game.inside !== 'lutreau'; i++) { hold('up', 20); clear(); }
check('le velo se range en entrant', game.inside === 'lutreau' && game.bike === false,
  'inside=' + game.inside + ' velo=' + game.bike);
for (let i = 0; i < 12 && game.inside === 'lutreau'; i++) { hold('down', 20); clear(); }
game.bike = false; clear();

/* chaque salon doit etre meuble : canape, table basse, television, cheminee, cuisine */
['lutreau', 'lebel', 'webb', 'jungers'].forEach(id => {
  const C = t.INT[id], vus = new Set(C.map);
  [['canape', T.SOFA], ['table basse', T.TBAS], ['television', T.TVGC],
   ['cheminee', T.CHEM], ['cuisine', T.KITCH], ['frigo', T.FRIGO],
   ['evier', T.EVIER], ['fauteuil', T.FAUT]].forEach(([nom, tuile]) => {
    check('chez ' + id + ' il y a ' + nom, vus.has(tuile));
  });
});

t.DOORS.filter(d => d.to !== 'club').forEach(d => entre(d.x, d.y, d.to));
const dclub = t.DOORS.find(d => d.to === 'club');
entre(dclub.x, dclub.y, 'club');

/* portes fermees : elles parlent, elles n ouvrent pas */
t.LOCKED.forEach(L => {
  clear(); tp(L.x, L.y + 1); game.dir = 1; hold('up', 40);
  check('porte fermee ' + L.who, game.inside === null, 'inside=' + game.inside);
  clear();
});

/* ---------- 3 bis. le sous-bois ---------- */
clear();
/* on cherche une case de sous-bois avec une voisine de sous-bois, loin du bord */
let bois = null, allee = null;
for (let y = 10; y < MH - 10 && !bois; y++) for (let x = 10; x < MW - 10; x++) {
  if (at(x, y) === T.DENSE && at(x, y + 1) === T.DENSE && at(x, y + 2) === T.DENSE) { bois = [x, y]; break; }
}
for (let y = 40; y < 60 && !allee; y++) for (let x = 34; x < 54; x++) {
  if (at(x, y) === T.PATH && at(x, y + 1) === T.PATH && at(x, y + 2) === T.PATH) { allee = [x, y]; break; }
}
check('il y a du sous-bois sur la carte', !!bois);
check('il y a des chemins sur la carte', !!allee);
check('le sous-bois se traverse', !t.SOLID.has(T.DENSE));
check('les arbres restent infranchissables', t.SOLID.has(T.TREE));
check('le bord du monde est un mur d arbres', t.solidAt(1, 40) && t.solidAt(40, 1),
  'tuiles ' + at(1, 40) + ' et ' + at(40, 1));
check('hors carte, on ne passe pas', at(-1, 40) === T.TREE && at(MW + 3, 40) === T.TREE);

const ballesAuBois = t.ballSpots.filter(b => at(b.x, b.y) === T.DENSE).length;
check('on trouve des balles dans le sous-bois', ballesAuBois > 4, ballesAuBois + ' balle(s)');
check('les balles du sous-bois sont invisibles',
  t.ballSpots.filter(b => at(b.x, b.y) === T.DENSE).every(b => !t.ballVisible(b)));
check('les balles du rough restent visibles',
  t.ballSpots.filter(b => at(b.x, b.y) === T.ROUGH && !b.taken).some(b => t.ballVisible(b)));
/* et on les ramasse quand meme en marchant dessus */
const cachee = t.ballSpots.find(b => at(b.x, b.y) === T.DENSE && !b.taken);
if (cachee) {
  clear(); tp(cachee.x, cachee.y - 1); game.dir = 0;
  const avant = t.BALLS.reduce((a, _, i) => a + game.bag[i], 0);
  for (let i = 0; i < 4 && !cachee.taken; i++) { hold('down', 30); clear(); }
  const apres = t.BALLS.reduce((a, _, i) => a + game.bag[i], 0);
  check('on ramasse la balle cachee en marchant dessus', cachee.taken && apres === avant + 1,
    'prise=' + cachee.taken + ' sac ' + avant + '->' + apres);
  clear();
}

/* un pas dans le sous-bois doit etre plus lent qu un pas sur le chemin */
function pas(x, y) {
  clear(); tp(x, y); game.state = t.S.WORLD; game.bike = false;
  t.press('down'); t.update();
  let n = 0;
  while (game.moving && n < 400) { t.update(); n++; }
  t.release('down'); frames(2);
  return n;
}
if (bois && allee) {
  const nBois = pas(bois[0], bois[1]);
  clear();
  const nAllee = pas(allee[0], allee[1]);
  check('on avance moins vite dans le sous-bois', nBois > nAllee + 4,
    nBois + ' images au bois contre ' + nAllee + ' sur le chemin');
  check('un pas sur le chemin fait bien huit images', Math.abs(nAllee - 8) <= 2, nAllee + ' images');
}
/* on est enfoui, et ca fait voler des feuilles */
if (bois) {
  clear(); tp(bois[0], bois[1]);
  check('on est enfoui dans le sous-bois', t.inBrush(bois[0], bois[1]));
  t.leaves.length = 0;
  t.press('down'); for (let i = 0; i < 120 && !t.leaves.length; i++) t.update(); t.release('down');
  check('les feuilles volent quand on avance', t.leaves.length > 0, t.leaves.length + ' feuille(s)');
  for (let i = 0; i < 200; i++) t.update();
  check('les feuilles retombent', t.leaves.length === 0, t.leaves.length + ' restante(s)');
}
clear();

/* la pente en terre doit encore repondre */
let terre = null;
for (let y = 20; y < 34 && !terre; y++) for (let x = 100; x < 118; x++) if (at(x, y) === T.DIRT) { terre = [x, y]; break; }
check('la pente en terre existe', !!terre, terre ? terre.join(',') : 'introuvable');
if (terre) {
  clear(); tp(terre[0], terre[1] - 1); game.dir = 0;
  for (let i = 0; i < 5 && game.state !== t.S.ASK; i++) { hold('down', 26); }
  check('la pente propose de descendre', game.state === t.S.ASK || game.state === t.S.PENTE,
    'etat ' + game.state + ' en ' + game.px + ',' + game.py);
  if (game.state === t.S.ASK) { tap('b', 3); }
  clear();
}

/* ---------- 4. une partie de golf complete ---------- */
clear(); tp(52, 54); game.state = t.S.WORLD; game.party = [];
tap('a', 3);
check('depart du 1', t.golf.on, 'phase ' + t.golf.phase);
let garde = 0;
function golfBot() {
  const g = t.golf, p = t.P_()[g.cur];
  if (game.state === t.S.DIALOG) { tap('a', 1); return; }
  if (g.phase === 'aim' || g.phase === 'putt' || g.phase === 'result' || g.phase === 'card') { tap('a', 1); return; }
  if (g.phase === 'power') { if (g.gT > 0.72 && g.dirg > 0) tap('a', 1); else frames(1); return; }
  if (g.phase === 'putpow') {
    const d = Math.hypot(t.HOLES[g.hole].gx + 0.5 - p.bx, t.HOLES[g.hole].gy + 0.5 - p.by);
    const vise = Math.max(0.12, Math.min(0.95, (d - 0.32) / 3.1 + 0.12));
    if (Math.abs(g.gT - vise) < 0.03) tap('a', 1); else frames(1); return;
  }
  if (g.phase === 'acc') { if (Math.abs(g.gT - 0.5) < 0.02) tap('a', 1); else frames(1); return; }
  frames(1);
}
while (t.golf.on && garde++ < 200000) golfBot();
check('les neuf trous sont joues', !t.golf.on, 'reste phase ' + t.golf.phase + ' apres ' + garde);
const players = t.P_();
const totalCarte = game.card.reduce((a, b) => a + b, 0);
check('carte de score remplie', game.card.every(v => v > 0), JSON.stringify(game.card));
check('score plausible', totalCarte > 20 && totalCarte < 200, 'total ' + totalCarte);
clear();

/* ---------- 5. les voitures de la departementale ---------- */
t.cars.length = 0;
tp(31, 57); game.state = t.S.WORLD;
let vues = 0;
for (let i = 0; i < 1400; i++) { t.updateCars(); if (t.cars.length) vues++; if (game.state !== t.S.WORLD) break; }
check('une voiture est passee', vues > 0);
check('la voiture renverse au passage cloute', game.state === t.S.DIALOG || game.px === 28 || game.px === 35,
  'px=' + game.px + ' etat=' + game.state);
clear();

/* ---------- 6. les vitres des Mamoumani ---------- */
const w0 = t.MAMOU_WIN[0];
t.put(w0[0], w0[1], T.SWIN);
tp(w0[0], w0[1] + 3);
t.breakWindow(w0[0], w0[1]);
check('la vitre casse', at(w0[0], w0[1]) === T.SWINB, 'tuile ' + at(w0[0], w0[1]));
check('des eclats volent', t.shards.length > 0);
frames(80);
check('les eclats retombent', t.shards.length === 0);

/* ---------- 7. le temps, une journee en quarante minutes ---------- */
game.min = 8 * 60;
const avant = game.min;
for (let i = 0; i < 3600; i++) t.timeStep();       /* une minute de jeu reel */
const parMinute = game.min - avant;
const journee = 1440 / parMinute;
check('une journee dure 30 a 55 minutes', journee > 30 && journee < 55, Math.round(journee) + ' min');

/* ---------- 8. le feu de camp ---------- */
game.min = 20 * 60 + 50; game.phase = 'h'; game.inside = null; game.state = t.S.WORLD;
for (let i = 0; i < 4000 && game.state !== t.S.ASK; i++) t.timeStep();
check('on est appele au feu', game.state === t.S.ASK || game.feuCall, 'etat ' + game.state);
if (game.state === t.S.ASK) {
  tap('a', 3);
  frames(100);
  check('teleporte au feu', Math.hypot(game.px - t.FEU.x, game.py - t.FEU.y) < 5,
    game.px + ',' + game.py);
}

/* ---------- 8 bis. le cours collectif au practice ---------- */
clear(); game.state = t.S.WORLD; game.inside = null; game.min = 14 * 60; game.phase = 'g';
t.placeGang(); tp(24, 42); game.party = [];
const sacAvant = game.bag[0];
t.startCours('GILLES', 1);
check('le cours demarre', t.cours.on && t.golf.on, 'cours=' + t.cours.on + ' golf=' + t.golf.on);
check('tout le monde est aligne sur les tapis', t.P_().length >= 2, t.P_().length + ' joueur(s)');
let g2 = 0;
while (t.cours.on && g2++ < 200000) golfBot();
check('le cours va au bout des dix balles', !t.cours.on, 'coup ' + t.cours.shot);
const scores = t.P_().map(p => p.cours);
check('tout le monde a un score', scores.every(v => typeof v === 'number' && v >= 0), JSON.stringify(scores));
check('les scores ne sont pas tous nuls', scores.some(v => v > 0), JSON.stringify(scores));
const meilleur = Math.max.apply(null, scores);
check('la Pro V1 va au meilleur',
  (scores[0] === meilleur) ? game.bag[0] === sacAvant + 1 : game.bag[0] === sacAvant,
  'moi=' + scores[0] + ' meilleur=' + meilleur + ' sac ' + sacAvant + '->' + game.bag[0]);
clear();

/* ---------- 8 ter. le feu parle tout seul, et les invitations ---------- */
game.state = t.S.WORLD; game.inside = null; game.min = 22 * 60; game.phase = 'f';
t.placeGang(); tp(t.FEU.x, t.FEU.y + 3); game.feuCall = false;
let attente = 0;
while (game.state !== t.S.DIALOG && attente++ < 900) t.update();
check('le feu lance une conversation tout seul', game.state === t.S.DIALOG, 'apres ' + attente + ' images');
if (game.state === t.S.DIALOG) {
  const page = game.dl;
  let n2 = 0;
  while (game.state === t.S.DIALOG && game.dl === page && n2++ < 900) t.update();
  check('le dialogue du feu avance sans appuyer sur A', game.dl !== page || game.state !== t.S.DIALOG,
    'page ' + game.dl + ' etat ' + game.state);
  let n3 = 0;
  while (game.state === t.S.DIALOG && n3++ < 4000) t.update();
  check('le dialogue du feu se termine tout seul', game.state !== t.S.DIALOG, 'etat ' + game.state);
}
clear();

['cours', 'pente', 'mamou'].forEach(k => check('invitation ' + k + ' definie', !!t.INVITES[k]));
game.state = t.S.WORLD; game.inside = null; game.fade = null; game.inviteT = 0; tp(24, 42);
t.inviteRecue({ kind: 'cours', from: 'VICTOR' });
check('une invitation ouvre une question', game.state === t.S.ASK, 'etat ' + game.state);
tap('b', 3); clear();

/* ---------- 9. menus, carte, sac, fiche ---------- */
game.state = t.S.WORLD; game.inside = null; tp(45, 57);
tap('start', 3);
check('menu ouvert', game.state === t.S.MENU);
frames(3);
const liste = t.menuList();
check('menu complet', liste.indexOf('SAUVEGARDER') >= 0 && liste.indexOf('CARTE') >= 0);
['CARTE', 'SAC', 'FICHE'].forEach(p => { game.page = p; game.state = t.S.PAGE; frames(3); });
check('les pages se dessinent', true);
game.items.clopes = true; game.clopes = 3;
check('la clope apparait au menu', t.menuList().indexOf('CLOPE') >= 0);
game.state = t.S.CLOPE; frames(260);
check('la clope se termine seule', game.state !== t.S.CLOPE, 'etat ' + game.state);
clear();

/* ---------- 10 bis. le velo dans le hameau ---------- */
game.state = t.S.WORLD; game.inside = null; game.bike = true; tp(100, 14);
let arrivee = 0;
for (let i = 0; i < 6000 && !t.velo.on; i++) {
  if (game.state !== t.S.WORLD) { clear(60); game.state = t.S.WORLD; game.bike = true; }
  t.update(); arrivee++;
}
check('la bande rapplique a velo', t.velo.on, 'apres ' + arrivee + ' images');
clear();
check('ils ont tous un velo', t.velo.team.length >= 2 && t.velo.team.every(n => n.bike));
for (let i = 0; i < 900; i++) t.update();
check('la course avance', t.velo.race === null || t.velo.race.t > 0);
clear();
game.bike = false;
for (let i = 0; i < 400; i++) t.update();
check('ils rangent les velos', !t.velo.on);
clear();

/* ---------- 10. sauvegarde locale ---------- */
game.money = 12.5; game.clopes = 5; game.vitres = 2;
t.save();
check('sauvegarde ecrite dans localStorage', !!store['prieure3']);
const relu = JSON.parse(store['prieure3']);
check('sauvegarde coherente', relu.money === 12.5 && relu.clopes === 5 && relu.vitres === 2);

/* ---------- 11. rendu de tous les etats, sans exception ---------- */
Object.keys(t.S).forEach(k => {
  game.state = t.S[k];
  try { t.render(); ok++; } catch (e) { ko++; fails.push('rendu ' + k + ' -> ' + e.message); }
});

/* ---------- verdict ---------- */
console.log('\n  ' + ok + ' verifications passees, ' + ko + ' echec(s).');
if (fails.length) { console.log('\n  Echecs :'); fails.forEach(f => console.log('   - ' + f)); }
process.exit(ko ? 1 : 0);
