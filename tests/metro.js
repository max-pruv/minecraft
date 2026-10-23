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

// L'ANNEAU SE DEMANDE, IL NE S'ÉCRIT PAS (v293). Ces deux constantes étaient
// l'adresse de la caserne en BLOCS — `{ x: -240, z: 200 }`, le cœur de Paris —
// et son rayon recopié. Le jour où le village a déménagé en banlieue, le témoin
// a continué de creuser au même endroit et a rendu « 14 points dégagés sur
// 180 » sur un tunnel parfaitement creusé, ailleurs. C'est « un témoin qui
// porte une dimension de ville ne l'écrit pas, il la demande » (v203, v271,
// v274, v279, v281), pour une ADRESSE.
let PARIS = { x: -240, z: 200 };     // repli : l'ancienne adresse, si le module est trop ancien
let RAYON = 38;

(async () => {
  const banc = new Banc({ portJeu: 8391, portPairs: 9391 });
  await banc.ouvrir();
  try {
    const tab = await banc.jouerSeul('Camille');
    // L'adresse du village et le rayon de son anneau viennent des modules.
    const ou = await tab.evaluate(async () => {
      const [w, v] = await Promise.all([import('./src/world.js'), import('./src/ville.js')]);
      return { x: w.VILLE && w.VILLE.x, z: w.VILLE && w.VILLE.z, r: v.ANNEAU && v.ANNEAU.rayon };
    }).catch(() => null);
    if (ou && Number.isFinite(ou.x) && Number.isFinite(ou.z)) PARIS = { x: ou.x, z: ou.z };
    if (ou && Number.isFinite(ou.r)) RAYON = ou.r;
    console.log(`   📍 l'anneau du village : (${PARIS.x}, ${PARIS.z}), rayon ${RAYON}`);
    // On amène l'enfant sur place : sans cela le monde autour n'est jamais bâti
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
        // ON COMPTE PAR LA GÉOMÉTRIE, PAS PAR LE NOM. Deux segments d'une même
        // ligne n'ont ni la même longueur ni le même nombre de trains : les
        // confondre rendait « 3,5 trains », un chiffre qui n'existe pas. Et
        // le nom ne peut pas servir d'arbitre, puisqu'il a changé dans cette
        // même livraison — un témoin qui s'y fierait compterait ZÉRO train sur
        // l'ancien code et annoncerait le bon verdict pour la mauvaise raison.
        // La longueur du tour, elle, ne dépend d'aucun nom.
        const convois = e.filter((v) => v.nom.startsWith(`train ${seg.ligne.nom}`)
          && Math.abs(v.longueur - L) <= 2).length;
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

    // --- LA LIGNE 1 DE PARIS : LE TRAJET DE L'ENFANT (v473) -------------------
    //
    // L'anneau a suivi la caserne en banlieue (v293) : Paris n'avait plus de
    // métro. La ligne 1 passe sous les Champs-Élysées, Rivoli et le Faubourg.
    // La descente case par case de chaque bouche au quai se prouve sous node
    // (`sonde-metro-paris.mjs`, lue par plafond.js) ; ici on éprouve ce que le
    // banc seul peut éprouver : l'édicule se voit de la rue, on se tient sur le
    // quai, la rame jaune se présente, on monte, et elle nous emmène à la
    // station suivante. Le temps se compte en secondes de JEU (dt borné, v270).
    const l1 = await tab.evaluate(async () => {
      const v = await import('./src/ville.js');
      if (!v.BOUCHES_LIGNE1) return null;
      const b = v.BOUCHES_LIGNE1.find((x) => x && x.nom === 'Concorde') || v.BOUCHES_LIGNE1.find(Boolean);
      return { nom: b.nom, tx: b.tx, tz: b.tz, q: { x: b.q.x, z: b.q.z, dx: b.q.dx, dz: b.q.dz }, cote: b.cote,
        yr: v.LIGNE1.voie, quais: v.QUAIS_LIGNE1.map((q) => ({ nom: q.nom, x: q.x, z: q.z })) };
    }).catch(() => null);
    if (!l1) {
      verifier('Paris a sa ligne 1 de métro, avec ses bouches et ses quais', false, 'ville.js ne publie pas de ligne 1');
    } else {
      // l'édicule, vu de la rue : du vert Guimard au-dessus du trottoir
      await tab.evaluate(({ tx, tz }) => {
        const g = window.__game;
        g.player.pos.x = tx; g.player.pos.z = tz;
        g.player.pos.y = g.world.terrainHeight(Math.floor(tx), Math.floor(tz)) + 2;
      }, l1);
      await dormir(4000);
      const edicule = await tab.evaluate(({ tx, tz }) => {
        const w = window.__game.world;
        let vert = 0, trou = 0;
        for (let dx = -8; dx <= 8; dx++) for (let dz = -8; dz <= 8; dz++) {
          const x = Math.floor(tx) + dx, z = Math.floor(tz) + dz, h = w.terrainHeight(x, z);
          for (let y = h + 1; y <= h + 5; y++) if (w.getBlock(x, y, z) === 40 + 13 * 10) vert++;
          if (w.getBlock(x, h, z) === 0 && w.getBlock(x, h - 1, z) === 0) trou++;
        }
        return { vert, trou };
      }, l1);
      verifier('la bouche de la ligne 1 se voit de la rue (le vert Guimard, la trémie)',
        edicule.vert >= 2 && edicule.trou >= 3, `${l1.nom} : ${JSON.stringify(edicule)}`);

      // sur le quai, côté de la bouche, à cinq blocs de l'axe
      const surQuai = { x: l1.q.x - l1.q.dz * 5 * l1.cote, z: l1.q.z + l1.q.dx * 5 * l1.cote };
      await tab.evaluate(({ p, yr }) => {
        const g = window.__game;
        g.player.pos.x = p.x; g.player.pos.z = p.z; g.player.pos.y = yr + 2.05;
        window.__simL1 = 0;
        let prec = performance.now();
        const tic = (now) => {
          window.__simL1 += Math.min(Math.max((now - prec) / 1000, 0), 0.05);
          prec = now;
          requestAnimationFrame(tic);
        };
        requestAnimationFrame(tic);
      }, { p: surQuai, yr: l1.yr });
      const debout = await tab.evaluate(({ yr }) => {
        const g = window.__game, p = g.player.pos;
        const x = Math.floor(p.x), z = Math.floor(p.z);
        return { sol: g.world.getBlock(x, yr + 1, z) !== 0, tete: g.world.getBlock(x, yr + 2, z) === 0 && g.world.getBlock(x, yr + 3, z) === 0 };
      }, { yr: l1.yr });
      verifier('on tient debout sur le quai de la ligne 1', debout.sol && debout.tete, JSON.stringify(debout));

      // LE NOM DE LA STATION SUR LE QUAI (v529) : la plaque bleue des
      // piédroits, écrite par `stations.js` (sa place se prouve sous node,
      // plafond.js). Ici : elle est dans la scène quand on est sur le quai, avec
      // son nom à elle, dessinée sur un canevas. Rouge sur la v494 : aucun nom.
      const nom = await (async () => {
        const t0 = Date.now();
        for (;;) {
          const r = await tab.evaluate((attendu) => {
            const g = window.__game;
            if (!g.nomsDeStations) return { absent: true };
            const m = [];
            g.scene.traverse((o) => { if (o.name === 'nom-station' && o.visible) m.push(o); });
            const ici = m.find((o) => o.userData.station === attendu);
            return { stations: g.nomsDeStations.etat().map((s) => s.nom), ici: !!ici,
              plaques: ici ? ici.geometry.index.count / 6 : 0,
              canevas: !!(ici && ici.material.map && ici.material.map.image && ici.material.map.image.width >= 256) };
          }, l1.nom);
          if (r.absent || (r.ici && r.canevas) || Date.now() - t0 > 15000) return { ...r, ms: Date.now() - t0 };
          await dormir(500);
        }
      })();
      verifier('sur le quai, le nom de la station est écrit sur les plaques bleues',
        !nom.absent && nom.ici && nom.plaques >= 4 && nom.canevas,
        nom.absent ? 'aucun nom de station dans le jeu' : `${l1.nom} : ${nom.plaques} plaques, canevas ${nom.canevas}, stations nommées autour : ${nom.stations.join(', ')}, ${nom.ms} ms`);

      // la rame jaune se présente : 45 s de JEU, une fois et demie l'intervalle
      let vu = false, sim = 0, approche = null;
      for (let i = 0; i < 300 && !vu && sim < 45; i++) {
        const e = await tab.evaluate(() => {
          const b = document.getElementById('board-btn');
          const cible = b && b.closest('.fun-target');
          const visible = !!(b && getComputedStyle(b).display !== 'none' && cible && getComputedStyle(cible).display !== 'none');
          const p = window.__game.player.pos;
          let best = null;
          for (const c of (window.__vehicules.etat() || [])) {
            if (c.nom !== 'métro ligne 1') continue;
            for (const q of c.places) {
              const d = Math.hypot(q[0] - p.x, q[1] - p.z);
              if (!best || d < best.d) best = { d: +d.toFixed(1), dy: +(c.y - p.y).toFixed(1) };
            }
          }
          return { visible, texte: b ? b.textContent : '', quoi: b ? b.dataset.quoi || '' : '', pastille: !!(b && b.querySelector('.pastille')), best, sim: window.__simL1 };
        });
        sim = e.sim;
        if (e.best && (!approche || e.best.d < approche.d)) approche = e.best;
        // la pastille jaune est dessinée depuis la v504 : on lit le nom de la ligne
        if (e.visible && e.pastille && /ligne 1/.test(e.quoi)) { vu = true; break; }
        await dormir(800);
      }
      verifier('une rame jaune de la ligne 1 se présente, et on propose d\'y monter', vu,
        `${sim.toFixed(0)} s de jeu, la plus proche vue à ${approche ? `${approche.d} blocs, Δy ${approche.dy}` : '—'}`);
      if (vu) {
        await tab.evaluate(() => document.getElementById('board-btn').click());
        const proche = (p) => l1.quais.reduce((a, q) => (Math.hypot(q.x - p.x, q.z - p.z) < Math.hypot(a.x - p.x, a.z - p.z) ? q : a));
        const ou = () => tab.evaluate(() => { const p = window.__game.player.pos; return { x: p.x, y: p.y, z: p.z, sim: window.__simL1 }; });
        const dep = await ou();
        const depart = proche(dep).nom;
        // ARRIVÉ, c'est À QUAI à une autre station (à moins de douze blocs de
        // son centre), pas seulement plus près d'elle : la rame fait trente
        // blocs, et l'on peut s'y asseoir loin de la station de départ.
        const aQuai = (p) => { const q = proche(p); return Math.hypot(q.x - p.x, q.z - p.z) < 12 ? q.nom : null; };
        let arr = depart, ici = dep;
        for (let i = 0; i < 400 && (arr === depart || arr === null) && ici.sim - dep.sim < 60; i++) {
          await dormir(800);
          ici = await ou();
          arr = aQuai(ici);
        }
        verifier('et la ligne 1 nous emmène à la station suivante, sous la rue', arr !== depart && ici.y < l1.yr + 4,
          `${depart} → ${arr} en ${(ici.sim - dep.sim).toFixed(0)} s de jeu, rame à y=${ici.y.toFixed(1)}`);
        await tab.evaluate(() => document.getElementById('board-btn').click());
      }
    }

    // --- LA LIGNE A DE ROME (v500) : SES RAMES MARQUENT SES STATIONS ---------
    //
    // La descente de chaque bouche, le gabarit, le Tibre et le trottoir se
    // prouvent sous node (`sonde-metro-monde.mjs`, lue par plafond.js) ; ici, ce
    // que seul le jeu dit : les rames de la ligne A existent, toutes, sous terre,
    // et chacune marque les vingt-quatre arrêts (douze stations, deux voies).
    const ligneA = await tab.evaluate(async () => {
      const m = await import('./src/metromonde.js').catch(() => null);
      const L = m && m.LIGNES_MONDE && m.LIGNES_MONDE.find((l) => l.def.cle === 'rome');
      const rames = (window.__vehicules.etat() || []).filter((c) => c.nom === 'métro ligne A');
      return { attendu: L ? L.arrets.length : null, rames: rames.map((c) => ({ arrets: c.nbArrets, longueur: c.longueur })) };
    }).catch((e) => ({ erreur: String(e) }));
    verifier('la ligne A de Rome roule sous la ville : cinq rames, et chacune marque ses vingt-quatre arrêts',
      ligneA.attendu === 24 && ligneA.rames && ligneA.rames.length === 5 && ligneA.rames.every((r) => r.arrets === 24 && r.longueur > 400),
      JSON.stringify(ligneA));

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
