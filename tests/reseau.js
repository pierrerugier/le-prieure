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
  await Promise.all(ws.map((w, i) => new Promise(r => {
    w.on('open', r);
    w.on('message', d => { try { const m = JSON.parse(d); if (m.t === 'golf') etats[i] = m.p; } catch (e) {} });
  })));
  check('les quatre se connectent', ws.every(w => w.readyState === 1));

  const dis = (i, o) => ws[i].send(JSON.stringify(o));

  dis(0, { t: 'golf', a: 'ouvre', pk: 'moi', nom: 'PIERRE', trous: TROUS });
  await attends(200);
  check('la partie est ouverte', etats[0] && etats[0].ouvert === 1);

  for (let k = 1; k < 4; k++) dis(k, { t: 'golf', a: 'rejoint', pk: NOMS[k], nom: NOMS[k].toUpperCase() });
  await attends(250);
  check('quatre joueurs inscrits', etats[0] && etats[0].joueurs.length === 4,
    etats[0] ? etats[0].joueurs.length + '' : 'aucun etat');

  /* un cinquieme ne rentre pas */
  const cinq = new WebSocket('ws://localhost:' + PORT);
  await new Promise(r => cinq.on('open', r));
  let refus = null;
  cinq.on('message', d => { try { const m = JSON.parse(d); if (m.t === 'golf' && m.refus) refus = m.refus; } catch (e) {} });
  cinq.send(JSON.stringify({ t: 'golf', a: 'rejoint', pk: 'louis', nom: 'LOUIS' }));
  await attends(250);
  check('le cinquieme est refuse', refus === 'complet', String(refus));
  cinq.close();

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
  dis(mauvais, { t: 'golf', a: 'coup', bx: 60, by: 70, coups: 1, lie: 'fairway' });
  await attends(200);
  check('un coup joue hors de son tour est ignore',
    etats[0].tour === tour && etats[0].joueurs[mauvais].coups === 0,
    'tour ' + etats[0].tour + ' coups ' + etats[0].joueurs[mauvais].coups);

  dis(tour, { t: 'golf', a: 'coup', bx: 56.5, by: 80, coups: 1, lie: 'fairway' });
  await attends(200);
  check('le coup du bon joueur compte', etats[0].joueurs[tour].coups === 1);
  check('la main passe a quelqu un d autre', etats[0].tour !== tour, 'tour ' + etats[0].tour);
  check('les quatre ecrans racontent la meme partie',
    new Set(etats.filter(Boolean).map(x => JSON.stringify(x.joueurs.map(j => [j.pk, j.bx, j.by, j.coups])))).size === 1);

  /* celui dont c'est le tour ferme son onglet : la partie continue */
  const parti = etats[0].tour;
  ws[parti].close();
  await attends(400);
  const e2 = etats.filter((x, i) => x && i !== parti);
  check('quand quelqu un s en va, la partie continue',
    e2.length && e2[0].tour !== parti && e2[0].joueurs[parti].parti === 1,
    e2.length ? ('tour ' + e2[0].tour + ' parti ' + e2[0].joueurs[parti].parti) : 'aucun etat');

  /* tout le monde rentre la balle : on passe au trou suivant */
  for (let k = 0; k < 4; k++) {
    if (k === parti) continue;
    const t = etats.find((x, i) => x && i !== parti).tour;
    dis(t, { t: 'golf', a: 'coup', bx: TROUS[0].gx + 0.5, by: TROUS[0].gy + 0.5, coups: 3, lie: 'green', fini: 1 });
    await attends(160);
  }
  const e3 = etats.find((x, i) => x && i !== parti);
  check('on passe au trou suivant quand tout le monde a fini', e3 && e3.trou === 1,
    e3 ? 'trou ' + e3.trou : 'aucun etat');
  check('les cartes sont remplies', e3 && e3.joueurs.some(j => (j.carte || []).length),
    e3 ? JSON.stringify(e3.joueurs.map(j => j.carte)) : '');

  ws.forEach(w => { try { w.close(); } catch (e) {} });
  serveur.kill();
  console.log('\n  ' + ok + ' verifications reseau passees, ' + ko + ' echec(s).');
  if (fails.length) { console.log('\n  Echecs :'); fails.forEach(f => console.log('   - ' + f)); }
  process.exit(ko ? 1 : 0);
})().catch(e => { serveur.kill(); console.error(e); process.exit(1); });
