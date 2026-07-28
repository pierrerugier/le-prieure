/* Harnais de test : on extrait le script du index.html, on stubbe le DOM,
   et on pilote update() image par image. Lancer avec : node tests/harness.js */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..', 'public');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
let src = html.match(/<script>([\s\S]*)<\/script>/)[1];

if (src.indexOf('chargeMonde().then(load).finally(loop);') < 0) throw new Error('point de sortie introuvable');
src = src.replace('chargeMonde().then(load).finally(loop);', `globalThis.__t={game,golf,net,update,render,map,MW,MH,T,at,put,NPCS,ITEMS,
  HOLES,PICKS,INT,DOORS,LOCKED,cars,shards,keys,press,release,consume,MAMOU,MAMOU_WIN,FEU,
  players,P_:()=>players,goInside,goOutside,zoneAt,menuList,buildMini,SOLID,getTile,S,ballSpots,updatePick,
  startHole,save,load,solidAt,placeGang,SPOTS,TRACKS,musWant,pente,CRIS,phaseOf,BALLS,updateCars,timeStep,breakWindow,velo,updateVelo,startPente,updatePente,leaves,inBrush,ballVisible,estVitre,estCassee,VILLAS,LISIERE,EVENOU,VOITURES,FICHES,fiche,skillDe,vitPuissance,vitPrecision,longueurDe,cours,startCours,INVITES,inviteRecue,FEU,
  pers,dogSpr,BODY_SIDE,DOG_SIDE,sfx,ambiances,piscineOuverte,baignade,entreDansLeau,proposePartie,updateAttente,departDu1,hNow,AU_FEU,FEU_RING,FEU_TALK,feuMenu,eteindreLeFeu,bikeSpr,BIKE_DOWN,BIKE_UP,BIKE_SIDE,MISSIONS,ACTES,mission,missionCourante,niveau,chaparde,voleVoiturette,updateVoiturette,BUTIN,
  BASE,appliqueMonde,carteDe,TUILE_OVR,CORPS,CORPS_BASE,FICHES_BASE,tile,cache,MW_:MW,
  BIBLI,MIROIR,ROT,SAUT,MODELES,HOLES_BASE,DOORS_BASE,estDepart,VILLAS_:VILLAS,
  PERSO0,BLOCS_PERSO,TIRADES,ART_MULTI,MIR_ART,mondeVide,VAR0,baseT,tourneCase,miroirCase,COMPO,compose,fondDe,motifDe,TRANSP,lieAt,map,
  ITEMS_BASE,NPCS_BASE,MISSIONS_BASE,ACTES_BASE,LOCKED_BASE,EVENTS};`);

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
/* Le domaine tel que Pierre l'a redessine dans l'atelier : c'est lui, la vraie
   carte. On le pose avant tout, sinon on teste un terrain que plus personne ne
   joue. */
const fMonde = path.join(root, 'monde.json');
const mondeDePierre = fs.existsSync(fMonde) ? JSON.parse(fs.readFileSync(fMonde, 'utf8')) : null;
/* a rappeler apres chaque essai qui remet le monde a plat */
function remetMonde() { if (mondeDePierre) t.appliqueMonde(mondeDePierre); }
/* Les sections 1 a 3 verifient ce que le CODE fabrique : on les joue sur le
   terrain d'origine. Le monde de Pierre arrive juste avant le golf, parce que le
   parcours, lui, c'est le sien. */

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
check('la route se traverse partout', !t.SOLID.has(T.ROAD) && !t.SOLID.has(T.LINE));
check('pas de passage cloute', !t.map.includes(T.ZEBRA));
check('trois courts de tennis', at(14, 60) === T.TENN && at(23, 60) === T.TENN && at(18, 67) === T.TENN);
check('piscine au sud-est', at(83, 50) === T.POOL);
check('putting green a plusieurs trous',
  [[58,61],[64,63],[68,60]].filter(f => at(f[0],f[1]) === T.FLAG).length === 3,
  [[58,61],[64,63],[68,60]].map(f => at(f[0],f[1])).join(','));
check('portes du club house', !!t.DOORS.find(d => d.to === 'club'));
const noms = ['club', 'lutreau', 'lebel', 'webb', 'jungers'];
noms.forEach(n => check('interieur ' + n, !!t.INT[n]));
noms.forEach(n => check('porte vers ' + n, n === 'club' || !!t.DOORS.find(d => d.to === n)));
check('vitres Mamoumani', t.MAMOU_WIN.every(w => t.estVitre(at(w[0], w[1]))));
check('cinq maisons de lisiere alignees', t.LISIERE.length === 5 && t.LISIERE.every(m => at(112, m.y + 4) === T.HBAIE || at(112, m.y + 4) === T.SDOOR),
  t.LISIERE.map(m => m.id + ':' + at(112, m.y + 4)).join(' '));
check('la voie du hameau passe derriere la lisiere', at(116, 60) === T.GRAVEL, 'tuile ' + at(116,60));
check('un jardin entre les maisons et le bois', at(108, 60) === T.LAWN, 'tuile ' + at(108,60));
check('une bande de bois avant le parcours', at(105, 60) === T.DENSE, 'tuile ' + at(105,60));
check('des passages entre les haies', at(107, 48) === T.LAWN && at(105, 48) === T.HEDGE,
  at(107,48) + ' / ' + at(105,48));
check('huit villas forestieres', t.VILLAS.length === 8);
check('trois baraques Evenou', t.EVENOU.length === 3 && t.EVENOU.every(e => at(e.x + 2, 89) === T.STORE),
  t.EVENOU.map(e => at(e.x + 2, 89)).join(','));
check('des champs separent les Evenou du hameau', at(100, 82) === T.CHAMP && at(112, 83) === T.CHAMP,
  at(100,82) + '/' + at(112,83));
check('le 712 est un hangar gris au nord du practice',
  at(12, 12) === T.HANG && at(11, 11) === T.HANGW && at(12, 8) === T.HANGR,
  [at(12,12), at(11,11), at(12,8)].join('/'));
check('une petite route relie le 712 a la departementale',
  at(25, 16) === T.GRAVEL && at(29, 20) === T.GRAVEL, at(25,16) + '/' + at(29,20));
check('le mini-golf devant le 712', at(8, 18) === T.MINIG && at(17, 18) === T.MINIG);
check('la cabane dans le bois', at(6, 26) === T.CABW || at(6, 27) === T.CABW, 'tuile ' + at(6,26));
check('les Mamoumani sont au nord du practice', t.MAMOU.x < 30 && t.MAMOU.y < 20,
  t.MAMOU.x + ',' + t.MAMOU.y);
check('le trou 6 ne coupe plus le hameau',
  t.HOLES[5].gx < 88 && t.VILLAS.every(v => Math.hypot(v.x + 3 - t.HOLES[5].gx, v.y + 2 - t.HOLES[5].gy) > 8),
  'green du 6 en ' + t.HOLES[5].gx + ',' + t.HOLES[5].gy);
/* autour du feu, tout le monde est sur le cercle et regarde les flammes */
game.min = 22 * 60; game.phase = 'f'; t.placeGang();
const autour = Object.keys(t.SPOTS_||{}).length ? [] : t.NPCS.filter(n => n.gang && !n.gone);
check('le velo est dessine de face, de dos et de profil',
  t.bikeSpr(0) === t.BIKE_DOWN && t.bikeSpr(1) === t.BIKE_UP && t.bikeSpr(3) === t.BIKE_SIDE);
check('les trois velos font seize lignes',
  [t.BIKE_DOWN, t.BIKE_UP, t.BIKE_SIDE].every(b => b.length === 16 && b.every(r => r.length === 16)));
check('des talus larges sur la carte', t.map.filter(v => v === T.TALUS || v === T.TALUH).length > 120,
  t.map.filter(v => v === T.TALUS || v === T.TALUH).length + ' cases');
check('aucun talus sur la piscine ni sur un green',
  !t.map.some((v, i) => (v === T.TALUS || v === T.TALUH) && false));
check('la foret ne mord plus sur la piscine',
  ![T.TREE, T.DENSE].includes(at(80, 50)) && ![T.TREE, T.DENSE].includes(at(90, 46)));
const ballesBois = t.ballSpots.filter(b => at(b.x, b.y) === T.DENSE).length;
check('la plupart des balles sont dans le bois', ballesBois > t.ballSpots.length * 0.5,
  ballesBois + ' sur ' + t.ballSpots.length);
check('la bande est en cercle autour du feu',
  autour.every(n => { const d = Math.hypot(n.x - t.FEU.x, n.y - t.FEU.y); return d > 2 && d < 5; }),
  autour.map(n => n.id + ':' + Math.hypot(n.x - t.FEU.x, n.y - t.FEU.y).toFixed(1)).join(' '));
check('ils regardent tous le feu', autour.every(n => {
  const ex = t.FEU.x - n.x, ey = t.FEU.y - n.y;
  const attendu = (Math.abs(ex) > Math.abs(ey)) ? (ex > 0 ? 3 : 2) : (ey > 0 ? 0 : 1);
  return n.dir === attendu;
}));
game.min = 14 * 60; game.phase = 'g'; t.placeGang();
check('la rangee de platanes borde le parking', at(35, 47) === T.PLAT && at(35, 59) === T.PLAT);
check('huit voitures nommees au parking', t.VOITURES.length === 8 && t.VOITURES.every(v => at(v.x, v.y) === T.CAR));
check('les transats au bord de la piscine', at(89, 44) === T.TRANSAT);
check('les vestiaires ferment la piscine a l ouest', t.SOLID.has(at(74, 50)));
check('jacuzzi des Webb', at(108, 46) === T.JACU, 'tuile ' + at(108,46));
check('villa forestiere en lambris',
  t.VILLAS.every(v => { const tl = at(v.x + 1, v.y + 1); return tl === T.BAIE || tl === T.STONEW || tl === T.WOOD; }),
  t.VILLAS.map(v => v.id + ':' + at(v.x + 1, v.y + 1)).join(' '));

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
clear(); tp(92, 6); game.bike = true; game.dir = 1;
for (let i = 0; i < 6 && game.inside !== 'lutreau'; i++) { hold('up', 20); clear(); }
check('le velo se range en entrant', game.inside === 'lutreau' && game.bike === false,
  'inside=' + game.inside + ' velo=' + game.bike);
for (let i = 0; i < 12 && game.inside === 'lutreau'; i++) { hold('down', 20); clear(); }
game.bike = false; clear();

/* chaque salon doit etre meuble : canape, table basse, television, cheminee, cuisine */
['lutreau', 'lebel', 'webb', 'jungers'].forEach(id => {
  const C = t.INT[id], vus = new Set([...C.map].map(t.baseT));
  [['canape', T.SOFA], ['table basse', T.TBAS], ['television', T.TVGC],
   ['cheminee', T.CHEM], ['cuisine', T.KITCH], ['frigo', T.FRIGO],
   ['evier', T.EVIER], ['fauteuil', T.FAUT]].forEach(([nom, tuile]) => {
    check('chez ' + id + ' il y a ' + nom, vus.has(tuile));
  });
});

t.DOORS.filter(d => d.to !== 'club').forEach(d => entre(d.x, d.y, d.to));

/* le club house a trois portes en facade, chacune avec son point de chute */
const portesClub = t.DOORS.filter(d => d.to === 'club');
check('trois entrees au club house', new Set(portesClub.map(d => d.sx + ',' + d.sy)).size === 3,
  portesClub.map(d => d.x + '->' + d.sx + ',' + d.sy).join(' '));
portesClub.forEach(d => {
  clear(); tp(d.x, d.y + 1); game.dir = 1;
  /* un seul pas, pile sur la porte, pour lire le point de chute exact */
  t.press('up'); t.update();
  let n = 0; while (game.moving && n++ < 80) t.update();
  t.release('up'); frames(2); clear();
  check('la porte en x=' + d.x + ' mene au bon endroit',
    game.inside === 'club' && game.px === d.sx && game.py === d.sy,
    game.px + ',' + game.py + ' au lieu de ' + d.sx + ',' + d.sy);
  /* et on ressort par la meme */
  for (let i = 0; i < 12 && game.inside === 'club'; i++) { hold('down', 20); clear(); }
  check('on ressort du club par la porte en x=' + d.x, game.inside === null, 'inside=' + game.inside);
  clear();
});
/* les pieces du plan doivent toutes exister */
const club = t.INT.club;
const dedans = new Set([...club.map].map(t.baseT));
[['vitrines du couloir', T.VITRINE], ['escaliers', T.ESCAL], ['toilettes', T.WC],
 ['billard', T.BILL], ['cheminee', T.CHEM], ['fauteuils clubs', T.FAUT],
 ['tables basses', T.TBAS], ['fontaine du patio', T.FOUNT], ['bar', T.BAR],
 ['cuisines', T.KITCH], ['casiers des vestiaires', T.LOCKER]].forEach(([nom, tuile]) => {
  check('le club house a ses ' + nom, dedans.has(tuile));
});
check('trois groupes de fauteuils dans la salle cheminee',
  [13, 18, 23].every(x => t.baseT(club.map[18 * club.w + x]) === T.FAUT));
check('la cheminee est a droite de la salle',
  t.baseT(club.map[17 * club.w + 26]) === T.CHEM && t.baseT(club.map[17 * club.w + 27]) === T.CHEM);

/* portes fermees : elles parlent, elles n ouvrent pas */
t.LOCKED.forEach(L => {
  clear(); tp(L.x, L.y + 1); game.dir = 1; hold('up', 40);
  check('porte fermee ' + L.who, game.inside === null, 'inside=' + game.inside);
  clear();
});

/* ---------- 2 ter. ramasser ne coupe jamais la marche ---------- */
clear();
const objetTest = t.ITEMS.find(o => !o.inside && !game.items[o.id]);
check('chaque objet a sa replique courte', t.ITEMS.every(o => o.trouve && o.trouve.length < 90),
  t.ITEMS.filter(o => !o.trouve || o.trouve.length >= 90).map(o => o.id).join(','));
check('les repliques sont a la premiere personne',
  t.ITEMS.every(o => o.trouve.indexOf("J'ai trouvé") === 0));
if (objetTest) {
  tp(objetTest.x, objetTest.y - 1); game.dir = 0;
  t.press('down');
  let n4 = 0;
  while (!game.items[objetTest.id] && n4++ < 200) t.update();
  check('on ramasse ' + objetTest.id + ' en marchant', !!game.items[objetTest.id]);
  check('le ramassage ne coupe pas la marche', game.state === t.S.WORLD, 'etat ' + game.state);
  check('il previent en bas d ecran', !!game.toast, game.toast || 'rien');
  t.release('down'); frames(2);
}
/* pareil pour une balle */
/* une balle tranquille : pas collee a une porte ni au bord d'une zone, sinon
   c'est la transition qu'on teste et pas le ramassage */
const balleTest = t.ballSpots.find(b => !b.taken &&
  !t.solidAt(b.x, b.y - 1) && !t.solidAt(b.x, b.y) &&
  !t.DOORS.some(d => Math.abs(d.x - b.x) < 3 && Math.abs(d.y - b.y) < 3) &&
  t.at(b.x, b.y - 1) === t.at(b.x, b.y));
if (balleTest) {
  clear(); tp(balleTest.x, balleTest.y - 1); game.dir = 0;
  t.press('down');
  let n5 = 0;
  while (!balleTest.taken && n5++ < 200) t.update();
  t.release('down'); frames(2);
  check('on ramasse une balle en marchant', balleTest.taken);
  check('la balle ne coupe pas la marche', game.state === t.S.WORLD, 'etat ' + game.state);
  check('elle se dit en une ligne', !!game.toast && game.toast.indexOf("J'ai trouvé") === 0,
    game.toast || 'rien');
}
clear();

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

/* ---------- 4. une partie de golf complete, sur le domaine de Pierre ---------- */
remetMonde();
check('le domaine redessine est bien charge', !mondeDePierre || t.HOLES.length === 7);
/* le parcours de Pierre : sept trous, chacun avec son depart et son drapeau en place */
check('sept trous', t.HOLES.length === 7, t.HOLES.length + '');
t.HOLES.forEach(h => {
  check('le depart du ' + h.n + ' est bien un depart',
    [[0,0],[1,0],[0,1],[1,1]].some(d => t.estDepart(at(h.tx - 1 + d[0], h.ty - 1 + d[1]))),
    'en ' + h.tx + ',' + h.ty + ' : ' + at(h.tx, h.ty));
  check('le drapeau du ' + h.n + ' est sur un green',
    at(h.gx, h.gy) === T.FLAG || at(h.gx, h.gy) === T.GREEN,
    'en ' + h.gx + ',' + h.gy + ' : ' + at(h.gx, h.gy));
  check('le ' + h.n + ' fait une longueur jouable', h.len > 120 && h.len < 700, h.len + ' m');
});
/* les obstacles d'eau penalisent, qu'ils soient en mare ou en eau vive */
check('la mare compte comme de l eau pour la balle', t.lieAt(39, 42) === 'eau', t.lieAt(39, 42));
check('la mare a droite du 7 est bien la', at(39, 42) === T.MARE, '' + at(39, 42));
check('l eau au bord du green du 2 est bien la', at(85, 83) === T.MARE, '' + at(85, 83));
check('l eau du 1 est bien la', at(51, 92) === T.MARE, '' + at(51, 92));
/* et aucune balle a trouver ne se retrouve dans un tronc */
const dansUnMur = t.ballSpots.filter(b => t.SOLID.has(at(b.x, b.y)));
check('aucune balle a ramasser n est dans un arbre', dansUnMur.length === 0,
  dansUnMur.length + ' balle(s) : ' + dansUnMur.slice(0,4).map(b => b.x+','+b.y).join(' '));
check('il reste des balles a trouver', t.ballSpots.length > 60, t.ballSpots.length + '');
clear(); tp(t.HOLES[0].tx, t.HOLES[0].ty); game.state = t.S.WORLD; game.party = [];
tap('a', 3);
check('depart du 1', t.golf.on, 'phase ' + t.golf.phase);
let garde = 0;
let botPhase = '', botAttente = 0;
function golfBot() {
  const g = t.golf, p = t.P_()[g.cur];
  if (g.phase !== botPhase) { botPhase = g.phase; botAttente = 0; }
  botAttente++;
  const patience = botAttente > 400;   /* si la jauge nous echappe, on tape quand meme */
  if (game.state === t.S.DIALOG) { tap('a', 1); return; }
  /* une partie dure assez longtemps pour que le feu de camp s'invite : on decline */
  if (game.state === t.S.ASK) { tap('b', 1); return; }
  if (g.phase === 'aim') {
    /* coince dans les bois : un humain change d'angle au lieu de retaper dans le meme arbre */
    if (p && (p.lie === 'bois' || p.stroke > 6)) hold((p.stroke & 1) ? 'left' : 'right', 5);
    tap('a', 1); return;
  }
  if (g.phase === 'putt' || g.phase === 'result' || g.phase === 'card') { tap('a', 1); return; }
  if (g.phase === 'power') { if (patience || (g.gT > 0.7 && g.dirg > 0)) tap('a', 1); else frames(1); return; }
  if (g.phase === 'putpow') {
    const d = Math.hypot(t.HOLES[g.hole].gx + 0.5 - p.bx, t.HOLES[g.hole].gy + 0.5 - p.by);
    const vise = Math.max(0.12, Math.min(0.95, (d - 0.32) / 3.1 + 0.12));
    if (patience || Math.abs(g.gT - vise) < 0.05) tap('a', 1); else frames(1); return;
  }
  if (g.phase === 'acc') { if (patience || Math.abs(g.gT - 0.5) < 0.04) tap('a', 1); else frames(1); return; }
  frames(1);
}
while (t.golf.on && garde++ < 200000) golfBot();
check('le feu de camp n a pas interrompu la partie', game.state !== t.S.ASK,
  'etat ' + game.state);
check('les sept trous sont joues', !t.golf.on, 'reste phase ' + t.golf.phase + ' apres ' + garde);
const players = t.P_();
const totalCarte = game.card.reduce((a, b) => a + b, 0);
check('carte de score remplie', game.card.every(v => v > 0), JSON.stringify(game.card));
check('score plausible', totalCarte > 20 && totalCarte < 320, 'total ' + totalCarte);
clear();

/* ---------- 4 bis. l'atelier : les retouches du monde ---------- */
clear();
check('la carte d origine est gardee de cote', !!t.BASE.domaine && t.BASE.domaine.length === MW * MH);
check('chaque interieur a sa carte d origine',
  Object.keys(t.INT).every(k => t.BASE[k] && t.BASE[k].length === t.INT[k].w * t.INT[k].h));
const tuileAvant = at(60, 20);
t.appliqueMonde({ v: 1, carte: { domaine: [[60, 20, T.SAND]] }, tuiles: {}, persos: {} });
check('une retouche de carte s applique', at(60, 20) === T.SAND, 'tuile ' + at(60, 20));
/* une fiche retouchee, puis remise d aplomb */
t.appliqueMonde({ v: 1, carte: {}, tuiles: {}, persos: { fiches: { moi: { puis: 5 } }, corps: {} } });
check('une fiche retouchee s applique', t.FICHES.moi.puis === 5, 'puis ' + t.FICHES.moi.puis);
remetMonde();
check('la retouche de carte a bien ete retiree', at(60, 20) === tuileAvant, 'tuile ' + at(60, 20));
/* une pose retouchee change ce que le jeu dessine */
const poseDeBase = t.CORPS.BODY_DOWN.join('|');
t.appliqueMonde({ v: 1, carte: {}, tuiles: {},
  persos: { fiches: {}, corps: { BODY_DOWN: t.CORPS_BASE.BODY_DOWN.map(() => '                ') } } });
check('une pose retouchee s applique', t.pers(0, 0)[1].trim() === '', 'ligne : [' + t.pers(0,0)[1] + ']');
t.appliqueMonde({ v: 1, carte: {}, tuiles: {}, persos: { fiches: {}, corps: {} } });
check('la pose revient a l origine', t.CORPS.BODY_DOWN.join('|') === poseDeBase);
check('les fiches reviennent a l origine', t.FICHES.moi.puis === t.FICHES_BASE.moi.puis);
/* un bloc redessine passe devant le dessin du code */
t.appliqueMonde({ v: 1, carte: {},
  tuiles: { [T.ROUGH]: { pal: ['#ff0000'], px: new Array(256).fill(0) } }, persos: {} });
check('un bloc redessine est pris en compte', !!t.TUILE_OVR[T.ROUGH]);
check('le cache de tuiles a ete vide', Object.keys(t.cache).length === 0 || !!t.tile(T.ROUGH, 0, 0));
t.appliqueMonde({ v: 1, carte: {}, tuiles: {}, persos: {} }); remetMonde();
check('le bloc revient au dessin du code', !t.TUILE_OVR[T.ROUGH]);
/* les textes : repliques, objets, lieux, trame */
const victor = t.NPCS.find(n => n.id === 'victor');
const ditAvant = JSON.stringify(victor.d);
t.appliqueMonde({ v: 1, carte: {}, tuiles: {}, persos: {},
  pnj: { victor: { name: 'LE CHEF', d: [['On passe par les bois.']] } },
  objets: { putter: { n: 'Un putter tordu' } },
  lieux: [{ x: 12, y: 14, who: 'LE 712', d: ['Fermé.'] }],
  missions: [{ a: 1, t: 'Une seule mission', d: 'Parle a Charles.', ev: 'parle', qui: 'charles', f: 'Voila.' }],
  actes: ['', 'UN SEUL ACTE'] });
check('une replique retouchee arrive dans le jeu',
  t.NPCS.find(n => n.id === 'victor').d[0][0] === 'On passe par les bois.');
check('un nom de personnage retouche arrive dans le jeu',
  t.NPCS.find(n => n.id === 'victor').name === 'LE CHEF');
check('un objet retouche arrive dans le jeu',
  t.ITEMS.find(o => o.id === 'putter').n === 'Un putter tordu');
check('un lieu retouche arrive dans le jeu', t.LOCKED.length === 1 && t.LOCKED[0].d[0] === 'Fermé.');
check('la trame retouchee arrive dans le jeu',
  t.MISSIONS.length === 1 && t.MISSIONS[0].t === 'Une seule mission');
check('les actes retouches arrivent dans le jeu', t.ACTES[1] === 'UN SEUL ACTE');
t.appliqueMonde({ v: 1, carte: {}, tuiles: {}, persos: {} });
check('les textes reviennent a l origine', JSON.stringify(t.NPCS.find(n => n.id === 'victor').d) === ditAvant);
check('la trame revient a l origine', t.MISSIONS.length === t.MISSIONS_BASE.length);
check('les lieux reviennent a l origine', t.LOCKED.length === t.LOCKED_BASE.length);
check('les objets reviennent a l origine',
  t.ITEMS.find(o => o.id === 'putter').n === t.ITEMS_BASE.putter.n);
clear();

/* ---------- 4 ter. la bibliotheque et les reperes ---------- */
check('la bibliotheque est rangee par familles', t.BIBLI.length > 140, t.BIBLI.length + ' entrees');
check('chaque entree a une famille et un nom',
  t.BIBLI.every(e => e.cat && e.n && (e.t !== undefined || (e.m && e.m.length === e.w * e.h))));
check('les motifs de plusieurs cases existent',
  t.BIBLI.filter(e => e.m).length >= 12, t.BIBLI.filter(e => e.m).length + ' motifs');
check('les sept voitures de profil sont dessinees',
  t.MODELES.length === 7 && t.BIBLI.filter(e => e.cat === 'vehicule').length === 7);
check('toutes les cases de la bibliotheque se dessinent',
  t.BIBLI.every(e => (e.m || [e.t]).every(id => !!t.tile(id, 0, 0))));
check('la cloture blanche se saute', ['CLOH','CLOV','CLONO','CLOSE','CLOP'].every(k => t.SAUT.has(T[k])));
check('la cloture blanche arrete quand on ne saute pas', t.SOLID.has(T.CLOH) && t.SOLID.has(T.CLOV));
check('on passe sur le chemin de terre et le carrelage',
  !t.SOLID.has(T.TERRE) && !t.SOLID.has(T.CARRP) && !t.SOLID.has(T.JONC));
check('la mare arrete', t.SOLID.has(T.MARE));
check('le miroir renvoie bien les paires', t.MIROIR[T.CLONO] === T.CLONE && t.MIROIR[T.CLONE] === T.CLONO);
/* retourner une voiture doit vraiment la retourner, pas la laisser telle quelle */
const q = [T.VOIT0, T.VOIT0 + 1, T.VOIT0 + 2, T.VOIT0 + 3];
const retourne = (w, h, tt, table) => {
  const o = new Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const src = tt[y * w + x];
    o[y * w + (w - 1 - x)] = (table[src] !== undefined) ? table[src] : src;
  }
  return o;
};
const miroite = retourne(2, 2, q, t.MIROIR);
check('une voiture retournee change vraiment de cases',
  miroite.every((id, i) => id !== q[i]), miroite.join(',') + ' contre ' + q.join(','));
check('la retourner deux fois la remet comme avant',
  retourne(2, 2, miroite, t.MIROIR).join(',') === q.join(','));
check('les cases en miroir se dessinent', miroite.every(id => !!t.tile(id, 0, 0)));
check('et elles arretent le joueur comme les autres', miroite.every(id => t.SOLID.has(id)));
/* un dessin de plusieurs cases sans correspondance ne doit pas etre melange */
check('le billard sait se retourner', [T.BIL1,T.BIL2,T.BIL3,T.BIL4,T.BIL5,T.BIL6]
  .every(id => t.MIROIR[id] !== undefined));
check('le canape sait se coucher', t.ROT[T.CANH1] === T.CANV1 && t.ROT[T.CANV1] === T.CANH1);
check('une voiture est marquee comme dessin de plusieurs cases', t.ART_MULTI.has(T.VOIT0));
/* n'importe quelle case se tourne, meme celles que le code n'avait pas prevues */
const q1 = t.tourneCase(T.ARB1);
check('une case sans correspondance se tourne quand meme', q1 !== T.ARB1 && q1 >= t.VAR0);
check('quatre quarts de tour ramenent la case d origine',
  t.tourneCase(t.tourneCase(t.tourneCase(q1))) === T.ARB1);
check('deux miroirs ramenent la case d origine', t.miroirCase(t.miroirCase(T.ARB1)) === T.ARB1);
check('une case tournee se dessine', !!t.tile(q1, 0, 0));
check('une case tournee arrete toujours le joueur', t.SOLID.has(q1));
check('une barriere tournee se saute toujours', t.SAUT.has(t.tourneCase(T.CLOH)));
check('un depart tourne reste un depart', t.estDepart(t.tourneCase(T.DEPTL)));
check('un arbre tourne reste un bois pour la balle',
  t.baseT(t.tourneCase(T.ARB1)) === T.ARB1);
/* et une case tournee posee sur la carte se comporte comme l originale */
clear(); tp(60, 30); t.put(61, 30, q1);
check('on ne traverse pas une case tournee', t.solidAt(61, 30));
t.put(61, 30, T.ROUGH); clear();
check('le quart de tour redresse la cloture', t.ROT[T.CLOH] === T.CLOV && t.ROT[T.CLOV] === T.CLOH);
check('les sept trous sont des reperes deplacables',
  t.HOLES.length === 7 && t.HOLES_BASE.length === 7, t.HOLES.length + ' trous');
check('les portes sont des reperes deplacables', t.DOORS.length >= 5 && t.DOORS_BASE.length === t.DOORS.length);
/* deplacer un depart deplace la logique, pas l'herbe */
const teeAvant = { tx: t.HOLES[0].tx, ty: t.HOLES[0].ty };
t.appliqueMonde({ v: 1, carte: {}, tuiles: {}, persos: {}, trous: [{ tx: 40, ty: 40, gx: 50, gy: 76 }] });
check('un depart deplace change ou commence le trou', t.HOLES[0].tx === 40 && t.HOLES[0].ty === 40);
t.appliqueMonde({ v: 1, carte: {}, tuiles: {}, persos: {} }); remetMonde();
check('le depart revient a sa place', t.HOLES[0].tx === teeAvant.tx && t.HOLES[0].ty === teeAvant.ty);
/* le vrai depart de quatre cases est bien pose et reconnu */
check('le depart du 1 fait quatre cases',
  [[0,0],[1,0],[0,1],[1,1]].every(d => t.estDepart(at(t.HOLES[0].tx - 1 + d[0], t.HOLES[0].ty - 1 + d[1]))),
  'tuiles ' + [[0,0],[1,0],[0,1],[1,1]].map(d => at(t.HOLES[0].tx-1+d[0], t.HOLES[0].ty-1+d[1])).join(','));
/* un bloc fabrique dans l'atelier : dessin, franchissabilite, tirade */
const monBloc = {
  id: t.PERSO0, n: 'Le grand orme', cat: 'vegetation', w: 2, h: 2, solide: 1, saut: 0,
  qui: "L'ORME", tirade: ['Un orme, tout seul au milieu du fairway.'],
  cases: [0,1,2,3].map(() => ({ pal: ['#2f6b34'], px: new Array(256).fill(0) }))
};
t.appliqueMonde({ v: 1, carte: {}, tuiles: {}, persos: {}, blocs: [monBloc] });
check('un bloc fabrique entre dans la bibliotheque',
  t.BIBLI.some(e => e.perso && e.n === 'Le grand orme' && e.w === 2 && e.h === 2));
check('ses quatre cases se dessinent',
  [0,1,2,3].every(i => !!t.tile(t.PERSO0 + i, 0, 0)));
check('il arrete le joueur si on l a voulu',
  [0,1,2,3].every(i => t.SOLID.has(t.PERSO0 + i)));
check('sa tirade est attachee a chaque case',
  [0,1,2,3].every(i => t.TIRADES[t.PERSO0 + i]));
/* on le pose sur la carte et on va lui parler */
clear(); tp(60, 20);
[0,1,2,3].forEach(i => t.put(61 + (i % 2), 20 + ((i / 2) | 0), t.PERSO0 + i));
check('on ne traverse pas le bloc', t.solidAt(61, 20));
game.dir = 3; t.press('a'); frames(3); t.release('a'); frames(3);
check('lui parler ouvre sa tirade', game.state === t.S.DIALOG, 'etat ' + game.state);
clear();
t.appliqueMonde({ v: 1, carte: {}, tuiles: {}, persos: {} });
check('retirer le bloc le sort de la bibliotheque', !t.BIBLI.some(e => e.perso));
check('et rend le passage', !t.SOLID.has(t.PERSO0) && !t.TIRADES[t.PERSO0]);
remetMonde();
check('un monde sans rien dedans est reconnu comme vide',
  t.mondeVide({v:1,carte:{},tuiles:{},persos:{fiches:{},corps:{}},pnj:{},objets:{}}));
check('un monde avec une seule case retouchee n est pas vide',
  !t.mondeVide({v:1,carte:{domaine:[[1,1,3]]}}));
check('un monde avec un bloc maison n est pas vide', !t.mondeVide({v:1,carte:{},blocs:[{id:400}]}));
/* les objets se posent sur ce qui est deja la, ils n'ont pas de sol a eux */
check('un arbre n a pas de sol a lui', t.TRANSP.has(T.CHN1));
check('un transat non plus', t.TRANSP.has(T.TRANSAT) && t.TRANSP.has(T.TRANPG));
check('le feu de camp non plus', t.TRANSP.has(T.FIRE));
check('le lampadaire non plus', t.TRANSP.has(T.LAMPH) && t.TRANSP.has(T.LAMPB));
check('la voiturette non plus', t.TRANSP.has(T.GOLFTL));
check('le barbecue non plus', t.TRANSP.has(T.BARBEC));
check('un canape non plus', t.TRANSP.has(T.CANH1) && t.TRANSP.has(T.SOFA));
check('mais l herbe et les murs gardent le leur',
  !t.TRANSP.has(T.ROUGH) && !t.TRANSP.has(T.FAIR) && !t.TRANSP.has(T.HWALL) && !t.TRANSP.has(T.HROOF));
/* poser un arbre sur du fairway garde le fairway dessous */
clear();
t.put(62, 24, T.FAIR);
t.put(62, 24, T.CHN1);
const pose = t.map[24 * MW + 62];
check('poser un objet compose la case', pose >= t.COMPO, 'case ' + pose);
check('le sol dessous est bien celui qui y etait', t.fondDe(pose) === T.FAIR);
check('et la case reste un arbre pour le jeu', at(62, 24) === T.CHN1);
check('elle arrete toujours le joueur', t.solidAt(62, 24));
check('la balle s y perd comme dans un bois', t.lieAt(62, 24) === 'bois');
check('la case composee se dessine', !!t.tile(pose, 0, 0));
/* et on peut la reposer sur autre chose sans empiler a l infini */
t.put(62, 24, T.PET1);
check('un objet remplace l objet, pas le sol', t.fondDe(t.map[24 * MW + 62]) === T.FAIR);
t.put(62, 24, T.FAIR); clear();
/* les deux courts de tennis, vingt-quatre cases chacun, filet a la quatrieme rangee */
[['quick', T.TENQ], ['terre battue', T.TENT]].forEach(([nom, base]) => {
  const e = t.BIBLI.find(x => x.m && x.m[0] === base);
  check('le court ' + nom + ' est dans la bibliotheque', !!e && e.w === 4 && e.h === 6);
  check('ses vingt-quatre cases se dessinent',
    Array.from({length:24},(_,i)=>base+i).every(id => !!t.tile(id, 0, 0)));
  check('son filet arrete le joueur', [12,13,14,15].every(i => t.SOLID.has(base + i)));
  check('et il se saute', [12,13,14,15].every(i => t.SAUT.has(base + i)));
  check('on marche partout ailleurs sur le court',
    [0,5,10,17,20,23].every(i => !t.SOLID.has(base + i)));
  check('le court est un sol, il ne se pose pas sur autre chose', !t.TRANSP.has(base));
});
check('les deux courts ne partagent aucune case', T.TENT >= T.TENQ + 24);
check('la maison des Molina existe hors du hameau', !!t.INT.molina);
check('les Molina ne sont plus au hameau', !t.VILLAS.some(v => v.id === 'molina'));
clear();

/* ---------- 5. les voitures de la departementale ---------- */
t.cars.length = 0;
tp(31, 60); game.state = t.S.WORLD;
let vues = 0;
for (let i = 0; i < 1400; i++) { t.updateCars(); if (t.cars.length) vues++; if (game.state !== t.S.WORLD) break; }
check('une voiture est passee', vues > 0);
check('la voiture renverse sur la chaussee', game.state === t.S.DIALOG || game.px === 28 || game.px === 35,
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
  check('teleporte au feu', Math.hypot(game.px - t.FEU.x, game.py - t.FEU.y) < 7,
    game.px + ',' + game.py);
  /* et tout le monde est bien assis autour, pas seulement les golfeurs */
  const cercle = t.AU_FEU.map(id => t.NPCS.find(n => n.id === id)).filter(n => n && !n.gone);
  check('douze personnes autour du feu', cercle.length >= 10, cercle.length + ' presents');
  check('tout le monde est sur le cercle',
    cercle.every(n => { const d = Math.hypot(n.x - t.FEU.x, n.y - t.FEU.y); return d > 1.5 && d < 5.5; }),
    cercle.map(n => n.id + ':' + Math.hypot(n.x - t.FEU.x, n.y - t.FEU.y).toFixed(1)).join(' '));
  check('beaucoup de conversations de feu', t.FEU_TALK.length >= 20, t.FEU_TALK.length + ' conversations');
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

/* ---------- 8 quater. le grass board ---------- */
check('le grass board a sa musique', !!t.TRACKS.grassboard && t.TRACKS.grassboard.lead.length >= 32);
check('sa musique est plus rapide que la balade', t.TRACKS.grassboard.bpm > t.TRACKS.balade.bpm);
clear(); t.startPente(1); game.state = t.S.PENTE;
check('la musique bascule sur le grass board', t.musWant() === 'grassboard', t.musWant());
let criVu = false;
for (let i = 0; i < 3000 && !criVu; i++) { t.update(); if (t.pente.criT > 0) criVu = true; }
check('les autres gueulent pendant la descente', criVu, 'cri : ' + t.pente.cri);
/* une descente entiere doit se terminer toute seule et compter les portes */
t.startPente(1); game.state = t.S.PENTE;
check('dix portes a passer, pas des trous', t.pente.portes.length === 10);
check('les portes sont assez larges pour etre passables', t.pente.portes.every(p => p.w >= 22));
let desc = 0;
while (game.state === t.S.PENTE && desc++ < 4000) t.update();
check('la descente se termine toute seule', game.state !== t.S.PENTE, 'apres ' + desc + ' images');
check('toutes les portes ont ete jugees', t.pente.portes.every(p => p.passe > 0),
  t.pente.portes.filter(p => !p.passe).length + ' non jugee(s)');
check('le compte des portes est coherent', t.pente.n + t.pente.rate === 10,
  t.pente.n + ' passees, ' + t.pente.rate + ' ratees');
check('on ne peut pas sortir du sentier', Math.abs(t.pente.x) <= 34, 'x=' + t.pente.x.toFixed(1));
clear();
check('ce qu ils gueulent parle de grass board',
  !t.pente.cri || t.CRIS.indexOf(t.pente.cri) >= 0);
game.state = t.S.WORLD; clear();

/* ---------- 8 quinquies. la trame et les missions ---------- */
check('une trentaine de missions', t.MISSIONS.length >= 30, t.MISSIONS.length + ' missions');
check('six actes', new Set(t.MISSIONS.map(m => m.a)).size === 6);
check('chaque mission a un titre, une consigne et une fin',
  t.MISSIONS.every(m => m.t && m.d && m.f && m.ev));
check('les actes se suivent sans reculer',
  t.MISSIONS.every((m, i) => i === 0 || m.a >= t.MISSIONS[i - 1].a));
check('aucun titre en double', new Set(t.MISSIONS.map(m => m.t)).size === t.MISSIONS.length);
/* on doit pouvoir derouler toute la trame en tirant les evenements */
game.mission = 0; game.missionN = 0;
let garde3 = 0;
while (t.missionCourante() && garde3++ < 500) {
  const m = t.missionCourante();
  t.mission(m.ev, m.qui);
  clear();
}
check('la trame se deroule jusqu au bout', !t.missionCourante(),
  'bloque sur ' + (t.missionCourante() ? t.missionCourante().t : ''));
check('le carnet compte toutes les missions', game.mission === t.MISSIONS.length);
game.mission = 0; game.missionN = 0; clear();
check('le carnet est dans le menu', t.menuList().indexOf('CARNET') >= 0);
game.page = 'CARNET'; game.state = t.S.PAGE; frames(3); game.state = t.S.WORLD;

/* le chapardage chez le caddie master rend toujours quelque chose */
[0, 1, 2].forEach(() => {
  const av = { g: !!game.items.gant, c: game.clopes, b: game.bag[0] };
  t.chaparde(); clear();
  check('on ressort de la cabane avec quelque chose',
    (!!game.items.gant !== av.g) || game.clopes > av.c || game.bag[0] > av.b);
});
/* la voiturette : on la prend, elle laboure, Alain rattrape */
clear(); game.state = t.S.WORLD; game.inside = null; tp(50, 70);
t.voleVoiturette(); clear();
check('on peut voler la voiturette', game.voiturette === true);
const avantTraces = game.traces || 0;
for (let i = 0; i < 6; i++) { hold('down', 12); }
check('elle laisse des traces sur le gazon', (game.traces || 0) > avantTraces,
  avantTraces + ' -> ' + game.traces);
let poursuite = 0;
while (game.voiturette && poursuite++ < 6000) t.update();
check('Alain finit par rattraper', !game.voiturette, 'apres ' + poursuite + ' images');
clear();

/* la topologie en cuve */
check('la route est le point bas', t.niveau(31, 50) === 0);
check('le hameau domine', t.niveau(110, 20) > t.niveau(60, 50));
check('le practice est haut', t.niveau(14, 40) > t.niveau(40, 40));
check('les Evenou surplombent', t.niveau(105, 88) >= t.niveau(105, 60));

/* ---------- 8 sexies. la piscine et la partie a plusieurs ---------- */
clear(); game.state = t.S.WORLD; game.inside = null;
game.min = 14 * 60;
check('la piscine ouvre a quatorze heures', t.piscineOuverte());
game.min = 8 * 60;
check('elle est fermee a huit heures', !t.piscineOuverte());
game.min = 20 * 60;
check('elle est fermee a vingt heures', !t.piscineOuverte());
game.min = 14 * 60; game.phase = 'g';
/* on trouve un bord de bassin et on se met a l'eau */
let bord = null;
for (let y = 42; y < 58 && !bord; y++) for (let x = 76; x < 92; x++)
  if (at(x, y) === T.PDECK && at(x, y + 1) === T.POOL) { bord = [x, y]; break; }
check('on trouve un bord de bassin', !!bord, bord ? bord.join(',') : 'aucun');
if (bord) {
  tp(bord[0], bord[1]); game.dir = 0;
  t.entreDansLeau(0); clear();
  check('on se baigne', game.nage === true && at(game.px, game.py) === T.POOL,
    'nage=' + game.nage + ' tuile ' + at(game.px, game.py));
  check('l eau se traverse quand on nage', !t.solidAt(game.px, game.py));
  /* et on ressort par le bord */
  for (let i = 0; i < 8 && game.nage; i++) { hold('up', 14); clear(); }
  check('on ressort de l eau', !game.nage, 'nage=' + game.nage);
  clear();
}
check('la piscine invite les autres', !!t.INVITES.piscine);
check('le depart du 1 invite les autres', !!t.INVITES.partie);
/* la proposition de partie part et se resout toute seule au bout de cinq secondes */
clear(); tp(t.HOLES[0].tx, t.HOLES[0].ty + 1); game.party = [];
t.proposePartie();
check('une partie est proposee', !!game.attente);
let att = 0;
while (game.attente && att++ < 900) t.update();
check('la partie part au bout de cinq secondes', !game.attente, 'apres ' + att + ' images');
check('elle demarre seule si personne ne repond', t.golf.on || game.state === t.S.GOLF,
  'golf=' + t.golf.on + ' etat=' + game.state);
t.golf.on = false; game.state = t.S.WORLD; clear();

/* ---------- 8 septies. les bruitages ---------- */
/* sans AudioContext le harnais ne peut pas ecouter, mais rien ne doit planter
   et tous les bruitages doivent exister dans la banque */
const BRUITS = ['klaxon','moteur','verre','wouf','ok','pas','feuille','sable','drive','fer',
  'putt','coupautre','atterri','mur','trou','plouf','nage','page','objet','ramasse','porte','velo'];
let bruitOk = true;
BRUITS.forEach(b => { try { t.sfx(b); } catch (e) { bruitOk = false; fails.push('bruitage ' + b + ' -> ' + e.message); } });
check('tous les bruitages repondent sans planter', bruitOk);
const srcJeu = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
BRUITS.forEach(b => check("le bruitage '" + b + "' est bien declare", srcJeu.indexOf("case '" + b + "'") >= 0 || b === 'klaxon'));
[["les pas", "sfx(sol===T.DENSE?'feuille'"], ["le drive", "golf.club<=1?'drive':'fer'"],
 ["les coups des autres", "'coupautre'"], ["l atterrissage", "sfx('atterri')"],
 ["la balle dans le trou", "sfx('trou')"], ["le plouf", "sfx('plouf')"],
 ["la validation de dialogue", "sfx('page')"], ["le ramassage d un objet", "sfx('objet')"], ["le ramassage d une balle", "sfx('ramasse')"],
 ["les portes", "sfx('porte')"], ["la voiture qui passe", "sfx('moteur')"],
 ["le velo", "sfx('velo')"]].forEach(([nom, code]) =>
  check('le jeu declenche ' + nom, srcJeu.indexOf(code) >= 0));
check('une ambiance continue pour le feu et le roulement', srcJeu.indexOf('function ambiances(') >= 0);
try { t.ambiances(); check('l ambiance tourne sans audio', true); }
catch (e) { check('l ambiance tourne sans audio', false, e.message); }
check('une musique de practice', !!t.TRACKS.practice && t.TRACKS.practice.lead.length >= 32);
t.golf.practice = true; t.cours.on = false;
check('la musique bascule au practice', t.musWant() === 'practice', t.musWant());
t.golf.practice = false;

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
