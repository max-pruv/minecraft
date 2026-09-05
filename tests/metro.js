// Le métro de Paris passe sous terre.
//
// CE QUI L'A DÉCLENCHÉ. Max, en jouant : « pas du tout de métro ou de train
// aérien à Paris. Typiquement, la réalité voudrait dire qu'on devrait avoir un
// métro souterrain. Le train ne devrait pas être aérien. » Il avait raison :
// un anneau aérien faisant le tour de Paris n'existe nulle part, et le viaduc
// parisien se limite à deux tronçons des lignes 2 et 6.
//
// Ce témoin ne vérifie pas « il y a un tunnel quelque part ». Il vérifie ce
// qu'un enfant vit : plus rien en l'air au-dessus des toits, une bouche de
// métro trouvable depuis la rue, un quai où l'on tient debout, et une rame qui
// roule dedans.
//
//     cd tests && npm run metro

const { Banc, dormir, jusqua } = require('./banc.js');

const echecs = [];
function verifier(nom, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${nom}${detail ? ` — ${detail}` : ''}`);
  if (!ok) echecs.push(nom + (detail ? ` — ${detail}` : ''));
}

const PARIS = { x: -240, z: 200 };
const RAYON = 38;

(async () => {
  const banc = new Banc({ portJeu: 8391, portPairs: 9391 });
  await banc.ouvrir();
  try {
    const tab = await banc.jouerSeul('Camille');
    // On amène l'enfant à Paris : sans cela le monde autour n'est jamais bâti
    // et l'on éprouverait des morceaux de terrain qui n'existent pas.
    await tab.evaluate((p) => {
      window.__game.player.pos.x = p.x;
      window.__game.player.pos.z = p.z;
      window.__game.player.pos.y = window.__game.world.terrainHeight(p.x, p.z) + 2;
    }, PARIS);
    await dormir(4000);

    // LE TÉMOIN PRINCIPAL : plus de tablier au-dessus des toits.
    //
    // Première version de ce témoin : compter TOUT ce qui est solide au-dessus
    // du sol le long de l'anneau. Elle rendait 2 459 blocs — et c'étaient les
    // immeubles de Paris, que l'anneau traverse. Le témoin accusait la ville
    // d'être un viaduc.
    //
    // Ce qui distingue un viaduc d'un quartier, c'est la CONTINUITÉ : une voie
    // ferrée est pleine à une hauteur donnée sur tout le tour, là où des
    // immeubles sont épars. On cherche donc la hauteur la plus « pleine » entre
    // trois et quinze blocs au-dessus du sol. Le viaduc y montait à près de
    // cent pour cent ; un quartier n'y arrive jamais.
    const pont = await tab.evaluate(({ p, R }) => {
      const w = window.__game.world;
      const sol = w.terrainHeight(p.x, p.z);
      let pire = 0, pireY = null;
      for (let y = sol + 3; y <= sol + 15; y++) {
        let pleins = 0;
        for (let i = 0; i < 180; i++) {
          const a = (i / 180) * Math.PI * 2;
          const x = Math.round(p.x + Math.sin(a) * R);
          const z = Math.round(p.z + Math.cos(a) * R);
          if (w.isSolid(x, y, z)) pleins++;
        }
        if (pleins > pire) { pire = pleins; pireY = y - sol; }
      }
      return { part: pire / 180, hauteur: pireY };
    }, { p: PARIS, R: RAYON });
    verifier('plus aucun tablier continu ne fait le tour au-dessus des toits',
      pont.part < 0.5,
      `hauteur la plus pleine : +${pont.hauteur}, ${Math.round(pont.part * 100)} % du tour`);

    // Et le tunnel existe VRAIMENT sous terre : creusé, et sur tout le tour.
    const tunnel = await tab.evaluate(({ p, R }) => {
      const w = window.__game.world;
      const sol = w.terrainHeight(p.x, p.z);
      let creux = 0, total = 0;
      for (let i = 0; i < 180; i++) {
        const a = (i / 180) * Math.PI * 2;
        const x = Math.round(p.x + Math.sin(a) * R);
        const z = Math.round(p.z + Math.cos(a) * R);
        total++;
        // au niveau des rails, l'air doit être libre juste au-dessus de la voie
        if (!w.isSolid(x, sol - 5, z) && !w.isSolid(x, sol - 4, z)) creux++;
      }
      return { creux, total };
    }, { p: PARIS, R: RAYON });
    verifier('le tunnel fait bien tout le tour, sans interruption',
      tunnel.creux >= tunnel.total * 0.9, `${tunnel.creux} points dégagés sur ${tunnel.total}`);

    // Une bouche de métro se voit depuis la rue : c'est ce qui rend le métro
    // trouvable. Un tunnel parfait mais invisible ne sert à personne.
    const bouches = await tab.evaluate(({ p, R }) => {
      const w = window.__game.world;
      const sol = w.terrainHeight(p.x, p.z);
      let trouvees = 0;
      for (const [sx, sz] of [[0, -R], [R, 0], [0, R], [-R, 0]]) {
        let bati = 0;
        for (let dx = -14; dx <= 14; dx++) {
          for (let dz = -14; dz <= 14; dz++) {
            for (let y = sol + 1; y <= sol + 6; y++) {
              if (w.isSolid(Math.round(p.x + sx + dx), y, Math.round(p.z + sz + dz))) bati++;
            }
          }
        }
        if (bati > 6) trouvees++;   // l'édicule : deux mâts, une arche, l'enseigne
      }
      return trouvees;
    }, { p: PARIS, R: RAYON });
    verifier('les quatre stations ont leur bouche visible depuis la rue',
      bouches === 4, `${bouches} bouche(s) sur 4`);

    // Un quai, c'est un endroit où l'on tient debout à côté de la voie —
    // pas la voie elle-même. Deux blocs d'air au-dessus du sol du quai.
    const quai = await tab.evaluate(({ p, R }) => {
      const w = window.__game.world;
      const sol = w.terrainHeight(p.x, p.z);
      let debout = 0;
      // La perpendiculaire au quai se DÉDUIT comme le bâtisseur la déduit —
      // la première version la donnait à la main et se trompait sur deux
      // stations, ce qui faisait accuser des quais parfaitement praticables.
      for (const [sx, sz] of [[0, -R], [R, 0], [0, R], [-R, 0]]) {
        const long = Math.abs(sx) > Math.abs(sz);
        const [px, pz] = long ? [1, 0] : [0, 1];
        const cote = Math.sign(sx || sz);
        for (let d = 2; d <= 4; d++) {
          const x = Math.round(p.x + sx - px * cote * d);
          const z = Math.round(p.z + sz - pz * cote * d);
          const y = sol - 7;
          if (w.isSolid(x, y, z) && !w.isSolid(x, y + 1, z) && !w.isSolid(x, y + 2, z)) debout++;
        }
      }
      return debout;
    }, { p: PARIS, R: RAYON });
    verifier('on tient debout sur les quais, à côté de la voie',
      quai >= 8, `${quai} points praticables sur 12`);

    // Et la rame roule bien dans le tunnel, pas au-dessus.
    const rame = await tab.evaluate(({ p }) => {
      const w = window.__game.world;
      const sol = w.terrainHeight(p.x, p.z);
      const e = window.__vehicules && window.__vehicules.etat && window.__vehicules.etat();
      const m = (e || []).find((v) => v.nom === 'métro');
      return m ? { y: m.y, sol } : null;
    }, { p: PARIS });
    verifier('la rame roule sous le niveau de la rue',
      rame && rame.y < rame.sol, JSON.stringify(rame));

    // --- ON N'ATTEND PAS UNE MINUTE SUR UN QUAI -----------------------------
    //
    // Max : « make sure trains arrive and depart from train stations ». Les
    // gares étaient au bon endroit — les dix-huit arrêts tombent à zéro bloc
    // d'une gare — mais chaque ligne n'avait que DEUX trains pour un tour qui
    // dure jusqu'à cent vingt-sept secondes. L'attente sur un quai allait de
    // vingt-six à soixante-quatre secondes.
    //
    // La règle existait déjà, écrite pour le métro de Washington : « trois
    // rames ramènent l'attente sous la demi-minute, ce qui est déjà
    // l'intervalle du vrai métro aux heures creuses ». Six lignes sur neuf la
    // violaient.
    //
    // Le témoin ne chronomètre RIEN — une durée mesurée sur ce banc mesure le
    // banc. Il lit le nombre de convois que le jeu a réellement créés par
    // ligne, recalcule le tour depuis la géométrie de la voie, et divise.
    // C'est ce que l'enfant obtient : le temps entre deux trains à son quai.
    const quais = await tab.evaluate(async () => {
      const w = window.__game.world;
      const t = await import('./src/trains.js');
      const e = (window.__vehicules && window.__vehicules.etat && window.__vehicules.etat()) || [];
      const lignes = [];
      for (const seg of t.segmentsDeTrain()) {
        const tr = t.traceSegment(seg, (x, z) => w.terrainHeight(x, z), 32);
        let L = 0;
        for (let i = 0; i < tr.pts.length; i++) {
          const a = tr.pts[i], b = tr.pts[(i + 1) % tr.pts.length];
          L += Math.hypot(b.x - a.x, b.z - a.z);
        }
        // Le nom porte le segment : deux segments d'une même ligne n'ont ni la
        // même longueur ni le même nombre de trains, et les confondre rendait
        // « 3,5 trains » — un chiffre qui n'existe pas.
        const nom = `train ${seg.ligne.nom} ${seg.de}–${seg.vers}`;
        const convois = e.filter((v) => v.nom === nom).length;
        const tour = L / 14 + tr.arretsIndex.length * 4;
        lignes.push({ ligne: seg.ligne.nom, de: seg.de, vers: seg.vers,
          convois, attente: Math.round(tour / Math.max(1, convois)) });
      }
      return lignes;
    });
    const pire = quais.reduce((a, b) => (b.attente > a.attente ? b : a), quais[0] || { attente: 999 });
    verifier('un train se présente au quai au moins toutes les trente secondes',
      quais.length > 0 && quais.every((l) => l.attente <= 31),
      `pire : ${pire.ligne} ${pire.de}→${pire.vers} ${pire.attente} s avec ${pire.convois} train(s)`
      + ` · toutes : ${quais.map((l) => l.attente).join(' ')}`);

    verifier('aucune erreur JavaScript de bout en bout',
      tab.erreurs.length === 0, JSON.stringify(tab.erreurs.slice(0, 3)));
  } finally {
    await banc.fermer();
  }

  console.log(echecs.length
    ? `\n❌ ${echecs.length} défaut(s) :\n   ${echecs.join('\n   ')}`
    : '\n✅ le métro de Paris passe sous terre, et on sait y descendre');
  process.exit(echecs.length ? 1 : 0);
})().catch((e) => { console.error('\n💥 le banc d\'essai a lâché :', e); process.exit(2); });
