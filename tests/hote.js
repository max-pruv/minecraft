// L'hôte s'en va, et le monde continue.
//
// Signalé par la famille : quand celui qui héberge la partie quitte
// l'application, les autres restent bloqués, déconnectés, sans recours. Le
// coupable est simple à énoncer : c'est l'hôte qui relaie chaque message
// entre les invités, et « rejoinHost » ne fait que retenter le même
// identifiant mort, pour toujours, si personne ne reprend la maison.
//
// Ce banc éprouve la reprise : un hôte qui part proprement (l'app se ferme,
// « pagehide » se déclenche, comme dans la vraie vie) doit voir un invité
// devenir hôte à sa place, et les autres doivent continuer à se voir bouger
// — la preuve qu'ils ne sont pas seulement « en ligne », mais VRAIMENT
// reliés les uns aux autres.
//
//     cd tests && node hote.js

const { Banc, vu, nomsVus, jusqua } = require('./banc.js');
const { servirLeNuage } = require('./nuage.js');

const TOLERE = /Could not connect to peer|readyState is not|is taken|Aborting!|Lost connection to server|Could not get an ID from the server|Error retrieving ID/;
const fautes = (p) => p.erreurs.filter((e) => !TOLERE.test(e));

const echecs = [];
function verifier(nom, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${nom}${detail ? ` — ${detail}` : ''}`);
  if (!ok) echecs.push(nom + (detail ? ` — ${detail}` : ''));
}

(async () => {
  const banc = new Banc();
  await banc.ouvrir();
  const nuage = await servirLeNuage(9751);
  const AVEC_NUAGE = { portNuage: 9751 };
  try {
    const { p: marlon, code } = await banc.creerMonde('Marlon', AVEC_NUAGE);
    const alice = await banc.rejoindre('Alice', code, AVEC_NUAGE);
    const nina = await banc.rejoindre('Nina', code, AVEC_NUAGE);

    const attenduAvant = JSON.stringify([['Alice', 'Nina'], ['Marlon', 'Nina'], ['Alice', 'Marlon']]);
    const avant = await jusqua(async () => JSON.stringify(
      [await nomsVus(marlon), await nomsVus(alice), await nomsVus(nina)]) === attenduAvant);
    verifier('avant le départ, les trois se voient', avant);

    // Marlon s'en va — comme un enfant qui ferme l'application, pas comme un
    // crash : c'est « pagehide » qui prévient les autres et éteint le phare.
    await marlon.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await marlon.close();

    // Alice et Nina retentent de rejoindre un hôte qui n'existe plus. L'une
    // des deux doit finir par réclamer son identifiant et devenir hôte à sa
    // place — peu importe laquelle, le serveur de rendez-vous ne l'accorde
    // qu'à une seule.
    const uneReprise = await jusqua(async () =>
      (await vu(alice)).hote || (await vu(nina)).hote, 60000);
    verifier('un invité reprend la maison quand l\'hôte est parti', uneReprise);

    const [aliceHote, ninaHote] = [(await vu(alice)).hote, (await vu(nina)).hote];
    verifier('un seul nouvel hôte, pas deux à la fois', aliceHote !== ninaHote,
      `alice=${aliceHote} nina=${ninaHote}`);

    // Et surtout : ils se voient encore bouger l'un l'autre. Un simple
    // drapeau isHost à vrai ne prouve rien si plus aucun message ne circule.
    const seVoientEncore = await jusqua(async () => {
      const [na, nn] = [await nomsVus(alice), await nomsVus(nina)];
      return na.includes('Nina') && nn.includes('Alice');
    }, 30000);
    verifier('Alice et Nina continuent de se voir après la reprise',
      seVoientEncore, JSON.stringify([await nomsVus(alice), await nomsVus(nina)]));

    // Un troisième enfant qui arrive APRÈS la reprise doit pouvoir rejoindre
    // avec le même code, sur le nouvel hôte, sans rien savoir de l'histoire.
    const yanis = await banc.rejoindre('Yanis', code, AVEC_NUAGE);
    const tousLa = await jusqua(async () => {
      const noms = await nomsVus(yanis);
      return noms.includes('Alice') && noms.includes('Nina');
    }, 30000);
    verifier('un nouvel arrivant rejoint le monde repris sous le même code',
      tousLa, JSON.stringify(await nomsVus(yanis)));

    for (const [nom, p] of [['Alice', alice], ['Nina', nina], ['Yanis', yanis]]) {
      const f = fautes(p);
      verifier(`pas d'erreur console imprévue (${nom})`, f.length === 0, f.join(' | '));
    }

    await alice.close();
    await nina.close();
    await yanis.close();
  } finally {
    await nuage.fermer();
    await banc.fermer();
  }

  console.log('');
  if (echecs.length) {
    console.log(`❌ ${echecs.length} échec(s) :`);
    echecs.forEach((e) => console.log(`   - ${e}`));
    process.exit(1);
  } else {
    console.log('✅ tout est passé — la reprise d\'hôte fonctionne');
  }
})();
