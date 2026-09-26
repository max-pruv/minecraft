// LES HUIT MONUMENTS DE PARIS EN RELIEF (v292).
//
// Max : « les monuments reconnaissables ne suffisent pas ». Un voxel de la
// tour Eiffel est un treillis de cubes de quarante-deux mètres de côté ; de
// près, c'est un échafaudage. Cette passe est la SECONDE lecture de la v287,
// appliquée aux repères : elle rend des tampons — treillis, arches, coupoles,
// colonnes, rosace — et NE POSE AUCUN BLOC. Le voxel reste le squelette : les
// collisions, les sauvegardes et le loin ne changent pas d'un octet.
//
// Trois règles portent ce fichier, et les trois viennent de pannes du dépôt.
//
// 1. UN MONUMENT NE DISPARAÎT PAS QUAND SON CENTRE SORT DU CHAMP. Les
//    triangles sont DÉCOUPÉS aux frontières du morceau (Sutherland-Hodgman sur
//    X/Z) : chaque morceau porte sa part, et les UV sont absolues, donc les
//    deux morceaux échantillonnent la même pierre à la couture.
// 2. CE QU'ON MASQUE EST CE QUE LE BÂTISSEUR A ÉCRIT, RIEN D'AUTRE. Les
//    cellules du monument sont demandées au bâtisseur — la même fonction que
//    le générateur de monde appelle, jamais une seconde table — et masquées
//    seulement si le bloc du morceau est ENCORE celui qu'il a posé. Un bloc
//    qu'un enfant ajoute contre le monument reste visible.
// 3. LE COÛT SE PAIE UNE FOIS, PAS À CHAQUE MORCEAU. Le bâtisseur est
//    déterministe : ses cellules sont mémoïsées PAR MORCEAU (`cellulesDuMorceau`).
//    Et « ce monument a-t-il été touché ? » est un INDEX tenu par `World`
//    (`monumentsTouches`), jamais un balayage du journal des blocs — le
//    mailleur est le chemin le plus chaud du jeu.
//
// Aucun objet three, aucun DOM : cette passe tourne aussi dans le worker.
import { rectHD } from './facadeshd.js';

const STONE = ['pierre', [1, .97, .91], [.86, 0], 0];
const TRIM = ['pierre-lisse', [1, .98, .94], [.78, 0], 0];
// LE FER DE LA TOUR EST PEINT, PAS UN MIROIR. Mesuré sur capture : à métal 0,8
// et sans ciel au-dessous de l'horizon, le DESSOUS des plateformes rendait du
// NOIR pur — l'environnement PMREM n'a rien de clair à leur renvoyer. Le vrai
// fer d'Eiffel est couvert de peinture brune : rugueux, et presque pas
// métallique. Même correction pour l'or, qui noircissait sous les coupoles.
const IRON = ['pierre-lisse', [.42, .30, .22], [.62, .06], 0];
const ROOF = ['zinc', [.7, .77, .85], [.4, .75], 0];
const GOLD = ['pierre-lisse', [.92, .63, .21], [.34, .55], .14];
const GLASS = ['verre', [.4, .66, .73], [.12, .65], .12];
const DARK = ['pierre-lisse', [.12, .15, .18], [.8, 0], 0];
const COPPER = ['pierre-lisse', [.26, .46, .39], [.45, .6], 0];
const sub = (a,b) => a.map((v,i)=>v-b[i]);
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm = a => { const d=Math.hypot(...a);return d ? a.map(v=>v/d) : [0,1,0]; };
const add = (a,b,s=1) => a.map((v,i)=>v+b[i]*s);

class Atelier {
  constructor(){this.faces=[];}
  quad(a,b,c,d,m=STONE){this.faces.push({p:[a,b,c,d],m});}
  box(x,y,z,w,h,d,m=STONE){
    const a=x-w/2,b=x+w/2,c=y,e=y+h,f=z-d/2,g=z+d/2;
    this.quad([a,c,g],[b,c,g],[b,e,g],[a,e,g],m);
    this.quad([b,c,f],[a,c,f],[a,e,f],[b,e,f],m);
    this.quad([a,c,f],[a,c,g],[a,e,g],[a,e,f],m);
    this.quad([b,c,g],[b,c,f],[b,e,f],[b,e,g],m);
    this.quad([a,e,g],[b,e,g],[b,e,f],[a,e,f],m);
    this.quad([a,c,f],[b,c,f],[b,c,g],[a,c,g],m);
  }
  beam(a,b,r,m=IRON,sides=6){
    const axis=norm(sub(b,a)), u=norm(cross(axis,Math.abs(axis[1])>.9?[1,0,0]:[0,1,0])),v=cross(axis,u);
    const p=(c,i)=>add(add(c,u,Math.cos(i*2*Math.PI/sides)*r),v,Math.sin(i*2*Math.PI/sides)*r);
    for(let i=0;i<sides;i++)this.quad(p(a,i+1),p(a,i),p(b,i),p(b,i+1),m);
  }
  // Profil de révolution : tambours, coupoles, colonnes, lanternons.
  lathe(x,z,profile,m=STONE,n=40){
    for(let j=0;j<profile.length-1;j++)for(let i=0;i<n;i++){
      const p=(row,k)=>[x+row[1]*Math.cos(k*2*Math.PI/n),row[0],z+row[1]*Math.sin(k*2*Math.PI/n)];
      this.quad(p(profile[j],i+1),p(profile[j],i),p(profile[j+1],i),p(profile[j+1],i+1),m);
    }
  }
  dome(x,y,z,r,h,m=STONE){
    const p=[];for(let i=0;i<=16;i++){const a=i*Math.PI/32;p.push([y+Math.sin(a)*h,Math.max(.001,Math.cos(a)*r)]);}
    this.lathe(x,z,p,m);
  }
  column(x,y,z,r,h,m=TRIM){
    this.lathe(x,z,[[y,r*1.3],[y+.2,r*1.3],[y+.3,r],[y+h-.35,r*.84],[y+h-.2,r*1.35],[y+h,r*1.35]],m,16);
  }
  // Une arcade complète : deux piédroits et les voussoirs, vide traversable.
  arch(x,y,z,r,spring,depth,m=STONE){
    this.box(x-r-.24,y,z,.48,spring,depth,m);this.box(x+r+.24,y,z,.48,spring,depth,m);
    for(let i=0;i<24;i++){
      const a=i*Math.PI/24,b=(i+1)*Math.PI/24;
      const p=(t,rr,zz)=>[x+Math.cos(t)*rr,y+spring+Math.sin(t)*rr,zz];
      const z0=z-depth/2,z1=z+depth/2;
      this.quad(p(a,r,z1),p(a,r+.48,z1),p(b,r+.48,z1),p(b,r,z1),m);
      this.quad(p(b,r,z0),p(b,r+.48,z0),p(a,r+.48,z0),p(a,r,z0),m);
      this.quad(p(a,r,z0),p(a,r,z1),p(b,r,z1),p(b,r,z0),m);
      this.quad(p(b,r+.48,z0),p(b,r+.48,z1),p(a,r+.48,z1),p(a,r+.48,z0),m);
    }
  }
  window(x,y,z,w,h,back=false){
    this.box(x,y,z,w,h,.07,GLASS);
    for(const dx of [-w/2,w/2])this.box(x+dx,y-.12,z+(back?-.06:.06),.12,h+.24,.14,TRIM);
    for(const yy of [y-.12,y+h])this.box(x,yy,z,w+.24,.12,.14,TRIM);
    this.box(x,y,z+(back?-.1:.1),.06,h,.06,TRIM);
  }
}

function eiffel(a){
  const r=y=> y<=16?6-3*Math.pow(y/16,.8):y<=30?3-(y-16)/14:y<=52?2-(y-30)/22:.55;
  for(const sx of [-1,1])for(const sz of [-1,1]){
    for(let y=0;y<52;y+=2)a.beam([sx*r(y),y,sz*r(y)],[sx*r(y+2),y+2,sz*r(y+2)],y<16?.19:.11);
    a.box(sx*6,-.05,sz*6,1.4,.65,1.4,STONE);
  }
  // Les ceintures et les croix de Saint-André, tous les deux blocs. Elles
  // commencent à SIX, pas à seize : le voxel pose une ceinture pleine à y = 6
  // et 12 et une diagonale à chaque niveau intermédiaire, et sans elles ces
  // soixante-quatre cellules restaient en cubes bruns accrochés aux jambes
  // (vu en capture au pied de la tour). Le dessous reste ouvert : c'est la
  // ceinture du SOL, retirée en v292, qui fermait le passage.
  for(let y=6;y<52;y+=2){
    const lo=r(y),hi=r(y+2);
    for(const s of [-1,1]){
      a.beam([-lo,y,s*lo],[hi,y+2,s*hi],.046);a.beam([lo,y,s*lo],[-hi,y+2,s*hi],.046);
      a.beam([s*lo,y,-lo],[s*hi,y+2,hi],.046);a.beam([s*lo,y,lo],[s*hi,y+2,-hi],.046);
      a.beam([-lo,y,s*lo],[lo,y,s*lo],.065);a.beam([s*lo,y,-lo],[s*lo,y,lo],.065);
    }
  }
  // Quatre jambes ajourées, jamais une grille qui ferme le passage central.
  for(const sx of [-1,1])for(const sz of [-1,1])for(let y=0;y<16;y+=2){
    const lo=r(y),hi=r(y+2),w=.65-y*.02,wn=.65-(y+2)*.02;
    for(const axis of [0,2]){
      const p=(h,rr,d)=>{const v=[sx*rr,h,sz*rr];v[axis]+=d;return v;};
      a.beam(p(y,lo,-w),p(y+2,hi,-wn),.065);a.beam(p(y,lo,w),p(y+2,hi,wn),.065);
      a.beam(p(y,lo,-w),p(y+2,hi,wn),.035);a.beam(p(y,lo,w),p(y+2,hi,-wn),.035);
    }
  }
  // LES TROIS PLATEFORMES SONT DES PLANCHERS, pas quatre rails. Le voxel en
  // pose un ANNEAU de deux rangs (`plateforme`, world.js) ; quatre barres fines
  // n'en couvraient qu'un, et l'autre restait en cubes autour du modèle —
  // visible en capture comme des caisses brunes accrochées à la tour.
  // Les rayons sont ceux du VOXEL : `plateforme(P, rayon(P) + 1)` rend un anneau
  // de Tchebychev de deux rangs, à 4, 3 et 2 blocs. Mon premier jet les avait
  // élargis d'un bloc « pour faire plancher » : mesuré, 14,5 % du modèle
  // tombait dans le vide au lieu de 0,8 %.
  for(const [y,R] of [[16,4],[30,3],[52,2]]){
    const dep=R+.55, inn=Math.max(.5,R-1.55), mil=(dep+inn)/2, larg=dep-inn;
    for(const s of [-1,1]){
      a.box(0,y-.35,s*mil,2*dep,.45,larg,IRON);                       // les deux bandes en x
      a.box(s*mil,y-.35,0,larg,.45,2*inn,IRON);                       // les deux bandes en z
      a.beam([-dep,y+1.1,s*dep],[dep,y+1.1,s*dep],.06);               // la main courante
      a.beam([s*dep,y+1.1,-dep],[s*dep,y+1.1,dep],.06);
      for(let d=-dep;d<=dep;d+=.6){a.beam([d,y,s*dep],[d,y+1.1,s*dep],.03);a.beam([s*dep,y,d],[s*dep,y+1.1,d],.03);}
    }
  }
  // Les quatre arcs décoratifs concaves, distincts des pieds porteurs.
  for(let i=0;i<32;i++){
    const x=-6+i*12/32,n=x+12/32;
    const y=t=>3+Math.sqrt(Math.max(0,36-t*t))*1.45;
    for(const s of [-1,1]){a.beam([x,y(x),s*6],[n,y(n),s*6],.13);a.beam([s*6,y(x),x],[s*6,y(n),n],.13);}
  }
  a.lathe(0,0,[[52,.7],[57,.55],[64,.18],[68,.07]],IRON,12);
  a.dome(0,68,0,.15,.3,GOLD);
}
function louvre(a){
  const apex=[0,5.8,0],corners=[[-5.5,0,-5.5],[-5.5,0,5.5],[5.5,0,5.5],[5.5,0,-5.5]];
  for(let i=0;i<4;i++){
    const p=corners[i],q=corners[(i+1)%4];a.quad(p,q,apex,apex,GLASS);
    a.beam(p,apex,.04,TRIM);a.beam(p,q,.055,TRIM);
    for(let j=1;j<12;j++){
      const t=j/12,lerp=(x,y,t)=>x.map((v,k)=>v+(y[k]-v)*t);
      a.beam(lerp(p,apex,t),lerp(q,apex,t),.018,TRIM);
      a.beam(lerp(p,q,t),lerp(p,apex,t),.018,TRIM);
      a.beam(lerp(q,p,t),lerp(q,apex,t),.018,TRIM);
    }
  }
}
function arc(a){
  // Quatre piles laissent libres les deux axes déjà ouverts par les collisions.
  for(const x of [-5.5,5.5])for(const z of [-3.8,3.8]){
    a.box(x,0,z,4,16,1.4);a.box(x,0,z,4.3,.5,1.6,TRIM);
    for(const zz of [-.72,.72]){
      a.box(x,4,z+zz,2.6,6,.1,TRIM);
      for(let k=0;k<5;k++)a.column(x-.8+k*.4,4.3,z+zz*1.05,.14,3+(k%3)*.45);
    }
  }
  for(const z of [-3.8,3.8])a.arch(0,0,z,3.45,10.8,1.4);
  a.box(0,16,0,15,.5,9,TRIM);a.box(0,16.5,0,13,4,7);
  a.box(0,20.5,0,13.4,.35,7.4,TRIM);
  for(const z of [-3.56,3.56])for(let x=-5.8;x<6;x+=.7)a.box(x,17.1,z,.4,1.8,.1,TRIM);
}
function notreDame(a){
  // Axe de la nef est-ouest ; portail à l'ouest, comme le monument du monde.
  for(const z of [-4.05,4.05]){
    a.box(1.5,1,z,20,12.9,.6);
    for(let x=-6;x<=10;x+=2){
      a.window(x,7,z+(z>0?.34:-.34),.65,3.5,z<0);
      // L'ARC-BOUTANT SUIT LES CELLULES DU VOXEL, sinon sa maçonnerie haute
      // reste en cubes accrochés au vide — vu en capture de flanc. Le voxel
      // pose un pied (z ±5..±7), une culée courte à z ±7, et une volée qui
      // descend de (y 12, z ±5) à (y 10, z ±7).
      // Les cotes sont ABSOLUES, pas relatives au mur de la nef : le voxel pose
      // le pied aux cellules z ±5..±7 (y 1), la culée à z ±7 (y 1..3), et la
      // volée descend de (y 12, z ±5) à (y 10, z ±7).
      const s2=z>0?1:-1;
      a.box(x,1,s2*6,.5,1,3,TRIM);                            // le pied
      a.box(x,1,s2*7,.55,3,1,TRIM);                           // la culée montante
      a.beam([x,12.5,s2*5],[x,10.6,s2*7],.45,TRIM);           // la volée
      a.beam([x,12.8,s2*4.3],[x,12.4,s2*5.2],.35,TRIM);       // son appui sur la nef
    }
  }
  a.box(11,1,0,.6,13,8.5);
  a.quad([-8,14,-4.4],[11.5,14,-4.4],[11.5,18,0],[-8,18,0],ROOF);
  a.quad([-8,18,0],[11.5,18,0],[11.5,14,4.4],[-8,14,4.4],ROOF);
  a.lathe(2,0,[[17,1],[20,.8],[29,.03]],ROOF,8);
  a.beam([2,29,0],[2,31,0],.055,GOLD);a.beam([2,30,-.5],[2,30,.5],.04,GOLD);
  // Façade transformée de la face +z à la face -x.
  const f=new Atelier();
  for(const x of [-3,3]){
    f.box(x,1,0,3,12,2.6);
    for(const dx of [-.65,.65]){
      f.box(x+dx,13,0,.35,8,2.6);
      f.arch(x+dx,13,1.35,.4,5,.28);
    }
    f.box(x,21,0,3.4,.65,3);
    for(let dx=-1.5;dx<=1.5;dx+=.3)f.box(x+dx,21.65,1.35,.12,.7,.18,TRIM);
  }
  f.box(0,1,0,3,13,2.6);
  for(const x of [-3,0,3]){f.box(x,1,1.32,.85,3.5,.08,DARK);f.arch(x,1,1.4,.55,2.8,.32);}
  // Rosace : médaillon bleu et rayons de pierre, sans texture de fenêtre répétée.
  for(let i=0;i<48;i++){
    const p=t=>[Math.cos(t)*1.35,10.2+Math.sin(t)*1.35,1.38];
    f.quad([0,10.2,1.38],p(i*Math.PI/24),p((i+1)*Math.PI/24),[0,10.2,1.38],GLASS);
    f.beam(p(i*Math.PI/24),p((i+1)*Math.PI/24),.09,TRIM);
    if(i%3===0)f.beam([0,10.2,1.43],p(i*Math.PI/24),.045,TRIM);
  }
  for(let x=-4.2;x<=4.2;x+=.42)f.column(x,6.2,1.5,.075,1.35);
  for(const y of [5.9,7.8,14.6])f.box(0,y,1.4,9.4,.25,.45,TRIM);
  for(const face of f.faces)a.faces.push({...face,p:face.p.map(([x,y,z])=>[-8.8-z,y,x])});
}
function palais(a,width,depth,height){
  // Coque et porte centrale laissée ouverte, pas un volume plein.
  for(const s of [-1,1]){
    a.box(s*(width/2-.3),1,0,.6,height,depth);
    a.box(s*(width/4+.5),1,depth/2,width/2-1,height,.6);
  }
  a.box(0,1,-depth/2,width,height,.6);a.box(0,4,depth/2,2,height-3,.6);
  a.box(0,height+1,0,width+.5,.4,depth+.5,TRIM);
  for(const z of [-depth/2-.32,depth/2+.32])for(let x=-width/2+1;x<width/2;x+=1.6)
    for(let y=3;y<height-1;y+=2.8)a.window(x,y,z,.65,1.6,z<0);
}
function sacre(a){
  palais(a,14,14,8);
  a.lathe(0,0,[[10,5.4],[12,5.4],[13,4.8]],TRIM);
  a.dome(0,13,0,4.8,6,TRIM);a.column(0,19,0,.45,2);a.beam([0,21,0],[0,23,0],.07,GOLD);
  a.beam([-.5,22,0],[.5,22,0],.06,GOLD);
  for(const x of [-5,5]){a.lathe(x,5,[[9,2],[11,2]],TRIM);a.dome(x,11,5,2,3,TRIM);}
  for(const x of [-3,0,3])a.arch(x,1,7.4,1,3,.7);
}
function pantheon(a){
  palais(a,10,8,10);
  for(let x=-5;x<=5;x+=2)a.column(x,1,-6.5,.37,10);
  a.box(0,11,-5.5,11,.5,4,TRIM);
  a.quad([-5.5,11.5,-7.5],[5.5,11.5,-7.5],[0,15.5,-7.5],[0,15.5,-7.5],TRIM);
  a.lathe(0,0,[[12,3.4],[20,3.4],[21,4.4],[22,4.4]],STONE);
  for(let i=0;i<24;i++){const t=i*Math.PI/12;a.column(Math.cos(t)*3.9,13,Math.sin(t)*3.9,.18,7);}
  a.dome(0,22,0,4.7,5,ROOF);a.column(0,27,0,.65,3);a.dome(0,30,0,.7,1,ROOF);
}
// LES INVALIDES. Mon premier jet posait la coque générique de `palais` au
// milieu du repère : mesuré à la sonde, VINGT-CINQ POUR CENT du modèle tombait
// dans le vide et trois cent vingt-cinq cellules de voxel restaient sans rien
// devant elles. Le voxel n'est pas centré — c'est une longue façade au NORD
// (x ±10, z −5..−2) et, derrière, l'église du Dôme au SUD (x ±5, z 0..8). Les
// cotes ci-dessous sont les siennes, parce que c'est lui qui arrête l'enfant.
function invalides(a){
  const FZ=-3.5;                                                  // le milieu de la façade
  for(const s of [-1,1])a.box(s*10.1,1,FZ,1.4,8,4.2);             // les pavillons d'about
  a.box(0,1,-5.3,21,8,.8);                                        // le mur du nord, sur l'esplanade
  for(const s of [-1,1])a.box(s*6.3,1,-1.7,8.4,8,.8);             // le mur de cour, le portail au milieu
  a.box(0,5.5,-1.7,3.8,3.5,.8);                                   // le linteau du portail
  a.box(0,9,FZ,21.6,.5,4.6,TRIM);                                 // la corniche
  // Le comble de zinc, à deux pentes, dans le bloc du voxel.
  a.quad([-10.8,9.5,-5.5],[10.8,9.5,-5.5],[10.8,10.6,FZ],[-10.8,10.6,FZ],ROOF);
  a.quad([-10.8,10.6,FZ],[10.8,10.6,FZ],[10.8,9.5,-1.5],[-10.8,9.5,-1.5],ROOF);
  for(let x=-9;x<=9;x+=2)for(const y of [2.6,5.6])a.window(x,y,-5.72,.65,1.6,true);
  for(const x of [-4,0,4])a.arch(x,1,-1.85,.9,3.2,.6);            // les arcades sur la cour
  // L'ÉGLISE DU DÔME, au sud : x ±5, z 0..8, et l'or par-dessus.
  for(const s of [-1,1])a.box(s*5.2,1,4,.8,12,9);
  a.box(0,1,8.2,11,12,.8);a.box(0,1,-.2,11,12,.8);
  for(const x of [-3,0,3])for(const y of [3.6,7.6])a.window(x,y,8.62,.7,1.8);
  a.arch(0,1,8.7,1.1,3.4,.7);                                     // le portail du sud
  a.box(0,13,4,11.6,.5,9.6,TRIM);
  a.lathe(0,4,[[13,4.3],[14.2,4.3],[15,4.1]],STONE);              // le tambour
  for(let i=0;i<16;i++){const t=i*Math.PI/8;a.column(Math.cos(t)*4.1,13.2,4+Math.sin(t)*4.1,.16,1.6);}
  a.dome(0,15,4,4.1,5,GOLD);a.column(0,19.8,4,.5,1.8,GOLD);
  a.beam([0,21.6,4],[0,22.8,4],.07,GOLD);
}
function opera(a){
  palais(a,14,8,8);
  for(let x=-6;x<=6;x+=1.5){a.column(x,4,-4.5,.18,4);a.dome(x,8.4,-4.5,.23,.45,GOLD);}
  a.dome(0,10,1,4.8,4,COPPER);a.column(0,14,1,.4,3,GOLD);
  for(const x of [-6,6]){a.box(x,10,0,1.4,.4,1.4,TRIM);a.column(x,10.4,0,.25,2,GOLD);}
}
export const MONUMENTS_HD = Object.freeze({
  'Tour Eiffel': eiffel, 'Pyramide du Louvre': louvre, 'Arc de Triomphe': arc,
  'Notre-Dame': notreDame, 'Sacré-Cœur': sacre, 'Panthéon': pantheon,
  'Invalides': invalides, 'Opéra': opera,
});

// Le même nom des deux côtés : `world.js` filtre ses repères là-dessus, ce
// fichier les dessine. Un nom absent d'ici garde son voxel, et c'est tout.
export const aUnModeleHD = (nom) => Object.prototype.hasOwnProperty.call(MONUMENTS_HD, nom);

const cache = new Map();
export function geometrieMonument(nom) {
  if (!cache.has(nom)) { const a = new Atelier(); MONUMENTS_HD[nom]?.(a); cache.set(nom, a.faces); }
  return cache.get(nom);
}

// L'EMPRISE MESURÉE DU MODÈLE, en écart au centre du repère. C'est ce qu'un
// témoin compare à la boîte du voxel : une géométrie qui sortirait de la boîte
// serait vue sans être touchée — l'enfant traverserait une pierre. On la
// MESURE sur les sommets émis, on ne la déclare pas (v223 : un emplacement se
// mesure, il ne s'écrit pas).
export function boiteHD(nom) {
  const faces = geometrieMonument(nom);
  const b = { x: 0, y0: Infinity, y1: -Infinity, z: 0 };
  for (const f of faces) for (const p of f.p) {
    b.x = Math.max(b.x, Math.abs(p[0]));
    b.z = Math.max(b.z, Math.abs(p[2]));
    b.y0 = Math.min(b.y0, p[1]); b.y1 = Math.max(b.y1, p[1]);
  }
  return b;
}

// La portée en blocs du modèle : le morceau qui la touche doit l'émettre, sinon
// une aile du monument est coupée net à la frontière. Elle est toujours
// comparée à la boîte du repère, jamais substituée à elle.
export const porteeHD = (nom) => { const b = boiteHD(nom); return Math.ceil(Math.max(b.x, b.z)); };

// --- ce que le modèle COUVRE, et c'est lui qui décide du masquage ------------------

// CE QU'ON MASQUE EST CE QUE LE MODÈLE COUVRE, PAS CE QUE LE BÂTISSEUR A ÉCRIT
// — et c'est une mesure qui l'a imposé, pas un raisonnement.
//
// Mon premier jet masquait toutes les cellules du bâtisseur. Mesuré à la sonde
// (`tests/sonde-monuments-hd.cjs`), cela laissait **des murs invisibles** :
// 325 cellules exposées aux Invalides, 128 à Notre-Dame — dont les
// soixante-dix-neuf du PARVIS — que le modèle ne dessine nulle part. L'enfant
// se cogne à rien, et un parvis pavé disparaît sous ses pieds. Entre un cube
// qui dépasse d'un modèle lisse et un mur qu'on ne voit pas, on choisit le
// cube : il est honnête, et il arrête ce qu'il a l'air d'arrêter.
//
// La couverture se mesure en RASTÉRISANT les triangles — comparer des SOMMETS
// ne dit rien d'un grand quad, qui traverse du terrain sans y poser de sommet —
// et elle est dilatée d'un bloc, exactement la tolérance de la sonde.
const couvertes = new Map();
export function cellulesCouvertes(nom) {
  let ens = couvertes.get(nom);
  if (ens) return ens;
  const brut = new Set();
  for (const f of geometrieMonument(nom)) {
    for (const [ia, ib, ic] of [[0, 1, 2], [0, 2, 3]]) {
      const A = f.p[ia], B = f.p[ib], C = f.p[ic];
      if (!A || !B || !C) continue;
      const n = Math.max(2, Math.ceil(3 * Math.max(
        Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]),
        Math.hypot(C[0] - A[0], C[1] - A[1], C[2] - A[2]))));
      for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) {
        const u = i / n, v = j / n;
        brut.add(`${Math.round(A[0] + (B[0] - A[0]) * u + (C[0] - A[0]) * v)},`
          + `${Math.floor(A[1] + (B[1] - A[1]) * u + (C[1] - A[1]) * v)},`
          + `${Math.round(A[2] + (B[2] - A[2]) * u + (C[2] - A[2]) * v)}`);
      }
    }
  }
  ens = new Set();
  for (const k of brut) {
    const [x, y, z] = k.split(',').map(Number);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      ens.add(`${x + dx},${y + dy},${z + dz}`);
    }
  }
  couvertes.set(nom, ens);
  return ens;
}

// --- ce que le bâtisseur a écrit, par morceau ---------------------------------------

// Les cellules que le bâtisseur du VOXEL pose, rangées par morceau et
// mémoïsées. Le bâtisseur peut effacer une cellule après l'avoir posée — la
// dernière écriture fait foi, comme dans le générateur de monde — d'où la
// table intermédiaire. `by` est la cote du sol sous le repère : elle est
// déterministe, donc la clé du cache n'a pas à la porter.
const parMorceau = new Map();
export function cellulesDuMorceau(lm, baseX, baseZ, by, taille, hauteur) {
  const cle = `${lm.name}|${baseX}|${baseZ}`;
  let liste = parMorceau.get(cle);
  if (liste) return liste;
  const cellules = new Map();
  lm.build((x, y, z, id) => { if (y >= 0) cellules.set(`${x},${y},${z}`, id); });
  const couvre = cellulesCouvertes(lm.name);
  liste = [];
  for (const [k, id] of cellules) {
    if (id === 0) continue;                            // BLOCK.AIR : le bâtisseur a creusé
    if (!couvre.has(k)) continue;                      // le modèle ne le remplace pas : il reste en cubes
    const [x, y, z] = k.split(',').map(Number);
    const lx = x + lm.x - baseX, lz = z + lm.z - baseZ, yy = y + by;
    if (lx < 0 || lx >= taille || lz < 0 || lz >= taille || yy < 0 || yy >= hauteur) continue;
    liste.push(lx + lz * taille + yy * taille * taille, id);
  }
  liste = Int32Array.from(liste);
  parMorceau.set(cle, liste);
  return liste;
}

// --- l'émission, découpée au morceau -----------------------------------------------

// Sutherland-Hodgman sur X/Z. Les attributs restent continus à la couture.
function clip(poly, axis, edge, sign) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const da = (a[axis] - edge) * sign, db = (b[axis] - edge) * sign;
    if (da >= 0) out.push(a);
    if ((da >= 0) !== (db >= 0)) { const t = da / (da - db); out.push(a.map((v, k) => v + (b[k] - v) * t)); }
  }
  return out;
}

export function emettreMonument(buf, nom, dx, by, dz, taille = 16) {
  for (const face of geometrieMonument(nom)) {
    const original = face.p.map((p) => [p[0] + dx + 0.5, p[1] + by, p[2] + dz + 0.5]);
    const normal = norm(cross(sub(original[1], original[0]), sub(original[2], original[0])));
    let p = original;
    for (const [axis, edge, sign] of [[0, 0, 1], [0, taille, -1], [2, 0, 1], [2, taille, -1]]) {
      p = clip(p, axis, edge, sign);
      if (p.length < 3) break;
    }
    if (p.length < 3) continue;
    const [tile, color, mat, glow] = face.m, rect = rectHD(tile);
    // Coordonnées UV absolues : deux morceaux échantillonnent la même pierre.
    const dominant = normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs)));
    const ids = p.map((v) => buf.sommet(v, normal,
      dominant === 1 ? [v[0] - dx, v[2] - dz] : [dominant === 0 ? v[2] - dz : v[0] - dx, v[1] - by],
      rect, color, mat, glow));
    for (let i = 1; i < ids.length - 1; i++) {
      const area = Math.hypot(...cross(sub(p[i], p[0]), sub(p[i + 1], p[0])));
      if (area > 1e-9) buf.indices.push(ids[0], ids[i], ids[i + 1]);
    }
  }
}
