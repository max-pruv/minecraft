// L'espace parent, ouvert pour de vrai sur une famille réaliste.
//
// Il manquait à cet écran ce que toutes les autres suites ont : un scénario
// qui l'ouvre et regarde ce qu'il montre. Le Supabase de poche ne servait même
// pas la table des identités — un pan entier du panneau passait donc au
// travers, et « rien ne remonte » n'avait aucun témoin pour le contredire.
//
//     cd tests && node parent.js
//
// Deux exigences, et elles comptent autant l'une que l'autre :
//   — quand le nuage répond, la famille apparaît, avec ses chiffres ;
//   — quand il refuse, le panneau le DIT. Une liste vide muette est un piège :
//     rien n'y distingue « le nuage dit non » de « personne n'a joué », et
//     c'est exactement ce qui a coûté une soirée d'enquête.

const { Banc, dormir, jusqua } = require('./banc.js');
const { servirLeNuage } = require('./nuage.js');

const echecs = [];
function verifier(nom, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${nom}${detail ? ` — ${detail}` : ''}`);
  if (!ok) echecs.push(nom + (detail ? ` — ${detail}` : ''));
}

const jour = (recul) => {
  const d = new Date();
  d.setDate(d.getDate() - recul);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Une famille comme celle de la vraie base : des enfants vivants, un parent,
// des documents de service en tilde, et des comptes supprimés qui traînent.
//
// Aucun de ces enfants n'est celui qui REGARDE. C'est volontaire : trouver
// son propre profil neuf dans le nuage fait recharger la page une fois — un
// comportement du jeu, pas un défaut — et un scénario qui l'ignore se fait
// arracher le tapis sous les pieds au milieu d'une mesure.
const ENFANTS = ['Marlon', 'Alice', 'Iditsi5'];

function semer(nuage) {
  for (const nom of ENFANTS) {
    nuage.poserIdentite({ name: nom, faces: [[0.1, 0.2]], pin_hash: 'x', updated_at: new Date().toISOString() });
    // Le journal de blocs a la forme que le jeu écrit : [identifiant, date].
    // Une entrée volontairement biscornue s'y ajoute — un lot venu du nuage ne
    // doit jamais être perdu en entier à cause d'une case douteuse.
    // ET LE `dex` RESTE DANS LE DOCUMENT, À DESSEIN. Le mode d'attrape est parti
    // en v285 mais ses données restent (v256) : ce document a la forme de ce
    // qu'une tablette a vraiment écrit, et l'espace parent doit continuer de le
    // lire sans broncher. Le retirer d'ici rendrait le témoin plus faible.
    nuage.poserEtat(nom, {
      dex: [{ id: 1 }], worlds: [{ code: '12345' }],
      edits: { local: { '1,40,3': [4, 1786000000000], '2,40,3': 'abîmée' } },
    });
    nuage.poserReglages(nom, { lang: 'fr', grade: 3, charIdx: 0 });
    for (let i = 0; i < 5; i++) {
      nuage.poserTemps({ name: nom, device_id: 'ipad-' + nom, day: jour(i),
        play: 600 + i * 60, quiz: 120, correct: 8, wrong: 2, updated_at: new Date().toISOString() });
    }
  }
  // Les consignes du parent, l'invitation d'un ami, et deux comptes effacés :
  // aucun des quatre n'est un enfant, et aucun ne doit apparaître.
  nuage.poserReglages('Marlon~parent', { sessionMin: 20 });
  nuage.poserReglages('Alice~invit', { de: 'Marlon' });
  nuage.poserReglages('Papa', { supprime: true });
  nuage.poserReglages('__zz_test', { supprime: true });
}

async function ouvrirEspaceParent(p) {
  // On passe par l'objet du jeu plutôt que par le geste secret : c'est le
  // panneau qu'on éprouve, pas la serrure.
  return p.evaluate(async () => {
    const a = window.__game.admin;
    if (!a) return { err: 'pas d’espace parent' };
    // mount() plutôt que open() : c'est le panneau qu'on éprouve, pas la
    // serrure — open() réclame le code parental, qui n'a rien à voir ici.
    a.mount();
    // On garde la vraie lecture sous la main : les scénarios de panne la
    // remplacent, et le dernier doit pouvoir la rendre.
    if (!window.__vraiSelect) {
      window.__vraiSelect = window.__game.cloud.selectAllDetaille.bind(window.__game.cloud);
    }
    await a.load();
    return { ouvert: !!a.el };
  });
}

// Ce que le parent a sous les yeux.
async function panneau(p) {
  return p.evaluate(() => {
    const a = window.__game.admin;
    if (!a || !a.el) return null;
    return {
      sub: (a.el.querySelector('#adm-sub') || {}).textContent || '',
      lignes: [...a.el.querySelectorAll('#adm-rows tr')].map((tr) =>
        (tr.querySelector('td') || {}).textContent || '').map((s) => s.trim()),
      cartes: [...a.el.querySelectorAll('#adm-cards .adm-card')].map((c) => c.textContent.trim()),
      choix: [...a.el.querySelectorAll('#adm-filtre-enfant option')].map((o) => o.value),
    };
  });
}

(async () => {
  const banc = new Banc();
  await banc.ouvrir();
  const nuage = await servirLeNuage(9741);
  semer(nuage);
  try {
    const p = await banc.jouerSeul('Max', { portNuage: 9741 });
    // Le jeu peut se recharger une fois au premier contact avec le nuage : on
    // le laisse faire avant de toucher au panneau.
    await dormir(4000);
    await p.waitForFunction(() => !!(window.__game && window.__game.admin), null, { timeout: 30000 });
    const ouverture = await ouvrirEspaceParent(p);
    verifier('l’espace parent s’ouvre', !!(ouverture && ouverture.ouvert), JSON.stringify(ouverture));

    await jusqua(async () => {
      const v = await panneau(p);
      return !!v && v.lignes.length > 0;
    }, 30000);
    const vu = await panneau(p);
    const noms = vu ? vu.lignes.join(' ') : '';
    verifier('la famille remonte', !!vu && vu.lignes.length >= 3,
      vu ? `${vu.lignes.length} ligne(s)` : 'panneau absent');
    verifier('chaque enfant est là',
      /Marlon/.test(noms) && /Alice/.test(noms) && /Iditsi5/.test(noms), noms.replace(/\s+/g, ' '));
    verifier('les documents de service n’y sont pas',
      !/~parent|~invit/.test(noms), noms);
    verifier('les comptes supprimés non plus', !/Papa|__zz_test/.test(noms), noms);

    // Le résumé dit ce qu'il a lu : c'est ce qui rend une lecture vide
    // interprétable au lieu d'être une énigme.
    verifier('le résumé dit ce qui a été lu',
      /identités/.test(vu.sub) && /journées/.test(vu.sub), JSON.stringify(vu.sub));

    // --- le nuage qui refuse -------------------------------------------------
    //
    // Le cœur de l'affaire. On coupe la lecture net et on exige une phrase.
    // Sans elle, le panneau affichait « 0 joueur » du même ton assuré que s'il
    // n'y avait vraiment personne.
    await p.evaluate(() => {
      const c = window.__game.cloud;
      c.selectAllDetaille = async () => ({ ok: false, statut: 401, raison: 'clé refusée', lignes: [] });
    });
    await p.evaluate(() => window.__game.admin.load());
    await dormir(800);
    const refus = await panneau(p);
    verifier('un nuage qui refuse ne se fait pas passer pour une famille vide',
      !!refus && /401|refuse/i.test(refus.sub), refus ? JSON.stringify(refus.sub) : 'panneau absent');

    // --- l'appareil hors ligne ----------------------------------------------
    await p.evaluate(() => {
      const c = window.__game.cloud;
      c.selectAllDetaille = async () => ({ ok: false, statut: 0, raison: 'injoignable', lignes: [] });
    });
    await p.evaluate(() => window.__game.admin.load());
    await dormir(800);
    const horsLigne = await panneau(p);
    verifier('et un appareil hors ligne le dit autrement',
      !!horsLigne && /injoignable|connexion/i.test(horsLigne.sub),
      horsLigne ? JSON.stringify(horsLigne.sub) : 'panneau absent');

    // --- une lecture partielle montre quand même ce qu'elle a ----------------
    //
    // Une table fâchée ne doit pas emporter les trois autres : on montre ce
    // qu'on a, en disant ce qui manque.
    await p.evaluate(() => {
      const c = window.__game.cloud;
      c.selectAllDetaille = async (table, q) => (table === 'player_identity'
        ? { ok: false, statut: 500, raison: 'table fâchée', lignes: [] }
        : window.__vraiSelect(table, q));
    });
    await p.evaluate(() => window.__game.admin.load());
    await dormir(1500);
    const partiel = await panneau(p);
    verifier('une table fâchée n’efface pas les autres',
      !!partiel && partiel.lignes.length >= 3 && /illisible/.test(partiel.sub),
      partiel ? `${partiel.lignes.length} ligne(s) · ${JSON.stringify(partiel.sub)}` : 'panneau absent');

    // LE TEMPS D'ÉCRAN D'UN ENFANT COMPTE EN TEMPS RÉEL (v234).
    //
    // C'est l'invariant 2 qui est en jeu : le mode éducatif doit être « toujours
    // actif et non contournable ». Or `main.js` borne `dt` à un vingtième de
    // seconde — juste pour la physique — et `education.js` comptait la journée
    // de l'enfant avec ce `dt`. Mesuré à la sonde sur douze secondes réelles :
    // à 24 images par seconde le compteur en retient 11, à 5 il n'en retient
    // que TROIS. Une tablette qui rame multipliait donc par quatre la limite du
    // jour — sans que personne ne contourne quoi que ce soit.
    //
    // ON MESURE CE QUE LE PARENT A RÉGLÉ : des minutes de pendule. On alourdit
    // chaque image pour retrouver la cadence d'une tablette fatiguée, et l'on
    // regarde ce que le compteur retient d'une fenêtre de temps réel connue.
    const ecran = await p.evaluate(async () => {
      const g = window.__game;
      if (!g.edu || !g.edu.today) return { err: 'pas de mode éducatif' };
      g.edu.today().libreJusqua = 86400;          // pas de quiz au milieu de la mesure
      // On occupe le fil d'affichage à chaque image : c'est ce que fait un iPad
      // qui charge une ville, et c'est la seule façon d'éprouver la cadence
      // basse sans attendre qu'elle arrive.
      window.__lest = () => {
        const t0 = performance.now();
        while (performance.now() - t0 < 190) { /* on occupe le fil */ }
        if (window.__lestActif) requestAnimationFrame(window.__lest);
      };
      window.__lestActif = true;
      requestAnimationFrame(window.__lest);
      const im0 = g.renderer.info.render.frame;
      const joue0 = g.edu.today().play;
      const t0 = performance.now();
      await new Promise((f) => setTimeout(f, 12000));
      const reel = (performance.now() - t0) / 1000;
      const compte = g.edu.today().play - joue0;
      const cadence = (g.renderer.info.render.frame - im0) / reel;
      window.__lestActif = false;
      return {
        reel: +reel.toFixed(1), compte: +compte.toFixed(1),
        cadence: +cadence.toFixed(1), part: +(compte / reel).toFixed(2),
      };
    });
    // Neuf dixièmes : on laisse la marge d'une image ou deux perdues au
    // démarrage de la mesure, pas celle d'un facteur quatre. L'ancien code rend
    // 0,25 à cinq images par seconde.
    verifier('une minute de jeu compte pour une minute, même quand ça rame',
      !ecran.err && ecran.cadence < 12 && ecran.part >= 0.9,
      JSON.stringify(ecran));

    // ── LE JOURNAL DE BORD DE L'APPAREIL (v296) ────────────────────────────
    //
    // Max : un iPad de six ans plante après vingt secondes à Paris, et il n'en
    // reste rien. Le journal s'écrit PENDANT, se relit au lancement suivant, et
    // deux plantages de suite allègent le jeu tout seuls. La règle pure d'abord,
    // sous node ; puis le trajet d'une tablette dont la session d'avant est
    // morte sans dire au revoir ; puis ce que le parent en voit.
    const J = await import('../src/journal.js');
    const PAL = await import('../src/palier.js');
    {
      const b1 = J.bilanPrecedent({ drapeau: '1', journalBrut: JSON.stringify({ debut: 1, fiche: { ua: 'iPad' }, releves: [{ t: 19, ville: 'paris' }], evenements: [] }), plantages: 0 });
      const b0 = J.bilanPrecedent({ drapeau: null, journalBrut: '{}', plantages: 1 });
      verifier('une session qui n’a pas dit au revoir est un plantage présumé, et le compteur monte',
        !!(b1.rapport && b1.rapport.fin === 'plantage' && b1.rapport.releves[0].ville === 'paris' && b1.plantages === 1
          && b0.rapport === null && b0.plantages === 1), JSON.stringify({ b1, b0 }));
      const s1 = J.suretePalier(1), s2 = J.suretePalier(2);
      const r2 = PAL.palierRetenu({ choix: 'auto', mesure: s2 });
      const rc = PAL.palierRetenu({ choix: 'moyen', mesure: s2 });
      const rm = PAL.palierRetenu({ choix: 'auto', mesure: { palier: 'moyen' } });
      verifier('deux plantages de suite déclenchent la sûreté : palier bas, que seul un choix d’étendue passe',
        s1 === null && !!(s2 && s2.palier === 'bas' && s2.surete) && !!(r2 && r2.nom === 'bas' && r2.source === 'sûreté')
          && !!(rc && rc.nom === 'moyen' && rc.source === 'choix') && !!(rm && rm.source === 'mesure'),
        JSON.stringify({ s1, s2, r2, rc, rm }));
      // ET LA SÛRETÉ PASSE DEVANT L'ÉTENDUE SOUS LAQUELLE ÇA A PLANTÉ (v299) :
      // l'iPhone de Max est mort deux fois de suite sous « Loin », et un choix
      // qui passait devant tout était devenu la boucle sans issue. Le journal de
      // la session morte dit sous quelle étendue elle jouait (fiche.reglage) ;
      // le verdict la porte, et ne s'oppose qu'à elle : « Normal » passe.
      const bh = J.bilanPrecedent({ drapeau: '1', journalBrut: JSON.stringify({ fiche: { reglage: { rr: 16, hd: 6, etendue: 'haut' } }, releves: [], evenements: [] }), plantages: 1 });
      const sh = J.suretePalier(bh.plantages, bh.etendue);
      const rh = PAL.palierRetenu({ choix: 'haut', mesure: sh });
      const rn = PAL.palierRetenu({ choix: 'moyen', mesure: sh });
      const ra = PAL.palierRetenu({ choix: 'auto', mesure: sh });
      const sa = J.suretePalier(2, 'auto');
      verifier('deux plantages sous « Loin » : la sûreté passe devant « Loin », et devant lui seul',
        bh.etendue === 'haut' && bh.plantages === 2 && !!(sh && sh.sousChoix === 'haut')
          && !!(rh && rh.nom === 'bas' && rh.source === 'sûreté' && rh.sousChoix === 'haut')
          && !!(rn && rn.nom === 'moyen' && rn.source === 'choix') && !!(ra && ra.source === 'sûreté')
          && !!(sa && !('sousChoix' in sa)),
        JSON.stringify({ etendue: bh.etendue, sh, rh: rh && { nom: rh.nom, source: rh.source, sousChoix: rh.sousChoix }, rn: rn && rn.source, ra: ra && ra.source, sa }));
      // DEUX PAGES SUR LE MÊME STOCKAGE NE SE DÉCLARENT PAS PLANTÉES (v409).
      // L'iPhone de la famille a déclaré « plantée » une session qui a envoyé
      // sa fermeture propre trois minutes plus tard (lignes 82 et 83 de
      // `journal_appareil`) : une seconde page avait lu le drapeau de la
      // première, vivante. Une horloge et un stockage fabriqués : la première
      // bat, la seconde s'ouvre une seconde après — ni rapport ni compteur ;
      // la première se ferme — la ligne de la seconde reste. Puis une page qui
      // meurt sans battre : relancée quinze secondes plus tard, plantage ; et
      // relancée trois secondes plus tard, elle est DOUTEUSE, et c'est le
      // battement qui n'avance pas qui la dit morte. Sur l'ancien code, la
      // seconde page rapporte la première (rouge).
      {
        const magasin = new Map();
        const stockage = { get: (k) => (magasin.has(k) ? magasin.get(k) : null), set: (k, v) => magasin.set(k, String(v)), remove: (k) => magasin.delete(k) };
        let h = 1e12;
        const horloge = () => h;
        const nouvelle = (id) => new J.Journal({ stockage, maintenant: horloge, id });
        const a = nouvelle('a'); const ba = a.ouvrir();
        h += 1000; if (a.battre) a.battre();
        const b = nouvelle('b'); const bb = b.ouvrir();
        h += 2000; if (a.battre) a.battre();
        const vivA = b.verifierDouteuses ? b.verifierDouteuses(true) : { vivantes: [], rapports: ['(pas de vérification)'] };
        a.fermer('fermeture');
        const tableApresA = stockage.get(J.SESSION_CLE);
        const ligneB = J.lireSessions ? !!J.lireSessions(tableApresA).b : false;
        // b meurt sans dire au revoir ; relance quinze secondes plus tard
        h += 15000;
        const c = nouvelle('c'); const bc = c.ouvrir();
        // c meurt ; relance trois secondes plus tard : douteuse, puis tranchée
        h += 3000;
        const d = nouvelle('d'); const bd = d.ouvrir();
        h += 7000;
        const td = d.verifierDouteuses ? d.verifierDouteuses(true) : { vivantes: [], rapports: [] };
        const ancien = J.lireSessions ? J.lireSessions('1791654694912') : null;
        verifier('deux pages sur le même stockage ne se déclarent pas plantées, et une page morte l’est quand même',
          !ba.rapport && !bb.rapport && bb.plantages === 0 && vivA.vivantes.length === 1 && !vivA.rapports.length && ligneB
            && !!(bc.rapport && bc.rapport.fin === 'plantage' && bc.rapport.id === 'b') && bc.plantages === 1
            && !bd.rapport && bd.douteuses && bd.douteuses.length === 1 && td.rapports.length === 1 && td.rapports[0].id === 'c'
            && d.plantages() === 2 && !!(ancien && ancien.ancienne && ancien.ancienne.ancienne),
          JSON.stringify({ seconde: { rapport: !!bb.rapport, plantages: bb.plantages }, vivA, ligneB, apresMort: { rapport: bc.rapport && bc.rapport.id, plantages: bc.plantages },
            douteuse: { rapport: !!bd.rapport, douteuses: bd.douteuses, tranchee: td.rapports.map((r) => r.id), plantages: d.plantages() }, ancien }));
      }
      const gros = { fiche: {}, evenements: Array.from({ length: 500 }, (_, i) => ({ t: i, type: 'x', d: 'y'.repeat(100) })),
        releves: Array.from({ length: 200 }, (_, i) => ({ t: i, ips: 30, pire: 40 })) };
      const borne = J.borner(gros);
      verifier('un journal se borne à ce qu’un envoi de fermeture accepte, en gardant le plus récent',
        JSON.stringify(borne).length <= J.MAX_OCTETS && JSON.stringify(gros).length > J.MAX_OCTETS && borne.releves.slice(-1)[0].t === 199,
        `${JSON.stringify(gros).length} → ${JSON.stringify(borne).length} octets, borne ${J.MAX_OCTETS}`);
    }

    // Le trajet : une tablette dont la session d'avant est morte — le drapeau
    // encore là, un journal écrit à Paris, déjà un plantage au compteur.
    const cles = { SESSION_CLE: J.SESSION_CLE, PLANTAGES_CLE: J.PLANTAGES_CLE, JOURNAL_CLE: J.JOURNAL_CLE };
    const tab = await banc.joueur('Ipad', { portNuage: 9741 });
    await tab.waitForFunction(() => window.__game, null, { timeout: 90000 });
    // UN RECHARGEMENT EST UN AU REVOIR : `pagehide` ferme la session proprement
    // et efface le drapeau. Mon premier jet semait les clés AVANT de recharger
    // et mesurait donc une session propre (« plantages 0 »). On sème au
    // `pagehide`, APRÈS le geste du jeu — les écouteurs se suivent dans l'ordre
    // d'inscription — c'est la seule façon de laisser derrière soi ce qu'un
    // plantage laisse : un drapeau, un journal, un compteur.
    await tab.evaluate((c) => {
      window.addEventListener('pagehide', () => {
        localStorage.setItem(c.SESSION_CLE, String(Date.now()));
        localStorage.setItem(c.PLANTAGES_CLE, '1');
        localStorage.setItem(c.JOURNAL_CLE, JSON.stringify({ debut: Date.now() - 20000, fiche: { ua: navigator.userAgent, prenom: 'Ipad' },
          evenements: [{ t: 0, type: 'jouer' }], releves: [{ t: 19.5, ville: 'paris', ips: 12, pire: 900, morceaux: 240, hd: 200 }], erreurs: 0 }));
      });
    }, cles);
    await tab.reload({ waitUntil: 'load', timeout: 90000 });
    await tab.waitForFunction(() => window.__game, null, { timeout: 90000 });
    const tJ = Date.now();
    let plantage = null;
    while (Date.now() - tJ < 20000 && !plantage) {
      await dormir(500);
      plantage = nuage.journaux().find((r) => r.fin === 'plantage' && r.name === 'Ipad');
    }
    verifier('la session morte sans au revoir remonte au nuage comme plantage présumé, avec son dernier relevé',
      !!(plantage && plantage.doc && plantage.doc.releves && plantage.doc.releves[0].ville === 'paris' && plantage.appareil),
      plantage ? `en ${Date.now() - tJ} ms · ${JSON.stringify(plantage).slice(0, 240)}` : 'aucune ligne « plantage » en 20 s');
    const etat = await tab.evaluate(() => ({ ...window.__game.reglageApplique, plantages: window.__journal.plantages(),
      range: localStorage.getItem('web-minecraft-palier-v2') }));
    // Sous `?rr=` (le banc), la sûreté s'applique mais ne se RANGE pas (v284).
    verifier('au deuxième plantage de suite, le jeu passe en palier bas par sûreté — sans le ranger sous une adresse forcée',
      etat.palier === 'bas' && etat.source === 'sûreté' && etat.hd === 0 && etat.plantages === 2 && etat.range === null,
      JSON.stringify(etat));
    // CE QUE LA SCÈNE TIENT CÔTÉ CARTE GRAPHIQUE SE COMPTE EN OCTETS (v409).
    // Safari ne donne pas le tas ; un compte de textures n'est pas un poids.
    // L'estimation doit SUIVRE un objet : une texture de 1 024² sans mipmaps, une de
    // 512² avec, et une géométrie de six mégaoctets ajoutées la font monter d'autant, retirées
    // la ramènent. Et un clone qui partage sa source ne compte qu'une fois.
    const memoire = await tab.evaluate(async () => {
      const g = window.__game;
      if (!g.memoireGPU) return { absente: true };
      const THREE = await import('three');
      const avant = g.memoireGPU(true);
      // Une DataTexture ne fait pas de mipmaps (4 Mo) ; une texture qui en fait
      // en ajoute un tiers (512² → 1,33 Mo). Total attendu : 5,33 Mo.
      const tex = new THREE.DataTexture(new Uint8Array(1024 * 1024 * 4), 1024, 1024);
      const texMip = new THREE.DataTexture(new Uint8Array(512 * 512 * 4), 512, 512);
      texMip.generateMipmaps = true;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 500000), 3));
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex }));
      const clone = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex.clone() }));
      const m2 = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: texMip }));
      m.visible = false; clone.visible = false; m2.visible = false;
      g.scene.add(m, clone, m2);
      const pendant = g.memoireGPU(true);
      g.scene.remove(m, clone, m2);
      const apres = g.memoireGPU(true);
      geo.dispose(); tex.dispose();
      const dTex = pendant.texMo - avant.texMo, dGeo = pendant.geoMo - avant.geoMo;
      const r1 = (x) => Math.round(x * 100) / 100;
      return { avant: r1(avant.texMo + avant.geoMo), dTex: r1(dTex), dGeo: r1(dGeo), retour: r1((apres.texMo - avant.texMo) + (apres.geoMo - avant.geoMo)), ms: pendant.ms };
    });
    verifier('la mémoire graphique estimée suit un objet ajouté puis retiré, en octets, une source comptée une fois',
      !memoire.absente && memoire.dTex > 5.2 && memoire.dTex < 5.5 && memoire.dGeo > 5.5 && memoire.dGeo < 5.9 && Math.abs(memoire.retour) < 0.05,
      JSON.stringify(memoire));
    // Et la session qui dit au revoir : le drapeau tombe, le compteur aussi.
    await tab.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    const tF = Date.now();
    let fermeture = null;
    while (Date.now() - tF < 15000 && !fermeture) {
      await dormir(500);
      fermeture = nuage.journaux().find((r) => r.fin === 'fermeture');
    }
    const adieu = await tab.evaluate((c) => ({ drapeau: localStorage.getItem(c.SESSION_CLE), plantages: localStorage.getItem(c.PLANTAGES_CLE) }), cles);
    verifier('une session qui dit au revoir remonte son journal, retire son drapeau et remet le compteur à zéro',
      !!fermeture && adieu.drapeau === null && adieu.plantages === '0',
      `${fermeture ? `fermeture en ${Date.now() - tF} ms (${fermeture.name})` : 'aucune ligne « fermeture » en 15 s'} · ${JSON.stringify(adieu)}`);
    // UNE PAGE NÉE CACHÉE N'EST PAS UNE SESSION QUE L'ENFANT A VUE (v409).
    // iOS peut ouvrir l'application sans la montrer, puis la tuer : les
    // sessions VIDES de `journal_appareil`. Elle se ferme sans remettre le
    // compteur à zéro ; sur l'ancien code elle reste ouverte (rouge).
    {
      const url = tab.url();
      const cache = await tab.context().newPage();
      await cache.addInitScript(() => {
        Object.defineProperty(Document.prototype, 'visibilityState', { configurable: true, get: () => 'hidden' });
        Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get: () => true });
      });
      await tab.evaluate((c) => window.__rawStorage.set(c.PLANTAGES_CLE, '1'), cles);
      await cache.goto(url, { waitUntil: 'load', timeout: 90000 });
      await cache.waitForFunction(() => window.__journal, null, { timeout: 90000 });
      const vuCache = await cache.evaluate((c) => {
        const j = window.__journal;
        const t = window.__rawStorage.get(c.SESSION_CLE) || '';
        return { ouvert: j.ouvert, dansTable: !!(j.id && t.includes(j.id)), avant: j.doc.plantagesAvant, compteur: j.plantages() };
      }, cles);
      verifier('une page née cachée ne laisse pas de session ouverte, et ne remet pas le compteur à zéro',
        vuCache.ouvert === false && !vuCache.dansTable && vuCache.compteur === vuCache.avant && vuCache.avant >= 1,
        JSON.stringify(vuCache));
      await cache.close();
    }
    await tab.close();

    // Ce que le parent en voit : le plantage en tête, avec la ville.
    await p.evaluate(async () => { await window.__game.admin.chargerJournal(); });
    const vuJournal = await p.evaluate(() => {
      const z = window.__game.admin.el.querySelector('#adm-journal');
      const texte = z.textContent.replace(/\s+/g, ' ');
      return { lignes: z.querySelectorAll('.adm-jr').length, plantage: /PLANTAGE présumé/.test(texte), paris: /paris/.test(texte),
        fermeture: /au revoir/.test(texte), debut: texte.slice(0, 200) };
    });
    verifier('l’espace parent montre le journal de bord, plantage présumé et fermeture, avec la ville',
      vuJournal.lignes >= 2 && vuJournal.plantage && vuJournal.paris && vuJournal.fermeture,
      JSON.stringify(vuJournal));

    verifier('aucune faute de page dans l’espace parent', p.erreurs.length === 0,
      JSON.stringify(p.erreurs));
  } catch (e) {
    verifier('la suite va au bout', false, e && e.message);
  } finally {
    await banc.fermer();
    nuage.fermer();
  }

  console.log(echecs.length ? `\n${echecs.length} échec(s)` : '\nTout est vert');
  process.exit(echecs.length ? 1 : 0);
})();
