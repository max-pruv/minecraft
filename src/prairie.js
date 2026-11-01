// Détail végétal bas, semé dans le tampon HD existant. Aucun bloc, aucune
// collision, aucun appel de dessin par touffe. Le terrain et les routes
// restent les seules surfaces sur lesquelles roulent les véhicules.
import { BLOCK } from './blocks.js';
import { rectHD } from './facadeshd.js';
import { TEINTE_HERBE_LIN } from './terre.js';
import { villeMondeEn } from './villesmonde.js';

const hasard = (x,z,k) => {
  let n = Math.imul(x,374761393)^Math.imul(z,668265263)^Math.imul(k,1274126177);
  n = Math.imul(n^(n>>>13),1274126177);
  return ((n^(n>>>16))>>>0)/4294967296;
};

export function emettrePrairie(buf,world,grille,teintes) {
  const { chunk:C, baseX:ox, baseZ:oz, idx, cote, dessinee, cid } = grille;
  const rect = rectHD('brin');
  let touffes = 0;
  // Une station au plus par carré de 2×2 : budget maximal connu (64 touffes,
  // 1 536 sommets / 144 Ko), et répartition stable d'un chargement à l'autre.
  for (let z=0;z<C;z+=2) for (let x=0;x<C;x+=2) {
    const wx=ox+x,wz=oz+z;
    if (hasard(wx,wz,0)<.25 || !dessinee[cid(x,z)]) continue;
    const y0=cote[idx(x,z)];
    if (world.getBlock(wx,Math.floor(y0)-1,wz)!==BLOCK.GRASS) continue;
    if (world.getBlock(wx,Math.floor(y0),wz)!==BLOCK.AIR) continue;
    if ((world.corridorEn && world.corridorEn(wx,wz)) || (world.cityAt && world.cityAt(wx,wz))) continue;
    if (villeMondeEn(wx,wz)) continue;
    const dx=hasard(wx,wz,1)*.8,dz=hasard(wx,wz,2)*.8;
    const b=cote[idx(x+1,z)],c=cote[idx(x,z+1)],d=cote[idx(x+1,z+1)];
    if (Math.max(y0,b,c,d)-Math.min(y0,b,c,d)>.5) continue;
    const y=y0+(dz>dx?(c-y0)*dz+(d-c)*dx:(b-y0)*dx+(d-b)*dz);
    if (world.getBlock(Math.floor(wx+.5+dx),Math.floor(y+.1),Math.floor(wz+.5+dz))!==BLOCK.AIR) continue;
    const climat=teintes?.[x+z*C]||0;
    const teinte=TEINTE_HERBE_LIN[climat]||[1,1,1];
    const sec=hasard(wx,wz,3)>.72;
    const couleur=sec?[.62,.51,.25]:[.24,.36,.10];
    for(let k=0;k<4;k++) {
      const angle=hasard(wx,wz,k+10)*Math.PI*2;
      const ca=Math.cos(angle),sa=Math.sin(angle);
      const largeur=.018+hasard(wx,wz,k+20)*.018;
      const h=.18+hasard(wx,wz,k+30)*.28;
      const courbe=.08+hasard(wx,wz,k+40)*.12;
      const ids=[];
      for(let etage=0;etage<3;etage++) {
        const t=etage/2, w=largeur*(1-t*.92);
        for(const s of [-1,1]) {
          ids.push(buf.sommet([x+.5+dx+ca*courbe*t*t-sa*w*s,y+h*t,z+.5+dz+sa*courbe*t*t+ca*w*s],
            [-ca*.25,.94,-sa*.25],[(s+1)/2,t],rect,
            couleur.map((v,i)=>v*teinte[i]*(.65+t*.6)),[.95,0],0));
        }
      }
      for(let j=0;j<4;j+=2) {
        buf.quadIndices(ids[j],ids[j+1],ids[j+3],ids[j+2]);
        buf.quadIndices(ids[j+2],ids[j+3],ids[j+1],ids[j]);
      }
    }
    touffes++;
  }
  return touffes;
}
