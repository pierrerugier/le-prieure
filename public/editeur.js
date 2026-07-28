/* L'ATELIER DU PRIEURE
   Un editeur qui tourne dans la meme page que le jeu, sur /editeur. Il travaille
   sur les memes objets : la carte, le cache de tuiles, les fiches et les poses.
   Rien n'est duplique, donc ce qu'on voit ici est exactement ce que le jeu dessine.

   Ce qu'on enregistre n'est jamais la carte entiere, seulement l'ecart avec ce que
   le code fabrique. Vider le fichier remet tout d'aplomb. */
(function(){
'use strict';
const A=window.__PRIEURE__;
if(!A){document.body.innerHTML='<p style="padding:40px;font:14px sans-serif">Le jeu ne s\'est pas chargé.</p>';return;}
const TS=A.TS, T=A.T;

/* ---------- le squelette ---------- */
document.title="L'atelier du Prieuré";
const CSS=`
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:#14161c;color:#e6e8ef;
  font:13px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
  -webkit-user-select:none;user-select:none;overflow:hidden}
#ed{display:flex;flex-direction:column;height:100vh}
header{display:flex;align-items:center;gap:12px;padding:0 16px 0 14px;height:46px;flex:0 0 46px;
  background:#1b1e26;border-bottom:1px solid #2b2f3a}
header .titre{font-weight:700;letter-spacing:.13em;font-size:11px;color:#f4e2a8;text-transform:uppercase}
nav{display:flex;gap:2px}
nav button{background:none;border:0;color:#98a0b0;padding:7px 13px;border-radius:6px;
  font:inherit;font-weight:600;cursor:pointer}
nav button:hover{background:#242833;color:#e6e8ef}
nav button.on{background:#31384a;color:#fff}
header .droite{margin-left:auto;display:flex;align-items:center;gap:8px}
#etat{font-size:11px;color:#7f8798;min-width:130px;text-align:right}
button.b,label.b,a.b{background:#2c3240;border:1px solid #3a4152;color:#dfe3ec;border-radius:6px;
  padding:6px 11px;font:inherit;cursor:pointer;text-decoration:none;white-space:nowrap;line-height:1.2}
button.b:hover,label.b:hover,a.b:hover{background:#39415a}
button.b.vert{background:#2f6b45;border-color:#3d8a5a;color:#eafff2}
button.b.vert:hover{background:#3a8455}
button.b.rouge{background:#5e2f34;border-color:#7c3b42}
button.b:disabled{opacity:.4;cursor:default}
main{flex:1;display:flex;min-height:0}
aside{background:#1b1e26;overflow-y:auto;flex:0 0 auto}
#outils{width:158px;border-right:1px solid #2b2f3a;padding:10px}
#pan{width:266px;border-left:1px solid #2b2f3a;padding:10px}
#vue{flex:1;position:relative;background:#0d0f13;overflow:hidden;min-width:0}
#cv{position:absolute;inset:0;width:100%;height:100%;cursor:crosshair;
  image-rendering:pixelated;image-rendering:crisp-edges}
#infos{position:absolute;left:10px;bottom:10px;background:rgba(12,14,18,.82);
  border:1px solid #2b2f3a;border-radius:6px;padding:5px 9px;font-size:11px;color:#aeb6c6;
  pointer-events:none;font-variant-numeric:tabular-nums}
h4{margin:14px 0 6px;font-size:10px;letter-spacing:.13em;color:#7f8798;text-transform:uppercase}
h4:first-child{margin-top:2px}
.grille{display:grid;gap:4px}
.o{display:grid;grid-template-columns:1fr 1fr;gap:4px}
.o button{background:#252a35;border:1px solid #333a49;color:#c6ccda;border-radius:5px;
  padding:6px 4px;font:inherit;font-size:11px;cursor:pointer}
.o button.on{background:#3d5a8a;border-color:#5679b5;color:#fff}
select,input[type=text],input[type=number]{width:100%;background:#252a35;border:1px solid #333a49;
  color:#e6e8ef;border-radius:5px;padding:6px;font:inherit}
input[type=range]{width:100%}
.blocs{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
.bloc{position:relative;background:#22262f;border:2px solid transparent;border-radius:5px;
  padding:3px 2px 12px;cursor:pointer;text-align:center}
.bloc:hover{background:#2d323e}
.bloc.on{border-color:#f4e2a8;background:#333a49}
.bloc canvas{width:100%;height:auto;aspect-ratio:1;image-rendering:pixelated;border-radius:3px;display:block}
.bloc i{position:absolute;left:0;right:0;bottom:1px;font-style:normal;font-size:8px;color:#98a0b0;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 2px}
.bloc.retouche i{color:#f4e2a8}
.ligne{display:flex;align-items:center;gap:7px;margin:5px 0}
.ligne label{flex:1;font-size:12px;color:#aeb6c6}
.ligne input[type=color]{width:38px;height:26px;padding:0;border:1px solid #333a49;
  border-radius:4px;background:#252a35;cursor:pointer}
.aide{font-size:11px;color:#79808f;line-height:1.6;margin-top:10px}
.aide b{color:#aeb6c6;font-weight:600}
kbd{background:#252a35;border:1px solid #3a4152;border-radius:3px;padding:0 4px;font-size:10px}
#pixels{display:grid;gap:0;background:#333a49;border:2px solid #333a49;border-radius:4px;
  width:min(52vh,440px);aspect-ratio:1;margin:0 auto;flex:0 0 auto}
#pixels div{background-size:12px 12px;cursor:crosshair}
#pixels div:hover{outline:1px solid #f4e2a8;outline-offset:-1px;z-index:2}
.centre{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;
  height:100%;gap:12px;padding:16px 16px 28px;overflow-y:auto}
.nuancier{display:flex;flex-wrap:wrap;gap:4px;max-width:520px;justify-content:center}
.nuancier button{width:26px;height:26px;border-radius:4px;border:2px solid #333a49;cursor:pointer;padding:0}
.nuancier button.on{border-color:#f4e2a8}
.poses{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}
.pose{text-align:center}
.pose canvas{background:#2a3b28;border-radius:5px;image-rendering:pixelated;display:block}
.poses{max-width:100%}
.pose span{font-size:10px;color:#7f8798}
.pers{display:flex;align-items:center;gap:8px;width:100%;background:#22262f;border:1px solid #2b2f3a;
  border-radius:5px;padding:4px 8px;margin-bottom:3px;cursor:pointer;color:#c6ccda;font:inherit}
.pers:hover{background:#2d323e}
.pers.on{background:#3d5a8a;border-color:#5679b5;color:#fff}
.pers canvas{image-rendering:pixelated}
.form{width:min(760px,100%);display:flex;flex-direction:column;gap:9px}
textarea{width:100%;background:#252a35;border:1px solid #333a49;color:#e6e8ef;
  border-radius:5px;padding:8px;font:inherit;line-height:1.5;resize:vertical;display:block}
textarea::placeholder{color:#6b7385}
.champ{display:flex;flex-direction:column;gap:3px}
.champ>span{font-size:10px;letter-spacing:.13em;color:#7f8798;text-transform:uppercase}
.rangee{display:flex;gap:8px}
.rangee>*{flex:1}
.replique{background:#1b1e26;border:1px solid #2b2f3a;border-radius:6px;padding:8px}
.replique .haut{display:flex;align-items:center;gap:8px;margin-bottom:5px}
.replique .haut span{font-size:10px;letter-spacing:.13em;color:#7f8798;text-transform:uppercase;flex:1}
.entree{display:block;width:100%;background:#22262f;border:1px solid #2b2f3a;border-radius:5px;
  padding:6px 9px;margin-bottom:3px;cursor:pointer;color:#c6ccda;font:inherit;text-align:left;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.entree:hover{background:#2d323e}
.entree.on{background:#3d5a8a;border-color:#5679b5;color:#fff}
.entree.retouche{border-left:3px solid #f4e2a8}
.mis{background:#1b1e26;border:1px solid #2b2f3a;border-radius:6px;margin-bottom:5px;overflow:hidden}
.mis .tete{display:flex;align-items:center;gap:8px;padding:7px 10px;cursor:pointer}
.mis .tete:hover{background:#22262f}
.mis.on .tete{background:#2b3242}
.mis .num{font-size:10px;color:#7f8798;width:22px;font-variant-numeric:tabular-nums}
.mis .tit{flex:1;font-weight:600}
.mis .ev{font-size:10px;color:#8fb0d8;background:#232a38;border-radius:3px;padding:2px 6px}
.mis .corps{padding:0 10px 10px;display:flex;flex-direction:column;gap:8px}
.mis .fleches button{background:none;border:0;color:#7f8798;cursor:pointer;font-size:13px;padding:2px 4px}
.mis .fleches button:hover{color:#e6e8ef}
.acte{font-size:10px;letter-spacing:.15em;color:#f4e2a8;text-transform:uppercase;margin:14px 0 5px}
.prog{width:min(760px,100%);background:#1b2432;border:1px solid #2f4159;border-radius:8px;padding:12px}
.prog h3{margin:0 0 8px;font-size:11px;letter-spacing:.13em;color:#8fb0d8;text-transform:uppercase}
.prog textarea{min-height:74px}
.apercu{background:#16241b;border:1px solid #2c5e3a;border-radius:6px;padding:10px;margin-top:9px}
.apercu .m{border-bottom:1px solid #234;padding:5px 0}
.apercu .m:last-child{border:0}
.mot{color:#8de08d}
`;
const st=document.createElement('style'); st.textContent=CSS; document.head.appendChild(st);
document.body.innerHTML=`
<div id="ed">
  <header>
    <span class="titre">L'atelier</span>
    <nav>
      <button data-ong="carte" class="on">Carte</button>
      <button data-ong="blocs">Blocs</button>
      <button data-ong="persos">Personnages</button>
      <button data-ong="textes">Textes</button>
      <button data-ong="trame">Trame</button>
    </nav>
    <div class="droite">
      <span id="etat"></span>
      <button class="b" id="bExport">Exporter</button>
      <label class="b">Importer<input type="file" id="fImport" accept=".json" hidden></label>
      <button class="b vert" id="bSave">Enregistrer</button>
      <a class="b" href="/" style="text-decoration:none">Jouer</a>
    </div>
  </header>
  <main>
    <aside id="outils"></aside>
    <div id="vue"><canvas id="cv"></canvas><div id="infos"></div></div>
    <aside id="pan"></aside>
  </main>
</div>`;

const $=s=>document.querySelector(s);
const vue=$('#vue'), cv=$('#cv'), cx=cv.getContext('2d'), infos=$('#infos');
const outils=$('#outils'), pan=$('#pan'), etat=$('#etat');

/* ---------- l'etat de l'atelier ---------- */
const NOMS_T={}; Object.keys(T).forEach(k=>{NOMS_T[T[k]]=k;});
const CARTES=[{id:'domaine',n:'LE DOMAINE'}].concat(
  Object.keys(A.INT).map(k=>({id:k,n:A.INT[k].name})));
const ed={
  ong:'carte', carte:'domaine', outil:'pinceau', taille:1, bloc:T.ROUGH,
  z:6, camx:0, camy:0, grille:false, solides:false,
  presse:false, pan:false, panx:0, pany:0, sauve:true,
  hist:[], futur:[], trait:null,
  couleur:'#7cb85c', lettre:'K', blocEdit:-1, perso:'moi', partie:'BODY_DOWN',
  cat:'pnj', sel:null, misOuv:-1, prog:'', progRep:null, progEnCours:false, apres:-1
};

/* Les personnages se deplacent tout seuls quand le jeu tourne. On ne peut donc pas
   deviner une retouche en comparant les positions : on note ce qui est modifie ici,
   en partant de ce qui etait deja enregistre. */
const clonage=o=>JSON.parse(JSON.stringify(o||{}));
const patchPnj=clonage((A.monde||{}).pnj), patchObj=clonage((A.monde||{}).objets);
function notePnj(id,champ,val){if(!patchPnj[id])patchPnj[id]={};patchPnj[id][champ]=val;}
function noteObj(id,champ,val){if(!patchObj[id])patchObj[id]={};patchObj[id][champ]=val;}
function dit(m,ok){etat.textContent=m;etat.style.color=ok?'#8de08d':'#7f8798';}
function sale(){ed.sauve=false;dit('Modifié, pas encore enregistré.');}

/* ---------- le rendu de la carte ---------- */
let planche=null, planCarte=null;
function dims(nom){
  if(nom==='domaine')return {w:A.MW,h:A.MH};
  const I=A.INT[nom]; return {w:I.w,h:I.h};
}
function tuileA(nom,x,y){
  const c=A.carteDe(nom); return c.m[y*c.w+x];
}
function poseTuile(nom,x,y,t){
  const c=A.carteDe(nom); c.m[y*c.w+x]=t;
}
function batPlanche(){
  const d=dims(ed.carte);
  planche=document.createElement('canvas');
  planche.width=d.w*TS; planche.height=d.h*TS;
  planCarte=planche.getContext('2d');
  planCarte.imageSmoothingEnabled=false;
  for(let y=0;y<d.h;y++)for(let x=0;x<d.w;x++)peintCase(x,y);
}
function peintCase(x,y){
  const t=tuileA(ed.carte,x,y);
  planCarte.clearRect(x*TS,y*TS,TS,TS);
  planCarte.drawImage(A.tile(t,A.tv(x,y,t),0),x*TS,y*TS);
}
function cadre(){
  const d=dims(ed.carte);
  ed.z=Math.max(1,Math.min(cv.width/d.w,cv.height/d.h));
  ed.camx=(d.w-cv.width/ed.z)/2; ed.camy=(d.h-cv.height/ed.z)/2;
}
function dessine(){
  const r=vue.getBoundingClientRect();
  if(cv.width!==(r.width|0)||cv.height!==(r.height|0)){
    cv.width=r.width|0;cv.height=r.height|0;
    if(!ed.cadre&&cv.width>10){ed.cadre=true;cadre();}
  }
  cx.imageSmoothingEnabled=false;
  cx.fillStyle='#0d0f13'; cx.fillRect(0,0,cv.width,cv.height);
  if(ed.ong!=='carte'||!planche)return;
  const z=ed.z, d=dims(ed.carte);
  cx.drawImage(planche,0,0,planche.width,planche.height,
    Math.round(-ed.camx*z),Math.round(-ed.camy*z),Math.round(d.w*z),Math.round(d.h*z));
  /* le quadrillage, seulement quand on est assez pres pour le lire */
  if(ed.grille&&z>=8){
    cx.strokeStyle='rgba(255,255,255,.10)';cx.lineWidth=1;cx.beginPath();
    const x0=Math.floor(ed.camx), x1=Math.ceil(ed.camx+cv.width/z);
    const y0=Math.floor(ed.camy), y1=Math.ceil(ed.camy+cv.height/z);
    for(let x=x0;x<=x1;x++){const sx=Math.round((x-ed.camx)*z)+.5;cx.moveTo(sx,0);cx.lineTo(sx,cv.height);}
    for(let y=y0;y<=y1;y++){const sy=Math.round((y-ed.camy)*z)+.5;cx.moveTo(0,sy);cx.lineTo(cv.width,sy);}
    cx.stroke();
  }
  /* les cases ou l'on ne passe pas */
  if(ed.solides){
    const x0=Math.max(0,Math.floor(ed.camx)), x1=Math.min(d.w,Math.ceil(ed.camx+cv.width/z));
    const y0=Math.max(0,Math.floor(ed.camy)), y1=Math.min(d.h,Math.ceil(ed.camy+cv.height/z));
    cx.fillStyle='rgba(216,64,47,.34)';
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)
      if(A.SOLID.has(tuileA(ed.carte,x,y)))
        cx.fillRect(Math.round((x-ed.camx)*z),Math.round((y-ed.camy)*z),Math.ceil(z),Math.ceil(z));
  }
  /* ce qui a ete retouche depuis le dessin d'origine */
  const base=A.BASE[ed.carte];
  if(base){
    const x0=Math.max(0,Math.floor(ed.camx)), x1=Math.min(d.w,Math.ceil(ed.camx+cv.width/z));
    const y0=Math.max(0,Math.floor(ed.camy)), y1=Math.min(d.h,Math.ceil(ed.camy+cv.height/z));
    cx.strokeStyle='rgba(244,226,168,.75)';cx.lineWidth=1;
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)
      if(base[y*d.w+x]!==tuileA(ed.carte,x,y))
        cx.strokeRect(Math.round((x-ed.camx)*z)+.5,Math.round((y-ed.camy)*z)+.5,Math.ceil(z)-1,Math.ceil(z)-1);
  }
  /* le curseur */
  if(ed.sx!=null){
    const n=ed.taille, o=(n-1)>>1;
    cx.strokeStyle='#f4e2a8';cx.lineWidth=2;
    cx.strokeRect(Math.round((ed.sx-o-ed.camx)*z)+1,Math.round((ed.sy-o-ed.camy)*z)+1,z*n-2,z*n-2);
  }
}
function boucle(){dessine();requestAnimationFrame(boucle);}

/* ---------- l'outillage de la carte ---------- */
function caseSous(e){
  const r=cv.getBoundingClientRect();
  const x=Math.floor((e.clientX-r.left)/ed.z+ed.camx);
  const y=Math.floor((e.clientY-r.top)/ed.z+ed.camy);
  return {x:x,y:y};
}
function poseAvecHisto(x,y,t){
  const d=dims(ed.carte);
  if(x<0||y<0||x>=d.w||y>=d.h)return;
  const av=tuileA(ed.carte,x,y);
  if(av===t)return;
  if(ed.trait)ed.trait.push({x:x,y:y,av:av,ap:t});
  poseTuile(ed.carte,x,y,t);
  peintCase(x,y);
  sale();
}
function pinceau(x,y,t){
  const n=ed.taille, o=(n-1)>>1;
  for(let j=0;j<n;j++)for(let i=0;i<n;i++)poseAvecHisto(x-o+i,y-o+j,t);
}
function remplis(x,y,t){
  const d=dims(ed.carte), cible=tuileA(ed.carte,x,y);
  if(cible===t)return;
  const pile=[[x,y]], vu=new Set();
  let garde=0;
  while(pile.length&&garde++<40000){
    const[px,py]=pile.pop(), k=py*d.w+px;
    if(px<0||py<0||px>=d.w||py>=d.h||vu.has(k))continue;
    if(tuileA(ed.carte,px,py)!==cible)continue;
    vu.add(k); poseAvecHisto(px,py,t);
    pile.push([px+1,py],[px-1,py],[px,py+1],[px,py-1]);
  }
}
function rectangle(x0,y0,x1,y1,t){
  const ax=Math.min(x0,x1),bx=Math.max(x0,x1),ay=Math.min(y0,y1),by=Math.max(y0,y1);
  for(let y=ay;y<=by;y++)for(let x=ax;x<=bx;x++)poseAvecHisto(x,y,t);
}
function debutTrait(){ed.trait=[];}
function finTrait(){
  if(ed.trait&&ed.trait.length){ed.hist.push({carte:ed.carte,cases:ed.trait});ed.futur.length=0;
    if(ed.hist.length>120)ed.hist.shift();}
  ed.trait=null; majOutils();
}
function annule(){
  const h=ed.hist.pop(); if(!h)return;
  if(h.carte!==ed.carte){ed.carte=h.carte;batPlanche();}
  h.cases.slice().reverse().forEach(c=>{poseTuile(h.carte,c.x,c.y,c.av);peintCase(c.x,c.y);});
  ed.futur.push(h); sale(); majOutils();
}
function refais(){
  const h=ed.futur.pop(); if(!h)return;
  if(h.carte!==ed.carte){ed.carte=h.carte;batPlanche();}
  h.cases.forEach(c=>{poseTuile(h.carte,c.x,c.y,c.ap);peintCase(c.x,c.y);});
  ed.hist.push(h); sale(); majOutils();
}

cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('mousedown',e=>{
  if(ed.ong!=='carte')return;
  cv.focus();
  const c=caseSous(e);
  if(e.button===2||e.button===1||e.altKey){
    if(e.altKey&&e.button===0){ed.bloc=tuileA(ed.carte,c.x,c.y);majPanneau();return;}
    ed.pan=true;ed.panx=e.clientX;ed.pany=e.clientY;cv.style.cursor='grabbing';return;
  }
  ed.presse=true; debutTrait();
  if(ed.outil==='pipette'){ed.bloc=tuileA(ed.carte,c.x,c.y);ed.outil='pinceau';majOutils();majPanneau();ed.presse=false;finTrait();return;}
  if(ed.outil==='remplir'){remplis(c.x,c.y,ed.bloc);ed.presse=false;finTrait();return;}
  if(ed.outil==='rect'){ed.rect=[c.x,c.y];return;}
  pinceau(c.x,c.y,ed.bloc);
});
window.addEventListener('mousemove',e=>{
  if(ed.ong!=='carte')return;
  const c=caseSous(e); const d=dims(ed.carte);
  ed.sx=(c.x>=0&&c.y>=0&&c.x<d.w&&c.y<d.h)?c.x:null; ed.sy=c.y;
  if(ed.sx!=null){
    const t=tuileA(ed.carte,c.x,c.y);
    infos.textContent=c.x+', '+c.y+'   '+(NOMS_T[t]||t)+(A.SOLID.has(t)?'   (on ne passe pas)':'');
  }
  if(ed.pan){
    ed.camx-=(e.clientX-ed.panx)/ed.z; ed.camy-=(e.clientY-ed.pany)/ed.z;
    ed.panx=e.clientX;ed.pany=e.clientY;borne();return;
  }
  if(!ed.presse)return;
  if(ed.outil==='pinceau')pinceau(c.x,c.y,ed.bloc);
});
window.addEventListener('mouseup',e=>{
  if(ed.pan){ed.pan=false;cv.style.cursor='crosshair';}
  if(!ed.presse)return;
  ed.presse=false;
  if(ed.outil==='rect'&&ed.rect){const c=caseSous(e);rectangle(ed.rect[0],ed.rect[1],c.x,c.y,ed.bloc);ed.rect=null;}
  finTrait();
});
/* deux doigts sur le trackpad, ca deplace. Le zoom c'est CMD + et CMD -,
   ou le pincement, que le navigateur envoie avec ctrl enfonce. */
function zoomeVers(px,py,fac){
  const r=cv.getBoundingClientRect();
  const mx=(px-r.left)/ed.z+ed.camx, my=(py-r.top)/ed.z+ed.camy;
  ed.z=Math.max(1,Math.min(48,ed.z*fac));
  ed.camx=mx-(px-r.left)/ed.z; ed.camy=my-(py-r.top)/ed.z;
  borne();
}
function zoome(fac){zoomeVers(cv.getBoundingClientRect().left+cv.width/2,
                              cv.getBoundingClientRect().top+cv.height/2,fac);}
vue.addEventListener('wheel',e=>{
  if(ed.ong!=='carte')return;
  e.preventDefault();
  if(e.ctrlKey||e.metaKey){zoomeVers(e.clientX,e.clientY,e.deltaY<0?1.12:0.89);return;}
  ed.camx+=e.deltaX/ed.z; ed.camy+=e.deltaY/ed.z; borne();
},{passive:false});
function borne(){
  const d=dims(ed.carte), vw=cv.width/ed.z, vh=cv.height/ed.z;
  ed.camx=Math.max(-vw*0.3,Math.min(d.w-vw*0.7,ed.camx));
  ed.camy=Math.max(-vh*0.3,Math.min(d.h-vh*0.7,ed.camy));
}
window.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT')return;
  const k=e.key.toLowerCase();
  if((e.metaKey||e.ctrlKey)&&k==='z'){e.preventDefault();e.shiftKey?refais():annule();return;}
  if((e.metaKey||e.ctrlKey)&&k==='y'){e.preventDefault();refais();return;}
  if((e.metaKey||e.ctrlKey)&&k==='s'){e.preventDefault();enregistre();return;}
  if((e.metaKey||e.ctrlKey)&&(k==='+'||k==='='||e.code==='Equal')){e.preventDefault();zoome(1.3);return;}
  if((e.metaKey||e.ctrlKey)&&(k==='-'||e.code==='Minus')){e.preventDefault();zoome(1/1.3);return;}
  if(ed.ong!=='carte')return;
  const pas=e.shiftKey?10:3;
  if(k==='arrowleft'){ed.camx-=pas;borne();e.preventDefault();}
  else if(k==='arrowright'){ed.camx+=pas;borne();e.preventDefault();}
  else if(k==='arrowup'){ed.camy-=pas;borne();e.preventDefault();}
  else if(k==='arrowdown'){ed.camy+=pas;borne();e.preventDefault();}
  else if(k==='b'){ed.outil='pinceau';majOutils();}
  else if(k==='r'){ed.outil='rect';majOutils();}
  else if(k==='g'){ed.outil='remplir';majOutils();}
  else if(k==='i'){ed.outil='pipette';majOutils();}
  else if(k==='['){ed.taille=Math.max(1,ed.taille-2);majOutils();}
  else if(k===']'){ed.taille=Math.min(9,ed.taille+2);majOutils();}
});

/* ---------- le panneau de gauche ---------- */
function majOutils(){
  if(ed.ong==='textes'){outils.style.display='';outilsTextes();return;}
  if(ed.ong!=='carte'){outils.innerHTML='';outils.style.display='none';return;}
  outils.style.display='';
  const O=[['pinceau','Pinceau','B'],['rect','Rectangle','R'],['remplir','Remplir','G'],['pipette','Pipette','I']];
  outils.innerHTML=`
    <h4>Carte</h4>
    <select id="selCarte">${CARTES.map(c=>`<option value="${c.id}"${c.id===ed.carte?' selected':''}>${c.n}</option>`).join('')}</select>
    <h4>Outil</h4>
    <div class="o">${O.map(o=>`<button data-o="${o[0]}" class="${ed.outil===o[0]?'on':''}" title="${o[2]}">${o[1]}</button>`).join('')}</div>
    <h4>Taille du pinceau : ${ed.taille}</h4>
    <input type="range" id="rTaille" min="1" max="9" step="2" value="${ed.taille}">
    <h4>Zoom</h4>
    <div class="o">
      <button id="zM">Moins</button><button id="zP">Plus</button>
      <button id="zTout">Tout voir</button><button id="z1">100 %</button>
    </div>
    <h4>Repères</h4>
    <div class="o">
      <button id="tG" class="${ed.grille?'on':''}">Quadrillage</button>
      <button id="tS" class="${ed.solides?'on':''}">Obstacles</button>
    </div>
    <h4>Historique</h4>
    <div class="o">
      <button id="bU" ${ed.hist.length?'':'disabled'}>Annuler</button>
      <button id="bR" ${ed.futur.length?'':'disabled'}>Refaire</button>
    </div>
    <button class="b rouge" id="bReset" style="width:100%;margin-top:8px">Tout remettre d'origine</button>
    <div class="aide">
      <b>Clic</b> pose le bloc choisi.<br>
      <b>Alt + clic</b> reprend le bloc qui est déjà là.<br>
      <b>Clic droit</b> déplace la carte.<br>
      <b>Deux doigts</b> déplacent la carte.<br>
      <kbd>⌘+</kbd> et <kbd>⌘-</kbd> zooment.<br>
      <kbd>⌘Z</kbd> annule, <kbd>⌘S</kbd> enregistre.
    </div>`;
  $('#selCarte').onchange=e=>{ed.carte=e.target.value;batPlanche();cadre();};
  outils.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>{ed.outil=b.dataset.o;majOutils();});
  $('#rTaille').oninput=e=>{ed.taille=+e.target.value;majOutils();};
  $('#zM').onclick=()=>zoome(1/1.4);
  $('#zP').onclick=()=>zoome(1.4);
  $('#z1').onclick=()=>{ed.z=16;borne();};
  $('#zTout').onclick=cadre;
  $('#tG').onclick=()=>{ed.grille=!ed.grille;majOutils();};
  $('#tS').onclick=()=>{ed.solides=!ed.solides;majOutils();};
  $('#bU').onclick=annule; $('#bR').onclick=refais;
  $('#bReset').onclick=()=>{
    if(!confirm("Effacer toutes les retouches de la carte et revenir au dessin d'origine ?"))return;
    Object.keys(A.BASE).forEach(nom=>{const c=A.carteDe(nom);if(c)c.m.set(A.BASE[nom]);});
    ed.hist.length=0;ed.futur.length=0;batPlanche();sale();majOutils();
  };
}

/* ---------- le panneau de droite ---------- */
function vignette(t){
  const c=document.createElement('canvas'); c.width=TS;c.height=TS;
  c.getContext('2d').drawImage(A.tile(t,0,0),0,0); return c;
}
function majPanneau(){
  if(ed.ong==='carte'||ed.ong==='blocs')panneauBlocs();
  else if(ed.ong==='persos')panneauPersos();
  else if(ed.ong==='textes')panneauTextes();
  else panneauTrame();
}
function panneauBlocs(){
  pan.style.display='';
  const ids=Object.keys(NOMS_T).map(Number).sort((a,b)=>a-b);
  pan.innerHTML=`<h4>Bibliothèque de blocs</h4>
    <input type="text" id="q" placeholder="Chercher un bloc..." style="margin-bottom:7px">
    <div class="blocs" id="lstBlocs"></div>
    <div class="aide">Le bloc encadré est celui que le pinceau pose.
    ${ed.ong==='blocs'?'<br>Clique un bloc pour le redessiner pixel par pixel.':''}</div>`;
  const lst=$('#lstBlocs');
  function remplir(f){
    lst.innerHTML='';
    ids.forEach(t=>{
      const nom=NOMS_T[t];
      if(f&&nom.toLowerCase().indexOf(f)<0)return;
      const d=document.createElement('div');
      d.className='bloc'+(t===ed.bloc?' on':'')+(A.TUILE_OVR[t]?' retouche':'');
      d.title=nom+' ('+t+')';
      d.appendChild(vignette(t));
      const i=document.createElement('i'); i.textContent=nom; d.appendChild(i);
      d.onclick=()=>{
        ed.bloc=t;
        if(ed.ong==='blocs'){ed.blocEdit=t;ouvreBloc(t);}
        majPanneau();
      };
      lst.appendChild(d);
    });
  }
  remplir('');
  $('#q').oninput=e=>remplir(e.target.value.trim().toLowerCase());
}

/* ---------- redessiner un bloc, pixel par pixel ---------- */
let pxBloc=null;
function litTuile(t){
  const c=document.createElement('canvas'); c.width=TS;c.height=TS;
  const g=c.getContext('2d'); g.drawImage(A.tile(t,0,0),0,0);
  const d=g.getImageData(0,0,TS,TS).data, out=[];
  for(let i=0;i<256;i++){
    const a=d[i*4+3];
    out.push(a<8?null:'#'+[d[i*4],d[i*4+1],d[i*4+2]].map(v=>v.toString(16).padStart(2,'0')).join(''));
  }
  return out;
}
function couleursDe(px){
  const vu=[]; px.forEach(c=>{if(c&&vu.indexOf(c)<0)vu.push(c);}); return vu;
}
function ouvreBloc(t){
  pxBloc=litTuile(t);
  ed.couleur=couleursDe(pxBloc)[0]||'#7cb85c';
  majVue();
}
function grillePixels(px,lit,pose,rendu){
  const g=document.createElement('div');
  g.id='pixels'; g.style.gridTemplateColumns='repeat(16,1fr)';
  const cases=[];
  for(let i=0;i<256;i++){
    const c=document.createElement('div');
    c.style.background=rendu(px[i]);
    cases.push(c);
    const pique=e=>{
      if(e.buttons&2||e.altKey){lit(i);return;}
      pose(i); c.style.background=rendu(px[i]);
    };
    c.onmousedown=e=>{e.preventDefault();pique(e);};
    c.onmouseenter=e=>{if(e.buttons)pique(e);};
    g.appendChild(c);
  }
  g.oncontextmenu=e=>e.preventDefault();
  g.rafraichis=()=>{for(let i=0;i<256;i++)cases[i].style.background=rendu(px[i]);};
  return g;
}
function damier(c){
  return c?c:'repeating-conic-gradient(#2b3040 0% 25%,#232734 0% 50%) 0 0/12px 12px';
}
function vueBloc(){
  const t=ed.blocEdit;
  const w=document.createElement('div'); w.className='centre';
  if(t<0||!pxBloc){
    w.innerHTML='<div style="color:#79808f;max-width:340px;text-align:center">'+
      'Choisis un bloc dans la bibliothèque, à droite, pour le redessiner.</div>';
    return w;
  }
  const h=document.createElement('div');
  h.innerHTML='<b style="color:#f4e2a8">'+NOMS_T[t]+'</b> <span style="color:#79808f">'+
    '— clic pour peindre, alt ou clic droit pour reprendre une couleur</span>';
  w.appendChild(h);
  const g=grillePixels(pxBloc,i=>{if(pxBloc[i]){ed.couleur=pxBloc[i];majNuancier();}},
    i=>{pxBloc[i]=ed.gomme?null:ed.couleur;}, damier);
  w.appendChild(g);
  const n=document.createElement('div'); n.className='nuancier'; n.id='nuancier';
  w.appendChild(n);
  const bar=document.createElement('div');
  bar.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center';
  bar.innerHTML=`
    <input type="color" id="cPick" value="${ed.couleur}" style="width:44px;height:30px;padding:0;border:1px solid #333a49;border-radius:4px;background:#252a35">
    <button class="b" id="bGomme">Gomme</button>
    <button class="b" id="bOrig">Redessin d'origine</button>
    <button class="b vert" id="bBloc">Appliquer ce bloc</button>`;
  w.appendChild(bar);
  setTimeout(()=>{
    majNuancier();
    $('#cPick').oninput=e=>{ed.couleur=e.target.value;ed.gomme=false;majNuancier();};
    $('#bGomme').onclick=()=>{ed.gomme=!ed.gomme;majNuancier();};
    $('#bOrig').onclick=()=>{
      delete A.TUILE_OVR[t]; A.videCacheTuiles(); pxBloc=litTuile(t);
      g.rafraichis(); batPlanche(); sale(); majPanneau();
    };
    $('#bBloc').onclick=()=>{
      const pal=couleursDe(pxBloc);
      A.TUILE_OVR[t]={pal:pal,px:pxBloc.map(c=>c==null?-1:pal.indexOf(c))};
      A.videCacheTuiles(); batPlanche(); sale(); majPanneau();
      dit('Bloc '+NOMS_T[t]+' appliqué.');
    };
  },0);
  return w;
}
function majNuancier(){
  const n=$('#nuancier'); if(!n)return;
  const cs=couleursDe(pxBloc||[]);
  n.innerHTML='';
  cs.forEach(c=>{
    const b=document.createElement('button');
    b.style.background=c; b.className=(!ed.gomme&&c===ed.couleur)?'on':'';
    b.title=c; b.onclick=()=>{ed.couleur=c;ed.gomme=false;majNuancier();};
    n.appendChild(b);
  });
  const g=document.createElement('button');
  g.style.background=damier(null); g.className=ed.gomme?'on':''; g.title='Transparent';
  g.onclick=()=>{ed.gomme=true;majNuancier();};
  n.appendChild(g);
  const p=$('#cPick'); if(p&&!ed.gomme)p.value=ed.couleur;
}

/* ---------- les personnages ---------- */
const PARTIES=[
  {k:'BODY_DOWN',n:'Corps de face'},{k:'BODY_UP',n:'Corps de dos'},{k:'BODY_SIDE',n:'Corps de profil'},
  {k:'LEGS_DOWN0',n:'Jambes face 1'},{k:'LEGS_DOWN1',n:'Jambes face 2'},{k:'LEGS_DOWN2',n:'Jambes face 3'},
  {k:'LEGS_SIDE0',n:'Jambes profil 1'},{k:'LEGS_SIDE1',n:'Jambes profil 2'},{k:'LEGS_SIDE2',n:'Jambes profil 3'},
  {k:'CHEV_MI_DOWN',n:'Cheveux mi, face'},{k:'CHEV_LONG_DOWN',n:'Cheveux longs, face'},
  {k:'CHEV_BOUCLE_DOWN',n:'Cheveux bouclés'},{k:'CHEV_MI_SIDE',n:'Cheveux, profil'},
  {k:'LUNETTES_DOWN',n:'Lunettes, face'},{k:'LUNETTES_SIDE',n:'Lunettes, profil'},
  {k:'CARRURE',n:'Carrure'},{k:'OURLET',n:'Ourlet du short'}
];
const LETTRES=['K','S','D','H','h','C','c','W','w','P','p','O','E','G','R','N','n','Y','B','L'];
function dessineRows(g,rows,sc,pal,x,y){
  for(let j=0;j<rows.length;j++){const r=rows[j];
    for(let i=0;i<r.length;i++){const ch=r[i]; if(ch===' ')continue;
      const col=pal[ch]||A.PAL[ch]; if(!col)continue;
      g.fillStyle=col; g.fillRect(x+i*sc,y+j*sc,sc,sc);}}
}
function persoRows(id,dir,frame){
  const f=A.fiche(id), cote=(dir===2);
  const rows=[];
  const push=r=>rows.push(r);
  push(A.pers(cote?2:dir,frame));
  if(f.corps===1||f.corps===2)push(A.CORPS.CARRURE);
  if(f.coupe==='mi')push(cote?A.CORPS.CHEV_MI_SIDE:A.CORPS.CHEV_MI_DOWN);
  else if(f.coupe==='long')push(cote?A.CORPS.CHEV_MI_SIDE:A.CORPS.CHEV_LONG_DOWN);
  else if(f.coupe==='boucle')push(A.CORPS.CHEV_BOUCLE_DOWN);
  if(f.lunettes&&dir!==1)push(cote?A.CORPS.LUNETTES_SIDE:A.CORPS.LUNETTES_DOWN);
  if(f.short)push(A.CORPS.OURLET);
  return rows;
}
function vignettePerso(id,dir,frame,sc,flip){
  const c=document.createElement('canvas');
  c.width=16*sc; c.height=16*sc;
  const g=c.getContext('2d');
  const pal=A.palFiche(A.fiche(id));
  if(flip){g.translate(c.width,0);g.scale(-1,1);}
  persoRows(id,dir,frame).forEach(r=>dessineRows(g,r,sc,pal,0,0));
  return c;
}
function panneauPersos(){
  pan.style.display='';
  const f=A.fiche(ed.perso);
  const num=(k,mi,ma,pas)=>`<input type="range" id="f_${k}" min="${mi}" max="${ma}" step="${pas||1}" value="${f[k]}">`;
  pan.innerHTML=`
    <h4>La fiche de ${f.n}</h4>
    <div class="ligne"><label>Haut</label><input type="color" id="f_haut" value="${f.haut}"></div>
    <div class="ligne"><label>Bas</label><input type="color" id="f_bas" value="${f.bas}"></div>
    <div class="ligne"><label>Cheveux</label><input type="color" id="f_chev" value="${f.chev}"></div>
    <div class="ligne"><label>Peau</label><input type="color" id="f_peau" value="${f.peau}"></div>
    <h4>Coupe</h4>
    <select id="f_coupe">${['court','mi','long','boucle'].map(c=>`<option${c===f.coupe?' selected':''}>${c}</option>`).join('')}</select>
    <h4>Taille (${f.taille})</h4>${num('taille',-1,1)}
    <h4>Carrure (${f.corps})</h4>${num('corps',0,2)}
    <div class="o" style="margin-top:8px">
      <button id="f_short" class="${f.short?'on':''}">Short</button>
      <button id="f_lunettes" class="${f.lunettes?'on':''}">Lunettes</button>
    </div>
    <h4>Précision (${f.prec})</h4>${num('prec',1,5)}
    <h4>Puissance (${f.puis})</h4>${num('puis',1,5)}
    <h4>Les poses, communes à tous</h4>
    <select id="selPartie">${PARTIES.map(p=>`<option value="${p.k}"${p.k===ed.partie?' selected':''}>${p.n}</option>`).join('')}</select>
    <div class="aide">Les couleurs viennent de la fiche, les poses sont partagées :
    retoucher une pose la change pour tout le monde.</div>`;
  ['haut','bas','chev','peau'].forEach(k=>{
    $('#f_'+k).oninput=e=>{f[k]=e.target.value;sale();majVue();};
  });
  $('#f_coupe').onchange=e=>{f.coupe=e.target.value;sale();majVue();majPanneau();};
  ['taille','corps','prec','puis'].forEach(k=>{
    $('#f_'+k).oninput=e=>{f[k]=+e.target.value;sale();majVue();majPanneau();};
  });
  $('#f_short').onclick=()=>{f.short=f.short?0:1;sale();majVue();majPanneau();};
  $('#f_lunettes').onclick=()=>{f.lunettes=f.lunettes?0:1;sale();majVue();majPanneau();};
  $('#selPartie').onchange=e=>{ed.partie=e.target.value;majVue();};
}
function vuePersos(){
  const w=document.createElement('div'); w.className='centre';
  /* la bande, en haut */
  const bande=document.createElement('div');
  bande.style.cssText='display:flex;gap:6px;flex-wrap:wrap;justify-content:center';
  Object.keys(A.FICHES).forEach(id=>{
    const b=document.createElement('button');
    b.className='pers'+(id===ed.perso?' on':''); b.style.width='auto';
    b.appendChild(vignettePerso(id,0,0,2));
    const s=document.createElement('span'); s.textContent=A.FICHES[id].n; b.appendChild(s);
    b.onclick=()=>{ed.perso=id;majVue();majPanneau();};
    bande.appendChild(b);
  });
  w.appendChild(bande);
  /* toutes les poses */
  const poses=document.createElement('div'); poses.className='poses';
  const L=[['De face',0,false],['De dos',1,false],['Profil droit',2,false],['Profil gauche',2,true]];
  L.forEach(l=>{
    for(let fr=0;fr<3;fr++){
      const d=document.createElement('div'); d.className='pose';
      d.appendChild(vignettePerso(ed.perso,l[1],fr,5,l[2]));
      const s=document.createElement('span'); s.textContent=l[0]+' '+(fr+1); d.appendChild(s);
      poses.appendChild(d);
    }
  });
  w.appendChild(poses);
  /* la pose que l'on retouche */
  const rows=A.CORPS[ed.partie];
  const px=new Array(256).fill(' ');
  for(let j=0;j<rows.length&&j<16;j++)for(let i=0;i<16;i++)px[j*16+i]=rows[j][i]||' ';
  const pal=A.palFiche(A.fiche(ed.perso));
  const rendu=c=>(c===' '||!c)?damier(null):(pal[c]||A.PAL[c]||'#ff00ff');
  const titre=document.createElement('div');
  titre.innerHTML='<b style="color:#f4e2a8">'+(PARTIES.find(p=>p.k===ed.partie)||{}).n+'</b>'+
    ' <span style="color:#79808f">— chaque case est une couleur de la fiche</span>';
  w.appendChild(titre);
  const g=grillePixels(px,i=>{if(px[i]!==' '){ed.lettre=px[i];majLettres();}},
    i=>{px[i]=ed.gomme?' ':ed.lettre;appliquePose(px);}, rendu);
  w.appendChild(g);
  const n=document.createElement('div'); n.className='nuancier'; n.id='lettres'; w.appendChild(n);
  const bar=document.createElement('div');
  bar.style.cssText='display:flex;gap:8px;justify-content:center';
  bar.innerHTML='<button class="b" id="bPoseOrig">Pose d\'origine</button>';
  w.appendChild(bar);
  setTimeout(()=>{
    majLettres();
    $('#bPoseOrig').onclick=()=>{
      const src=A.CORPS_BASE[ed.partie], dst=A.CORPS[ed.partie];
      dst.length=0; src.forEach(r=>dst.push(r)); sale(); majVue();
    };
  },0);
  return w;
}
function appliquePose(px){
  const dst=A.CORPS[ed.partie], n=dst.length||16;
  const lignes=[];
  for(let j=0;j<n;j++){let r='';for(let i=0;i<16;i++)r+=px[j*16+i]||' ';lignes.push(r);}
  dst.length=0; lignes.forEach(r=>dst.push(r));
  sale();
  const p=document.querySelector('.poses');
  if(p){p.innerHTML='';
    [['De face',0,false],['De dos',1,false],['Profil droit',2,false],['Profil gauche',2,true]].forEach(l=>{
      for(let fr=0;fr<3;fr++){
        const d=document.createElement('div'); d.className='pose';
        d.appendChild(vignettePerso(ed.perso,l[1],fr,5,l[2]));
        const s=document.createElement('span'); s.textContent=l[0]+' '+(fr+1); d.appendChild(s);
        p.appendChild(d);
      }});
  }
}
function majLettres(){
  const n=$('#lettres'); if(!n)return;
  const pal=A.palFiche(A.fiche(ed.perso));
  n.innerHTML='';
  LETTRES.forEach(l=>{
    const col=pal[l]||A.PAL[l]; if(!col)return;
    const b=document.createElement('button');
    b.style.background=col; b.className=(!ed.gomme&&l===ed.lettre)?'on':'';
    b.title=l; b.textContent=''; b.onclick=()=>{ed.lettre=l;ed.gomme=false;majLettres();};
    n.appendChild(b);
  });
  const g=document.createElement('button');
  g.style.background=damier(null); g.className=ed.gomme?'on':''; g.title='Vide';
  g.onclick=()=>{ed.gomme=true;majLettres();};
  n.appendChild(g);
}

/* ---------- les textes : dialogues, personnages, lieux, objets ---------- */
const CATS=[{k:'pnj',n:'Personnages'},{k:'lieux',n:'Lieux'},{k:'objets',n:'Objets'}];
function listeCat(){
  if(ed.cat==='pnj')return A.NPCS.map((n,i)=>({cle:n.id,n:n.name||n.id,o:n}));
  if(ed.cat==='objets')return A.ITEMS.map(o=>({cle:o.id,n:o.n,o:o}));
  return A.LOCKED.map((l,i)=>({cle:i,n:l.who+'  ('+l.x+', '+l.y+')',o:l}));
}
function entreeRetouchee(cle){
  if(ed.cat==='pnj')return !!(patchPnj[cle]&&Object.keys(patchPnj[cle]).length);
  if(ed.cat==='objets')return !!(patchObj[cle]&&Object.keys(patchObj[cle]).length);
  const b=A.LOCKED_BASE[cle];
  return b&&JSON.stringify(A.LOCKED[cle])!==JSON.stringify(b);
}
function outilsTextes(){
  outils.innerHTML='<h4>Ce qu\'on écrit</h4><div class="grille" id="cats"></div>'+
    '<div class="aide">Tout ce qui se lit dans le jeu passe par là. '+
    'Les positions sont en cases de la carte.</div>';
  const g=$('#cats');
  CATS.forEach(c=>{
    const b=document.createElement('button');
    b.className='b'; b.style.width='100%'; b.style.textAlign='left';
    if(c.k===ed.cat){b.style.background='#3d5a8a';b.style.borderColor='#5679b5';b.style.color='#fff';}
    b.textContent=c.n;
    b.onclick=()=>{ed.cat=c.k;ed.sel=null;majOutils();majPanneau();majVue();};
    g.appendChild(b);
  });
}
function panneauTextes(){
  pan.style.display='';
  pan.innerHTML='<h4>'+(CATS.find(c=>c.k===ed.cat)||{}).n+'</h4>'+
    '<input type="text" id="q" placeholder="Chercher..." style="margin-bottom:7px">'+
    '<div id="lst"></div>';
  const lst=$('#lst'), tout=listeCat();
  function remplir(f){
    lst.innerHTML='';
    tout.forEach(e=>{
      if(f&&String(e.n).toLowerCase().indexOf(f)<0)return;
      const b=document.createElement('button');
      b.className='entree'+(String(e.cle)===String(ed.sel)?' on':'')+(entreeRetouchee(e.cle)?' retouche':'');
      b.textContent=e.n;
      b.onclick=()=>{ed.sel=e.cle;majPanneau();majVue();};
      lst.appendChild(b);
    });
  }
  remplir('');
  $('#q').oninput=e=>remplir(e.target.value.trim().toLowerCase());
}
function champ(nom,val,multi,oninput){
  const d=document.createElement('div'); d.className='champ';
  const s=document.createElement('span'); s.textContent=nom; d.appendChild(s);
  const i=document.createElement(multi?'textarea':'input');
  if(!multi)i.type='text';
  i.value=val==null?'':val;
  if(multi)i.rows=Math.max(2,String(val||'').split('\n').length+1);
  i.oninput=()=>{oninput(i.value);sale();};
  d.appendChild(i);
  return d;
}
function champNum(nom,val,oninput){
  const d=document.createElement('div'); d.className='champ';
  const s=document.createElement('span'); s.textContent=nom; d.appendChild(s);
  const i=document.createElement('input'); i.type='number'; i.value=(val==null?'':val);
  i.oninput=()=>{oninput(i.value===''?null:+i.value);sale();};
  d.appendChild(i); return d;
}
function blocRepliques(obj,titre,note){
  const w=document.createElement('div');
  const h=document.createElement('div'); h.className='champ';
  h.innerHTML='<span>'+titre+'</span>';
  w.appendChild(h);
  (obj.d||[]).forEach((rep,i)=>{
    const r=document.createElement('div'); r.className='replique';
    const haut=document.createElement('div'); haut.className='haut';
    haut.innerHTML='<span>Réplique '+(i+1)+' — une phrase par ligne, une boîte par phrase</span>';
    const sup=document.createElement('button'); sup.className='b'; sup.textContent='Retirer';
    sup.onclick=()=>{obj.d.splice(i,1);if(note)note();sale();majVue();};
    haut.appendChild(sup); r.appendChild(haut);
    const t=document.createElement('textarea');
    t.value=rep.join('\n'); t.rows=Math.max(2,rep.length+1);
    t.oninput=()=>{obj.d[i]=t.value.split('\n').filter(x=>x.trim()!=='');if(note)note();sale();};
    r.appendChild(t); w.appendChild(r);
  });
  const add=document.createElement('button'); add.className='b'; add.textContent='Ajouter une réplique';
  add.onclick=()=>{if(!obj.d)obj.d=[];obj.d.push(['']);if(note)note();sale();majVue();};
  w.appendChild(add);
  return w;
}
function vueTextes(){
  const w=document.createElement('div'); w.className='centre';
  if(ed.sel==null){
    w.innerHTML='<div style="color:#79808f;max-width:360px;text-align:center">'+
      'Choisis quelque chose dans la liste, à droite.</div>';
    return w;
  }
  const f=document.createElement('div'); f.className='form';
  const titre=document.createElement('div');
  const bRaz=document.createElement('button'); bRaz.className='b'; bRaz.textContent="Texte d'origine";
  if(ed.cat==='pnj'){
    const n=A.NPCS.find(x=>x.id===ed.sel); if(!n)return w;
    titre.innerHTML='<b style="color:#f4e2a8">'+n.name+'</b> <span style="color:#79808f">'+n.id+'</span>';
    f.appendChild(titre);
    f.appendChild(champ('Nom affiché',n.name,false,v=>{n.name=v;notePnj(n.id,'name',v);}));
    const r=document.createElement('div'); r.className='rangee';
    r.appendChild(champNum('Case X',n.x,v=>{n.x=v;notePnj(n.id,'x',v);}));
    r.appendChild(champNum('Case Y',n.y,v=>{n.y=v;notePnj(n.id,'y',v);}));
    r.appendChild(champ('Intérieur (vide = dehors)',n.inside||'',false,
      v=>{n.inside=v||null;notePnj(n.id,'inside',n.inside);}));
    f.appendChild(r);
    f.appendChild(blocRepliques(n,'Ce qu\'il dit, une réplique tirée au hasard à chaque fois',
      ()=>notePnj(n.id,'d',n.d)));
    bRaz.onclick=()=>{const b=A.NPCS_BASE[n.id];n.name=b.name;n.x=b.x;n.y=b.y;n.inside=b.inside;
      n.d=JSON.parse(JSON.stringify(b.d));delete patchPnj[n.id];sale();majVue();majPanneau();};
  } else if(ed.cat==='objets'){
    const o=A.ITEMS.find(x=>x.id===ed.sel); if(!o)return w;
    titre.innerHTML='<b style="color:#f4e2a8">'+o.n+'</b> <span style="color:#79808f">'+o.id+'</span>';
    f.appendChild(titre);
    f.appendChild(champ('Nom dans le sac',o.n,false,v=>{o.n=v;noteObj(o.id,'n',v);}));
    f.appendChild(champ('Quand on le ramasse',o.trouve,true,v=>{o.trouve=v;noteObj(o.id,'trouve',v);}));
    f.appendChild(champ('Quand on le regarde',o.txt,true,v=>{o.txt=v;noteObj(o.id,'txt',v);}));
    const r=document.createElement('div'); r.className='rangee';
    r.appendChild(champNum('Case X',o.x,v=>{o.x=v;noteObj(o.id,'x',v);}));
    r.appendChild(champNum('Case Y',o.y,v=>{o.y=v;noteObj(o.id,'y',v);}));
    r.appendChild(champ('Intérieur',o.inside||'',false,v=>{o.inside=v||null;noteObj(o.id,'inside',o.inside);}));
    f.appendChild(r);
    bRaz.onclick=()=>{const b=A.ITEMS_BASE[o.id];Object.assign(o,b);delete patchObj[o.id];
      sale();majVue();majPanneau();};
  } else {
    const l=A.LOCKED[ed.sel]; if(!l)return w;
    titre.innerHTML='<b style="color:#f4e2a8">'+l.who+'</b>';
    f.appendChild(titre);
    f.appendChild(champ('Le cadre du haut',l.who,false,v=>{l.who=v;majPanneau();}));
    const r=document.createElement('div'); r.className='rangee';
    r.appendChild(champNum('Case X',l.x,v=>{l.x=v;}));
    r.appendChild(champNum('Case Y',l.y,v=>{l.y=v;}));
    f.appendChild(r);
    const t=document.createElement('div'); t.className='champ';
    t.innerHTML='<span>Ce qu\'on lit — une phrase par ligne, une boîte par phrase</span>';
    const ta=document.createElement('textarea');
    ta.value=(l.d||[]).join('\n'); ta.rows=Math.max(3,(l.d||[]).length+1);
    ta.oninput=()=>{l.d=ta.value.split('\n').filter(x=>x.trim()!=='');sale();};
    t.appendChild(ta); f.appendChild(t);
    const i=ed.sel;
    bRaz.onclick=()=>{A.LOCKED[i]=JSON.parse(JSON.stringify(A.LOCKED_BASE[i]));sale();majVue();majPanneau();};
  }
  f.appendChild(bRaz);
  w.appendChild(f);
  return w;
}

/* ---------- la trame et les missions ---------- */
function panneauTrame(){
  pan.style.display='';
  pan.innerHTML='<h4>Les actes</h4><div id="actes"></div>'+
    '<h4>Les évènements que le jeu sait déclencher</h4><div id="evs" class="aide"></div>';
  const g=$('#actes');
  A.ACTES.forEach((n,i)=>{
    if(i===0)return;
    const d=document.createElement('div'); d.className='champ'; d.style.marginBottom='5px';
    d.innerHTML='<span>Acte '+i+'</span>';
    const inp=document.createElement('input'); inp.type='text'; inp.value=n;
    inp.oninput=()=>{A.ACTES[i]=inp.value;sale();majVue();};
    d.appendChild(inp); g.appendChild(d);
  });
  $('#evs').innerHTML=A.EVENTS.map(e=>'<b>'+e.ev+'</b> — '+e.q).join('<br>');
}
function formMission(m,i){
  const f=document.createElement('div'); f.className='corps';
  const r1=document.createElement('div'); r1.className='rangee';
  const dA=document.createElement('div'); dA.className='champ';
  dA.innerHTML='<span>Acte</span>';
  const sA=document.createElement('select');
  A.ACTES.forEach((n,k)=>{if(k===0)return;
    const o=document.createElement('option');o.value=k;o.textContent=k+'. '+n;
    if(k===m.a)o.selected=true;sA.appendChild(o);});
  sA.onchange=()=>{m.a=+sA.value;sale();majVue();};
  dA.appendChild(sA); r1.appendChild(dA);
  const dE=document.createElement('div'); dE.className='champ';
  dE.innerHTML='<span>Évènement</span>';
  const sE=document.createElement('select');
  A.EVENTS.forEach(e=>{const o=document.createElement('option');o.value=e.ev;
    o.textContent=e.ev+' — '+e.q; if(e.ev===m.ev)o.selected=true;sE.appendChild(o);});
  sE.onchange=()=>{m.ev=sE.value;sale();majVue();};
  dE.appendChild(sE); r1.appendChild(dE);
  f.appendChild(r1);
  f.appendChild(champ('Titre',m.t,false,v=>{m.t=v;}));
  f.appendChild(champ('Ce que le joueur doit faire',m.d,true,v=>{m.d=v;}));
  const r2=document.createElement('div'); r2.className='rangee';
  const dQ=document.createElement('div'); dQ.className='champ';
  dQ.innerHTML='<span>À qui (pour « parle »)</span>';
  const sQ=document.createElement('select');
  const o0=document.createElement('option'); o0.value=''; o0.textContent='— personne en particulier —';
  sQ.appendChild(o0);
  A.NPCS.forEach(n=>{const o=document.createElement('option');o.value=n.id;
    o.textContent=n.name+' ('+n.id+')'; if(n.id===m.qui)o.selected=true;sQ.appendChild(o);});
  sQ.onchange=()=>{if(sQ.value)m.qui=sQ.value;else delete m.qui;sale();};
  dQ.appendChild(sQ); r2.appendChild(dQ);
  r2.appendChild(champNum('Combien de fois',m.n,v=>{if(v)m.n=v;else delete m.n;}));
  f.appendChild(r2);
  f.appendChild(champ('Le texte qui tombe quand c\'est fini',m.f,true,v=>{m.f=v;}));
  const bar=document.createElement('div'); bar.style.cssText='display:flex;gap:6px';
  const dup=document.createElement('button'); dup.className='b'; dup.textContent='Dupliquer';
  dup.onclick=()=>{A.MISSIONS.splice(i+1,0,JSON.parse(JSON.stringify(m)));sale();majVue();};
  const sup=document.createElement('button'); sup.className='b rouge'; sup.textContent='Supprimer';
  sup.onclick=()=>{if(confirm('Supprimer « '+m.t+' » ?')){A.MISSIONS.splice(i,1);ed.misOuv=-1;sale();majVue();}};
  bar.appendChild(dup); bar.appendChild(sup);
  f.appendChild(bar);
  return f;
}
async function programme(){
  if(!ed.prog.trim()){dit('Écris d\'abord ce que tu veux.');return;}
  ed.progEnCours=true; ed.progRep=null; majVue();
  dit('Claude écrit la mission...');
  let r;
  try{
    const rep=await fetch('/api/claude',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({desc:ed.prog, apres:ed.apres,
        contexte:{actes:A.ACTES, evenements:A.EVENTS,
          pnj:A.NPCS.map(n=>({id:n.id,nom:n.name})),
          missions:A.MISSIONS}})});
    r=await rep.json();
  }catch(e){ r={ok:false,raison:'reseau'}; }
  ed.progEnCours=false;
  if(!r||!r.ok){
    const m={sans_cle:"Le serveur n'a pas de clé Claude. Ajoute ANTHROPIC_API_KEY dans Render, onglet Environment, puis redémarre le service.",
      reseau:"Pas de réponse du serveur.",api:"Claude a refusé : "+(r&&r.code)+' '+(r&&r.detail||''),
      illisible:"Claude a répondu à côté. Reformule.",serveur:"Le serveur a calé."};
    ed.progRep={erreur:(m[r&&r.raison]||'Ça n\'a pas marché.')};
  } else ed.progRep=r;
  dit(ed.progRep.erreur?ed.progRep.erreur:'Claude a répondu.',!ed.progRep.erreur);
  majVue();
}
function insereProg(){
  const r=ed.progRep; if(!r||!r.missions)return;
  const pos=(ed.apres<0)?A.MISSIONS.length:ed.apres+1;
  A.MISSIONS.splice(pos,0,...JSON.parse(JSON.stringify(r.missions)));
  Object.keys(r.dialogues||{}).forEach(id=>{
    const n=A.NPCS.find(x=>x.id===id); if(!n)return;
    if(!n.d)n.d=[];
    (r.dialogues[id]||[]).forEach(rep=>n.d.push(Array.isArray(rep)?rep:[String(rep)]));
    notePnj(id,'d',n.d);
  });
  ed.progRep=null; ed.prog=''; sale();
  dit(r.missions.length+' mission'+(r.missions.length>1?'s':'')+' insérée'+(r.missions.length>1?'s':'')+'.',true);
  majVue();
}
function vueTrame(){
  const w=document.createElement('div'); w.className='centre';
  /* la boite qui demande a Claude */
  const p=document.createElement('div'); p.className='prog';
  p.innerHTML='<h3>Programmer une mission</h3>';
  const ta=document.createElement('textarea');
  ta.placeholder="Décris la mission comme tu la raconterais. Par exemple : Charles parie qu'il "+
    "met une balle sur le toit du club house, il faut aller la rechercher avant Alain.";
  ta.value=ed.prog;
  ta.oninput=()=>{ed.prog=ta.value;};
  p.appendChild(ta);
  const bar=document.createElement('div');
  bar.style.cssText='display:flex;gap:8px;align-items:flex-end;margin-top:8px';
  const dP=document.createElement('div'); dP.className='champ'; dP.style.flex='1';
  dP.innerHTML='<span>L\'insérer après</span>';
  const sP=document.createElement('select');
  const oF=document.createElement('option'); oF.value='-1'; oF.textContent='— à la toute fin —';
  sP.appendChild(oF);
  A.MISSIONS.forEach((m,i)=>{const o=document.createElement('option');o.value=i;
    o.textContent=(i+1)+'. '+m.t; if(i===ed.apres)o.selected=true;sP.appendChild(o);});
  sP.value=String(ed.apres);
  sP.onchange=()=>{ed.apres=+sP.value;};
  dP.appendChild(sP); bar.appendChild(dP);
  const bP=document.createElement('button'); bP.className='b vert';
  bP.textContent=ed.progEnCours?'Claude écrit...':'Programmer';
  bP.disabled=ed.progEnCours; bP.onclick=programme;
  bar.appendChild(bP);
  p.appendChild(bar);
  if(ed.progRep){
    const a=document.createElement('div'); a.className='apercu';
    if(ed.progRep.erreur){
      a.style.background='#2a1a1a'; a.style.borderColor='#6b3232';
      a.textContent=ed.progRep.erreur;
    } else {
      if(ed.progRep.note)a.innerHTML='<div class="mot" style="margin-bottom:6px">'+ed.progRep.note+'</div>';
      (ed.progRep.missions||[]).forEach(m=>{
        const d=document.createElement('div'); d.className='m';
        d.innerHTML='<b>'+(m.t||'')+'</b> <span style="color:#8fb0d8">'+(m.ev||'')+
          (m.qui?' → '+m.qui:'')+(m.n?' ×'+m.n:'')+'</span><br>'+
          '<span style="color:#aeb6c6">'+(m.d||'')+'</span><br>'+
          '<span style="color:#79808f">'+(m.f||'')+'</span>';
        a.appendChild(d);
      });
      const nd=Object.keys(ed.progRep.dialogues||{});
      if(nd.length){const d=document.createElement('div');d.className='m';
        d.innerHTML='<span class="mot">Nouvelles répliques pour : '+nd.join(', ')+'</span>';a.appendChild(d);}
      const b2=document.createElement('div'); b2.style.cssText='display:flex;gap:8px;margin-top:9px';
      const ins=document.createElement('button'); ins.className='b vert'; ins.textContent='Insérer dans la trame';
      ins.onclick=insereProg;
      const ann=document.createElement('button'); ann.className='b'; ann.textContent='Jeter';
      ann.onclick=()=>{ed.progRep=null;majVue();};
      b2.appendChild(ins); b2.appendChild(ann); a.appendChild(b2);
    }
    p.appendChild(a);
  }
  w.appendChild(p);
  /* la trame */
  const l=document.createElement('div'); l.className='form';
  let acte=-1;
  A.MISSIONS.forEach((m,i)=>{
    if(m.a!==acte){acte=m.a;
      const h=document.createElement('div'); h.className='acte';
      h.textContent='Acte '+acte+' — '+(A.ACTES[acte]||''); l.appendChild(h);}
    const d=document.createElement('div'); d.className='mis'+(ed.misOuv===i?' on':'');
    const t=document.createElement('div'); t.className='tete';
    t.innerHTML='<span class="num">'+(i+1)+'</span><span class="tit">'+(m.t||'(sans titre)')+
      '</span><span class="ev">'+(m.ev||'?')+(m.qui?' → '+m.qui:'')+(m.n?' ×'+m.n:'')+'</span>';
    const fl=document.createElement('span'); fl.className='fleches';
    const up=document.createElement('button'); up.textContent='▲';
    up.onclick=e=>{e.stopPropagation();if(i>0){const x=A.MISSIONS.splice(i,1)[0];A.MISSIONS.splice(i-1,0,x);
      if(ed.misOuv===i)ed.misOuv=i-1;sale();majVue();}};
    const dn=document.createElement('button'); dn.textContent='▼';
    dn.onclick=e=>{e.stopPropagation();if(i<A.MISSIONS.length-1){const x=A.MISSIONS.splice(i,1)[0];
      A.MISSIONS.splice(i+1,0,x); if(ed.misOuv===i)ed.misOuv=i+1;sale();majVue();}};
    fl.appendChild(up); fl.appendChild(dn); t.appendChild(fl);
    t.onclick=()=>{ed.misOuv=(ed.misOuv===i)?-1:i;majVue();};
    d.appendChild(t);
    if(ed.misOuv===i)d.appendChild(formMission(m,i));
    l.appendChild(d);
  });
  const add=document.createElement('button'); add.className='b'; add.style.marginTop='8px';
  add.textContent='Ajouter une mission à la main';
  add.onclick=()=>{A.MISSIONS.push({a:A.MISSIONS.length?A.MISSIONS[A.MISSIONS.length-1].a:1,
    t:'Nouvelle mission',d:'',ev:'parle',qui:'charles',f:''});
    ed.misOuv=A.MISSIONS.length-1;sale();majVue();};
  l.appendChild(add);
  const raz=document.createElement('button'); raz.className='b rouge'; raz.style.marginTop='8px';
  raz.textContent="Remettre toute la trame d'origine";
  raz.onclick=()=>{if(!confirm('Effacer toutes les retouches de la trame ?'))return;
    A.MISSIONS.length=0;JSON.parse(JSON.stringify(A.MISSIONS_BASE)).forEach(m=>A.MISSIONS.push(m));
    A.ACTES.length=0;A.ACTES_BASE.forEach(a2=>A.ACTES.push(a2));
    ed.misOuv=-1;sale();majVue();majPanneau();};
  l.appendChild(raz);
  w.appendChild(l);
  return w;
}

/* ---------- la vue centrale ---------- */
function majVue(){
  const vieux=vue.querySelector('.centre'); if(vieux)vieux.remove();
  cv.style.display=(ed.ong==='carte')?'':'none';
  infos.style.display=(ed.ong==='carte')?'':'none';
  if(ed.ong==='blocs')vue.appendChild(vueBloc());
  else if(ed.ong==='persos')vue.appendChild(vuePersos());
  else if(ed.ong==='textes')vue.appendChild(vueTextes());
  else if(ed.ong==='trame')vue.appendChild(vueTrame());
}
document.querySelectorAll('nav button').forEach(b=>{
  b.onclick=()=>{
    document.querySelectorAll('nav button').forEach(x=>x.classList.remove('on'));
    b.classList.add('on'); ed.ong=b.dataset.ong;
    majOutils(); majPanneau(); majVue();
  };
});

/* ---------- enregistrer ---------- */
function monde(){
  const carte={};
  Object.keys(A.BASE).forEach(nom=>{
    const c=A.carteDe(nom), base=A.BASE[nom]; if(!c)return;
    const l=[];
    for(let i=0;i<base.length;i++)if(c.m[i]!==base[i])l.push([i%c.w,(i/c.w)|0,c.m[i]]);
    if(l.length)carte[nom]=l;
  });
  const tuiles={};
  Object.keys(A.TUILE_OVR).forEach(k=>{tuiles[k]=A.TUILE_OVR[k];});
  const fiches={};
  Object.keys(A.FICHES).forEach(id=>{
    const a=A.FICHES[id], b=A.FICHES_BASE[id], d={};
    Object.keys(a).forEach(k=>{if(a[k]!==b[k])d[k]=a[k];});
    if(Object.keys(d).length)fiches[id]=d;
  });
  const corps={};
  Object.keys(A.CORPS).forEach(k=>{
    const a=A.CORPS[k].join('|'), b=A.CORPS_BASE[k].join('|');
    if(a!==b)corps[k]=A.CORPS[k].slice();
  });
  /* les textes : ce qu'on a modifie ici, pas ce que le jeu a deplace tout seul */
  const pnj={}, objets={};
  Object.keys(patchPnj).forEach(k=>{if(Object.keys(patchPnj[k]||{}).length)pnj[k]=patchPnj[k];});
  Object.keys(patchObj).forEach(k=>{if(Object.keys(patchObj[k]||{}).length)objets[k]=patchObj[k];});
  const mem=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const out={v:1,carte:carte,tuiles:tuiles,persos:{fiches:fiches,corps:corps},
    pnj:pnj,objets:objets};
  if(!mem(A.MISSIONS,A.MISSIONS_BASE))out.missions=A.MISSIONS;
  if(!mem(A.ACTES,A.ACTES_BASE))out.actes=A.ACTES;
  if(!mem(A.LOCKED,A.LOCKED_BASE))out.lieux=A.LOCKED;
  return out;
}
async function enregistre(){
  const m=monde();
  const txt=JSON.stringify(m);
  try{localStorage.setItem(A.MONDEKEY,txt);}catch(e){}
  dit('Enregistrement...');
  try{
    const r=await fetch('/api/monde',{method:'POST',headers:{'Content-Type':'application/json'},body:txt});
    if(!r.ok)throw new Error(r.status);
    ed.sauve=true;
    const n=Object.keys(m.carte).reduce((a,k)=>a+m.carte[k].length,0);
    const bouts=[];
    if(n)bouts.push(n+' case'+(n>1?'s':''));
    const nb=Object.keys(m.tuiles||{}).length; if(nb)bouts.push(nb+' bloc'+(nb>1?'s':''));
    const np=Object.keys(m.pnj||{}).length; if(np)bouts.push(np+' personnage'+(np>1?'s':''));
    const no=Object.keys(m.objets||{}).length; if(no)bouts.push(no+' objet'+(no>1?'s':''));
    if(m.missions)bouts.push('la trame');
    if(m.lieux)bouts.push('les lieux');
    dit('Enregistré'+(bouts.length?' : '+bouts.join(', ')+'.':'.'),true);
  }catch(e){
    ed.sauve=true;
    dit('Gardé sur cet appareil (pas de serveur).',true);
  }
}
$('#bSave').onclick=enregistre;
$('#bExport').onclick=()=>{
  const b=new Blob([JSON.stringify(monde(),null,1)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(b); a.download='monde.json'; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),4000);
};
$('#fImport').onchange=e=>{
  const f=e.target.files[0]; if(!f)return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      A.appliqueMonde(JSON.parse(r.result));
      batPlanche(); majOutils(); majPanneau(); majVue(); sale();
      dit('Fichier chargé, pense à enregistrer.');
    }catch(err){dit('Fichier illisible.');}
  };
  r.readAsText(f);
};
window.addEventListener('beforeunload',e=>{
  if(!ed.sauve){e.preventDefault();e.returnValue='';}
});

/* ---------- en route ---------- */
batPlanche();
majOutils(); majPanneau(); majVue(); boucle();
dit('Prêt.');
})();
