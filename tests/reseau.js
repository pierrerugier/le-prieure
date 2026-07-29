/* ---------- la partie a quatre, avec un vrai serveur ----------
   On lance le serveur pour de bon, on ouvre quatre connexions, et on verifie
   que les quatre ecrans racontent exactement la meme partie. C'est la seule
   chose que le harnais solo ne peut pas prouver.

   node tests/reseau.js */
const { spawn } = require('child_process');
const path = require('path');
const WebSocket = require('ws');

const PORT = 8899;
const racine = path.join(__dirname, '..');
let ok = 0, ko = 0;
const fails = [];
function check(nom, cond, det) {
  if (cond) { ok++; return true; }
  ko++; fails.push(nom + (det ? ' -> ' + det : ''));
  return false;
}

const TROUS = [
  { n: 1, tx: 50, ty: 65, gx: 56, gy: 86, par: 4 },
  { n: 2, tx: 64, ty: 87, gx: 90, gy: 82, par: 4 }];
const NOMS = ['moi', 'charles', 'victor', 'oscar'];

const serveur = spawn('node', [path.join(racine, 'server', 'index.js')],
  { env: Object.assign({}, process.env, { PORT: String(PORT) }), stdio: 'ignore' });

const attends = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  await attends(1300);
  const ws = NOMS.map(() => new WebSocket('ws://localhost:' + PORT));
  const etats = [];
  const refus = [];
  await Promise.all(ws.map((w, i) => new Promise(r => {
    w.on('open', r);
    w.on('message', d => {
      try { const m = JSON.parse(d); if (m.t === 'golf') { etats[i] = m.p; if (m.refus) refus[i] = m.refus; } } catch (e) {}
    });
  })));
  check('les quatre se connectent', ws.every(w => w.readyState === 1));

  const dis = (i, o) => ws[i].send(JSON.stringify(o));
  /* chacun prend son personnage : sans ca le serveur ne sait pas qui parle */
  NOMS.forEach((pk, i) => dis(i, { t: 'claim', pk: pk, x: 50, y: 60, inside: null }));
  await attends(300);

  dis(0, { t: 'golf', a: 'ouvre', pk: 'moi', nom: 'PIERRE', trous: TROUS });
  await attends(200);
  check('la partie est ouverte', etats[0] && etats[0].ouvert === 1);

  for (let k = 1; k < 4; k++) dis(k, { t: 'golf', a: 'rejoint', id: etats[0] && etats[0].id, nom: NOMS[k].toUpperCase() });
  await attends(250);
  check('quatre joueurs inscrits', etats[0] && etats[0].joueurs.length === 4,
    etats[0] ? etats[0].joueurs.length + '' : 'aucun etat');

  /* un cinquieme ne rentre pas */
  const cinq = new WebSocket('ws://localhost:' + PORT);
  await new Promise(r => cinq.on('open', r));
  let refus5 = null;
  cinq.on('message', d => { try { const m = JSON.parse(d); if (m.t === 'golf' && m.refus) refus5 = m.refus; } catch (e) {} });
  cinq.send(JSON.stringify({ t: 'claim', pk: 'louis', x: 50, y: 60, inside: null }));
  await attends(200);
  cinq.send(JSON.stringify({ t: 'golf', a: 'rejoint', id: etats[0].id, nom: 'LOUIS' }));
  await attends(300);
  check('le cinquieme est refuse', refus5 === 'complet', String(refus5));

  dis(0, { t: 'golf', a: 'lance', pk: 'moi' });
  await attends(250);
  const e = etats.filter(Boolean);
  check('les quatre voient la partie', e.length === 4, e.length + ' etats');
  check('tout le monde voit quatre joueurs', e.every(x => x.joueurs.length === 4));
  check('tout le monde attend le meme joueur', new Set(e.map(x => x.tour)).size === 1,
    'tours ' + e.map(x => x.tour).join(','));
  check('la partie est fermee', e.every(x => x.ouvert === 0));

  const tour = e[0].tour;
  const mauvais = (tour === 0) ? 1 : 0;
  dis(mauvais, { t: 'golf', a: 'coup', seq: etats[0].seq, bx: 60, by: 70, coups: 1, lie: 'fairway' });
  await attends(200);
  check('un coup joue hors de son tour est ignore',
    etats[0].tour === tour && etats[0].joueurs[mauvais].coups === 0,
    'tour ' + etats[0].tour + ' coups ' + etats[0].joueurs[mauvais].coups);

  dis(tour, { t: 'golf', a: 'coup', seq: etats[0].seq, bx: 56.5, by: 80, coups: 1, lie: 'fairway' });
  await attends(200);
  check('le coup du bon joueur compte', etats[0].joueurs[tour].coups === 1);
  check('la main passe a quelqu un d autre', etats[0].tour !== tour, 'tour ' + etats[0].tour);
  check('les quatre ecrans racontent la meme partie',
    new Set(etats.filter(Boolean).map(x => JSON.stringify(x.joueurs.map(j => [j.pk, j.bx, j.by, j.coups])))).size === 1);

  /* celui dont c'est le tour ferme son onglet : il est hors ligne, pas dehors */
  const parti = etats[0].tour;
  ws[parti].close();
  await attends(500);
  const e2 = etats.filter((x, i) => x && i !== parti);
  check('une coupure ne fait pas sortir de la partie',
    e2.length && e2[0].joueurs[parti].hs === 1 && e2[0].joueurs[parti].parti === 0,
    e2.length ? ('hs ' + e2[0].joueurs[parti].hs + ' parti ' + e2[0].joueurs[parti].parti) : 'aucun etat');
  check('et la main passe a quelqu un de present',
    e2.length && e2[0].tour !== parti, e2.length ? ('tour ' + e2[0].tour) : '');
  /* il revient : il retrouve sa place et sa balle */
  const revenu = new WebSocket('ws://localhost:' + PORT);
  let etatRevenu = null;
  await new Promise(r => revenu.on('open', r));
  revenu.on('message', d => { try { const m = JSON.parse(d); if (m.t === 'golf') etatRevenu = m.p; } catch (e) {} });
  revenu.send(JSON.stringify({ t: 'claim', pk: NOMS[parti], x: 50, y: 60, inside: null }));
  await attends(400);
  check('en revenant, on retrouve sa partie',
    etatRevenu && etatRevenu.joueurs[parti].hs === 0 && etatRevenu.joueurs[parti].parti === 0,
    etatRevenu ? JSON.stringify(etatRevenu.joueurs[parti]).slice(0, 90) : 'aucun etat');
  revenu.close();
  await attends(300);
  /* il s en va pour de bon */
  const sort = new WebSocket('ws://localhost:' + PORT);
  await new Promise(r => sort.on('open', r));
  sort.send(JSON.stringify({ t: 'claim', pk: NOMS[parti], x: 50, y: 60, inside: null }));
  await attends(250);
  sort.send(JSON.stringify({ t: 'golf', a: 'quitte' }));
  await attends(300);
  const e2b = etats.filter((x, i) => x && i !== parti);
  check('quitter pour de bon, c est parti pour de bon',
    e2b.length && e2b[0].joueurs[parti].parti === 1,
    e2b.length ? ('parti ' + e2b[0].joueurs[parti].parti) : 'aucun etat');
  check('sa carte est bouchee au score maximum',
    e2b.length && (e2b[0].joueurs[parti].carte || []).length === TROUS.length,
    e2b.length ? JSON.stringify(e2b[0].joueurs[parti].carte) : '');
  sort.close();

  /* tout le monde rentre la balle : on passe au trou suivant */
  for (let k = 0; k < 4; k++) {
    if (k === parti) continue;
    const t = etats.find((x, i) => x && i !== parti).tour;
    const st = etats.find((x, i) => x && i !== parti);
    dis(t, { t: 'golf', a: 'coup', seq: st.seq, bx: TROUS[0].gx + 0.5, by: TROUS[0].gy + 0.5, coups: 3, lie: 'green', fini: 1 });
    await attends(160);
  }
  const e3 = etats.find((x, i) => x && i !== parti);
  check('on passe au trou suivant quand tout le monde a fini', e3 && e3.trou === 1,
    e3 ? 'trou ' + e3.trou : 'aucun etat');
  check('les cartes sont remplies', e3 && e3.joueurs.some(j => (j.carte || []).length),
    e3 ? JSON.stringify(e3.joueurs.map(j => j.carte)) : '');

  /* ---------- la phrase de B passe d'un ecran a l'autre ---------- */
  const dits = [];
  ws.forEach((w, i) => w.on('message', d => {
    try { const m = JSON.parse(d); if (m.t === 'dit') dits.push({ pour: i, de: m.de, vers: m.vers, i: m.i }); } catch (e) {}
  }));
  const vivant = ws.findIndex((w, i) => i !== parti && w.readyState === 1);
  const cible = ws.findIndex((w, i) => i !== parti && i !== vivant && w.readyState === 1);
  if (vivant >= 0 && cible >= 0) {
    ws[vivant].send(JSON.stringify({ t: 'dit', de: NOMS[vivant], vers: NOMS[cible], i: 2 }));
    await attends(250);
    check('la phrase arrive chez le copain vise',
      dits.some(x => x.pour === cible && x.de === NOMS[vivant] && x.vers === NOMS[cible] && x.i === 2),
      JSON.stringify(dits));
    check('celui qui parle ne se la renvoie pas a lui-meme',
      !dits.some(x => x.pour === vivant));
  }

  /* ---------- deux parties en meme temps ----------
     On libere d'abord les personnages de la premiere partie, sinon le serveur
     a raison de refuser : on ne joue pas deux parties a la fois. */
  for (let i = 0; i < ws.length; i++) {
    if (i === parti || ws[i].readyState !== 1) continue;
    ws[i].send(JSON.stringify({ t: 'golf', a: 'quitte' }));
  }
  await attends(400);
  ws.forEach(w => { try { w.close(); } catch (e) {} });
  await attends(500);
  /* louis a ete pris par le cinquieme client plus haut, on prend paul */
  const G = ['charles', 'victor', 'oscar', 'antoine', 'kuperfils', 'paul'];
  const w2 = G.map(() => new WebSocket('ws://localhost:' + PORT));
  const e6 = [];
  await Promise.all(w2.map((w, i) => new Promise(r => {
    w.on('open', r);
    w.on('message', d => { try { const m = JSON.parse(d); if (m.t === 'golf' && m.p) e6[i] = m.p; } catch (e) {} });
  })));
  G.forEach((pk, i) => w2[i].send(JSON.stringify({ t: 'claim', pk: pk, x: 50, y: 60, inside: null })));
  await attends(400);
  /* le premier groupe de trois ouvre sa partie */
  w2[0].send(JSON.stringify({ t: 'golf', a: 'ouvre', nom: 'CHARLES', trous: TROUS }));
  await attends(250);
  const idA = e6[0] && e6[0].id;
  for (const k of [1, 2]) w2[k].send(JSON.stringify({ t: 'golf', a: 'rejoint', id: idA, nom: G[k] }));
  await attends(300);
  /* le second groupe ouvre la sienne pendant que la premiere tourne encore */
  w2[3].send(JSON.stringify({ t: 'golf', a: 'ouvre', nom: 'ANTOINE', trous: TROUS }));
  await attends(250);
  const idB = e6[3] && e6[3].id;
  check('une seconde partie peut s ouvrir', !!idB && idB !== idA, 'A=' + idA + ' B=' + idB);
  for (const k of [4, 5]) w2[k].send(JSON.stringify({ t: 'golf', a: 'rejoint', id: idB, nom: G[k] }));
  await attends(300);
  check('trois joueurs dans la premiere', e6[0] && e6[0].joueurs.length === 3,
    e6[0] ? e6[0].joueurs.length + '' : 'aucun');
  check('trois joueurs dans la seconde', e6[3] && e6[3].joueurs.length === 3,
    e6[3] ? e6[3].joueurs.length + '' : 'aucun');
  check('les deux groupes ne se melangent pas',
    e6[0] && e6[3] && e6[0].joueurs.every(j => !e6[3].joueurs.some(k => k.pk === j.pk)),
    e6[0] && e6[3] ? (e6[0].joueurs.map(j => j.pk).join(',') + ' | ' + e6[3].joueurs.map(j => j.pk).join(',')) : '');
  /* et chacune se lance de son cote */
  w2[0].send(JSON.stringify({ t: 'golf', a: 'lance' }));
  w2[3].send(JSON.stringify({ t: 'golf', a: 'lance' }));
  await attends(350);
  check('les deux parties tournent en meme temps',
    e6[0] && e6[3] && e6[0].ouvert === 0 && e6[3].ouvert === 0 && e6[0].id !== e6[3].id);
  check('chacun ne voit que sa partie',
    e6[1] && e6[1].id === idA && e6[4] && e6[4].id === idB,
    (e6[1] ? e6[1].id : '?') + ' / ' + (e6[4] ? e6[4].id : '?'));
  /* on ne joue pas dans la partie des autres */
  const tourA = e6[0].tour;
  w2[3].send(JSON.stringify({ t: 'golf', a: 'coup', seq: e6[0].seq, bx: 60, by: 70, coups: 1, lie: 'fairway' }));
  await attends(250);
  check('un joueur de l autre partie ne peut rien y faire', e6[0].tour === tourA,
    'tour ' + e6[0].tour + ' au lieu de ' + tourA);
  w2.forEach(w => { try { w.close(); } catch (e) {} });

  serveur.kill();
  console.log('\n  ' + ok + ' verifications reseau passees, ' + ko + ' echec(s).');
  if (fails.length) { console.log('\n  Echecs :'); fails.forEach(f => console.log('   - ' + f)); }
  process.exit(ko ? 1 : 0);
})().catch(e => { serveur.kill(); console.error(e); process.exit(1); });
