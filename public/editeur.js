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
  couleur:'#7cb85c', lettre:'K', blocEdit:-1, perso:'moi', partie:'BODY_DOWN'
};

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
vue.addEventListener('wheel',e=>{
  if(ed.ong!=='carte')return;
  e.preventDefault();
  const r=cv.getBoundingClientRect();
  const mx=(e.clientX-r.left)/ed.z+ed.camx, my=(e.clientY-r.top)/ed.z+ed.camy;
  const av=ed.z;
  ed.z=Math.max(1,Math.min(48,ed.z*(e.deltaY<0?1.18:0.85)));
  ed.camx=mx-(e.clientX-r.left)/ed.z; ed.camy=my-(e.clientY-r.top)/ed.z;
  if(Math.abs(av-ed.z)>0.001)borne();
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
  else if(k==='+'||k==='='){ed.z=Math.min(48,ed.z*1.25);borne();}
  else if(k==='-'){ed.z=Math.max(1,ed.z/1.25);borne();}
});

/* ---------- le panneau de gauche ---------- */
function majOutils(){
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
      <b>Molette</b> zoome sur le curseur.<br>
      <kbd>⌘Z</kbd> annule, <kbd>⌘S</kbd> enregistre.
    </div>`;
  $('#selCarte').onchange=e=>{ed.carte=e.target.value;batPlanche();cadre();};
  outils.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>{ed.outil=b.dataset.o;majOutils();});
  $('#rTaille').oninput=e=>{ed.taille=+e.target.value;majOutils();};
  $('#zM').onclick=()=>{ed.z=Math.max(1,ed.z/1.4);borne();};
  $('#zP').onclick=()=>{ed.z=Math.min(48,ed.z*1.4);borne();};
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
  else panneauPersos();
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

/* ---------- la vue centrale ---------- */
function majVue(){
  const vieux=vue.querySelector('.centre'); if(vieux)vieux.remove();
  cv.style.display=(ed.ong==='carte')?'':'none';
  infos.style.display=(ed.ong==='carte')?'':'none';
  if(ed.ong==='blocs')vue.appendChild(vueBloc());
  else if(ed.ong==='persos')vue.appendChild(vuePersos());
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
  return {v:1,carte:carte,tuiles:tuiles,persos:{fiches:fiches,corps:corps}};
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
    dit('Enregistré. '+n+' case'+(n>1?'s':'')+' retouchée'+(n>1?'s':'')+'.',true);
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
