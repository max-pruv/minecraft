// La carte : celle qu'on ouvre pour décider où aller.
//
// Elle n'était qu'une image fixe ; elle se fait maintenant glisser et écarter
// à deux doigts. Ces scénarios suivent le geste d'un enfant du début à la fin
// — ouvrir, se promener, zoomer, toucher un nom — parce que c'est précisément
// là qu'on a trouvé les défauts : chacun des mécanismes marchait séparément.
//
//     cd tests && npm install && npm run carte

const { Banc, dormir, pincer } = require('./banc.js');

const echecs = [];
function verifier(nom, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${nom}${detail ? ` — ${detail}` : ''}`);
  if (!ok) echecs.push(nom + (detail ? ` — ${detail}` : ''));
}

const vue = (p) => p.evaluate(() => ({ ...window.__carte.vue }));
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

    // --- écarter deux doigts -------------------------------------------------
    // Au centre de la carte : plus loin, un doigt du geste large sortirait du
    // cadre et le navigateur n'annoncerait qu'un seul contact.
    const centre = { x: c.x + c.w / 2, y: c.y + c.w / 2 };
    const avantPince = await vue(tab);
    await pincer(tab, centre, 60, 200);
    const apresPince = await vue(tab);
    verifier('écarter deux doigts rapproche la carte',
      apresPince.bpp < avantPince.bpp * 0.75,
      `${avantPince.bpp.toFixed(2)} → ${apresPince.bpp.toFixed(2)}`);

    await pincer(tab, centre, 200, 60);
    verifier('les rapprocher éloigne',
      (await vue(tab)).bpp > apresPince.bpp * 1.3,
      `${apresPince.bpp.toFixed(2)} → ${(await vue(tab)).bpp.toFixed(2)}`);

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
    verifier('le bouton 🌍 montre tout le monde', monde.bpp > 3, monde.bpp.toFixed(2));

    // Une destination sans repère à l'écran est une destination inatteignable.
    // Les noms, eux, ont le droit de manquer quand la place manque : c'est la
    // pastille d'icône qui garantit qu'on peut toujours partir.
    const vus = await lieuxVus(tab);
    const grands = ['Paris', 'New York', 'San Francisco', 'Nice', 'Lille', 'Planète Mars',
      'Château de Villandry', 'Aéroport Charles-de-Gaulle', 'Village gaulois', 'Base spatiale',
      'Circuit de F1', 'Volcan', 'Désert', 'Île tropicale', 'Château médiéval', "Parc d'attractions"];
    const absents = grands.filter((n) => !vus.includes(n));
    verifier('toutes les grandes destinations restent repérables',
      absents.length === 0, absents.join(', '));

    // Rien ne doit déborder du cadre : un nom coupé n'est ni lisible ni touchable.
    const debord = await tab.evaluate(() => {
      const c2 = window.__carte;
      const css = c2.taille().css;
      return c2.etiquettes.filter((e) => e.rect.x0 < -1 || e.rect.x1 > css + 1
        || e.rect.y0 < -1 || e.rect.y1 > css + 1).map((e) => e.lieu.name);
    });
    verifier('aucun nom ne déborde de la carte', debord.length === 0, debord.join(', '));

    // --- toucher un nom ------------------------------------------------------
    const cible = await tab.evaluate(() => {
      const e = window.__carte.etiquettes.find((x) => x.lieu.name === 'Nice');
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
    await tab.evaluate(() => { const c2 = window.__carte; c2.vue.cx = 0; c2.vue.cz = -320; c2.vue.bpp = 1.2; });
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
    const rues = await tab.evaluate(() => {
      const c2 = window.__carte;
      const bitume = () => {
        const f = c2.fond;
        const d = f.getContext('2d').getImageData(0, 0, f.width, f.height).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] < 90 && d[i + 1] < 90 && d[i + 2] < 100 && Math.abs(d[i] - d[i + 2]) < 30) n++;
        }
        return n / (f.width * f.height);
      };
      c2.vue.cx = -240; c2.vue.cz = 200; c2.vue.bpp = 3;
      c2.rendreFond();
      const loin = bitume();
      c2.vue.bpp = 0.35;
      c2.rendreFond();
      return { loin, pres: bitume() };
    });
    verifier('en s\'approchant, Paris révèle ses rues',
      rues.pres > 0.015 && rues.pres > rues.loin * 4,
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

    // --- les bornes ----------------------------------------------------------
    const bornes = await tab.evaluate(() => {
      const c2 = window.__carte;
      for (let i = 0; i < 40; i++) c2.zoomerVers(100, 100, 1.5);
      const pres = c2.vue.bpp;
      for (let i = 0; i < 60; i++) c2.zoomerVers(100, 100, 1 / 1.5);
      const loin = c2.vue.bpp;
      for (let i = 0; i < 60; i++) { c2.vue.cx += 500; c2.limiter(); }
      return { pres, loin, cx: c2.vue.cx };
    });
    verifier('on ne peut ni zoomer à l\'infini ni sortir du monde',
      bornes.pres >= 0.2 && bornes.loin <= 5 && bornes.cx < 1500, JSON.stringify(bornes));

    // --- le bas de Manhattan -------------------------------------------------
    //
    // Le bas de l'île tenait en quinze blocs : de la pointe de Battery à la 14e
    // Rue, il y avait moins de place que dans un seul pâté de Midtown. Aucun
    // plan réel n'y entrait, et les quartiers dont un enfant connaît le nom —
    // TriBeCa, SoHo, Chinatown, le Village, Wall Street — se retrouvaient les
    // uns sur les autres. On vérifie donc les deux choses qu'il verrait :
    // qu'on peut y aller, et qu'une fois là-bas ce n'est pas la même ville
    // qu'au nord.
    const NY = { x: 295, z: -110 };
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
    const surLaGrille = (colonnes) => {
      let n = 0, dessus = 0;
      for (const c of colonnes) {
        if (!c.terre || c.rues.length > c.terre * 0.5) continue;
        for (const v of c.rues) { n++; if (((v % 6) + 6) % 6 === 0) dessus++; }
      }
      return n ? dessus / n : -1;
    };
    const colonnes = [2, -4, 6, -9, 13, 17];
    const haut = surLaGrille(await sonder(colonnes, 20, 50));
    const bas = surLaGrille(await sonder(colonnes, 66, 100));
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
    const PARIS = { x: -240, z: 200 };
    await banc.ouvrirLaCarte(tab);
    await tab.evaluate(({ p }) => {
      const c2 = window.__carte;
      c2.vue.cx = p.x; c2.vue.cz = p.z; c2.vue.bpp = 0.24;
      c2.limiter(); c2.peindre();
    }, { p: PARIS });
    await dormir(600);
    const vusParis = await lieuxVus(tab);
    const attendusParis = ['Tour Eiffel', 'Arc de Triomphe', 'Panthéon', 'Invalides',
      'Opéra', 'Bastille', 'Luxembourg', 'Concorde'];
    const absentsParis = attendusParis.filter((n) => !vusParis.includes(n));
    verifier('les lieux de Paris sont sur la carte', absentsParis.length === 0,
      absentsParis.length ? `absents : ${absentsParis.join(', ')}` : `${attendusParis.length} lieux`);

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
