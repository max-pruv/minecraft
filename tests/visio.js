// La visio, éprouvée sur deux vrais navigateurs avec une vraie caméra.
//
// Chromium sait simuler un appareil photo : une mire qui bouge, une piste de
// son qui bipe. C'est assez pour distinguer les trois pannes constatées à la
// maison — le carré noir, le silence, et le Wi-Fi public qui ne laisse rien
// passer — de ce que le code CROIT faire.
//
//     cd tests && node visio.js
//
// Le scénario central est celui du salon : Alice allume sa caméra, et on
// regarde l'écran de Marlon. S'il y voit un rectangle sombre, le test échoue,
// même si toutes les fonctions du réseau ont répondu « d'accord ».

const { Banc, dormir, jusqua, nomsVus } = require('./banc.js');
const { servirLeNuage } = require('./nuage.js');

const TOLERE = /Could not connect to peer|readyState is not|is taken|Aborting!/;
const fautes = (p) => p.erreurs.filter((e) => !TOLERE.test(e));

const echecs = [];
function verifier(nom, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${nom}${detail ? ` — ${detail}` : ''}`);
  if (!ok) echecs.push(nom + (detail ? ` — ${detail}` : ''));
}

// Ce que l'enfant a VRAIMENT sous les yeux dans le coin des vignettes.
async function vignettes(p) {
  return p.evaluate(() => {
    const wrap = document.getElementById('video-wrap');
    const out = [];
    for (const el of wrap ? wrap.querySelectorAll('video.remote, img.remote') : []) {
      if (el.tagName === 'IMG') {
        out.push({ genre: 'photo', large: el.naturalWidth || 0, vide: !el.src });
      } else {
        out.push({
          genre: 'video',
          large: el.videoWidth, haut: el.videoHeight,
          arrete: el.paused, temps: el.currentTime,
        });
      }
    }
    return out;
  });
}

// Le son distant : on ne peut pas « écouter » depuis un test, mais on peut
// exiger qu'un élément audio existe, qu'il porte bien une piste de son, et
// qu'il ne soit pas resté en pause faute d'avoir été lancé.
async function sons(p) {
  return p.evaluate(() => [...document.querySelectorAll('audio[data-visio]')].map((a) => ({
    pistes: a.srcObject ? a.srcObject.getAudioTracks().length : 0,
    arrete: a.paused,
    muet: a.muted,
  })));
}

async function allumerLaCamera(p) {
  // Le vrai geste : on clique sur le bouton, on ne triche pas avec toggleCam().
  await p.evaluate(() => document.getElementById('cam-btn').click());
  await p.waitForFunction(() => !!(window.__game.net && window.__game.net.camOn), null, { timeout: 20000 })
    .catch(() => { /* l'échec est parfois ce qu'on mesure */ });
}

(async () => {
  const banc = new Banc();
  await banc.ouvrir();
  const nuage = await servirLeNuage(9731);
  try {
    // --- le salon : Alice allume, Marlon regarde ------------------------------
    const { p: marlon, code } = await banc.creerMonde('Marlon');
    const alice = await banc.rejoindre('Alice', code);
    await jusqua(async () => (await marlon.evaluate(() => window.__game.net.conns.size)) >= 1);

    // LE SON ROBOTIQUE D'ALICE (v304). Avant l'appel, la radio du jeu joue sur
    // la tablette d'Alice : on retient son contexte audio et le niveau de ce
    // qui sort, lu dans les ÉCHANTILLONS (un analyseur accroché à la sortie du
    // jeu), jamais dans un drapeau.
    const avantAppel = await alice.evaluate(async () => {
      if (!window.__sons) return { absent: true };
      const S = await import('./src/sons.js');
      window.__niveauSon = async (ms) => {
        const c = window.__sons.contexte(), sortie = window.__sons.sortie();
        if (!c || !sortie) return 0;
        if (c.state === 'suspended') await c.resume().catch(() => {});
        const an = c.createAnalyser(); an.fftSize = 2048; sortie.connect(an);
        const buf = new Float32Array(an.fftSize); let pire = 0;
        const t0 = performance.now();
        while (performance.now() - t0 < ms) {
          an.getFloatTimeDomainData(buf);
          let s2 = 0; for (const v of buf) s2 += v * v;
          pire = Math.max(pire, Math.sqrt(s2 / buf.length));
          await new Promise((r) => setTimeout(r, 50));
        }
        try { sortie.disconnect(an); } catch { /* déjà */ }
        return pire;
      };
      S.radioDemarre(0);
      window.__ctxAvantAppel = window.__sons.contexte();
      return { niveau: await window.__niveauSon(1500), gain: window.__sons.sortie().gain.value };
    });

    await allumerLaCamera(alice);

    // Alice se voit elle-même : c'est la partie qui marchait déjà, et qui doit
    // continuer de marcher. Une caméra met un instant à donner ses dimensions —
    // on attend l'image, on ne mesure pas la vitesse de l'appareil.
    const lireSoi = () => alice.evaluate(() => {
      const v = document.querySelector('#video-wrap video.local');
      return v ? { large: v.videoWidth, arrete: v.paused } : null;
    });
    await jusqua(async () => { const v = await lireSoi(); return !!v && v.large > 0; }, 30000);
    const soi = await lireSoi();
    verifier('Alice se voit elle-même', !!soi && soi.large > 0 && !soi.arrete, JSON.stringify(soi));

    // Et c'est ici que le carré noir vivait.
    await jusqua(async () => {
      const v = await vignettes(marlon);
      return v.length > 0 && v[0].large > 0;
    }, 60000);
    const chezMarlon = await vignettes(marlon);
    verifier("Marlon voit l'image d'Alice, pas un carré noir",
      chezMarlon.length === 1 && chezMarlon[0].large > 0 && chezMarlon[0].haut > 0,
      `${JSON.stringify(chezMarlon)} · fautes ${JSON.stringify([fautes(alice), fautes(marlon)])}`);
    if (!chezMarlon.length) throw new Error('aucune vignette : la suite ne peut rien mesurer de plus');

    // Une image figée est un carré noir qui a réussi son premier dessin : on
    // exige que le film avance.
    const t0 = (await vignettes(marlon))[0].temps;
    await dormir(1500);
    const t1 = (await vignettes(marlon))[0].temps;
    verifier("et l'image bouge, elle n'est pas figée", t1 > t0, `${t0.toFixed(2)} → ${t1.toFixed(2)}`);

    verifier("la vignette de l'autre n'est pas restée en pause",
      chezMarlon[0].arrete === false, `arrêtée : ${chezMarlon[0].arrete}`);

    // --- le son : il a son propre élément, et il joue -------------------------
    await jusqua(async () => (await sons(marlon)).length > 0, 20000);
    const sonChezMarlon = await sons(marlon);
    verifier("Marlon reçoit bien la voix d'Alice",
      sonChezMarlon.length === 1 && sonChezMarlon[0].pistes > 0, JSON.stringify(sonChezMarlon));
    verifier('et le son n’est ni en pause ni muet',
      sonChezMarlon.length === 1 && !sonChezMarlon[0].arrete && !sonChezMarlon[0].muet,
      JSON.stringify(sonChezMarlon));

    // LE CONTEXTE AUDIO DU JEU SUIT LE MODE APPEL D'iOS (v304). Micro ouvert,
    // l'iPad passe en mode appel ; un contexte créé avant garde l'ancienne
    // fréquence et sonne « robotique ». On exige un contexte NEUF (l'ancien
    // fermé), la radio qui continue, et le jeu plus bas pendant l'appel.
    const pendantAppel = await alice.evaluate(async () => {
      if (!window.__niveauSon) return { absent: true };
      const c = window.__sons.contexte();
      return { neuf: c !== window.__ctxAvantAppel, ancien: window.__ctxAvantAppel ? window.__ctxAvantAppel.state : null,
        radio: window.__sons.station(), niveau: await window.__niveauSon(1500) };
    });
    verifier('micro ouvert, le jeu joue sur un contexte audio neuf, et l’ancien est fermé',
      !avantAppel.absent && pendantAppel.neuf === true && pendantAppel.ancien === 'closed' && !!pendantAppel.radio,
      JSON.stringify({ avantAppel, pendantAppel }));
    verifier('et pendant l’appel la radio du jeu parle plus bas, sans se taire',
      !avantAppel.absent && avantAppel.niveau > 0.005 && pendantAppel.niveau > 0
        && pendantAppel.niveau < 0.6 * avantAppel.niveau,
      `avant ${(+avantAppel.niveau || 0).toFixed(4)} · pendant ${(+pendantAppel.niveau || 0).toFixed(4)}`);

    // --- l'invitation --------------------------------------------------------
    const invite = await marlon.evaluate(() => {
      const b = document.getElementById('visio-invite');
      return b && b.style.display !== 'none' ? b.textContent.trim() : null;
    });
    verifier('Marlon se voit proposer d’allumer la sienne',
      !!invite && /Alice/.test(invite), JSON.stringify(invite));

    // Et le bouton fait vraiment quelque chose.
    await marlon.evaluate(() => document.getElementById('visio-invite-btn').click());
    await marlon.waitForFunction(() => !!(window.__game.net && window.__game.net.camOn), null, { timeout: 20000 })
      .catch(() => {});
    const marlonAllume = await marlon.evaluate(() => !!window.__game.net.camOn);
    verifier('le bouton de l’invitation allume vraiment sa caméra', marlonAllume);

    // Une fois la sienne allumée, l'invitation n'a plus lieu d'être.
    const invitePartie = await marlon.evaluate(() => {
      const b = document.getElementById('visio-invite');
      return !b || b.style.display === 'none';
    });
    verifier('et l’invitation disparaît une fois acceptée', invitePartie);

    // Réciproquement, Alice voit Marlon.
    await jusqua(async () => {
      const v = await vignettes(alice);
      return v.length > 0 && v[0].large > 0;
    }, 30000);
    const chezAlice = await vignettes(alice);
    verifier('et Alice voit Marlon à son tour',
      chezAlice.length === 1 && chezAlice[0].large > 0, JSON.stringify(chezAlice));

    // --- la voix de robot : un appel « open » mais malade se répare seul -----
    //
    // Rapporté à la maison : le son se met à grésiller façon robot, et rien ne
    // le répare — il fallait éteindre puis rallumer l'application. La veille
    // vidéo ne rattrapait que l'appel jamais ouvert ou fermé ; jamais celui-ci,
    // ouvert mais dont le lien ICE en dessous s'est mis à boiter. On simule
    // ici huit secondes de panne ICE soutenue sur l'appel d'Alice vers Marlon
    // — c'est SA voix qu'il entend — et on attend que la veille, qui tourne
    // toute seule toutes les deux secondes, la remarque et recompose l'appel.
    const idMarlonVuParAlice = await alice.evaluate(() => [...window.__game.net.conns.keys()][0]);
    await alice.evaluate((id) => {
      const c = window.__game.net.videoCalls.get(id);
      c.__temoin = true;
      c.malDepuis = Date.now() - 9000;
    }, idMarlonVuParAlice);
    const recompose = await jusqua(async () => alice.evaluate((id) => {
      const c = window.__game.net.videoCalls.get(id);
      return !!c && !c.__temoin;
    }, idMarlonVuParAlice), 15000);
    verifier('un appel ouvert mais malade depuis huit secondes est recomposé', recompose);

    // Et Marlon continue bel et bien à entendre quelque chose derrière, pas un
    // silence laissé par l'appel qu'on vient de fermer.
    const sonApresRepriseOk = await jusqua(async () => {
      const s = await sons(marlon);
      return s.length === 1 && !s[0].arrete && !s[0].muet && s[0].pistes > 0;
    }, 15000);
    verifier('et Marlon entend toujours quelque chose après la reprise', sonApresRepriseOk,
      JSON.stringify(await sons(marlon)));

    // --- éteindre nettoie tout -----------------------------------------------
    await alice.evaluate(() => document.getElementById('cam-btn').click());
    await jusqua(async () => (await vignettes(marlon)).length === 0, 20000);
    const apres = await vignettes(marlon);
    const sonApres = await sons(marlon);
    verifier('quand Alice éteint, sa vignette part', apres.length === 0, JSON.stringify(apres));
    verifier('et son filet de voix aussi', sonApres.length === 0, JSON.stringify(sonApres));
    // Et le jeu d'Alice revient en mode lecture : un contexte neuf encore, et
    // le volume d'avant l'appel. L'appel ne finit pour elle que quand PLUS
    // AUCUNE voix n'arrive : Marlon a allumé sa caméra plus haut, sa voix
    // joue encore chez Alice tant qu'il ne l'éteint pas — c'est juste, et le
    // témoin éteint donc les deux avant de mesurer.
    await marlon.evaluate(() => { if (window.__game.net.camOn) document.getElementById('cam-btn').click(); });
    await jusqua(async () => (await vignettes(alice)).length === 0 && (await sons(alice)).length === 0, 20000);
    const apresAppel = await alice.evaluate(async () => {
      if (!window.__niveauSon) return { absent: true };
      const c = window.__sons.contexte();
      return { neuf: c !== window.__ctxAvantAppel && c.state !== 'closed', radio: window.__sons.station(),
        niveau: await window.__niveauSon(1500), gain: window.__sons.sortie().gain.value };
    });
    // LA VOIX NORMALE, C'EST LE GAIN RENDU, PAS UNE FENÊTRE DE MÉLODIE (v389).
    // La barre « 0,8 × avant » comparait 1,5 s de radio en régime établi au
    // DÉBUT de la mélodie que le contexte neuf relance. Mesuré sans aucun
    // appel (`sonde-voix-apres-appel.cjs`) : 0,0195 à 0,0285 d'une fenêtre à
    // l'autre — 0,68, sous la barre ; la radio relancée sans appel rend
    // 0,0214–0,0225, après l'appel 0,0212–0,0253, gain revenu à 1 cinq fois
    // sur cinq. Ce que le témoin doit attraper, c'est une voix restée au quart
    // (`GAIN_APPEL`) : le gain d'avant, et un niveau au-dessus de la MOITIÉ —
    // le milieu entre un quart et un régime qui varie de 0,68 à 1,3.
    verifier('caméra éteinte, le jeu reprend sa voix normale sur un contexte neuf',
      !avantAppel.absent && apresAppel.neuf === true && !!apresAppel.radio
      && Math.abs(apresAppel.gain - avantAppel.gain) < 0.01 && apresAppel.niveau > 0.5 * avantAppel.niveau,
      `avant ${(+avantAppel.niveau || 0).toFixed(4)} (gain ${avantAppel.gain}) · après ${(+apresAppel.niveau || 0).toFixed(4)} · ${JSON.stringify(apresAppel)}`);

    verifier('aucune faute de page pendant la visio',
      fautes(marlon).length === 0 && fautes(alice).length === 0,
      JSON.stringify([fautes(marlon), fautes(alice)]));

    // Fermer la page ferme aussi son contexte, cf. banc.js.
    await marlon.close();
    await alice.close();

    // --- le Wi-Fi public : la caméra lente ------------------------------------
    //
    // Ici le pair-à-pair est coupé À LA RACINE chez l'invité : c'est le Wi-Fi
    // d'hôtel dans ce qu'il a de pire. Aucun flux vidéo ne peut circuler.
    // Ce qu'on exige, c'est qu'on se voie QUAND MÊME — en images — plutôt que
    // devant un cadre vide, et que le jeu dise honnêtement ce qui manque.
    const AVEC_NUAGE = { portNuage: 9731 };
    const { p: emma, code: code2 } = await banc.creerMonde('Emma', AVEC_NUAGE);
    const tom = await banc.joueur('Tom', { sansPairAPair: true, ...AVEC_NUAGE });
    await tom.evaluate(() => document.getElementById('online-btn').click());
    await dormir(400);
    await tom.evaluate((c) => {
      document.getElementById('join-code').value = c;
      document.getElementById('join-btn').click();
    }, code2);
    await tom.evaluate(() => document.getElementById('online-play-btn')?.click());
    const seVoient = await jusqua(async () => {
      const a = await nomsVus(emma);
      const b = await nomsVus(tom);
      return a.includes('Tom') && b.includes('Emma');
    }, 120000);
    verifier('le nuage a bien porté la partie', seVoient,
      JSON.stringify([await nomsVus(emma), await nomsVus(tom)]));

    const parLeNuage = await emma.evaluate(() =>
      [...window.__game.net.conns.values()].some((c) => !!(c.conn && c.conn.parNuage)));
    verifier('et le lien vers Tom passe bien par le nuage', parLeNuage);

    await allumerLaCamera(tom);
    await jusqua(async () => {
      const v = await vignettes(emma);
      return v.length > 0 && v[0].genre === 'photo' && !v[0].vide;
    }, 90000);
    const photoChezEmma = await vignettes(emma);
    verifier('par le nuage, Emma voit quand même le visage de Tom',
      photoChezEmma.length === 1 && photoChezEmma[0].genre === 'photo' && !photoChezEmma[0].vide,
      JSON.stringify(photoChezEmma));

    // L'image se rafraîchit : une photo unique serait un portrait au mur.
    const src1 = await emma.evaluate(() => {
      const i = document.querySelector('#video-wrap img.remote');
      return i ? i.src.length : 0;
    });
    const bouge = await jusqua(async () => {
      const s2 = await emma.evaluate(() => {
        const i = document.querySelector('#video-wrap img.remote');
        return i ? i.src : '';
      });
      return s2 && s2.length !== src1;
    }, 20000);
    verifier('et l’image se renouvelle, ce n’est pas un portrait figé', bouge);

    // On ne fait pas croire qu'on s'entend.
    const franchise = await emma.evaluate(() => {
      const t = document.getElementById('visio-chemin');
      return t && t.style.display !== 'none' ? t.textContent.trim() : null;
    });
    verifier('et le jeu dit franchement que le son ne passe pas par là',
      !!franchise && /son/i.test(franchise), JSON.stringify(franchise));

    // L'invitation vaut aussi pour la caméra lente.
    const inviteNuage = await emma.evaluate(() => {
      const b = document.getElementById('visio-invite');
      return b && b.style.display !== 'none' ? b.textContent.trim() : null;
    });
    verifier('Emma se voit proposer d’allumer la sienne, là aussi',
      !!inviteNuage && /Tom/.test(inviteNuage), JSON.stringify(inviteNuage));

    // Et quand Tom éteint, son portrait s'en va.
    await tom.evaluate(() => document.getElementById('cam-btn').click());
    const partie = await jusqua(async () => (await vignettes(emma)).length === 0, 40000);
    verifier('quand Tom éteint, son portrait disparaît', partie,
      JSON.stringify(await vignettes(emma)));

    verifier('aucune faute de page sur le chemin du nuage',
      fautes(emma).length === 0 && fautes(tom).length === 0,
      JSON.stringify([fautes(emma), fautes(tom)]));
  } catch (e) {
    verifier('la suite va au bout', false, e && e.message);
  } finally {
    await banc.fermer();
    nuage.fermer();
  }

  console.log(echecs.length ? `\n${echecs.length} échec(s)` : '\nTout est vert');
  process.exit(echecs.length ? 1 : 0);
})();
