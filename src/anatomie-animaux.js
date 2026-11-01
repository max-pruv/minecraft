// Anatomies de secours et espèces absentes des scans. Tous les volumes sont
// galbés et articulés ; aucune géométrie de boîte, y compris pour les montures.
import * as THREE from 'three';
import { Atelier } from './modeles.js';
import { construireBete } from './betes.js';

const BASES = { cow:'vache', pig:'cochon', sheep:'mouton', horse:'cheval', chicken:'poule',
  wolf:'chien', fox:'chien', squirrel:'chat', ane:'ane', zebre:'cheval',
  cheval:'cheval', cheval_blanc:'cheval_blanc', cheval_noir:'cheval_noir', poney:'poney',
  poule:'poule', poule_rousse:'poule_rousse', poule_grise:'poule_grise', coq:'coq', poussin:'poussin',
  oie:'oie', colombe:'colombe', paon:'paon', cochon:'cochon', porcelet:'porcelet', mouton:'mouton',
  agneau:'agneau', vache:'vache', chien:'chien', levrier:'levrier', chat:'chat', chat_roux:'chat_roux' };

function courbe(a, points, rayon, couleur) {
  const geo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),20,rayon,10,false);
  a.geometrie(geo,couleur); geo.dispose();
}
function ell(a,c,p,e,r) { a.sphere(c,{p,e,r,seg:30}); }
function yeux(a,y,z,x,taille=.025) {
  for(const s of [-1,1]) {
    ell(a,0x271c16,[s*x,y,z],[taille*1.1,taille,taille]);
    ell(a,0x090b0c,[s*(x+.003),y+.002,z-.005],[taille*.8,taille*.8,taille*.7]);
  }
}

// Longueur, largeur, dos, ventre, tête (y,z), robe, épaisseur des pattes.
const QUADRUPEDES = {
  goat:[.95,.34,.76,.43,[.91,-.56],0xb3a68a,.045],
  deer:[1.12,.35,.96,.59,[1.14,-.66],0x9b6940,.04],
  rabbit:[.5,.26,.3,.13,[.39,-.29],0x9c8c77,.035],
  elephant:[2.3,1.24,2.35,1.05,[2.48,-1.28],0x777a73,.23],
  chameau:[1.6,.58,1.4,.85,[1.96,-.99],0xbda17a,.07],
  lama:[1.12,.42,.99,.55,[1.52,-.61],0xbdb2a0,.05],
  sanglier:[1.1,.52,.76,.31,[.61,-.66],0x57483c,.065],
  ours:[1.32,.66,.99,.4,[.89,-.82],0x5a4030,.12],
};

function quadrupede(a,espece) {
  const [L,W,dos,ventre,tete,robe,r]=QUADRUPEDES[espece];
  const cy=(dos+ventre)/2,H=dos-ventre;
  a.membre('tronc');
  ell(a,robe,[0,cy,0],[W,H,L]);
  ell(a,robe,[0,cy+.035,-L*.25],[W*.94,H*.98,L*.58]);
  ell(a,robe,[0,cy+.02,L*.27],[W*.91,H*.94,L*.56]);
  const ty=tete[0],tz=tete[1],grand=espece==='elephant';
  const teteW=grand?.65:espece==='ours'?.38:W*.58;
  const teteH=grand?.78:W*.72;
  a.membreGalbe(robe,{de:[0,dos-H*.25,-L*.3],a:[0,ty-teteH*.2,tz+.08],r1:W*.32,r2:teteW*.3,seg:24});
  ell(a,robe,[0,ty,tz],[teteW,teteH,grand?.7:teteW*1.35]);
  const museau=espece==='sanglier'?0x62504a:robe;
  ell(a,museau,[0,ty-teteH*.18,tz-teteW*.6],[teteW*.68,teteH*.47,teteW*.82]);
  ell(a,0x292322,[0,ty-teteH*.18,tz-teteW*.98],[teteW*.47,teteH*.22,teteW*.18]);
  yeux(a,ty+teteH*.13,tz-teteW*.28,teteW*.46,grand?.055:.025);
  for(const s of [-1,1]) {
    const longues=espece==='rabbit'||espece==='lama';
    ell(a,robe,[s*teteW*.6,ty+teteH*.47,tz+.025],
      [longues?.065:grand?.12:.12,longues?.3:grand?.78:.17,grand?.55:.08],
      [0,0,s*(longues?.14:.75)]);
    if(longues) ell(a,0xc1a5a0,[s*teteW*.6,ty+teteH*.53,tz-.018],[.036,.23,.012],[0,0,s*.14]);
  }
  for(const [nom,s,z,avant] of [['patteAvG',-1,-L*.32,true],['patteArD',1,L*.33,false],['patteAvD',1,-L*.32,true],['patteArG',-1,L*.33,false]]) {
    const x=s*W*.33,haut=ventre+H*.28;
    a.membre(nom,[x,haut,z]);
    const genou=[x,haut*.48,z+(avant?.035:-.065)];
    a.membreGalbe(robe,{de:[x,haut,z],a:genou,r1:r*1.7,r2:r,seg:24});
    a.membreGalbe(robe,{de:genou,a:[x,r*.8,z],r1:r,r2:r*.72,seg:20});
    ell(a,grand?robe:0x322a24,[x,r*.65,z-.025],[r*2.2,r*1.4,r*2.8]);
  }
  a.membre('tronc');
  if(espece==='elephant') {
    courbe(a,[[0,ty-.1,tz-.33],[0,ty-.6,tz-.55],[0,.85,tz-.66],[.1,.45,tz-.83],[.13,.57,tz-1.02]],.12,robe);
    for(const s of [-1,1]) courbe(a,[[s*.27,ty-.4,tz-.26],[s*.31,ty-.62,tz-.7],[s*.31,ty-.52,tz-1.01]],.035,0xded5b7);
  }
  if(espece==='goat') {
    for(const s of [-1,1]) courbe(a,[[s*.09,ty+.1,tz],[s*.11,ty+.33,tz+.04],[s*.11,ty+.39,tz+.2]],.018,0x746552);
    a.cone(robe,{p:[0,ty-.2,tz-.12],r:[Math.PI,0,0],e:[.07,.18,.09],seg:24});
  }
  if(espece==='deer') for(const s of [-1,1]) {
    courbe(a,[[s*.1,ty+.12,tz],[s*.16,ty+.38,tz+.04],[s*.3,ty+.65,tz+.2]],.016,0x6c5237);
    for(let k=0;k<3;k++) courbe(a,[[s*(.14+k*.045),ty+.3+k*.09,tz+k*.04],[s*(.24+k*.05),ty+.4+k*.1,tz-.09+k*.06]],.01,0x7b6045);
  }
  if(espece==='chameau') for(const z of [-.3,.35]) ell(a,robe,[0,dos+.15,z],[.5,.55,.6]);
  if(espece==='sanglier') for(const s of [-1,1]) courbe(a,[[s*.11,ty-.12,tz-.17],[s*.16,ty-.09,tz-.29],[s*.18,ty+.04,tz-.28]],.018,0xddd1ac);
  if(espece==='rabbit') ell(a,0xd9d6cd,[0,.21,L*.55],[.16,.16,.15]);
  else courbe(a,[[0,dos-.1,L*.45],[.035,dos-.3,L*.6],[.06,ventre+.08,L*.6]],grand?.035:.018,robe);
}

function oiseau(a,espece) {
  const autruche=espece==='autruche',manchot=espece==='penguin',canard=espece==='duck';
  const robe=manchot?0x23272c:canard?0x665c49:0x383b37;
  const y=autruche?1.1:manchot?.35:.24;
  a.membre('tronc');
  ell(a,robe,[0,y,0],[autruche?.7:.34,autruche?.8:manchot?.55:.28,autruche?.98:.47]);
  ell(a,0xd7d2c5,[0,y+.01,-.09],[autruche?.57:.25,autruche?.62:manchot?.43:.21,.2]);
  const ty=autruche?2.1:manchot?.7:.48,tz=autruche?-.42:-.27;
  courbe(a,[[0,y+.1,-.12],[0,(y+ty)/2,tz+.05],[0,ty,tz]],autruche?.075:.06,canard?0x245b3e:robe);
  ell(a,canard?0x245b3e:robe,[0,ty,tz],[autruche?.18:.17,autruche?.2:.18,.21]);
  ell(a,0xb89951,[0,ty-.025,tz-.14],[canard?.13:.065,.04,.17]);
  yeux(a,ty+.035,tz-.02,autruche?.082:.075,.022);
  for(const [nom,s] of [['patteG',-1],['patteD',1]]) {
    a.membre(nom,[s*(autruche?.19:.08),y*.7,.03]);
    a.membreGalbe(0x8e775a,{de:[s*(autruche?.19:.08),y*.7,.03],a:[s*(autruche?.19:.08),.04,0],r1:autruche?.035:.016,r2:.012,seg:24});
    for(let k=-1;k<=1;k++) courbe(a,[[s*(autruche?.19:.08),.025,0],[s*(autruche?.19:.08)+k*.03,.016,-.1]],.01,0xaa8951);
  }
  a.membre('tronc');
  for(const s of [-1,1]) {
    const x=s*(autruche?.3:.16);
    ell(a,robe,[x,y+.02,.02],[.065,autruche?.5:.25,autruche?.75:.33],[0,0,s*(manchot?.25:.12)]);
    for(let k=0;k<7;k++) ell(a,manchot?robe:0x898779,[x+s*.012,y-.07+k*.016,.12+k*.017],[.035,.12,.12],[.25,0,s*.2]);
  }
}

function reptile(a,crabe) {
  a.membre('tronc');
  if(!crabe) {
    ell(a,0x59633e,[0,.2,0],[.55,.32,.68]);
    for(let k=0;k<9;k++) {
      const angle=k*Math.PI*2/9;
      ell(a,0x77794b,[Math.cos(angle)*.16,.32,Math.sin(angle)*.2],[.16,.06,.19]);
    }
    ell(a,0x7a8151,[0,.18,-.38],[.16,.13,.2]); yeux(a,.205,-.43,.066,.018);
  } else {
    ell(a,0xa95036,[0,.15,0],[.48,.19,.35]);
    for(const s of [-1,1]) {
      courbe(a,[[s*.09,.2,-.08],[s*.1,.31,-.11]],.012,0x8c4932);
      ell(a,0x171a18,[s*.1,.32,-.11],[.025,.03,.025]);
      courbe(a,[[s*.19,.16,-.1],[s*.29,.2,-.21],[s*.33,.2,-.32]],.024,0xa95036);
      for(const d of [-1,1]) ell(a,0xc17250,[s*.33+d*.026,.22,-.34],[.065,.09,.13],[0,d*.24,0]);
    }
  }
  for(let k=0;k<(crabe?8:4);k++) {
    const s=k%2?-1:1,z=(Math.floor(k/2)-(crabe?1.5:.5))*(crabe?.07:.35);
    const x=s*(crabe?.19:.21);
    a.membre('patte'+k,[x,.13,z]);
    courbe(a,[[x,.13,z],[x+s*.13,.1,z+.04],[x+s*(crabe?.23:.16),.025,z-.02]],crabe?.014:.035,crabe?0xb46243:0x82845a);
  }
}

function oiseauEnVol(a) {
  a.membre('tronc');
  ell(a,0xb7b8ad,[0,.13,0],[.22,.25,.55]);
  ell(a,0x7a7d75,[0,.22,-.3],[.16,.17,.19]);
  ell(a,0x9f8952,[0,.2,-.43],[.05,.035,.15]);
  yeux(a,.25,-.34,.07,.014);
  for(const [nom,s] of [['aileG',-1],['aileD',1]]) {
    a.membre(nom,[s*.09,.16,-.03]);
    ell(a,0xa8aaa1,[s*.36,.15,.03],[.65,.055,.28],[0,s*.15,0]);
    for(let k=0;k<10;k++) {
      a.sphere(k<6?0x676c66:0x343a38,{p:[s*(.22+k*.065),.14-k*.004,.13+k*.018],
        e:[.09,.025,.32-k*.012],r:[0,-s*.25,0],seg:20});
    }
  }
  a.membre('tronc');
  for(let k=-2;k<=2;k++) a.sphere(0x636962,{p:[k*.035,.12,.34],e:[.055,.025,.3],r:[0,k*.1,0],seg:20});
}

export function anatomieAnimal(espece) {
  let g;
  if(BASES[espece]) {
    g=construireBete(BASES[espece]);
    if(espece==='fox'||espece==='squirrel') {
      const a=new Atelier(); a.membre('queue');
      const couleur=espece==='fox'?0xa5572c:0x7a4f32;
      const points=espece==='fox'?[[0,.4,.35],[0,.35,.6],[0,.2,.85]]:[[0,.22,.2],[0,.43,.43],[0,.72,.32],[0,.64,.1]];
      courbe(a,points,espece==='fox'?.1:.085,couleur);
      const queue=a.finir(); g.add(queue);
    }
  } else {
    const a=new Atelier();
    if(espece==='oiseau') oiseauEnVol(a);
    else if(QUADRUPEDES[espece]) quadrupede(a,espece);
    else if(['duck','penguin','autruche'].includes(espece)) oiseau(a,espece);
    else if(['turtle','crab'].includes(espece)) reptile(a,espece==='crab');
    else throw new Error('Anatomie animale inconnue : '+espece);
    g=a.finir();
  }
  const m=g.userData.membres||{};
  for(const [nom,noeud] of Object.entries(m)) noeud.name='anatomie_'+nom;
  g.userData.legs=m.patteAvG?[m.patteAvG,m.patteArD,m.patteAvD,m.patteArG]:Object.entries(m).filter(([k])=>k.startsWith('patte')).map(([,v])=>v);
  return g;
}
