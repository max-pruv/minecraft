// QUI EST SUR LA CHAUSSÉE À ROME, ET POURQUOI ? (dette des portails v351-v354)
//
// Le témoin « les passants ne sont plus plantés au milieu de la chaussée »
// rend 5 sur 21 au portail et 0 ou 1 rejoué seul. Un seul nombre pour
// plusieurs pannes ne se démonte pas (v223) : cette sonde suit chaque passant
// depuis sa NAISSANCE (on enveloppe `placeAt` avant d'arriver à Rome) et, à
// chaque relevé, classe ceux qui sont sur la chaussée :
//   nais     — posé sur la chaussée par `posteAutour` (naissance ou rapatriement)
//   traverse — en pleine traversée au feu (v371), légitime
//   ecart    — en plein pas de côté devant une voiture (v351)
//   flaneur  — `surTrottoir` faux : l'ancien programme, qui va n'importe où
//   promeneur— `surTrottoir` vrai : sorti du trottoir en marchant
//   node tests/sonde-chaussee-rome.cjs [secondes] [attente avant, s]
const { Banc, souffler } = require('./banc.js');
const duree = +process.argv[2] || 60;
const avant = +process.argv[3] || 0;
(async () => {
  const banc = new Banc({ portJeu: 8423, portPairs: 9423 });
  await banc.ouvrir();
  try {
    await souffler();
    const tab = await banc.jouerSeul('ChausseeRome');
    const r = await tab.evaluate(async ({ duree, avant }) => {
      const g = window.__game;
      const { positionDe } = await import('./src/mondes.js');
      const { TROTTOIR, CHAUSSEE } = await import('./src/world.js');
      const { Habitant } = await import('./src/vie.js');
      const dormir = (ms) => new Promise((f) => setTimeout(f, ms));
      const cat = (x, z) => {
        const bx = Math.floor(x), bz = Math.floor(z);
        const b = g.world.getBlock(bx, g.world.sommetColonne(bx, bz), bz);
        return TROTTOIR.has(b) ? 't' : CHAUSSEE.has(b) ? 'c' : 'a';
      };
      // chaque pose (naissance, rapatriement) note où elle tombe
      const placeAt0 = Habitant.prototype.placeAt;
      Habitant.prototype.placeAt = function (x, z, y) { placeAt0.call(this, x, z, y); this._nePose = cat(x, z); };
      const p = positionDe('rome');
      g.player.flying = true;
      g.player.pos.set(p.x, g.world.terrainHeight(p.x, p.z) + 6, p.z);
      g.player.vel.set(0, 0, 0);
      await dormir(16000 + avant * 1000);
      const comptes = { releves: 0, chaussee: 0, nais: 0, traverse: 0, ecart: 0, flaneur: 0, promeneur: 0 };
      const instantanes = [];
      const t0 = performance.now();
      while (performance.now() - t0 < duree * 1000) {
        const s2 = g.passants.sites.find((q) => q.peuple && q.peuple.length);
        const gens = s2 ? s2.peuple.filter((h) => h.name === 'passant') : [];
        let ici = 0;
        for (const h of gens) {
          comptes.releves++;
          if (cat(h.pos.x, h.pos.z) !== 'c') continue;
          comptes.chaussee++; ici++;
          const anime = Math.hypot(h.pos.x - g.player.pos.x, h.pos.z - g.player.pos.z) < 80;
          if (h.traversee) comptes.traverse++;
          else if (h.ecart) comptes.ecart++;
          else if (h._nePose === 'c' && (!anime || Math.hypot(h.pos.x - h.poste.x, h.pos.z - h.poste.y) < 0.6)) comptes.nais++;
          else if (h.surTrottoir) comptes.promeneur++;
          else comptes.flaneur++;
        }
        instantanes.push(`${ici}/${gens.length}`);
        await dormir(500);
      }
      Habitant.prototype.placeAt = placeAt0;
      return { ...comptes, part: +(comptes.chaussee / Math.max(1, comptes.releves)).toFixed(3), instantanes: instantanes.filter((_, i) => i % 6 === 0).join(' ') };
    }, { duree, avant });
    console.log(JSON.stringify(r));
  } catch (e) { console.log('ERREUR', e.message); } finally { await banc.fermer(); process.exit(0); }
})();
