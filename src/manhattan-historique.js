// La refonte des volumes cède aux constructions sauvegardées : conserver un
// immeuble complet, y compris son toit, plutôt que laisser un bloc suspendu.
import { IMMEUBLES_V582 } from './manhattan-avant-osm.js';
import { BATIMENTS, DATE_NY_MODELES } from './manhattan-plan.js';
export const DATE_OSM = DATE_NY_MODELES;
export const BATIMENTS_HISTORIQUES = IMMEUBLES_V582.map((b,i)=>({ ...b, id:BATIMENTS.length+i, historique:true }));
const cases=new Map();
for(const b of BATIMENTS_HISTORIQUES) {
  for(let z=Math.floor((b.z0-2)/32);z<=Math.floor((b.z1+2)/32);z++)
    for(let x=Math.floor((b.x0-2)/32);x<=Math.floor((b.x1+2)/32);x++) {
      const k=`${x},${z}`;if(!cases.has(k))cases.set(k,[]);cases.get(k).push(b);
    }
}
export function immeublesHistoriquesEn(x,z,marge=0) {
  return (cases.get(`${Math.floor(x/32)},${Math.floor(z/32)}`)||[])
    .filter(b=>x>=b.x0-marge&&x<b.x1+marge&&z>=b.z0-marge&&z<b.z1+marge);
}
export const chevauchent=(a,b)=>a.x0<b.x1&&a.x1>b.x0&&a.z0<b.z1&&a.z1>b.z0;
