// LE TÉMOIN DES OMBRES DE MANHATTAN : QUEL DES DEUX RELEVÉS EST ROUGE ? (v291)
//
// La dette de la v290 annonçait « 1,0000000000000002 > 1, un défaut d'épsilon,
// à corriger d'une ligne ». Relu, le témoin compare à 0.9999 : cette valeur-là
// PASSE. La dette nommait donc un défaut que ce code ne peut pas avoir, et
// c'est une explication commode qu'on n'a pas mesurée (v220).
//
// Le témoin lit DEUX alignements — le soleil à 0,18 et la lune à 0,73 — et
// n'en publie qu'un tableau. Trois causes possibles se cachent derrière un
// même rouge : le groupe du ciel introuvable, l'astre introuvable dans ce
// groupe (donc 0), ou une direction de lumière vraiment de travers. Cette
// sonde les SÉPARE, et elle relève trois fois pour distinguer une certitude
// d'un pile ou face (v269).
const { Banc, dormir } = require('./banc.js');

(async () => {
  const banc = new Banc({ portJeu: 8397, portPairs: 9397 });
  await banc.ouvrir();
  try {
    const { positionDe } = await import('../src/mondes.js');
    const NY = positionDe('ny');
    const p = await banc.joueur('SondeOmbresNY', {
      carte: 'manhattan', rr: 2, tactile: true,
      viewport: { width: 700, height: 460 },
    });
    await p.locator('.who-card.active').click();
    await p.getByRole('button', { name: 'Plus tard', exact: true }).click();
    await p.locator('#play-btn').click();
    await p.waitForFunction(() => __game.running);
    await p.evaluate((NY) => {
      const j = __game.player;
      j.pos.set(NY.x + 1.5, 33.01, NY.z + 7.5);
      j.yaw = 0; j.pitch = -0.8; j.syncCamera();
    }, NY);
    // On attend le FAIT du monde : le renderer urbain est en place et il a
    // une lampe. Jamais un délai fixe (v270).
    const pret = await p.waitForFunction(
      () => !!(__game.villeRealiste && __game.villeRealiste.sunLight),
      null, { timeout: 60000 },
    ).then(() => true).catch(() => false);
    console.log(`villeRealiste prêt : ${pret}`);

    for (let tour = 1; tour <= 3; tour++) {
      for (const heure of [0.18, 0.73]) {
        // ATTENDRE LE FAIT, PAS UN DÉLAI : Manhattan rend 0,4 image par
        // seconde sur ce banc (v259), et l'heure ne bouge qu'à l'image
        // suivante. On attend que le ciel ait VRAIMENT tourné — le soleil du
        // bon côté de l'horizon — borné, et le temps pris entre dans le relevé.
        const t0 = Date.now();
        await p.evaluate((h) => __setDayTime(h), heure);
        const vu = await p.waitForFunction((h) => {
          const larg = (m) => m.geometry && m.geometry.parameters
            && m.geometry.parameters.width;
          const ciel = __game.scene.children.find((g) => g.children
            && g.children.some((m) => larg(m) === 62));
          const soleil = ciel && ciel.children.find((m) => larg(m) === 62);
          if (!soleil) return false;
          return h < 0.5 ? soleil.position.y > 0 : soleil.position.y < 0;
        }, heure, { timeout: 40000 }).then(() => true).catch(() => false);
        const attente = Date.now() - t0;
        const d = await p.evaluate((h) => {
          const v = __game.villeRealiste;
          const larg = (m) => m.geometry && m.geometry.parameters
            && m.geometry.parameters.width;
          const ciel = __game.scene.children.find((g) => g.children
            && g.children.some((m) => larg(m) === 62));
          const veut = h < 0.5 ? 62 : 42;
          const astre = ciel && ciel.children.find((m) => larg(m) === veut);
          const dir = v.sunLight.position.clone()
            .sub(v.sunLight.target.position).normalize();
          const r3 = (x) => +x.toFixed(3);
          return {
            cielTrouve: !!ciel,
            largeurs: ciel ? ciel.children.map(larg).filter((x) => x) : null,
            veut,
            astreTrouve: !!astre,
            astreVisible: astre ? astre.visible : null,
            astreOpacite: astre && astre.material ? r3(astre.material.opacity) : null,
            astrePos: astre ? [r3(astre.position.x), r3(astre.position.y), r3(astre.position.z)] : null,
            lampeDir: [r3(dir.x), r3(dir.y), r3(dir.z)],
            dot: astre ? dir.dot(astre.position.clone().normalize()) : 0,
          };
        }, heure);
        console.log(`tour ${tour} · h=${heure} · ciel tourné=${vu} en ${attente} ms · dot=${d.dot} · passe(>0.9999)=${d.dot > 0.9999}`);
        console.log(`   ${JSON.stringify(d)}`);
      }
    }
  } catch (e) {
    console.log('ÉCHEC DE LA SONDE : ' + (e && e.message ? e.message : e));
  }
  process.exit(0);
})();
