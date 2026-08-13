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
