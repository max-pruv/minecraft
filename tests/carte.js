// La carte : celle qu'on ouvre pour décider où aller.
//
// Elle n'était qu'une image fixe ; elle se fait maintenant glisser et écarter
// à deux doigts. Ces scénarios suivent le geste d'un enfant du début à la fin
// — ouvrir, se promener, zoomer, toucher un nom — parce que c'est précisément
// là qu'on a trouvé les défauts : chacun des mécanismes marchait séparément.
//
//     cd tests && npm install && npm run carte

const { Banc, dormir, pincer, souffler } = require('./banc.js');

const echecs = [];
function verifier(nom, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${nom}${detail ? ` — ${detail}` : ''}`);
  if (!ok) echecs.push(nom + (detail ? ` — ${detail}` : ''));
}

const vue = (p) => p.evaluate(() => ({ ...window.__carte.vue }));

// Regarder le zoom PENDANT toute la fenêtre, pas une fois à la fin.
//
// Un geste tactile n'agit pas au moment où le doigt se lève : le zoom
// s'applique au tour d'affichage suivant, et sur un conteneur chargé ce tour
// peut se faire attendre. On rend la première vue qui satisfait l'attente, ou
// la dernière lue si rien ne vient — le témoin dit alors la vérité, à savoir
// que le geste n'a rien produit.
async function attendreLeZoom(p, atteint, limiteMs = 5000) {
  const fin = Date.now() + limiteMs;
  let v = await vue(p);
  while (!atteint(v) && Date.now() < fin) {
    await dormir(150);
    v = await vue(p);
  }
  return v;
}
const cadre = (p) => p.evaluate(() => {
  const r = document.getElementById('map-modal-canvas').getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width };
});
const lieuxVus = (p) => p.evaluate(() => window.__carte.etiquettes.map((e) => e.lieu.name));
const carteOuverte = (p) => p.evaluate(() =>
  getComputedStyle(document.getElementById('map-modal')).display !== 'none');
const position = (p) => p.evaluate(() => ({
  x: Math.round(window.__game.player.pos.x), z: Math.round(window.__game.player.pos.z),
}));

(async () => {
  const banc = new Banc({ portJeu: 8323, portPairs: 9323 });
  await banc.ouvrir();
  try {
    // --- une tablette, comme à la maison -------------------------------------
    const tab = await banc.jouerSeul('Marlon', { tactile: true });
    await banc.ouvrirLaCarte(tab);

    // OÙ SONT LES VILLES : ON LE DEMANDE, ON NE LE SUPPOSE PAS.
    //
    // Ces coordonnées étaient recopiées à la main dans le test — « New York est
    // en (295, −110) ». Le jour où la carte a été refaite sur la vraie
    // géographie, vingt-cinq vérifications sont tombées d'un coup : elles
    // sondaient le terrain vide là où la ville n'était plus, et disaient « le
    // quartier a disparu » alors qu'il avait seulement déménagé. Un test qui
    // recopie ce qu'il éprouve ne l'éprouve pas — il éprouve sa propre copie.
    //
    // On lit donc le registre des mondes, qui est la source de vérité du jeu :
    // les villes peuvent bouger autant qu'on veut, le témoin les suit.
    const V = await tab.evaluate(async () => {
      const m = await import('./src/mondes.js');
      const out = {};
      for (const l of m.lieuxDuMonde('terre')) out[l.cle] = { x: l.x, z: l.z, r: l.r };
      return out;
    });

    const depart = await vue(tab);
    const moi = await position(tab);
    verifier('la carte s\'ouvre sur le joueur',
      Math.abs(depart.cx - moi.x) < 2 && Math.abs(depart.cz - moi.z) < 2,
      JSON.stringify({ vue: [depart.cx, depart.cz], joueur: [moi.x, moi.z] }));

    // Le menu de pause du jeu s'invitait par-dessus la carte dès qu'on la
    // rendait interactive : elle relâche la souris, et le jeu prenait cela
    // pour une mise en pause. Rien ne répondait plus.
    verifier('le menu du jeu ne recouvre pas la carte',
      (await tab.evaluate(() => getComputedStyle(document.getElementById('overlay')).display)) === 'none');

    // --- se promener ---------------------------------------------------------
    const c = await cadre(tab);
    // Un coin plutôt que le centre : au centre il y a le joueur, et souvent
    // une étiquette — on éprouverait le voyage, pas le déplacement.
    const milieu = { x: c.x + c.w * 0.75, y: c.y + c.w * 0.25 };
    await tab.mouse.move(milieu.x, milieu.y);
    await tab.mouse.down();
    for (let i = 1; i <= 8; i++) await tab.mouse.move(milieu.x - i * 12, milieu.y - i * 8);
    await tab.mouse.up();
    await dormir(400);
    const glisse = await vue(tab);
    verifier('glisser promène la carte',
      glisse.cx > depart.cx + 20 && glisse.cz > depart.cz + 10,
      JSON.stringify({ dx: Math.round(glisse.cx - depart.cx), dz: Math.round(glisse.cz - depart.cz) }));

    // LE GLISSER NE TÉLÉPORTE JAMAIS — même sur une machine qui suffoque.
    //
    // On rejoue le geste en étouffant le fil principal juste après la pose
    // du doigt : le minuteur d'appui long (550 ms) expire pendant que les
    // déplacements attendent leur tour dans la file. Avant le correctif, le
    // minuteur tirait le premier et l'enfant était téléporté au point de
    // départ de son propre glisser — vécu au banc, porte de v169.
    const avantEtouffe = await position(tab);
    await tab.mouse.move(milieu.x, milieu.y);
    await tab.mouse.down();
    const etouffe = tab.evaluate(() => { const t = performance.now(); while (performance.now() - t < 700); });
    for (let i = 1; i <= 8; i++) await tab.mouse.move(milieu.x - i * 12, milieu.y - i * 8);
    await tab.mouse.up();
    await etouffe;
    await dormir(600);
    const apresEtouffe = await position(tab);
    verifier('et il ne téléporte jamais, même le fil principal étouffé',
      apresEtouffe.x === avantEtouffe.x && apresEtouffe.z === avantEtouffe.z
      && (await carteOuverte(tab)),
      JSON.stringify({ avant: avantEtouffe, apres: apresEtouffe }));

    // --- écarter deux doigts -------------------------------------------------
    // Au centre de la carte : plus loin, un doigt du geste large sortirait du
    // cadre et le navigateur n'annoncerait qu'un seul contact.
    //
    // ON LAISSE SOUFFLER AVANT DE TOUCHER, ET ON REGARDE PENDANT, PAS APRÈS.
    //
    // Cette suite est la seule à faire des gestes au pixel près, et elle passe
    // en cinquième position, sur un conteneur que quatre suites viennent de
    // chauffer. Le zoom était lu dans la foulée du geste : sur une machine au
    // repos l'image est déjà redessinée, sur une machine chargée elle ne l'est
    // pas encore, et le témoin annonçait « 0.70 → 0.70 » — le geste n'aurait
    // rien produit. Il avait produit, on regardait trop tôt.
    await souffler();
    // Une sonde qui compte les contacts REÇUS par la carte. Sans elle, un
    // témoin rouge ne dit pas si le geste n'est pas arrivé ou si la carte l'a
    // ignoré — deux pannes opposées, et on a soupçonné la mauvaise.
    await tab.evaluate(() => {
      window.__contacts = { start: 0, move: 0, fin: 0 };
      const cv = document.getElementById('map-modal-canvas');
      cv.addEventListener('touchstart', () => { window.__contacts.start++; }, true);
      cv.addEventListener('touchmove', () => { window.__contacts.move++; }, true);
      cv.addEventListener('touchend', () => { window.__contacts.fin++; }, true);
    });
    const centre = { x: c.x + c.w / 2, y: c.y + c.w / 2 };
    const avantPince = await vue(tab);
    await pincer(tab, centre, 60, 200);
    const contacts = await tab.evaluate(() => ({
      ...window.__contacts,
      cadre: (() => { const r = document.getElementById('map-modal-canvas').getBoundingClientRect();
        return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; })(),
      ouverte: !!(window.__carte && window.__carte.ouverte),
    }));
    console.log(`   🔎 contacts reçus par la carte : ${JSON.stringify(contacts)}`);
    console.log(`   🔎 geste visé au centre : ${JSON.stringify(centre)}`);
    const apresPince = await attendreLeZoom(tab, (v) => v.bpp < avantPince.bpp * 0.75);
    verifier('écarter deux doigts rapproche la carte',
      apresPince.bpp < avantPince.bpp * 0.75,
      `${avantPince.bpp.toFixed(2)} → ${apresPince.bpp.toFixed(2)}`);

    await pincer(tab, centre, 200, 60);
    const apresEcart = await attendreLeZoom(tab, (v) => v.bpp > apresPince.bpp * 1.3);
    verifier('les rapprocher éloigne',
      apresEcart.bpp > apresPince.bpp * 1.3,
      `${apresPince.bpp.toFixed(2)} → ${apresEcart.bpp.toFixed(2)}`);

    // Un zoom se termine par deux doigts levés l'un après l'autre. Le second
    // ressemble à s'y méprendre à un appui bref : s'il est pris pour tel, un
    // enfant qui zoome sur une ville se retrouve dedans sans l'avoir demandé.
    const surUnLieu = await tab.evaluate(() => {
      const c2 = window.__carte;
      const e = c2.etiquettes.find((x) => x.lieu.name === 'Paris') || c2.etiquettes[0];
      if (!e) return null;
      const r = document.getElementById('map-modal-canvas').getBoundingClientRect();
      const cx = Math.min(Math.max((e.rect.x0 + e.rect.x1) / 2, 90), r.width - 90);
      return { x: r.left + cx, y: r.top + Math.min(Math.max((e.rect.y0 + e.rect.y1) / 2, 60), r.height - 60) };
    });
    const avantZoomSurLieu = await position(tab);
    await pincer(tab, surUnLieu, 110, 145, 2, 0);   // un geste vif, comme celui d'un enfant
    await dormir(500);
    const apresZoomSurLieu = await position(tab);
    verifier('zoomer sur une ville n\'y emmène pas',
      apresZoomSurLieu.x === avantZoomSurLieu.x && apresZoomSurLieu.z === avantZoomSurLieu.z
      && (await carteOuverte(tab)),
      JSON.stringify({ avant: avantZoomSurLieu, apres: apresZoomSurLieu }));

    // --- voir le monde entier ------------------------------------------------
    await tab.click('#map-tout');
    await dormir(700);
    const monde = await vue(tab);
    // « Tout le monde » veut dire tout le monde : la fenêtre doit contenir les
    // bornes réelles, d'un bord à l'autre. Un seuil écrit à la main — « bpp > 3 »
    // — se contentait d'un dézoom quelconque et laissait passer une carte qui
    // n'en montrait qu'un huitième.
    const tient = await tab.evaluate(() => {
      const c2 = window.__carte;
      const b = c2.bornesMonde();
      const { css } = c2.taille();
      const coin = (x, z) => c2.versEcran(x, z);
      const a = coin(b.x0, b.z0), d = coin(b.x1, b.z1);
      return { a, d, css, dedans: a.x >= -1 && a.y >= -1 && d.x <= css + 1 && d.y <= css + 1 };
    });
    verifier('le bouton 🌍 montre tout le monde — d\'un bord à l\'autre',
      tient.dedans, `bpp ${monde.bpp.toFixed(2)} · ${JSON.stringify(tient)}`);

    // UNE DESTINATION SANS REPÈRE EST UNE DESTINATION INATTEIGNABLE.
    //
    // Ce témoin exigeait que TOUTES les destinations tiennent à l'écran au
    // dézoom maximum. C'était juste dans un monde de mille cinq cents blocs :
    // tout y tenait. Le monde en fait aujourd'hui vingt-quatre mille, et une
    // douzaine de domaines — le désert, le volcan, l'île, les deux châteaux,
    // l'aéroport, le circuit, la base spatiale — se serrent dans les mille
    // blocs autour de l'origine. Vus de la carte entière, cela fait trente-six
    // pixels pour douze pastilles de vingt-six : aucune carte au monde ne peut
    // les montrer toutes à la fois, et l'exiger revenait à interdire au monde
    // de grandir.
    //
    // Ce qui compte vraiment n'est pas « tout à l'écran d'un coup » — c'est
    // « rien n'est perdu ». On vérifie donc, destination par destination,
    // qu'elle est bien repérable À SON ÉCHELLE : on cadre dessus, et sa
    // pastille doit être là. C'est plus exigeant que l'ancienne version, qui
    // se contentait d'un unique coup d'œil de très loin.
    const grands = ['Paris', 'New York', 'San Francisco', 'Nice', 'Lille', 'Chine', 'Planète Mars',
      'Château de Villandry', 'Aéroport Charles-de-Gaulle', 'Village gaulois', 'Base spatiale',
      'Circuit de F1', 'Volcan', 'Désert', 'Île tropicale', 'Château médiéval', "Parc d'attractions",
      // Le tour du monde : neuf villes de plus, chacune avec son monument.
      'Londres', 'Rome', 'Barcelone', 'Pise', 'Gizeh', 'Agra', 'Sydney',
      'Rio de Janeiro', 'Seattle'];
    const introuvables = [];
    for (const nom of grands) {
      // On cadre sur la destination, à une échelle où son domaine tient à
      // l'écran, puis on lit ce que la carte propose vraiment.
      const trouve = await tab.evaluate(async (n) => {
        const w = await import('./src/world.js');
        const cible = [...w.CITIES, ...w.PLACES, ...w.REPERES].find((p) => p.name === n);
        if (!cible) return { erreur: 'destination absente du monde' };
        const c2 = window.__carte;
        c2.vue.cx = cible.x; c2.vue.cz = cible.z; c2.vue.bpp = 0.9;
        c2.limiter(); c2.peindre();
        return { noms: c2.etiquettes.map((e) => e.lieu.name) };
      }, nom);
      await dormir(120);
      if (trouve.erreur || !trouve.noms.includes(nom)) {
        introuvables.push(`${nom}${trouve.erreur ? ` (${trouve.erreur})` : ''}`);
      }
    }
    verifier('chaque grande destination reste repérable à son échelle',
      introuvables.length === 0, introuvables.join(', '));

    // Rien ne doit déborder du cadre : un nom coupé n'est ni lisible ni touchable.
    const debord = await tab.evaluate(() => {
      const c2 = window.__carte;
      const css = c2.taille().css;
      return c2.etiquettes.filter((e) => e.rect.x0 < -1 || e.rect.x1 > css + 1
        || e.rect.y0 < -1 || e.rect.y1 > css + 1).map((e) => e.lieu.name);
    });
    verifier('aucun nom ne déborde de la carte', debord.length === 0, debord.join(', '));

    // --- toucher un nom ------------------------------------------------------
    //
    // Ce témoin cadre lui-même sur Nice au lieu d'hériter de la vue laissée par
    // le précédent. Il en dépendait en silence, et cela a fini par se voir : le
    // témoin d'au-dessus parcourt désormais les destinations une à une et
    // s'arrête sur la dernière, si bien que Nice n'était plus à l'écran. Ce
    // qu'on éprouve ici est « toucher un nom emmène en voyage », pas « Nice se
    // trouve dans le cadre où le test d'avant a laissé la carte ».
    const cible = await tab.evaluate(async () => {
      const nice = await import('./src/nice.js');
      const c2 = window.__carte;
      c2.vue.cx = nice.NICE.x; c2.vue.cz = nice.NICE.z; c2.vue.bpp = 0.9;
      c2.limiter(); c2.peindre();
      const e = c2.etiquettes.find((x) => x.lieu.name === 'Nice');
      if (!e) return null;
      const r = document.getElementById('map-modal-canvas').getBoundingClientRect();
      return { x: r.left + (e.rect.x0 + e.rect.x1) / 2, y: r.top + (e.rect.y0 + e.rect.y1) / 2,
        lieu: { x: e.lieu.x, z: e.lieu.z } };
    });
    if (!cible) verifier('Nice est repérable sur la carte du monde', false);
    else {
      await tab.mouse.click(cible.x, cible.y);
      await dormir(700);
      const arrive = await position(tab);
      verifier('toucher un lieu emmène en voyage',
        Math.hypot(arrive.x - cible.lieu.x, arrive.z - cible.lieu.z) < 6 && !(await carteOuverte(tab)),
        JSON.stringify(arrive));
    }

    // --- appui long n'importe où ---------------------------------------------
    await banc.ouvrirLaCarte(tab);
    // Le cadre vise la campagne française : l'ancien (0, −320) donnait un
    // point de dépose en (−113, −433) — de la terre en v164, la MER DU NORD
    // depuis que le planisphère existe. Le joueur nageait, l'or se posait au
    // fond de l'eau, et les deux témoins suivants accusaient la carte.
    await tab.evaluate(() => { const c2 = window.__carte; c2.vue.cx = 0; c2.vue.cz = 480; c2.vue.bpp = 1.2; });
    await dormir(400);
    const attendu = await tab.evaluate(() => {
      const c2 = window.__carte;
      const r = document.getElementById('map-modal-canvas').getBoundingClientRect();
      return { ecran: { x: r.left + 90, y: r.top + 90 }, monde: c2.versMonde(90, 90) };
    });
    await tab.mouse.move(attendu.ecran.x, attendu.ecran.y);
    await tab.mouse.down();
    await dormir(900);
    await tab.mouse.up();
    await dormir(600);
    const pose = await position(tab);
    verifier('un appui long dépose n\'importe où',
      Math.hypot(pose.x - attendu.monde.x, pose.z - attendu.monde.z) < 6 && !(await carteOuverte(tab)),
      JSON.stringify({ voulu: [Math.round(attendu.monde.x), Math.round(attendu.monde.z)], obtenu: [pose.x, pose.z] }));

    // --- plus on s'approche, plus la carte montre ----------------------------
    await banc.ouvrirLaCarte(tab);

    // Les rues de Paris : elles sont calculées, elles doivent donc apparaître
    // même sans avoir mis un pied dans la ville.
    //
    // Le compte EXCLUT les pixels qui tombent dans l'emprise de Washington :
    // au zoom large, la capitale — trois cents blocs au sud-est — entre dans le
    // cadre, et ses rues comptaient comme celles de Paris. Le témoin mesure la
    // révélation de PARIS ; une autre ville dans le champ n'est pas un défaut,
    // c'est un monde qui a grandi.
    const { ZONE_WASHINGTON } = await import('../src/washington.js');
    const rues = await tab.evaluate((Z) => {
      const c2 = window.__carte;
      const bitume = () => {
        const f = c2.fond;
        const d = f.getContext('2d').getImageData(0, 0, f.width, f.height).data;
        const { cx, cz, bpp } = c2.vue;
        let n = 0, total = 0;
        for (let y = 0; y < f.height; y++) {
          const wz = cz + (y - f.height / 2) * bpp;
          const dansZ = wz >= Z.z0 && wz <= Z.z1;
          for (let x = 0; x < f.width; x++) {
            if (dansZ) {
              const wx = cx + (x - f.width / 2) * bpp;
              if (wx >= Z.x0 && wx <= Z.x1) continue;      // Washington : hors compte
            }
            total++;
            const i = (y * f.width + x) * 4;
            if (d[i] < 90 && d[i + 1] < 90 && d[i + 2] < 100 && Math.abs(d[i] - d[i + 2]) < 30) n++;
          }
        }
        return n / total;
      };
      c2.vue.cx = -240; c2.vue.cz = 200; c2.vue.bpp = 3;
      c2.rendreFond();
      const loin = bitume();
      c2.vue.bpp = 0.35;
      c2.rendreFond();
      return { loin, pres: bitume() };
    }, ZONE_WASHINGTON);
    // Trois fois plus dense de près que de loin — pas quatre : mesuré sur
    // les passages verts d'avant, le ratio vivait entre 3,99 et 4,02, une
    // marge nulle qui ne prouvait rien de plus que 3 et cassait au moindre
    // souffle du monde.
    // v173 : deux fois, pas trois. Les deux cents villes ont peuplé la
    // campagne — la vue large autour de Paris contient désormais Rouen,
    // Bruges, Lille-alentours, et leur bitume compte dans « loin »
    // (mesuré : loin 0,021, pres 0,056, ratio 2,7). Ce que le témoin
    // prouve reste vrai : de près, la carte révèle un niveau de détail
    // que la vue monde n'a pas.
    verifier('en s\'approchant, Paris révèle ses rues',
      rues.pres > 0.015 && rues.pres > rues.loin * 2,
      JSON.stringify({ loin: rues.loin.toFixed(3), pres: rues.pres.toFixed(3) }));

    // Et ce qu'un enfant construit finit sur la carte : c'est la promesse de
    // « plus précise » — une carte qui ne montrerait que le terrain d'origine
    // ne dirait rien de son monde à lui.
    const construit = await tab.evaluate(() => {
      const g = window.__game, c2 = window.__carte;
      const x0 = Math.round(g.player.pos.x) + 8, z0 = Math.round(g.player.pos.z) + 8;
      for (let dx = 0; dx < 8; dx++) {
        for (let dz = 0; dz < 8; dz++) {
          const y = g.world.terrainHeight(x0 + dx, z0 + dz) + 1;
          g.world.setBlock(x0 + dx, y, z0 + dz, 19);   // de l'or : rien de tel en surface
        }
      }
      const compterOr = () => {
        const f = c2.fond;
        const d = f.getContext('2d').getImageData(0, 0, f.width, f.height).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] > 190 && d[i + 1] > 140 && d[i + 2] < 110) n++;
        }
        return n;
      };
      c2.vue.cx = x0 + 4; c2.vue.cz = z0 + 4;
      c2.vue.bpp = 0.35; c2.rendreFond();
      const pres = compterOr();
      c2.vue.bpp = 2.5; c2.rendreFond();
      return { pres, loin: compterOr() };
    });
    verifier('ce que l\'enfant construit apparaît sur la carte de près',
      construit.pres > 20 && construit.loin === 0, JSON.stringify(construit));

    // Les créatures restent visibles en dézoomant. Elles disparaissaient sans
    // un mot au-delà d'un seuil de zoom — « je ne vois plus de Pokémon sur la
    // carte » — pendant que la légende continuait de les promettre. Elles
    // vivent près du joueur : de loin, elles se regroupent autour de sa
    // flèche, et c'est la vérité. Mesuré avant correction : 0 pixel violet
    // dès bpp 1,6.
    const violets = await tab.evaluate(() => {
      const c2 = window.__carte, g = window.__game;
      // La ponte est opportuniste : près du spawn il peut n'y avoir qu'une
      // seule créature, et une seule se cache facilement. On en garantit une
      // poignée par le vrai chemin de ponte avant de mesurer.
      for (let i = 0; i < 60 && g.creatureManager.creatures.length < 6; i++) {
        g.creatureManager.trySpawn();
      }
      if (!g.creatureManager.creatures.length) return { erreur: 'aucune créature à dessiner' };
      c2.vue.cx = Math.round(g.player.pos.x); c2.vue.cz = Math.round(g.player.pos.z);
      const compter = () => {
        const cv = document.getElementById('map-modal-canvas');
        const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (Math.abs(d[i] - 200) < 30 && Math.abs(d[i + 1] - 110) < 30 && Math.abs(d[i + 2] - 224) < 30) n++;
        }
        return n;
      };
      const par = {};
      for (const bpp of [0.7, 2.5]) { c2.vue.bpp = bpp; c2.limiter(); c2.peindre(); par[bpp] = compter(); }
      return par;
    });
    verifier('les créatures restent visibles en dézoomant',
      !violets.erreur && violets['0.7'] > 0 && violets['2.5'] > 0, JSON.stringify(violets));

    // --- les bornes ----------------------------------------------------------
    const bornes = await tab.evaluate(() => {
      const c2 = window.__carte;
      for (let i = 0; i < 40; i++) c2.zoomerVers(100, 100, 1.5);
      const pres = c2.vue.bpp;
      for (let i = 0; i < 60; i++) c2.zoomerVers(100, 100, 1 / 1.5);
      const loin = c2.vue.bpp;
      for (let i = 0; i < 60; i++) { c2.vue.cx += 500; c2.limiter(); }
      return { pres, loin, cx: c2.vue.cx, plafond: c2.zoomMax(), monde: c2.bornesMonde() };
    });
    // Les deux bornes se mesurent CONTRE LE MONDE, pas contre deux chiffres
    // écrits à la main. « loin ≤ 5 » et « cx < 1500 » décrivaient le monde
    // d'avant, large de mille cinq cents blocs ; ils condamnaient d'avance
    // toute carte plus grande — et c'est bien ce qui est arrivé.
    verifier('on ne peut ni zoomer à l\'infini ni sortir du monde',
      bornes.pres >= 0.2
      && bornes.loin <= bornes.plafond + 0.001
      && bornes.cx <= bornes.monde.x1 + 0.001,
      JSON.stringify(bornes));

    // --- LA CARTE NE LAGUE PLUS ---------------------------------------------
    //
    // Max : « la carte lag un peu ». Les cinquante grandes avaient porté le
    // coût d'une colonne à ~250 zones et 46 villes interrogées une à une :
    // un fond entier coûtait jusqu'à une seconde, rejoué à chaque geste. Deux
    // index en cases et un cache de colonnes plus tard, on jure ici sur les
    // millisecondes : le fond entier au dézoom monde, D'ABORD SANS CACHE
    // (le vrai premier rendu), doit tenir sous 400 ms sur la machine du banc
    // — l'iPad est plus lent, mais c'est le même ordre — et le rendu suivant,
    // cache chaud, sous 150 ms.
    const vitesse = await tab.evaluate(() => {
      const c2 = window.__carte;
      c2.toutVoir();
      c2.cacheH = new Map();                       // premier rendu honnête
      const t0 = performance.now();
      c2.rendreFond();
      const froid = performance.now() - t0;
      c2.fondVue = null;
      const t1 = performance.now();
      c2.rendreFond();
      const chaud = performance.now() - t1;
      return { froid: Math.round(froid), chaud: Math.round(chaud) };
    });
    verifier('le fond de carte entier se rend vite, même à froid',
      vitesse.froid < 400, `${vitesse.froid} ms à froid (borne 400)`);
    verifier('et le rendu suivant, cache chaud, est presque gratuit',
      vitesse.chaud < 150, `${vitesse.chaud} ms à chaud (borne 150)`);

    // --- le bas de Manhattan -------------------------------------------------
    //
    // Le bas de l'île tenait en quinze blocs : de la pointe de Battery à la 14e
    // Rue, il y avait moins de place que dans un seul pâté de Midtown. Aucun
    // plan réel n'y entrait, et les quartiers dont un enfant connaît le nom —
    // TriBeCa, SoHo, Chinatown, le Village, Wall Street — se retrouvaient les
    // uns sur les autres. On vérifie donc les deux choses qu'il verrait :
    // qu'on peut y aller, et qu'une fois là-bas ce n'est pas la même ville
    // qu'au nord.
    const NY = V.ny;
    const sonder = (us, v0, v1) => tab.evaluate(({ ny, us: cols, v0: a, v1: b }) => {
      const w = window.__game.world;
      const RUE = [562, 563, 564, 566, 569];   // bitume, ligne, trottoir, pavé, passage
      return cols.map((u) => {
        const rues = [];
        let terre = 0;
        for (let v = a; v <= b; v++) {
          const x = ny.x + u, z = ny.z + v;
          const h = w.terrainHeight(x, z);
          if (h < 31) continue;                // le fleuve
          // Les deux voies rapides suivent la rive en diagonale : près du bord,
          // toutes les rangées finissent par être de la rue, quel que soit le
          // plan. On sonde donc l'intérieur de l'île, et lui seul.
          if (w.terrainHeight(x + 4, z) < 31 || w.terrainHeight(x - 4, z) < 31) continue;
          terre++;
          const sol = w.getBlock(x, h, z);
          let sommet = h;
          for (let y = h + 60; y > h; y--) if (w.getBlock(x, y, z)) { sommet = y; break; }
          if (RUE.includes(sol) && sommet === h) rues.push(v);
        }
        return { u, terre, rues };
      });
    }, { ny: NY, us, v0, v1 });

    // Les quartiers du bas ont enfin la place d'exister. Tout le bas de l'île
    // tenait dans quinze blocs — moins qu'un pâté de Midtown — et TriBeCa,
    // SoHo, Chinatown, le Village et Wall Street s'y superposaient. On regarde
    // donc ce qu'un enfant regarde : la carte, zoomée sur la pointe de l'île.
    await banc.ouvrirLaCarte(tab);
    await tab.evaluate(({ ny }) => {
      const c2 = window.__carte;
      c2.vue.cx = ny.x; c2.vue.cz = ny.z + 86; c2.vue.bpp = 0.4;
      c2.limiter(); c2.peindre();
    }, { ny: NY });
    await dormir(600);
    const quartiers = await tab.evaluate(() =>
      Object.fromEntries(window.__carte.etiquettes.map((e) => [e.lieu.name, [e.lieu.x, e.lieu.z]])));
    const attendus = ['Wall Street', 'SoHo', 'TriBeCa', 'Chinatown', 'Greenwich Village'];
    const manquants = attendus.filter((n) => !quartiers[n]);
    const zs = attendus.filter((n) => quartiers[n]).map((n) => quartiers[n][1]);
    const etendue = zs.length ? Math.max(...zs) - Math.min(...zs) : 0;
    verifier('les quartiers du bas de l\'île ont la place d\'exister',
      manquants.length === 0 && etendue > 25,
      manquants.length ? `absents : ${manquants.join(', ')}` : `${etendue} blocs entre Wall Street et le Village`);
    await tab.evaluate(() => document.getElementById('map-modal-close').click());
    await dormir(300);

    // Au nord de la 14e Rue, une rue tous les six blocs : c'est le plan des
    // commissaires de 1811, et presque toutes les rangées de rue tombent sur un
    // multiple de six. Au sud, chaque quartier a sa propre trame, à son propre
    // angle — la proportion s'effondre. C'est ce contraste qu'on mesure, et lui
    // seul dit que le bas de l'île a un plan à lui : mesuré 0,63 quand la
    // grille descendait jusqu'à la mer, 0,28 avec le vrai plan.
    // On écarte les colonnes qui tombent sur une avenue : une avenue est de la
    // rue du haut en bas, elle ne dirait rien.
    // Le pas de la grille et les coordonnées suivent l'ÉCHELLE de la ville :
    // depuis la refonte, une rue tous les CINQ blocs, l'île va de la pointe
    // (v +142) à la 68e Rue (v −141), et la 14e Rue — la frontière du plan de
    // 1811 — tombe à v +6. Le témoin lisait encore l'ancienne unité : ses deux
    // fenêtres, +20..+50 et +66..+100, étaient toutes les deux DANS le bas de
    // l'île, et il comparait le bas au bas.
    const surLaGrille = (colonnes) => {
      let n = 0, dessus = 0;
      for (const c of colonnes) {
        if (!c.terre || c.rues.length > c.terre * 0.5) continue;
        for (const v of c.rues) { n++; if (((v % 5) + 5) % 5 === 0) dessus++; }
      }
      return n ? dessus / n : -1;
    };
    const colonnes = [6, -12, 18, -26, 38, 50];
    const haut = surLaGrille(await sonder(colonnes, -110, -40));
    const bas = surLaGrille(await sonder(colonnes, 40, 110));
    verifier('la grille de 1811 s\'arrête bien à la 14e Rue',
      haut > 0.4 && bas < 0.4 && bas < haut * 0.8,
      `sur la grille : au nord ${haut.toFixed(2)}, au sud ${bas.toFixed(2)}`);

    // --- Paris et ses deux rives ---------------------------------------------
    //
    // Paris avait reçu son fleuve, mais rien n'était placé : la Tour Eiffel se
    // dressait sur la rive droite, le Louvre sur la rive gauche, et l'Opéra, le
    // Panthéon, les Invalides, la Bastille, le Luxembourg n'existaient pas du
    // tout. Une rive, ça ne se discute pas — c'est la première chose qu'un
    // enfant vérifie quand il compare avec un vrai plan.
    //
    // LE ZOOM SUIT LA VILLE. Il était écrit en dur (0,24 bloc par pixel), ce
    // qui cadrait les quatre cinquièmes de Paris tant qu'elle faisait cent dix
    // blocs de large. À trois cent soixante-dix — Paris à vingt-quatre blocs
    // par kilomètre, v187 — le même chiffre ne montrait plus que le premier
    // arrondissement, et le témoin annonçait « la Tour Eiffel a disparu de la
    // carte » alors qu'elle était simplement hors du cadre.
    //
    // On garde donc le CADRAGE d'origine — les quatre cinquièmes de la ville,
    // de l'Étoile à la Bastille — et on le calcule depuis le rayon du
    // registre. Pas la ville entière : sur un téléphone la carte fait trois
    // cent soixante-dix pixels, une pastille en fait vingt-six, et vingt-cinq
    // lieux ne tiennent pas côte à côte — au-delà de ce cadrage la carte en
    // écarte deux, ce qui est son travail et non un défaut.
    const PARIS = V.paris;
    await banc.ouvrirLaCarte(tab);
    const cadre = await tab.evaluate(({ p }) => {
      const c2 = window.__carte;
      const r = c2.canvas.getBoundingClientRect();
      const css = Math.min(r.width, r.height);
      c2.vue.cx = p.x; c2.vue.cz = p.z;
      c2.vue.bpp = (2 * p.r * 0.85) / css;      // de l'Étoile à la Bastille
      c2.limiter(); c2.peindre();
      return { css: Math.round(css), bpp: +c2.vue.bpp.toFixed(2) };
    }, { p: PARIS });
    await dormir(600);
    const vusParis = await lieuxVus(tab);
    const attendusParis = ['Tour Eiffel', 'Arc de Triomphe', 'Panthéon', 'Invalides',
      'Opéra', 'Bastille', 'Luxembourg', 'Concorde'];
    const absentsParis = attendusParis.filter((n) => !vusParis.includes(n));
    verifier('les lieux de Paris sont sur la carte', absentsParis.length === 0,
      absentsParis.length
        ? `absents : ${absentsParis.join(', ')} (carte ${cadre.css} px, ${cadre.bpp} bloc/px)`
        : `${attendusParis.length} lieux · carte ${cadre.css} px, ${cadre.bpp} bloc/px`);

    // Sur quelle rive ? On cherche la Seine dans le monde, à l'aplomb du
    // monument, et on regarde de quel côté il tombe. Rien n'est supposé : si
    // le fleuve bougeait, la mesure bougerait avec lui.
    const rives = await tab.evaluate(({ p, noms }) => {
      const w = window.__game.world;
      const EAU = 7;
      const out = {};
      for (const [nom, x, z] of noms) {
        const fil = [];
        for (let zz = p.z - 45; zz <= p.z + 45; zz++) if (w.getBlock(x, 30, zz) === EAU) fil.push(zz);
        const axe = fil.length ? fil.reduce((a, b) => a + b, 0) / fil.length : null;
        const sol = w.terrainHeight(x, z);
        out[nom] = { axe, rive: axe === null ? '?' : (z < axe ? 'droite' : 'gauche'), sec: sol > 31 };
      }
      return out;
    }, { p: PARIS, noms: (await tab.evaluate(({ noms }) => noms.map((n) => {
      const e = window.__carte.etiquettes.find((x) => x.lieu.name === n);
      return e ? [n, Math.round(e.lieu.x), Math.round(e.lieu.z)] : null;
    }).filter(Boolean), { noms: ['Tour Eiffel', 'Invalides', 'Panthéon', 'Luxembourg', 'Concorde', 'Opéra', 'Bastille', 'Arc de Triomphe'] })) });

    const GAUCHE = ['Tour Eiffel', 'Invalides', 'Panthéon', 'Luxembourg'];
    const DROITE = ['Concorde', 'Opéra', 'Bastille', 'Arc de Triomphe'];
    const faux = [...GAUCHE.map((n) => [n, 'gauche']), ...DROITE.map((n) => [n, 'droite'])]
      .filter(([n, r]) => !rives[n] || rives[n].rive !== r || !rives[n].sec)
      .map(([n, r]) => `${n} devrait être rive ${r}, il est ${rives[n] ? rives[n].rive : 'absent'}${rives[n] && !rives[n].sec ? ' et dans l\'eau' : ''}`);
    verifier('chaque monument de Paris est sur sa rive et au sec',
      faux.length === 0, faux.join(' · '));
    await tab.evaluate(() => document.getElementById('map-modal-close').click());
    await dormir(300);

    // --- le tissu de Paris ----------------------------------------------------
    //
    // Le fleuve, les places et les percées étaient au bon endroit. Entre elles,
    // il n'y avait rien : la trame générique posait un immeuble par lot de
    // douze blocs, mais elle écartait tout lot voisin d'un repère, et le repère
    // « Caserne & Commissariat » couvre Paris entière. Le pâté d'immeubles
    // haussmannien n'a donc jamais été bâti une seule fois — Paris était un
    // plan de rues posé sur une prairie.
    //
    // Trois choses le disent, et aucune n'a besoin d'une capture d'écran : la
    // pierre de taille et le zinc dont la ville est faite, les cours au milieu
    // des îlots, et l'herbe qu'on ne foule plus en la traversant.
    //
    // ET LA FENÊTRE DE MESURE AUSSI SUIT LA VILLE. Elle était centrée sur
    // l'ancre de Paris, ce qui à l'ancienne échelle tombait en plein tissu
    // ordinaire. À vingt-quatre blocs par kilomètre, ces quarante blocs-là
    // sont le Louvre, les Tuileries, la Seine et la caserne : on y mesurait
    // des monuments en croyant compter des immeubles. On vise donc un
    // quartier haussmannien ORDINAIRE, donné en kilomètres réels depuis
    // Notre-Dame — une adresse qui survivra à la prochaine remise à l'échelle.
    const CŒUR = await tab.evaluate(async () => {
      const M = await import('./src/paris.js');
      const [x, z] = M.adresseParis ? M.adresseParis(-3.7, -2.5)
        : [M.PARIS.x, M.PARIS.z];
      return { x, z };
    });
    const tissu = await tab.evaluate((P) => {
      const w = window.__game.world;
      const PIERRE = 560, ZINC = 561, PAVE_DE_COUR = 9, HERBE = 1, TERRE = 2;
      let bati = 0, cours = 0, nu = 0, total = 0;
      for (let u = -40; u <= 40; u++) {
        for (let v = -40; v <= 40; v++) {
          if (Math.hypot(u, v) > 40) continue;
          total++;
          const x = P.x + u, z = P.z + v;
          const h = w.terrainHeight(x, z);
          const sol = w.getBlock(x, h, z);
          if (sol === PAVE_DE_COUR) cours++;
          let pierre = false, rien = true;
          for (let y = h + 1; y < h + 20; y++) {
            const id = w.getBlock(x, y, z);
            if (!id) continue;
            rien = false;
            // Le vocabulaire a changé, et c'est tout le propos : une façade
            // n'est plus un aplat de « pierre haussmannienne », c'est une
            // devanture, un entresol, un étage noble, une corniche. On accepte
            // l'ancien pour les autres villes, et on exige le nouveau ici.
            if (id === PIERRE || id === ZINC || (id >= 620 && id <= 631)) pierre = true;
          }
          if (pierre) bati++;
          if (rien && (sol === HERBE || sol === TERRE)) nu++;
        }
      }
      return { bati, cours, nu, total };
    }, CŒUR);
    verifier('Paris est bâtie de pierre de taille et de zinc',
      tissu.bati > 700,
      `${tissu.bati} colonnes sur ${tissu.total}`);
    verifier('ses îlots ont une cour', tissu.cours > 40,
      `${tissu.cours} pavés de cour`);
    verifier('et on ne la traverse plus dans l\'herbe', tissu.nu < 400,
      `${tissu.nu} colonnes d'herbe nue`);

    // --- le parc d'attractions -----------------------------------------------
    //
    // « Le parc d'attractions n'est pas dingue » — il tenait dans cinquante
    // blocs : une grande roue, un carrousel, un anneau de rails, et une allée
    // dallée posée un bloc trop bas, donc enterrée et invisible. On mesure
    // maintenant ce qui fait un parc : du relief, un lac, et des villages qu'on
    // peut viser sur la carte.
    const PARC = { x: 150, z: -60 };
    const releve = await tab.evaluate(({ p }) => {
      const w = window.__game.world;
      const EAU = 7;
      let plusHaut = 0, eau = 0;
      const hautes = [];
      for (let u = -50; u <= 50; u++) {
        for (let v = -50; v <= 50; v++) {
          if (Math.hypot(u, v) > 50) continue;
          const x = p.x + u, z = p.z + v;
          if (w.getBlock(x, 33, z) === EAU) eau++;
          let haut = 33;
          for (let y = 90; y > 33; y--) if (w.getBlock(x, y, z)) { haut = y; break; }
          const h = haut - 33;
          if (h > plusHaut) plusHaut = h;
          if (h >= 12) hautes.push([u, v]);
        }
      }
      // Combien de bâtiments distincts dépassent douze blocs ? On regroupe les
      // colonnes hautes par paquets de dix blocs : deux attractions à dix
      // blocs l'une de l'autre, c'est la même.
      const paquets = new Set(hautes.map(([u, v]) => `${Math.floor(u / 10)},${Math.floor(v / 10)}`));
      return { plusHaut, eau, hautes: hautes.length, paquets: paquets.size };
    }, { p: PARC });
    verifier('le parc a du relief, un lac et des attractions',
      releve.plusHaut >= 35 && releve.eau >= 250 && releve.paquets >= 12,
      `plus haut ${releve.plusHaut} blocs · ${releve.eau} blocs d'eau · ${releve.paquets} ensembles bâtis`);

    await banc.ouvrirLaCarte(tab);
    await tab.evaluate(({ p }) => {
      const c2 = window.__carte;
      c2.vue.cx = p.x; c2.vue.cz = p.z; c2.vue.bpp = 0.35;
      c2.limiter(); c2.peindre();
    }, { p: PARC });
    await dormir(600);
    const vusParc = await lieuxVus(tab);
    const villages = ['Entrée du parc', 'Village allemand', 'Village italien', 'Village grec',
      'Village scandinave', 'Village russe', 'Village néerlandais', 'Village espagnol'];
    const sansVillage = villages.filter((n) => !vusParc.includes(n));
    verifier('et ses villages sont des destinations', sansVillage.length === 0,
      sansVillage.length ? `absents : ${sansVillage.join(', ')}` : `${villages.length} villages`);
    await tab.evaluate(() => document.getElementById('map-modal-close').click());
    await dormir(300);

    // --- San Francisco : les collines et la presqu'île ------------------------
    //
    // « Il n'y a pas les collines, il n'y a pas la cartographie exacte » : la
    // ville était un disque de maisons pastel posé sur un bruit de terrain,
    // sans côte et sans relief. Or c'est de ses collines et de sa presqu'île
    // qu'on la reconnaît — et de Market Street, la couture entre ses deux
    // quadrillages qui ne sont pas parallèles.
    const SF = V.sf;
    const releveSF = await tab.evaluate(({ p }) => {
      const w = window.__game.world;
      // La plaine d'une ville n'est pas un défaut — le Sunset et SoMa sont
      // plats pour de vrai. Ce qu'on compte, ce sont les BUTTES : les endroits
      // qui montent d'au moins dix blocs au-dessus du niveau de la ville, et
      // combien il y en a de distincts. Une ville sans collines n'en a aucune.
      let sommet = 0, mer = 0, terre = 0, hautes = 0;
      const parRang = new Set();
      for (let u = -60; u <= 60; u += 2) {
        for (let v = -60; v <= 60; v += 2) {
          if (Math.hypot(u, v) > 60) continue;
          const h = w.terrainHeight(p.x + u, p.z + v);
          if (h <= 30) { mer++; continue; }
          terre++;
          sommet = Math.max(sommet, h);
          if (h >= 43) { hautes++; parRang.add(`${Math.floor(u / 10)},${Math.floor(v / 10)}`); }
        }
      }
      return { sommet, mer, terre, collines: parRang.size, hautes };
    }, { p: SF });
    verifier('San Francisco a ses collines et sa presqu\'île',
      releveSF.sommet >= 55 && releveSF.collines >= 6 && releveSF.mer > releveSF.terre * 0.4,
      `sommet ${releveSF.sommet} · ${releveSF.collines} buttes distinctes `
      + `(${releveSF.hautes} points à dix blocs au-dessus de la ville) · `
      + `${releveSF.mer} points en mer pour ${releveSF.terre} à terre`);

    await banc.ouvrirLaCarte(tab);
    await tab.evaluate(({ p }) => {
      const c2 = window.__carte;
      c2.vue.cx = p.x; c2.vue.cz = p.z; c2.vue.bpp = 0.3;
      c2.limiter(); c2.peindre();
    }, { p: SF });
    await dormir(600);
    const vusSF = await lieuxVus(tab);
    const quartiersSF = ['Twin Peaks', 'Golden Gate Park', 'Mission', 'Castro', 'Chinatown', 'Le Presidio'];
    const sansQuartier = quartiersSF.filter((n) => !vusSF.includes(n));
    verifier('et ses quartiers sont des destinations', sansQuartier.length === 0,
      sansQuartier.length ? `absents : ${sansQuartier.join(', ')}` : `${quartiersSF.length} quartiers`);
    await tab.evaluate(() => document.getElementById('map-modal-close').click());
    await dormir(300);

    // --- Nice et Lille --------------------------------------------------------
    //
    // Deux disques de maisons génériques, l'un « au bord de la mer » sans mer,
    // l'autre avec un beffroi posé au milieu de rien. Or chacune tient dans une
    // forme : la baie des Anges pour Nice, et pour Lille l'étoile à cinq
    // branches de la citadelle de Vauban, qu'on ne lit que vue du ciel.
    const releveVilles = await tab.evaluate(({ N, L }) => {
      const w = window.__game.world;
      const EAU = 7;
      // Nice : la mer occupe le sud de la baie, et trois collines se lèvent.
      let mer = 0, terre = 0, sommetNice = 0;
      for (let u = -44; u <= 44; u += 2) {
        for (let v = -44; v <= 44; v += 2) {
          if (Math.hypot(u, v) > 44) continue;
          const h = w.terrainHeight(N.x + u, N.z + v);
          if (h <= 30) mer++; else { terre++; sommetNice = Math.max(sommetNice, h); }
        }
      }
      // Lille : l'étoile se compte par ses douves. Cinq bastions, cinq
      // courtines : le contour est bien plus long que celui d'un cercle de même
      // aire — c'est cela, une étoile, et c'est mesurable.
      let douves = 0;
      for (let u = -40; u <= -4; u++) {
        for (let v = -34; v <= 2; v++) {
          // Les douves sont creusées sous le niveau de la mer : c'est le remplissage
          // général du monde qui les met en eau, à la cote trente.
          if (w.getBlock(L.x + u, 30, L.z + v) === EAU) douves++;
        }
      }
      return { mer, terre, sommetNice, douves };
    }, { N: V.nice, L: V.lille });
    verifier('Nice a sa baie et ses collines',
      releveVilles.mer > 200 && releveVilles.sommetNice >= 44,
      `${releveVilles.mer} points en mer pour ${releveVilles.terre} à terre · sommet ${releveVilles.sommetNice}`);
    verifier('Lille a sa citadelle en étoile, entourée d\'eau',
      releveVilles.douves > 260,
      `${releveVilles.douves} blocs de douves`);

    // --- Lille, relevée sur documents ----------------------------------------
    //
    // « La ville de Lille ne ressemble pas du tout à la réalité. » La fiche de
    // terrain (Wikipédia, offices de tourisme) dit ce qu'un enfant lillois
    // vérifie au premier regard, et on mesure exactement cela : la rue
    // Faidherbe file droit de la Grand'Place à la gare, dont l'horloge ferme
    // la vue ; la Déesse est au centre du damier de la Grand'Place et la
    // Vieille Bourse, à CÔTÉ d'elle et non dessus, garde sa cour intérieure ;
    // trois tours ont trois tailles (beffroi CCI 76 m < beffroi de l'hôtel de
    // ville 104 m < tour de Lille 120 m, blanche et en porte-à-faux — la
    // « chaussure de ski ») ; et l'eau : le quai du Wault, doigt de la Deûle
    // pointé vers le centre, et la façade translucide de la Treille.
    const fidele = await tab.evaluate((L) => {
      const w = window.__game.world;
      const Lx = L.x, Lz = L.z, OR = 19, VERRE = 10, EAU = 7, BLANC = 310;
      const haut = (u, v) => {
        const h = w.terrainHeight(Lx + u, Lz + v);
        for (let y = h + 40; y > h; y--) { const id = w.getBlock(Lx + u, y, Lz + v); if (id) return { y: y - h, id }; }
        return { y: 0, id: 0 };
      };
      const colonne = (u, v, id) => {
        const h = w.terrainHeight(Lx + u, Lz + v);
        for (let y = h; y < h + 40; y++) if (w.getBlock(Lx + u, y, Lz + v) === id) return true;
        return false;
      };
      // la rue Faidherbe : rien au-dessus de la chaussée sur toute sa longueur
      let rueLibre = true;
      for (let u = 2; u <= 10; u++) if (haut(u, 0).y > 0) rueLibre = false;
      const horloge = colonne(11, 0, OR);
      // la Grand'Place : la Déesse au centre, le damier sous elle
      const deesse = haut(0, 0).id === OR;
      const p1 = w.getBlock(Lx + 2, w.terrainHeight(Lx + 2, Lz + 1), Lz + 1);
      const p2 = w.getBlock(Lx + 3, w.terrainHeight(Lx + 3, Lz + 1), Lz + 1);
      const damier = p1 !== p2 && p1 !== 0 && p2 !== 0;
      // la Vieille Bourse : des murs tout autour, une cour au milieu
      const cour = haut(4, -6).y <= 1 && haut(4, -10).y >= 5 && haut(0, -6).y >= 5;
      // les trois tours, chacune à sa place
      const cci = haut(6, -13).y, hdv = haut(6, 14).y, ski = haut(17, -3).y;
      // la chaussure de ski : blanche, et son porte-à-faux au-dessus du vide
      const bout = haut(17, 0);
      const hb = w.terrainHeight(Lx + 17, Lz);
      const videSous = w.getBlock(Lx + 17, hb + 6, Lz) === 0;
      // l'eau du quai du Wault, remplie à la cote trente comme les douves —
      // sondée à son bout EST, le seul hors de l'étoile de la citadelle : au
      // bout ouest, les douves du bastion mettaient déjà de l'eau avant.
      const wault = w.getBlock(Lx - 7, 30, Lz - 4) === EAU;
      // la façade claire de la Treille, percée de sa rosace de verre
      const treille = haut(-2, -16).y >= 7 && colonne(-2, -16, VERRE);
      return { rueLibre, horloge, deesse, damier, cour, cci, hdv, ski,
        blanc: bout.id === BLANC, videSous, wault, treille };
    }, V.lille);
    verifier("la rue Faidherbe file droit vers l'horloge de la gare",
      fidele.rueLibre && fidele.horloge,
      JSON.stringify({ rueLibre: fidele.rueLibre, horloge: fidele.horloge }));
    verifier('la Déesse veille sur le damier, la Vieille Bourse sur sa cour',
      fidele.deesse && fidele.damier && fidele.cour,
      JSON.stringify({ deesse: fidele.deesse, damier: fidele.damier, cour: fidele.cour }));
    verifier('trois tours, trois tailles : CCI, beffroi, chaussure de ski',
      fidele.cci >= 15 && fidele.hdv > fidele.cci && fidele.ski > fidele.hdv && fidele.blanc && fidele.videSous,
      `CCI ${fidele.cci} < hôtel de ville ${fidele.hdv} < tour de Lille ${fidele.ski}`
      + ` · blanche ${fidele.blanc} · porte-à-faux ${fidele.videSous}`);
    verifier('le quai du Wault est en eau, la Treille montre sa façade de verre',
      fidele.wault && fidele.treille,
      JSON.stringify({ wault: fidele.wault, treille: fidele.treille }));

    // --- Nice, relevée sur documents -----------------------------------------
    //
    // La fiche de terrain dit ce qui manquait : le port Lympia est un bassin
    // RECTANGULAIRE caché derrière la colline (pas un ovale), avec ses pointus
    // colorés à quai ; le Negresco lève sa coupole rose sur la Promenade ;
    // Saint-Nicolas porte cinq bulbes VERTS (pas un arc-en-ciel) ; Masséna a
    // SEPT statues perchées, pas six ; et la Promenade a ses chaises bleues et
    // ses palmiers, le cours Saleya ses stores rayés, le Paillon sa baleine de
    // bois — le mobilier que tout enfant niçois reconnaît avant les monuments.
    const nicoise = await tab.evaluate((N) => {
      const w = window.__game.world;
      const Nx = N.x, Nz = N.z, EAU = 7, LOG = 5, ROUGE = 23, BLEU_CH = 24, JAUNE = 25;
      const VERT = 90, ROSE = 200, BLANC = 310, STATUE = 230;
      const haut = (u, v) => {
        const h = w.terrainHeight(Nx + u, Nz + v);
        for (let y = h + 40; y > h; y--) { const id = w.getBlock(Nx + u, y, Nz + v); if (id) return { y: y - h, id }; }
        return { y: 0, id: 0 };
      };
      const colonne = (u, v, id) => {
        const h = w.terrainHeight(Nx + u, Nz + v);
        for (let y = h; y < h + 40; y++) if (w.getBlock(Nx + u, y, Nz + v) === id) return true;
        return false;
      };
      const surface = (u, v) => w.getBlock(Nx + u, w.terrainHeight(Nx + u, Nz + v), Nz + v);
      // le bassin rectangulaire : ses coins, hors de l'ancien ovale, sont en
      // eau — dont celui du sud-est, là où le bassin gagne sur la plage
      const bassin = surface(12, 1) === EAU && surface(16, 5) === EAU;
      const pointu = colonne(13, 1, ROUGE);
      // la coupole rose sur la façade blanche, les bulbes verts sur l'ocre
      const negresco = colonne(-10, 2, BLANC) && colonne(-8, 2, ROSE);
      const stNicolas = haut(-11, -7).y >= 10 && colonne(-11, -7, VERT);
      // les statues perchées de Masséna, comptées une à une
      let statues = 0;
      for (let du = -7; du <= 7; du++) {
        for (let dv = -6; dv <= 6; dv++) {
          const t = haut(du, dv);
          if (t.id === STATUE && t.y >= 6) statues++;
        }
      }
      // le mobilier de la Promenade, de Saleya et du Paillon
      let chaises = 0, palmiers = 0;
      for (const u of [-28, -21, -14, -7]) {
        for (let v = 2; v <= 12; v++) if (colonne(u, v, BLEU_CH)) { chaises++; break; }
      }
      for (const u of [-40, -35, -30, -25, -20, -15, -5]) {
        for (let v = 2; v <= 14; v++) if (colonne(u, v, LOG)) { palmiers++; break; }
      }
      const saleya = colonne(6, 5, ROUGE) && colonne(5, 5, JAUNE);
      const baleine = colonne(0, -6, LOG);
      return { bassin, pointu, negresco, stNicolas, statues, chaises, palmiers, saleya, baleine };
    }, V.nice);
    verifier('le port Lympia est un vrai bassin, et ses pointus sont à quai',
      nicoise.bassin && nicoise.pointu,
      JSON.stringify({ bassin: nicoise.bassin, pointu: nicoise.pointu }));
    verifier('la coupole rose du Negresco, les bulbes verts de Saint-Nicolas',
      nicoise.negresco && nicoise.stNicolas,
      JSON.stringify({ negresco: nicoise.negresco, stNicolas: nicoise.stNicolas }));
    verifier('sept statues perchées veillent sur Masséna',
      nicoise.statues === 7, `${nicoise.statues} statues`);
    verifier('chaises bleues, palmiers, stores rayés et la baleine du Paillon',
      nicoise.chaises >= 3 && nicoise.palmiers >= 6 && nicoise.saleya && nicoise.baleine,
      JSON.stringify({ chaises: nicoise.chaises, palmiers: nicoise.palmiers,
        saleya: nicoise.saleya, baleine: nicoise.baleine }));

    // --- San Francisco, relevée sur documents --------------------------------
    //
    // La fiche de terrain énumère les erreurs classiques, et l'ancien code les
    // faisait toutes : un pont ROUGE VIF couché est-ouest qui ne menait nulle
    // part (l'orange international est un rouge-orangé brûlé, et le pont va du
    // Presidio aux Marin Headlands, plein nord) ; pas de Headlands du tout ;
    // pas de brouillard ; le Bay Bridge de la même couleur que le Golden Gate ;
    // et aucune des icônes que cherchent les enfants — les otaries de Pier 39,
    // les épingles fleuries de Lombard Street, le Dragon Gate de Chinatown.
    const frisco = await tab.evaluate((S) => {
      const w = window.__game.world;
      const Sx = S.x, Sz = S.z;
      const ORANGE = 40, ICE = 18, MARRON = 210, BRIQUE = 11, VIOLET = 27;
      const VERT_TOIT = 90, DORE = 260, OLIVE = 250, GRIS = 33, ROUGE_LAINE = 23;
      const haut = (u, v) => {
        const h = w.terrainHeight(Sx + u, Sz + v);
        for (let y = h + 45; y > h; y--) { const id = w.getBlock(Sx + u, y, Sz + v); if (id) return { y: y - h, id }; }
        return { y: 0, id: 0 };
      };
      const colonne = (u, v, id) => {
        const h = w.terrainHeight(Sx + u, Sz + v);
        for (let y = h; y < h + 45; y++) if (w.getBlock(Sx + u, y, Sz + v) === id) return true;
        return false;
      };
      // le pont : orange, pylône sud dressé, tablier filant vers le nord.
      // Le rivage sous le pylône est à la cote 33 : le sommet à 54 fait une
      // hauteur relative de 21 — bien au-dessus du brouillard, qui plafonne à 14.
      const pylone = colonne(-22, -35, ORANGE) && haut(-22, -35).y >= 18;
      const tablier = colonne(-21, -46, 562);
      // les Marin Headlands : de la terre dorée là où il n'y avait que la mer
      const hMarin = w.terrainHeight(Sx - 22, Sz - 52);
      const solMarin = w.getBlock(Sx - 22, hMarin, Sz - 52);
      const marin = hMarin >= 32 && (solMarin === DORE || solMarin === OLIVE);
      // Karl the Fog : la nappe translucide sur la passe, sous les pylônes
      const brouillard = colonne(-27, -44, ICE) && colonne(-15, -44, ICE);
      // le Bay Bridge est gris — c'est la couleur qui empêche de le confondre
      const bayGris = colonne(38, 1, GRIS) && !colonne(38, 1, ROUGE_LAINE);
      // les icônes des enfants
      const otaries = colonne(29, -29, MARRON);
      const lombard = colonne(32, -18, BRIQUE) && colonne(32, -17, VIOLET);
      const dragon = colonne(36, -9, VERT_TOIT) && colonne(36, -9, 19);
      return { pylone, tablier, marin, brouillard, bayGris, otaries, lombard, dragon };
    }, V.sf);
    verifier('le Golden Gate, orange, va du Presidio aux Marin Headlands',
      frisco.pylone && frisco.tablier && frisco.marin,
      JSON.stringify({ pylone: frisco.pylone, tablier: frisco.tablier, marin: frisco.marin }));
    verifier('Karl the Fog coule sur la passe, et les pylônes en dépassent',
      frisco.brouillard && frisco.pylone,
      JSON.stringify({ brouillard: frisco.brouillard }));
    verifier('le Bay Bridge est gris — on ne le confond plus avec le Golden Gate',
      frisco.bayGris, JSON.stringify({ bayGris: frisco.bayGris }));
    verifier('les otaries de Pier 39, Lombard fleurie et le Dragon Gate',
      frisco.otaries && frisco.lombard && frisco.dragon,
      JSON.stringify({ otaries: frisco.otaries, lombard: frisco.lombard, dragon: frisco.dragon }));

    // --- la Chine : une région entière dans l'ancienne zone morte -------------
    //
    // Entre San Francisco et le Pôle Nord, il n'y avait RIEN : des collines de
    // bruit. La fiche de terrain a posé une région culturelle complète, et on
    // mesure ses signatures : la muraille qui serpente SUR les crêtes (jamais
    // en fond de vallée), la Cité interdite vermillon et or avec ses lions de
    // bronze, les karsts de Guilin au bord de la rivière turquoise, les
    // rizières en marches d'eau, et les pandas dans leur bambouseraie.
    const chine = await tab.evaluate((C) => {
      const w = window.__game.world;
      const Cx = C.x, Cz = C.z;
      const GRIS_MUR = 33, VERMILLON = 40, JAUNE = 60, ORB = 19, EAU = 7, NOIR = 28, TIGE = 5;
      const creteV = (u) => -34 + Math.round(6 * Math.sin(u / 9) + u * 0.12);
      const colonne = (u, v, id) => {
        const h = w.terrainHeight(Cx + u, Cz + v);
        for (let y = h - 2; y < h + 20; y++) if (w.getBlock(Cx + u, y, Cz + v) === id) return true;
        return false;
      };
      const surface = (u, v) => w.getBlock(Cx + u, w.terrainHeight(Cx + u, Cz + v), Cz + v);
      // la muraille : présente sur la crête en cinq points, et la crête domine
      let surCrete = 0, domine = 0;
      for (const u of [-40, -20, 0, 20, 40]) {
        const vc = creteV(u);
        if (colonne(u, vc, GRIS_MUR)) surCrete++;
        if (w.terrainHeight(Cx + u, Cz + vc) - w.terrainHeight(Cx + u, Cz + vc + 20) >= 6) domine++;
      }
      // la Cité interdite : la porte vermillon au pavillon jaune, les lions
      const porte = colonne(-6, 10, VERMILLON) && colonne(-6, 10, JAUNE);
      const lions = colonne(-8, 13, ORB);
      // les karsts et la rivière turquoise
      const karst = w.terrainHeight(Cx + 27, Cz + 4) - 34 >= 15;
      const riviere = surface(34 + Math.round(5 * Math.sin(10 / 11)), 10) === EAU;
      // les rizières : de l'eau en marches
      const rizEau = surface(19, 40) === EAU;
      const marches = w.terrainHeight(Cx + 19, Cz + 40) - w.terrainHeight(Cx + 19, Cz + 46) >= 1;
      // les pandas dans leur bambouseraie
      const panda = colonne(-18, 40, NOIR);
      let bambous = 0;
      for (let du = -8; du <= 8; du += 2) {
        for (let dv = -6; dv <= 6; dv += 2) if (colonne(-14 + du, 40 + dv, TIGE)) { bambous++; }
      }
      return { surCrete, domine, porte, lions, karst, riviere, rizEau, marches, panda, bambous };
    }, V.chine);
    verifier('la Grande Muraille serpente sur les crêtes',
      chine.surCrete >= 4 && chine.domine >= 3,
      `${chine.surCrete}/5 points sur la crête · la crête domine en ${chine.domine}/5`);
    verifier('la Cité interdite : vermillon, tuiles jaunes et lions de bronze',
      chine.porte && chine.lions, JSON.stringify({ porte: chine.porte, lions: chine.lions }));
    verifier('les karsts de Guilin au bord de la rivière turquoise',
      chine.karst && chine.riviere, JSON.stringify({ karst: chine.karst, riviere: chine.riviere }));
    // --- l'usine du Père Noël -------------------------------------------------
    //
    // « Il n'y a pas d'elfe. Tout est vide à l'intérieur. Il n'y a pas les
    // rênes, il n'y a pas de traîneau, il n'y a pas plein de jouets, des
    // cadeaux. Il n'y a pas cette magie, cette féerie. » Tout était juste : la
    // halle était une coquille, l'étable un hangar, le traîneau une caisse, et
    // le village n'avait aucun habitant. On mesure donc les quatre manques.
    const noel = await tab.evaluate(() => {
      const w = window.__game.world;
      const Px = 40, Pz = -690;                    // le Pôle Nord
      const FX = Px + 16, FZ = Pz;                 // la halle de l'usine
      const bloc = (x, y, z) => w.getBlock(x, y, z);
      const sol = (x, z) => w.terrainHeight(x, z);
      // Les jouets et les cadeaux : tout ce qui est coloré à l'intérieur des
      // murs de la halle, du sol au plafond. Avant, il n'y avait presque rien.
      // Les identifiants des blocs décoratifs : rouge, vert lutin, vert sapin,
      // jaune, bleu, rose, turquoise — et l'or des rubans.
      const COULEURS = new Set([40, 100, 90, 60, 140, 200, 110, 19]);
      let colores = 0, tapis = 0;
      const base = sol(FX, FZ);
      for (let x = FX - 11; x <= FX + 11; x++) {
        for (let z = FZ - 13; z <= FZ + 13; z++) {
          for (let y = base; y <= base + 9; y++) {
            const id = bloc(x, y, z);
            if (COULEURS.has(id)) colores++;
          }
        }
      }
      // La chaîne de montage : le tapis qui traverse la halle du nord au sud.
      // Le tapis est posé un bloc au-dessus du sol de la halle : on balaie la
      // hauteur plutôt que de parier sur une cote exacte.
      for (let z = FZ - 12; z <= FZ + 12; z++) {
        for (let y = base - 2; y <= base + 2; y++) if (bloc(FX, y, z) === 33) { tapis++; break; }
      }
      // Les rennes : leurs bois, en bois sombre, au-dessus des stalles.
      const EX = Px - 2, EZ = Pz - 26;
      let bois = 0;
      for (let x = EX - 10; x <= EX + 14; x++) {
        for (let z = EZ - 6; z <= EZ + 6; z++) {
          const h = sol(x, z);
          for (let y = h + 3; y <= h + 6; y++) if (bloc(x, y, z) === 17) bois++;
        }
      }
      // Le traîneau : ses patins dorés, et la hotte chargée de cadeaux.
      const TX = Px + 4, TZ = Pz - 16;
      let patins = 0;
      for (let x = TX - 6; x <= TX + 4; x++) {
        for (const dz of [-2, 2]) {
          const h = sol(x, TZ + dz);
          if (bloc(x, h, TZ + dz) === 19 || bloc(x, h + 1, TZ + dz) === 19) patins++;
        }
      }
      let hotte = 0;
      for (let x = TX - 2; x <= TX + 1; x++) {
        for (let dz = -1; dz <= 1; dz++) {
          const h = sol(x, TZ + dz);
          for (let y = h + 3; y <= h + 5; y++) if (COULEURS.has(bloc(x, y, TZ + dz))) hotte++;
        }
      }
      // Les lutins et le Père Noël : des personnages vivants, pas du décor.
      const gens = (window.__game.npcs || []).map((n) => n.name);
      const lutins = gens.filter((n) => ['Piprik', 'Noisette', 'Gambille', 'Chamalo',
        'Pignon', 'Grelot', 'Bricole', 'Cannelle'].includes(n));
      return { colores, tapis, bois, patins, hotte, lutins: lutins.length,
        pereNoel: gens.includes('Père Noël') };
    });
    verifier('l\'usine du Père Noël déborde de jouets et de cadeaux',
      noel.colores > 300 && noel.tapis > 20,
      `${noel.colores} blocs colorés dans la halle · chaîne de ${noel.tapis} blocs`);
    verifier('des lutins y travaillent, et le Père Noël est là',
      noel.lutins >= 6 && noel.pereNoel,
      `${noel.lutins} lutins · Père Noël ${noel.pereNoel}`);
    verifier('les rennes ont leurs bois dans l\'étable',
      noel.bois >= 30, `${noel.bois} blocs de bois de rennes`);
    verifier('le traîneau a ses patins et sa hotte pleine',
      noel.patins >= 12 && noel.hotte >= 6,
      `${noel.patins} blocs de patins · ${noel.hotte} cadeaux dans la hotte`);

    verifier('les rizières en marches d\'eau, les pandas dans les bambous',
      chine.rizEau && chine.marches && chine.panda && chine.bambous >= 5,
      JSON.stringify({ rizEau: chine.rizEau, marches: chine.marches,
        panda: chine.panda, bambous: chine.bambous }));

    // --- Londres, relevée sur documents --------------------------------------
    //
    // Max : « quand tu vois Londres aujourd'hui, il n'y a qu'un seul bâtiment…
    // je veux un petit bout de Londres avec une vraie fidélité — les rues,
    // les maisons. » On éprouve donc ce qu'un enfant reconnaît : la Tamise et
    // son coude de Westminster, Big Ben au bord de l'eau, Tower Bridge qui
    // ENJAMBE le fleuve, la roue du London Eye, le dôme de St Paul, le Shard,
    // le Mall rouge, les parcs royaux, la brique victorienne et les bus.
    const londres = await tab.evaluate(async () => {
      const { WATER_LEVEL } = await import('./src/world.js');
      const { DECOR_START } = await import('./src/blocks.js');
      const { LONDRES } = await import('./src/londres.js');
      const w = window.__game.world;
      const X = (u) => LONDRES.x + u, Z = (v) => LONDRES.z + v;
      const eau = (u, v) => w.terrainHeight(X(u), Z(v)) < WATER_LEVEL;
      const debout = (u, v, R) => {
        const sol = w.terrainHeight(X(u), Z(v));
        let hMax = 0;
        for (let du = -R; du <= R; du++) {
          for (let dv = -R; dv <= R; dv++) {
            for (let y = sol + 110; y > sol; y--) {
              if (w.getBlock(X(u) + du, y, Z(v) + dv)) { hMax = Math.max(hMax, y - sol); break; }
            }
          }
        }
        return hMax;
      };
      const MALL_ROUGE = DECOR_START + 161;
      let mall = 0;
      for (let k = 0; k <= 10; k++) {
        const u = Math.round(-2 - (19 * k) / 10), v = Math.round(2 + (12 * k) / 10);
        if (w.getBlock(X(u), w.terrainHeight(X(u), Z(v)), Z(v)) === MALL_ROUGE) mall++;
      }
      let briques = 0;
      for (let du = -8; du <= 8; du++) {
        for (let dv = -8; dv <= 8; dv++) {
          const sol = w.terrainHeight(X(-40 + du), Z(30 + dv));
          for (let y = sol; y < sol + 10; y++) {
            const id = w.getBlock(X(-40 + du), y, Z(30 + dv));
            if (id === DECOR_START + 1 || id === DECOR_START + 181 || id === DECOR_START + 171) briques++;
          }
        }
      }
      let bus = 0;
      for (const [u, v] of [[-30, -21], [-12, -19], [10, -4], [2, 8], [30, -8]]) {
        const sol = w.terrainHeight(X(u), Z(v));
        for (let y = sol; y < sol + 4; y++) if (w.getBlock(X(u), y, Z(v)) === 23) { bus++; break; }
      }
      return {
        tamiseWestminster: eau(10, 18), tamiseCity: eau(66, -1), coude: eau(13, 3),
        trafalgarAuSec: !eau(0, 0),
        bigBen: debout(8, 18, 6), eye: debout(14, 11, 4), stPaul: debout(49, -17, 8),
        shard: debout(69, 8, 6), towerBridge: debout(87, 5, 15), sousLePont: eau(87, 5),
        serpentine: eau(-62, 5),
        hydeVert: w.getBlock(X(-72), w.terrainHeight(X(-72), Z(-3)), Z(-3)),
        mall, briques, bus,
      };
    });
    verifier('la Tamise fait son coude : en eau à Westminster, Charing Cross et la City',
      londres.tamiseWestminster && londres.coude && londres.tamiseCity && londres.trafalgarAuSec,
      JSON.stringify({ w: londres.tamiseWestminster, c: londres.coude,
        city: londres.tamiseCity, trafalgar: londres.trafalgarAuSec }));
    verifier('Big Ben au bord de l\'eau, la roue du London Eye en face',
      londres.bigBen >= 55 && londres.eye >= 38,
      `Big Ben ${londres.bigBen} · Eye ${londres.eye}`);
    verifier('Tower Bridge enjambe le fleuve — de l\'eau sous le tablier',
      londres.towerBridge >= 30 && londres.sousLePont,
      `pont ${londres.towerBridge} de haut · eau dessous : ${londres.sousLePont}`);
    verifier('le dôme de St Paul et la flèche du Shard',
      londres.stPaul >= 14 && londres.shard >= 90,
      `St Paul ${londres.stPaul} · Shard ${londres.shard}`);
    verifier('le Mall est rouge, Hyde Park est vert, la Serpentine est en eau',
      londres.mall >= 6 && (londres.hydeVert === 1 || londres.hydeVert === 6) && londres.serpentine,
      JSON.stringify({ mall: londres.mall, hyde: londres.hydeVert, serpentine: londres.serpentine }));
    verifier('les terrasses de brique victoriennes, et les bus impériaux rouges',
      londres.briques >= 60 && londres.bus >= 3,
      `${londres.briques} blocs de brique · ${londres.bus}/5 bus`);

    await banc.ouvrirLaCarte(tab);
    for (const [nom, cx, cz, attendus, bpp] of [
      ['Nice', V.nice.x, V.nice.z, ['Place Masséna', 'Vieux-Nice', 'Promenade des Anglais', 'Port Lympia']],
      ['Lille', V.lille.x, V.lille.z, ["Grand'Place", 'Vieux-Lille', 'Citadelle', 'Euralille']],
      // Londres est deux fois plus étendue que Nice : Tower Bridge vit à
      // 87 blocs du centre, un cadre de ±65 le laissait dehors.
      ['Londres', V.londres.x, V.londres.z,
        ['Big Ben', 'Buckingham Palace', 'Tower Bridge', 'Hyde Park', 'La City'], 0.6],
    ]) {
      await tab.evaluate(({ x, z, b }) => {
        const c2 = window.__carte;
        c2.vue.cx = x; c2.vue.cz = z; c2.vue.bpp = b;
        c2.limiter(); c2.peindre();
      }, { x: cx, z: cz, b: bpp || 0.35 });
      await dormir(500);
      const vusV = await lieuxVus(tab);
      const manque = attendus.filter((n) => !vusV.includes(n));
      verifier(`les lieux de ${nom} sont sur la carte`, manque.length === 0,
        manque.length ? `absents : ${manque.join(', ')}` : `${attendus.length} lieux`);
    }
    await tab.evaluate(() => document.getElementById('map-modal-close').click());
    await dormir(300);

    // --- Paris : la façade haussmannienne, registre par registre ------------
    //
    // « Ce qu'on a là n'est pas du tout à la hauteur de quelque chose de
    // vraiment sharp. » C'était juste, et la cause n'était pas la forme : une
    // fenêtre était un CUBE DE VERRE d'un mètre de côté, une façade un aplat
    // crème. On vérifie donc que la rue se lit maintenant comme une vraie
    // façade parisienne, de bas en haut, selon la règle du Second Empire :
    // devanture, entresol, étage noble à balcon, étages courants, second
    // balcon, corniche, puis le zinc.
    const facades = await tab.evaluate(() => {
      const w = window.__game.world;
      const { PARIS } = window.__game.__paris || {};
      const A = window.__game.__archi;
      if (!A || !PARIS) return { err: 'modules non exposés' };
      // On balaie le quartier et on relève, pour chaque colonne de façade,
      // l'empilement des registres.
      const compte = {};
      let piles = 0, correctes = 0, rythmees = 0;
      for (let x = PARIS.x - 40; x <= PARIS.x + 40; x += 1) {
        for (let z = PARIS.z - 40; z <= PARIS.z + 40; z += 1) {
          // La base d'un immeuble n'est pas toujours à la même hauteur : le
          // terrain de Paris monte vers la Butte. On la CHERCHE.
          const sol = w.terrainHeight(x, z);
          let y0 = null;
          for (let d = -1; d <= 2 && y0 === null; d++) {
            const b = w.getBlock(x, sol + d, z);
            if (b === A.VITRINE || b === A.PORTE) y0 = sol + d - 1;
          }
          if (y0 === null) continue;
          const pile = [];
          for (let y = y0 + 1; y <= y0 + 12; y++) pile.push(w.getBlock(x, y, z));
          piles++;
          for (const id of pile) compte[id] = (compte[id] || 0) + 1;
          // La règle : entresol juste au-dessus, étage noble encore au-dessus,
          // et une corniche quelque part avant le zinc.
          // Deux lectures sont justes, et une seule est fausse. Une travée
          // ordinaire empile entresol puis étage noble ; un ANGLE porte le
          // chaînage de pierre d'un seul tenant, du trottoir à la corniche —
          // c'est ainsi qu'un immeuble se construit, et l'oublier faisait
          // passer un tiers des colonnes pour fautives.
          const corniche = pile.includes(A.CORNICHE);
          const registre = pile[1] === A.ENTRESOL && pile[2] === A.NOBLE;
          const chaine = pile[1] === A.CHAINAGE && pile[2] === A.CHAINAGE;
          if (corniche && (registre || chaine)) correctes++;
          if (corniche && registre) rythmees++;
        }
      }
      return { piles, correctes, rythmees, compte };
    });
    verifier('Paris a de vraies façades haussmanniennes',
      !facades.err && facades.piles > 40, JSON.stringify({ piles: facades.piles, err: facades.err }));
    verifier('et chaque colonne est un registre ou un chaînage d\'angle',
      !facades.err && facades.correctes > facades.piles * 0.95,
      `${facades.correctes}/${facades.piles} conformes`);
    verifier('l\'étage noble à balcon court sur la majorité des travées',
      !facades.err && facades.rythmees > facades.piles * 0.5,
      `${facades.rythmees}/${facades.piles} travées rythmées`);

    const rue = await tab.evaluate(() => {
      const w = window.__game.world;
      const { PARIS } = window.__game.__paris || {};
      const A = window.__game.__archi;
      if (!A || !PARIS) return { err: 'modules non exposés' };
      let paves = 0, bordures = 0, mansardes = 0, chainages = 0;
      for (let x = PARIS.x - 40; x <= PARIS.x + 40; x += 1) {
        for (let z = PARIS.z - 40; z <= PARIS.z + 40; z += 1) {
          const y = w.terrainHeight(x, z);
          const sol = w.getBlock(x, y, z);
          if (sol === A.PAVE) paves++;
          if (sol === A.BORDURE) bordures++;
          for (let h = y + 1; h <= y + 12; h++) {
            const b = w.getBlock(x, h, z);
            if (b === A.MANSARDE) mansardes++;
            if (b === A.CHAINAGE) chainages++;
          }
        }
      }
      return { paves, bordures, mansardes, chainages };
    });
    verifier('la chaussée est pavée et bordée de granit',
      !rue.err && rue.paves > 200 && rue.bordures > 60,
      JSON.stringify(rue));
    verifier('les combles ont leurs chiens-assis et les angles leur chaînage',
      !rue.err && rue.mansardes > 10 && rue.chainages > 10, JSON.stringify(rue));

    verifier('aucune erreur JavaScript sur la tablette', tab.erreurs.length === 0,
      JSON.stringify(tab.erreurs));

    // --- et sur un ordinateur, à la souris -----------------------------------
    // C'est là que la carte était complètement inerte : la souris capturée par
    // le jeu envoyait tous les clics dans la fenêtre 3D.
    const bureau = await banc.jouerSeul('Alice');
    await banc.ouvrirLaCarte(bureau);
    const boutonRecoit = await bureau.evaluate(() => {
      const b = document.getElementById('map-tout');
      const r = b.getBoundingClientRect();
      const dessus = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return dessus === b;
    });
    verifier('à la souris, les commandes de la carte sont bien atteignables', boutonRecoit);

    const avant = await vue(bureau);
    await bureau.click('#map-tout');
    await dormir(600);
    verifier('et le bouton 🌍 répond vraiment au clic',
      (await vue(bureau)).bpp > avant.bpp * 2,
      `${avant.bpp.toFixed(2)} → ${(await vue(bureau)).bpp.toFixed(2)}`);

    const c3 = await cadre(bureau);
    const avantMolette = (await vue(bureau)).bpp;
    await bureau.mouse.move(c3.x + c3.w / 2, c3.y + c3.w / 2);
    await bureau.mouse.wheel(0, -400);
    await dormir(400);
    const apresMolette = (await vue(bureau)).bpp;
    verifier('la molette zoome', apresMolette < avantMolette * 0.9,
      `${avantMolette.toFixed(2)} → ${apresMolette.toFixed(2)}`);

    verifier('aucune erreur JavaScript sur l\'ordinateur', bureau.erreurs.length === 0,
      JSON.stringify(bureau.erreurs));
  } finally {
    await banc.fermer();
  }

  console.log(echecs.length
    ? `\n❌ ${echecs.length} défaut(s) :\n   ${echecs.join('\n   ')}`
    : '\n✅ la carte se laisse promener, zoomer et toucher');
  process.exit(echecs.length ? 1 : 0);
})().catch((e) => { console.error('\n💥 le banc d\'essai a lâché :', e); process.exit(2); });
