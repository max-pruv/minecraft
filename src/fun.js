// Fun & social systems: breeding, riding, companions, duels, text signs
// (those already planted), emotes, photos, daily treasure, park mini-games,
// records, museum statues and little math challenges. Everything persists per
// profile via the storage shim; world-scoped data (signs) is keyed by the
// world code.
//
// L'ATELIER, LE COFFRE, LA QUÊTE, LE PANNEAU, LE CHANTIER, LES RECORDS ET LES
// CHAPEAUX N'ONT PLUS D'ÉCRAN, ET LE FEU D'ARTIFICE PLUS DE BOUTON (v255).
// Décision de Max : « supprime la fonctionnalité de pouvoir faire les feux
// d'artifice, et tout ça à part les souvenirs photos. » On retire l'écran et
// les commandes, jamais ce qu'un enfant a gagné : les records, le sac, la
// quête, le coffre, les chapeaux et les panneaux plantés restent dans le
// stockage et dans le nuage, sous leurs clés, tels quels. Le panneau 🖼️
// n'ouvre plus que les Souvenirs.

import * as THREE from 'three';
import { liberer } from './liberer.js';
import { buildCreatureMesh } from './creatures.js';
import { PLACES, PARK, WATER_LEVEL } from './world.js';
import { monumentBati } from './monuments.js';
import { garagesDe, garageAutour, inscrireGarage, garer, sortir } from './garages.js';
import { allureDe } from './vehicules.js';

// Le sac (`web-minecraft-bag-v1`), la quête (`web-minecraft-quest-v1`), le
// coffre (`web-minecraft-chest-v1::…`) et le chantier
// (`web-minecraft-chantier-v1::…`) ne sont plus ni lus ni écrits depuis la
// v255 ; leurs clés restent en place, et sync.js continue de faire voyager le
// sac et la quête tels quels. On n'efface rien.
const RECORDS_KEY = 'web-minecraft-records-v1';
const PHOTOS_KEY = 'web-minecraft-photos-v1';
const PET_KEY = 'web-minecraft-pet-v1';

function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

function loadJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function saveJson(key, v) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* full/blocked */ }
}

export function initFun(ctx) {
  const { scene, world, player, creatureManager, animalManager, edu, cloud, canvas,
    renderNow, emojiBurst, toast, myName, getNet, remotePlayers, isRunning,
    isNight, getWeather, getPosCtx, getVehicules, vehiculeDistant, photos: photosNuage } = ctx;

  // ---- persistent state -----------------------------------------------------
  // Les records ne s'affichent plus (v255) mais se COMPTENT toujours. Ce
  // qu'un enfant a déjà gagné — quêtes finies, feux lancés, chapeaux — reste
  // dans le document tel quel : l'étalement de `loadJson` ne jette rien, on
  // ne fait que ne plus y toucher.
  const records = { blocks: 0, quizCorrect: 0, treasures: 0, duels: 0,
    mathWins: 0, parkour: 0, bestRace: 0, ...loadJson(RECORDS_KEY, {}) };
  const saveRecords = () => saveJson(RECORDS_KEY, records);

  creatureManager.legendaryOk = () => isNight() || getWeather() === 'rain';

  // ---- styles & panels ------------------------------------------------------
  const style = document.createElement('style');
  style.textContent = `
    /* dans la colonne de gauche : plus de position propre, c'est le rail qui
       place, donc aucun risque de recouvrir un voisin */
    .fun-btn { position:static; flex:none; width:var(--rail-btn); height:var(--rail-btn); border-radius:12px;
      background:rgba(20,26,40,.72); border:1px solid rgba(255,255,255,.18); color:#fff;
      font-size:22px; z-index:30; display:none; align-items:center; justify-content:center;
      -webkit-tap-highlight-color:transparent; }
    .fun-panel { position:fixed; left:50%; top:50%; transform:translate(-50%,-50%);
      width:min(92vw,440px); max-height:76vh; overflow-y:auto; background:rgba(14,18,30,.96);
      border:1px solid rgba(255,255,255,.2); border-radius:16px; color:#eef; z-index:60;
      padding:14px; display:none; font-size:15px; }
    .fun-panel h3 { margin:4px 0 10px; font-size:17px; }
    .fun-close { position:absolute; top:8px; right:10px; background:none; border:none;
      color:#889; font-size:22px; }
    .fun-row { display:flex; align-items:center; gap:8px; padding:7px 6px;
      border-bottom:1px solid rgba(255,255,255,.08); }
    .fun-row button { margin-left:auto; padding:6px 12px; border-radius:9px; border:none;
      background:#3a9a4a; color:#fff; font-size:14px; }
    .fun-row button:disabled { background:#3a4152; color:#778; }
    .fun-note { color:#8894b0; font-size:13px; margin:6px 2px; }
    .fun-target { position:fixed; left:50%; transform:translateX(-50%); bottom:96px;
      display:none; gap:8px; z-index:30; }
    /* EN VÉHICULE, « Descendre » S'ÉCARTE DES COMMANDES DE BORD (v265). La
       colonne de vol commence à 272 px du bord gauche sur un iPhone de 430,
       et le bouton centré s'arrête à 277 : sept pixels de recouvrement,
       mesurés. Il se recentre sur ce qui reste à gauche. */
    body.en-vehicule .fun-target { left:40%; }
    .fun-target button { padding:9px 14px; border-radius:12px; border:none; font-size:15px;
      background:rgba(20,26,40,.85); color:#fff; border:1px solid rgba(255,255,255,.25); }
    .emote-row { position:static; display:none; flex-direction:column; gap:8px; }
    .emote-row button { width:var(--rail-btn); height:var(--rail-btn); border-radius:12px; font-size:22px;
      background:rgba(20,26,40,.72); border:1px solid rgba(255,255,255,.18); }
    #duel-overlay { position:fixed; inset:0; background:rgba(8,10,18,.88); z-index:80;
      display:none; align-items:center; justify-content:center; flex-direction:column;
      color:#fff; text-align:center; }
    .duel-arena { display:flex; gap:24px; align-items:center; }
    .duel-side { width:130px; }
    .duel-side img { width:110px; height:130px; }
    .duel-side .nm { font-weight:bold; margin-top:4px; }
    #duel-status { font-size:26px; margin-top:18px; font-weight:bold; }
    #math-pop { position:fixed; left:50%; transform:translateX(-50%); bottom:120px;
      background:rgba(14,18,30,.95); border:1px solid rgba(255,255,255,.25); border-radius:14px;
      color:#eef; z-index:55; padding:12px 14px; width:min(90vw,360px); display:none; }
    #math-pop .opts { display:flex; gap:8px; margin-top:10px; }
    #math-pop .opts button { flex:1; padding:9px 0; border-radius:10px; border:none;
      background:#3a6ad0; color:#fff; font-size:17px; }
    #photo-flash { position:fixed; inset:0; background:#fff; opacity:0; pointer-events:none;
      z-index:90; transition:opacity .25s; }
    .photo-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; }
    .photo-grid .ph { position:relative; }
    .photo-grid img { width:100%; border-radius:10px; }
    .photo-grid .garder { position:absolute; top:4px; left:4px; background:rgba(0,0,0,.6);
      border:none; border-radius:8px; font-size:15px; padding:2px 6px; }
    .photo-grid .del { position:absolute; top:4px; right:4px; background:rgba(0,0,0,.6);
      color:#fff; border:none; border-radius:8px; font-size:13px; padding:2px 7px; }
  `;
  document.head.appendChild(style);

  const el = (html, parent) => {
    const d = document.createElement('div');
    d.innerHTML = html;
    const node = d.firstElementChild;
    (parent || document.body).appendChild(node);
    return node;
  };

  // Les boutons rejoignent la colonne de gauche déclarée dans index.html : ils
  // n'ont plus de position propre, donc ils ne peuvent plus tomber sur un
  // voisin, et un bouton de plus se rangera tout seul à la suite.
  const rail = document.getElementById('left-rail') || document.body;
  const railBottom = document.getElementById('left-rail-bottom') || document.body;
  const mkBtn = (emoji, title) => el(`<button class="fun-btn" title="${title}">${emoji}</button>`, rail);
  // Un seul bouton pour l'album. L'atelier, le coffre, la quête, le panneau,
  // le chantier, les records et les chapeaux sont partis (v255, décision de
  // Max), et le feu d'artifice avec eux. Ce qui reste, c'est l'album des
  // photos — et un bouton qui dit ce qu'il ouvre, pas une clé à molette.
  const souvenirsBtn = mkBtn('🖼️', 'Souvenirs');
  const photoBtn = mkBtn('📸', 'Photo');

  // Un seul bouton, qui se déplie. Trois émotes en permanence à l'écran d'un
  // téléphone, c'est trois boutons de pris pour un geste occasionnel — et
  // elles ne servent que si quelqu'un est là pour les voir : l'animation se
  // joue sur NOTRE avatar, que nous ne voyons pas nous-mêmes. Un enfant seul
  // dans un monde en ligne les avait pourtant sous les yeux, à ne rien faire.
  const emoteToggle = el('<button class="fun-btn" id="emote-toggle" title="Émotes">😊</button>', railBottom);
  const emoteRow = el(`<div class="emote-row" id="emote-row">
    <button data-k="👋">👋</button><button data-k="💃">💃</button><button data-k="❤️">❤️</button>
  </div>`, railBottom);
  let emotesDepliees = false;
  emoteToggle.addEventListener('click', () => {
    emotesDepliees = !emotesDepliees;
    emoteRow.style.display = emotesDepliees ? 'flex' : 'none';
  });

  const targetRow = el(`<div class="fun-target" id="fun-target">
    <button id="feed-btn">🍼 Nourrir</button><button id="ride-btn">🐴 Monter</button><button id="board-btn">🚇 Monter à bord</button>
  </div>`);

  // Un seul corps, plus d'onglets : le panneau n'a plus que les Souvenirs.
  const panel = el(`<div class="fun-panel" id="fun-main-panel">
    <button class="fun-close">✕</button>
    <div id="fun-tab-body"></div>
  </div>`);

  const duelOverlay = el(`<div id="duel-overlay">
    <h2>⚔️ Défi amical !</h2>
    <div class="duel-arena">
      <div class="duel-side"><img id="duel-img-a"><div class="nm" id="duel-nm-a"></div></div>
      <div style="font-size:34px">VS</div>
      <div class="duel-side"><img id="duel-img-b"><div class="nm" id="duel-nm-b"></div></div>
    </div>
    <div id="duel-status"></div>
  </div>`);

  const mathPop = el(`<div id="math-pop">
    <div id="math-q"></div><div class="opts" id="math-opts"></div>
  </div>`);
  const flash = el(`<div id="photo-flash"></div>`);

  panel.querySelector('.fun-close').addEventListener('click', () => { panel.style.display = 'none'; });

  // ---- companion ------------------------------------------------------------
  let pet = loadJson(PET_KEY, null);
  let petMesh = null, petLabel = null, petBob = 0;

  function makeTextSprite(text, scale = 1) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 96;
    const g = c.getContext('2d');
    let size = 46; // shrink until the text fits the canvas
    do { g.font = `bold ${size}px system-ui, sans-serif`; size -= 2; }
    while (g.measureText(text).width > 490 && size > 16);
    g.textAlign = 'center';
    g.lineWidth = 8; g.strokeStyle = 'rgba(0,0,0,.8)';
    g.strokeText(text, 256, 62);
    g.fillStyle = '#fff';
    g.fillText(text, 256, 62);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true }));
    sp.scale.set(3.2 * scale, 0.6 * scale, 1);
    return sp;
  }

  function refreshPet() {
    // ET L'ANCIENNE SE REND (v238) : `refreshPet` en refabrique une neuve, avec
    // ses sphères, ses matériaux ET l'étiquette dessinée sur une toile. Sans
    // cette ligne chaque changement de mascotte en abandonnait un jeu complet.
    if (petMesh) { scene.remove(petMesh); liberer(petMesh); petMesh = null; }
    if (!pet) return;
    const sp = creatureManager.species.find((s) => s.id === pet.id);
    if (!sp) return;
    petMesh = buildCreatureMesh(sp);
    petMesh.scale.setScalar(0.55);
    petLabel = makeTextSprite(`⭐ ${pet.name}`, 0.9);
    petLabel.position.y = sp.size * 1.6 + 0.5;
    petMesh.add(petLabel);
    petMesh.position.copy(player.pos);
    scene.add(petMesh);
  }
  refreshPet();

  function setPet(spId) {
    const sp = creatureManager.species.find((s) => s.id === spId);
    if (!sp) return;
    const name = (window.prompt(`Comment s'appelle ton compagnon ${sp.name} ?`, sp.name) || sp.name).slice(0, 14);
    pet = { id: spId, name };
    saveJson(PET_KEY, pet);
    refreshPet();
    toast(`⭐ ${name} est maintenant ton compagnon !`, 0xffe07a);
    emojiBurst(['⭐', '💛'], 12);
  }

  function clearPet() {
    pet = null;
    saveJson(PET_KEY, pet);
    refreshPet();
  }

  // add "companion" buttons inside the dex rows when the dex opens
  document.getElementById('dex-btn')?.addEventListener('click', () => setTimeout(decorateDex, 60));
  function decorateDex() {
    const list = document.getElementById('dex-list');
    if (!list) return;
    // dex rows are rendered in species order, one row per species
    [...list.children].forEach((row, i) => {
      const sp = creatureManager.species[i];
      if (!sp || row.querySelector('.pet-btn')) return;
      const entry = creatureManager.collection.find((e) => e.id === sp.id);
      if (!entry) return;
      const b = document.createElement('button');
      b.className = 'pet-btn dex-release';
      b.textContent = pet && pet.id === sp.id ? '⭐' : '☆';
      b.title = 'Choisir comme compagnon';
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (pet && pet.id === sp.id) clearPet(); else setPet(sp.id);
        for (const btn of list.querySelectorAll('.pet-btn')) btn.remove();
        decorateDex();
      });
      row.appendChild(b);
    });
  }

  // ---- feeding & riding -----------------------------------------------------
  let riding = null;

  function feed(a) {
    // Comme `montable`, c'est la fiche de l'espèce qui décide : une voiture
    // ne se nourrit pas, ne se câline pas, et ne fait pas de bébés voitures.
    if (!a || a.def.nourrissable === false) return;
    emojiBurst(['💕', a.def.emoji], 8);
    const partner = animalManager.animals.find((o) =>
      o !== a && o.def.key === a.def.key && !o.baby && o.pos.distanceTo(a.pos) < 9);
    if (!a.baby && partner) {
      const AnimalClass = a.constructor;
      const baby = new AnimalClass(a.def, (a.pos.x + partner.pos.x) / 2, a.pos.y + 0.3, (a.pos.z + partner.pos.z) / 2, true);
      animalManager.animals.push(baby);
      animalManager.scene.add(baby.mesh);
      toast(`${a.def.emoji} Un bébé ${a.def.name.toLowerCase()} est né ! 🍼`, 0xffc9dd);
      emojiBurst(['🍼', '💖', a.def.emoji], 16);
    } else {
      toast(`${a.def.emoji} ${a.def.name} adore les câlins ! (il faut 2 ${a.def.name.toLowerCase()}s adultes proches pour un bébé)`, 0xffd7e0);
    }
  }

  // Qui se monte n'est plus une liste écrite ici : c'est la fiche de l'espèce
  // qui le dit (`montable`, dans src/montures.js). Ajouter une bête à monter
  // ne demande donc plus de penser à revenir modifier ce fichier — l'oubli
  // qui, pendant des mois, a laissé le cheval, le cerf et le loup seuls
  // montables alors que le bestiaire s'était étoffé.
  const montable = (a) => !!(a && a.def && a.def.montable && !a.baby);

  function toggleRide(a) {
    if (riding) {
      const quitte = riding;
      riding = null;
      // Les flammes s'éteignent avec le mode pilote : la monture quittée
      // n'est plus mise à jour, elle garderait sa dernière flamme (v264).
      for (const f of (quitte && quitte.mesh && quitte.mesh.userData.tuyeres) || []) f.visible = false;
      // On rend la marche en descendant : sans cela l'enfant garderait la
      // physique de vol à pied. Même règle que le gabarit de la voiture, qui
      // se rend aussi en descendant (v212).
      player.pilote = null;
      player.vitesseAvion = undefined;
      player.avionEnVol = false;
      player.roulisAvion = 0;
      player.avionEtat = undefined; player.assietteAvion = 0; player.trainSorti = 1;
      player.gaz = null; player.vitesseVoiture = 0; player.trainVoulu = undefined; player.ventre = false;
      player.boost = undefined;
      // Le vol redevient permis dès qu'on a les pieds par terre, et la boîte
      // de collision reprend celle d'un piéton — sinon on garderait à pied le
      // gabarit d'une voiture et l'on resterait coincé entre deux murs.
      player.interdireVol(false);
      if (player.prendreGabarit) player.prendreGabarit(0);
      quitte.montee = false;
      if (!rangerAuGarage(quitte)) toast('🐴 Tu es descendu·e.', 0xd8c9a4);
      return;
    }
    if (!montable(a)) return;
    debarquer();
    riding = a;
    a.montee = true;   // le gestionnaire d'animaux ne la retire jamais (animals.js)
    player.gaz = null; player.vitesseVoiture = 0;   // la manette des gaz part de zéro, le joystick reste l'accélérateur tant qu'elle n'a pas servi
    // La fiche décide : une voiture ne décolle pas, un cheval non plus une
    // fois qu'on le dira. Voir `volInterdit` dans player.js.
    player.interdireVol(a.def.vole === false);
    // Et sa CARRURE : une voiture ne passe pas là où un piéton passe.
    if (player.prendreGabarit) player.prendreGabarit(a.def.gabarit || 0);
    a.state = 'idle';
    const allure = allureMonture(a);
    if (a.def.pilote) {
      // Un enfant de sept ans doit savoir QUOI FAIRE, pas ce que le jeu
      // calcule. Trois gestes, dans l'ordre où on s'en sert.
      toast(`${a.def.emoji} Aux commandes du ${a.def.name.toLowerCase()} !`
        + ' Le joystick fait rouler, ✈️ met les gaz — le nez se lève tout seul.', 0xa8d8ff);
    } else {
      toast(`${a.def.emoji} En selle sur ${a.def.name.toLowerCase()} ! Vitesse ×${allure.toFixed(1).replace('.0', '')}`
        + ' — refais pareil pour descendre.', 0xffe07a);
    }
    emojiBurst([a.def.emoji, '💨'], 8);
  }

  // ---- monter à bord de ce qui roule ---------------------------------------
  // Le métro et les monoplaces tournaient depuis toujours sans qu'on puisse y
  // monter : on les regardait passer. Embarquer, ici, c'est simplement se
  // laisser porter par la place qu'on occupe — le convoi suit son tracé, on
  // suit le convoi.
  let bord = null;
  // PASSAGER CHEZ UN AMI (v253). Max : « permets que plusieurs joueurs
  // rentrent dans un moyen de transport : le premier conduit, les autres
  // restent passagers ». Comme `bord` : on est collé au siège, les commandes
  // ne servent à rien, un appui descend. Le véhicule, lui, est celui que
  // main.js dessine pour l'ami (`vehiculeDistant`).
  let passager = null;   // { de: identifiant de l'ami, s: numéro de siège, nom }
  function vehiculeAmiProche() {
    const rps = remotePlayers ? remotePlayers() : null;
    if (!rps || !isRunning()) return null;
    let meilleur = null;
    for (const [id, rp] of rps) {
      if (!rp.vehicule || !rp.vehicule.def || !rp.vehicule.def.sieges) continue;
      const d = rp.vehicule.mesh.position.distanceTo(player.pos);
      if (d < RAYON_BORD && (!meilleur || d < meilleur.d)) meilleur = { id, d, nom: rp.name || 'un ami', def: rp.vehicule.def };
    }
    return meilleur;
  }
  function monterAvec(ami) {
    if (riding) toggleRide(null);
    debarquer(true);
    // le premier siège libre : les autres passagers de cette voiture sont
    // connus par leur position réseau (`passager.de`)
    const rps = remotePlayers ? remotePlayers() : null;
    let occupes = 0;
    if (rps) for (const rp of rps.values()) if (rp.passager && rp.passager.de === ami.id) occupes++;
    const s = Math.min(occupes, ami.def.sieges.length - 1);
    passager = { de: ami.id, s, nom: ami.nom };
    player.vel.set(0, 0, 0);
    toast(`🚗 Tu montes avec ${ami.nom} ! Appuie encore pour descendre.`, 0xa8d8ff);
    emojiBurst(['🚗', '💨'], 8);
  }
  function descendreDePassager(silencieux = false) {
    if (!passager) return;
    const nom = passager.nom;
    passager = null;
    player.vel.set(0, 0, 0);
    if (!silencieux) toast(`🚶 Tu descends de la voiture de ${nom}.`, 0xd8c9a4);
  }
  function updatePassager() {
    if (!passager) return;
    const veh = vehiculeDistant ? vehiculeDistant(passager.de) : null;
    if (!veh) { descendreDePassager(true); return; }
    const sieges = veh.def.sieges || [];
    const siege = sieges[Math.min(passager.s, sieges.length - 1)] || veh.def.siege;
    veh.mesh.updateMatrixWorld(true);
    const monde = veh.mesh.localToWorld(new THREE.Vector3(siege.x, 0, siege.z));
    player.pos.set(monde.x, veh.mesh.position.y, monde.z);
    player.vel.set(0, 0, 0);
    player.camera.position.copy(player.eyePosition());
  }

  // NEUF BLOCS, PAS CINQ — et c'est la réponse à « on ne peut pas monter dans
  // les véhicules en déplacement ». Le code pour conduire une voiture de ville
  // existe depuis la v194 et il marche ; ce qui ne marchait pas, c'est de
  // l'ATTRAPER. À 4,2 m/s, cinq blocs laissent une seconde pour appuyer sur le
  // bouton — un enfant de sept ans la rate à tous les coups, et il en conclut
  // que le jeu refuse. Neuf blocs lui en laissent deux, et `placeProche` rend
  // toujours la PLUS PROCHE : on ne monte pas dans la voiture d'en face. Le
  // bouton et l'embarquement partagent le même chiffre, sinon le bouton
  // s'affiche pour une voiture qu'appuyer ne peut pas attraper.
  const RAYON_BORD = 9;

  function debarquer(silencieux = false) {
    if (!bord) return;
    const nom = bord.nom;
    bord = null;
    player.vel.set(0, 0, 0);
    if (!silencieux) toast(`🚶 Tu descends du ${nom}.`, 0xd8c9a4);
  }

  // ON PREND LE VOLANT, ON NE SE LAISSE PLUS PORTER.
  //
  // Max : « je veux que l'on puisse conduire n'importe quel type de voiture
  // dans le jeu. » Une voiture de ville était un siège : le convoi suivait son
  // tracé et les commandes de l'enfant ne servaient à rien. Désormais il la
  // SORT du convoi et repart avec — le mode monture, celui qui sait déjà
  // conduire, prend le relais.
  //
  // Le modèle voyage avec elle : la voiture qu'on conduit est exactement celle
  // qu'on a vue passer, pas une inconnue de la flotte. Le métro, les rames et
  // les monoplaces gardent l'ancien comportement — on ne conduit pas un métro.
  function conduireLaVoiture(place) {
    const v = getVehicules && getVehicules();
    if (!v || !v.emprunter) return false;
    const pris = v.emprunter(place.id);
    if (!pris) return false;
    const auto = animalManager.invoquer('voiture', pris.x, pris.z, false, { flotte: pris.flotte });
    if (!auto) return false;
    // À SA PLACE EXACTE, pas au sommet de la colonne — la leçon du garage.
    auto.pos.set(pris.x, pris.y, pris.z);
    auto.yaw = pris.cap || 0;
    auto.mesh.position.copy(auto.pos);
    auto.mesh.rotation.y = auto.yaw + Math.PI;
    toggleRide(auto);
    toast(`🚗 Tu prends le volant ${pris.nom ? `de la ${pris.nom}` : 'de la voiture'} !`, 0xa8d8ff);
    return true;
  }

  function embarquer() {
    if (bord) { debarquer(); return; }
    const v = getVehicules && getVehicules();
    // Cinq blocs, pas quatre : les voies du métro de Washington sont à quatre
    // blocs de l'axe du quai — une rame à l'arrêt est donc à 4,2 blocs d'un
    // enfant au milieu du quai, et l'ancien rayon la déclarait hors de portée.
    const place = v && v.placeProche(player.pos, RAYON_BORD);
    if (!place) return;
    if (riding) toggleRide(null);
    // Une voiture se conduit ; un métro se prend.
    if (place.nom === 'voiture' && conduireLaVoiture(place)) return;
    bord = { id: place.id, nom: place.nom, emoji: place.emoji };
    toast(`${place.emoji} Tu montes dans le ${place.nom} ! Il t'emmène — appuie encore pour descendre.`, 0xa8d8ff);
    emojiBurst([place.emoji, '💨'], 8);
  }

  function updateBord() {
    if (!bord) return;
    const v = getVehicules && getVehicules();
    const place = v && v.place(bord.id);
    if (!place) { debarquer(true); return; }
    player.pos.set(place.x, place.y, place.z);
    player.vel.set(0, 0, 0);
    // La caméra a déjà été posée en début d'image, avant que le convoi n'avance :
    // sans ce rappel, on verrait le paysage avec une image de retard, ce qui
    // suffit à donner mal au cœur sur une tablette.
    player.camera.position.copy(player.eyePosition());
  }

  document.addEventListener('keydown', (e) => {
    if (!isRunning()) return;
    if (e.code === 'KeyN') feed(animalManager.targeted());
    // Une seule touche pour « monter » : sur ce qui vit s'il y a une bête
    // devant soi, à bord sinon. L'enfant n'a pas à savoir laquelle des deux.
    if (e.code === 'KeyM') {
      if (passager) descendreDePassager();
      else if (riding) toggleRide(null);
      else if (bord) debarquer();
      else if (animalManager.monture()) toggleRide(animalManager.monture());
      else embarquer();
    }
  });
  document.getElementById('feed-btn').addEventListener('click', () => feed(animalManager.targeted()));
  document.getElementById('ride-btn').addEventListener('click', () => {
    if (passager) { descendreDePassager(); return; }
    if (riding) { toggleRide(null); return; }
    const m = animalManager.monture();
    if (m) { toggleRide(m); return; }
    const ami = vehiculeAmiProche();
    if (ami) monterAvec(ami);
  });
  document.getElementById('board-btn').addEventListener('click', () => embarquer());

  // ---- emotes ---------------------------------------------------------------
  const emoteSprites = new Map(); // peerId -> { sprite, t }
  emoteRow.querySelectorAll('button').forEach((b) => {
    b.addEventListener('click', () => {
      const k = b.dataset.k;
      emojiBurst([k], 10);
      const net = getNet();
      if (net && net.active) net.broadcast({ t: 'emote', k, name: myName() });
      // le geste est parti : la rangée se replie d'elle-même
      emotesDepliees = false;
      emoteRow.style.display = 'none';
    });
  });

  function showRemoteEmote(peerId, k) {
    const rp = remotePlayers().get(peerId);
    if (!rp) return;
    const old = emoteSprites.get(peerId);
    if (old) rp.mesh.remove(old.sprite);
    const sp = makeTextSprite(k, 1.4);
    sp.position.y = 2.6;
    rp.mesh.add(sp);
    emoteSprites.set(peerId, { sprite: sp, t: 2.5, mesh: rp.mesh });
  }

  function updateEmotes(dt) {
    for (const [id, e] of [...emoteSprites]) {
      e.t -= dt;
      e.sprite.position.y = 2.6 + Math.sin(e.t * 8) * 0.15;
      if (e.t <= 0) { e.mesh.remove(e.sprite); emoteSprites.delete(id); }
    }
  }

  // ---- duels ----------------------------------------------------------------
  let portraitRenderer = null;
  function creaturePortrait(spId) {
    const sp = creatureManager.species.find((s) => s.id === spId) || creatureManager.species[0];
    if (!portraitRenderer) {
      portraitRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      portraitRenderer.setSize(110, 130);
    }
    const sc = new THREE.Scene();
    sc.add(new THREE.AmbientLight(0xffffff, 0.9));
    const dl = new THREE.DirectionalLight(0xffffff, 1.2);
    dl.position.set(2, 4, 3);
    sc.add(dl);
    const mesh = buildCreatureMesh(sp);
    mesh.rotation.y = -0.4;
    sc.add(mesh);
    const cam = new THREE.PerspectiveCamera(40, 110 / 130, 0.1, 20);
    cam.position.set(0.4, sp.size * 1.1, -sp.size * 3.2);
    cam.lookAt(0, sp.size * 0.8, 0);
    portraitRenderer.render(sc, cam);
    return portraitRenderer.domElement.toDataURL();
  }

  function myDuelCreature() {
    if (pet) return pet.id;
    return creatureManager.collection[0]?.id ?? creatureManager.species[0].id;
  }

  function runDuel(a, b, spA, spB) {
    const me = myName();
    if (a !== me && b !== me) return; // spectators sit this one out
    document.getElementById('duel-img-a').src = creaturePortrait(spA);
    document.getElementById('duel-img-b').src = creaturePortrait(spB);
    document.getElementById('duel-nm-a').textContent = a;
    document.getElementById('duel-nm-b').textContent = b;
    duelOverlay.style.display = 'flex';
    const status = document.getElementById('duel-status');
    const winner = [a, b].sort()[hashStr([a, b].sort().join('|') + new Date().toISOString().slice(0, 13)) % 2];
    let count = 3;
    status.textContent = '3…';
    const iv = setInterval(() => {
      count--;
      if (count > 0) { status.textContent = `${count}…`; return; }
      clearInterval(iv);
      status.textContent = `🏆 ${winner} gagne ce round amical !`;
      if (winner === me) { records.duels++; saveRecords(); emojiBurst(['🏆', '🎉'], 20); }
      else emojiBurst(['👏', '💪'], 12);
      setTimeout(() => { duelOverlay.style.display = 'none'; }, 3200);
    }, 900);
  }

  function challenge(name) {
    const net = getNet();
    if (!net || !net.active) return;
    const msg = { t: 'duel', phase: 1, a: myName(), b: name, spA: myDuelCreature() };
    net.broadcast(msg);
    toast(`⚔️ Défi envoyé à ${name} !`, 0xffe07a);
  }

  function onDuelMsg(msg) {
    if (msg.phase === 1 && msg.b === myName()) {
      const net = getNet();
      const reply = { t: 'duel', phase: 2, a: msg.a, b: msg.b, spA: msg.spA, spB: myDuelCreature() };
      if (net && net.active) net.broadcast(reply);
      runDuel(msg.a, msg.b, msg.spA, reply.spB);
    } else if (msg.phase === 2 && (msg.a === myName() || msg.b === myName())) {
      runDuel(msg.a, msg.b, msg.spA, msg.spB);
    }
  }

  function decoratePlayersPanel(list) {
    const net = getNet();
    if (!net || !net.active) return;
    for (const c of net.conns.values()) {
      if (!c.name) continue;
      const row = document.createElement('div');
      row.className = 'fun-row';
      row.innerHTML = `<span>${c.name}</span>`;
      const duelB = document.createElement('button');
      duelB.textContent = '⚔️ Défi';
      duelB.addEventListener('click', () => challenge(c.name));
      row.appendChild(duelB);
      list.appendChild(row);
    }
    const hs = document.createElement('div');
    hs.className = 'fun-row';
    hs.innerHTML = '<span>🙈 Cache-cache</span>';
    const hsB = document.createElement('button');
    hsB.textContent = 'Lancer';
    hsB.addEventListener('click', () => {
      // Annonce, pas message : cette phrase toute faite encombrait le chat
      // et y restait pour toujours, alors qu'elle ne vaut que sur l'instant.
      net.broadcast({ t: 'annonce', txt: `🙈 ${myName()} lance un cache-cache ! Comptez jusqu'à 20 puis cherchez !` });
      toast('🙈 Va vite te cacher ! Les autres comptent jusqu\'à 20…', 0x9fd8e8);
    });
    hs.appendChild(hsB);
    list.appendChild(hs);
  }

  // ---- signs ----------------------------------------------------------------
  let signs = [];           // {x,y,z,text,author,yaw}
  const signMeshes = new Map();
  let signsCtx = null;

  const signsKey = () => `web-minecraft-signs-v1::${signsCtx || 'local'}`;

  function renderSign(s) {
    const k = `${s.x},${s.y},${s.z}`;
    if (signMeshes.has(k)) return;
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 0.1), new THREE.MeshLambertMaterial({ color: 0x6a4a2a }));
    post.position.y = 0.55;
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.65, 0.07), new THREE.MeshLambertMaterial({ color: 0xc9a86a }));
    board.position.y = 1.25;
    const label = makeTextSprite(`${s.text}`, 0.62);
    label.position.y = 1.3;
    label.position.z = -0.06;
    const author = makeTextSprite(`— ${s.author}`, 0.34);
    author.position.y = 1.02;
    author.position.z = -0.06;
    g.add(post, board, label, author);
    g.position.set(s.x + 0.5, s.y, s.z + 0.5);
    g.rotation.y = s.yaw || 0;
    scene.add(g);
    signMeshes.set(k, g);
  }

  function clearSignMeshes() {
    for (const m of signMeshes.values()) scene.remove(m);
    signMeshes.clear();
  }

  // ON NE PLANTE PLUS DE PANNEAU (v255) : l'onglet est parti. Ceux qui sont
  // déjà plantés restent dans le monde — c'est ce qu'un enfant a écrit — et
  // un panneau posé depuis une tablette restée sur l'ancienne version arrive
  // encore par le réseau ou par le nuage : le receveur cède, il l'affiche et
  // le garde. Il ne renvoie rien.
  function addSign(s, { save = true } = {}) {
    if (!s || signs.some((o) => o.x === s.x && o.y === s.y && o.z === s.z)) return;
    signs.push(s);
    renderSign(s);
    if (save) saveJson(signsKey(), signs);
  }

  async function loadSigns(ctxKey) {
    signsCtx = ctxKey;
    clearSignMeshes();
    signs = loadJson(signsKey(), []);
    for (const s of signs) renderSign(s);
    if (ctxKey && ctxKey !== 'local') {
      try {
        for (const s of await cloud.signHistory()) addSign(s, { save: false });
        saveJson(signsKey(), signs);
      } catch { /* offline */ }
    }
  }

  // ---- la bibliothèque de monuments ------------------------------------------
  //
  // Vingt-et-un bâtiments célèbres, relevés sur leurs vraies proportions. Un
  // enfant en choisit un et le pose devant lui : c'est un chantier de plusieurs
  // milliers de blocs qui apparaît d'un coup.
  //
  // Trois précautions, chacune apprise d'un vrai défaut :
  //   — on pose DEVANT le joueur et non sur lui, sinon il se réveille muré ;
  //   — le sol est cherché sous chaque colonne, pas une fois au centre : un
  //     monument à cheval sur une pente flotterait d'un côté ;
  //   — les blocs partent en UN lot au lieu de sept mille messages.
  function poserMonument(id) {
    poserBati(monumentBati(id));
  }

  function poserBati(m) {
    if (!m || !m.blocs.length) return;
    // Devant soi, à bonne distance : la moitié de l'emprise plus six pas, pour
    // qu'on voie le bâtiment en entier au lieu d'avoir le nez dans un mur.
    const recul = Math.max(m.emprise.l, m.emprise.p) / 2 + 6;
    const cx = Math.round(player.pos.x - Math.sin(player.yaw) * recul);
    const cz = Math.round(player.pos.z - Math.cos(player.yaw) * recul);
    // Le sol de référence : le point le plus bas sous l'emprise. Poser sur le
    // point le plus haut enterrerait la moitié du monument dans une pente.
    let sol = Infinity;
    for (let dx = -m.emprise.l / 2; dx <= m.emprise.l / 2; dx += 4) {
      for (let dz = -m.emprise.p / 2; dz <= m.emprise.p / 2; dz += 4) {
        const s = world.sommetColonne(cx + dx, cz + dz);
        if (s < sol) sol = s;
      }
    }
    if (!isFinite(sol)) sol = world.terrainHeight(cx, cz);

    // UN GARAGE A UNE FAÇADE, LA TOUR EIFFEL N'EN A PAS.
    //
    // La bibliothèque posait tout sans jamais faire pivoter : personne ne s'en
    // était plaint, parce qu'un monument se regarde de partout. Un garage, non
    // — il faut pouvoir ENTRER, et une porte qui regarde toujours le sud, c'est
    // un enfant qui fait le tour de son propre garage sans trouver l'entrée.
    //
    // Seuls les bâtiments qui déclarent une façade pivotent, et seulement par
    // quarts de tour : à un quart de tour près, les coordonnées restent
    // entières et aucun bloc ne se perd en chemin. La façade regarde alors
    // l'enfant qui vient de la poser.
    const quart = m.garage ? ((Math.round(player.yaw / (Math.PI / 2)) % 4) + 4) % 4 : 0;
    const cosT = [1, 0, -1, 0][quart], sinT = [0, 1, 0, -1][quart];
    const ox = Math.round((m.emprise.minX + m.emprise.maxX) / 2);
    const oz = Math.round((m.emprise.minZ + m.emprise.maxZ) / 2);
    const tourner = (bx, bz) => [bx * cosT + bz * sinT, bz * cosT - bx * sinT];

    const t = Date.now();
    const lot = [];
    // On coupe le crieur le temps de bâtir : sinon chaque bloc partirait seul.
    const crieur = world.onOp;
    world.onOp = null;
    try {
      for (const [bx, by, bz, bid] of m.blocs) {
        const [rx, rz] = tourner(bx - ox, bz - oz);
        const x = cx + rx;
        const y = sol + 1 + (by - m.emprise.minY);
        const z = cz + rz;
        world.setBlock(x, y, z, bid, t);
        lot.push([`${x},${y},${z}`, bid, t]);
      }
    } finally { world.onOp = crieur; }
    world.saveEdits();

    // UN GARAGE POSÉ EST UN GARAGE INSCRIT. C'est ici, et pas ailleurs, qu'on
    // sait où il a atterri : la pose recentre le bâtiment sur son emprise, la
    // fait pivoter, et cherche le sol colonne par colonne. Refaire ce calcul
    // plus tard, c'est le refaire faux.
    if (m.garage) {
      // L'ORIGINE DE L'AUTEUR, PAS LE CENTRE DE L'EMPRISE. Les deux diffèrent
      // dès qu'un bâtiment déborde d'un côté — ici l'allée goudronnée, qui
      // tire l'emprise de deux blocs vers l'avant. Les places, elles, sont
      // données par rapport à l'origine : inscrire le centre de l'emprise
      // décalerait la boîte de ces deux blocs-là, et un jour une voiture
      // garée au fond serait déclarée dehors.
      const [gx, gz] = tourner(-ox, -oz);
      inscrireGarage(world.ctx, {
        x: cx + gx, y: sol + 1, z: cz + gz,
        l: quart % 2 ? m.garage.p : m.garage.l,
        p: quart % 2 ? m.garage.l : m.garage.p,
        places: m.garage.places.map(([px, pz]) => {
          const [rx, rz] = tourner(px - ox, pz - oz);
          return [cx + rx, cz + rz];
        }),
      });
    }

    const net = getNet && getNet();
    if (net && net.active && net.sendLot) net.sendLot(lot);
    records.blocks += lot.length;
    saveRecords();
    toast(`${m.emoji} ${m.nom} — ${lot.length.toLocaleString('fr')} blocs posés !`, 0xffd166);
    panel.style.display = 'none';
  }

  // ---- les souvenirs ---------------------------------------------------------
  //
  // Le seul écran qui reste du panneau (v255) : l'album des photos. Le bouton
  // 🖼️ l'ouvre directement — plus d'onglet à choisir.
  const tabBody = panel.querySelector('#fun-tab-body');

  function renderSouvenirs(tirerDuNuage = true) {
    const photos = loadJson(PHOTOS_KEY, []);
    // On va chercher celles prises sur les autres appareils : c'est le seul
    // moment où l'album coûte quelque chose, et c'est celui où l'enfant le
    // regarde. Une seule redessinée, s'il y a du neuf — et sans redemander
    // le nuage, sinon on tournerait en rond.
    if (tirerDuNuage) {
      photosNuage?.tirer().then((tout) => {
        if (tout && tout.length !== photos.length && panel.style.display === 'block') renderSouvenirs(false);
      });
    }
    tabBody.innerHTML = `<h3>📸 Souvenirs</h3>
      <div class="fun-note">${photos.length ? 'Tes plus belles photos du monde !' : 'Appuie sur 📸 en jeu pour prendre une photo !'}</div>`;
    const grid = document.createElement('div');
    grid.className = 'photo-grid';
    photos.forEach((p, i) => {
      const d = document.createElement('div');
      d.className = 'ph';
      d.innerHTML = `<img src="${p}">`;
      const del = document.createElement('button');
      del.className = 'del';
      del.textContent = '🗑';
      del.addEventListener('click', () => {
        photos.splice(i, 1);
        saveJson(PHOTOS_KEY, photos);
        renderSouvenirs(false);
      });
      d.appendChild(del);
      // « Récupérer » la photo : le partage natif — vers Photos, Messages —
      // là où il existe (iPad, téléphone) ; un enregistrement direct sinon.
      const garder = document.createElement('button');
      garder.className = 'garder';
      garder.textContent = '📤';
      garder.title = 'Garder la photo';
      garder.addEventListener('click', async () => {
        try {
          const blob = await (await fetch(p)).blob();
          const fichier = new File([blob], `minecraft-${i + 1}.jpg`, { type: 'image/jpeg' });
          if (navigator.canShare && navigator.canShare({ files: [fichier] })) {
            await navigator.share({ files: [fichier] });
            return;
          }
        } catch { /* partage refusé ou fermé : on retombe sur le lien */ }
        const a = document.createElement('a');
        a.href = p;
        a.download = `minecraft-${i + 1}.jpg`;
        a.click();
      });
      d.appendChild(garder);
      grid.appendChild(d);
    });
    tabBody.appendChild(grid);
  }

  souvenirsBtn.addEventListener('click', () => {
    if (panel.style.display === 'block') { panel.style.display = 'none'; return; }
    panel.style.display = 'block';
    renderSouvenirs();
  });

  // Les bonnes réponses se comptent toujours : c'est un record de l'enfant.
  // Les chapeaux, eux, ne se débloquent plus (v255) — ceux déjà gagnés
  // restent dans `records.hats`, intouchés.
  edu.onCorrect = () => {
    records.quizCorrect++;
    saveRecords();
  };

  // ---- photos ---------------------------------------------------------------
  photoBtn.addEventListener('click', () => {
    renderNow();
    const full = canvas;
    const c = document.createElement('canvas');
    const w = 480, h = Math.round(480 * full.height / full.width);
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(full, 0, 0, w, h);
    const data = c.toDataURL('image/jpeg', 0.6);
    const photos = loadJson(PHOTOS_KEY, []);
    photos.unshift(data);
    while (photos.length > 10) photos.pop();
    saveJson(PHOTOS_KEY, photos);
    // Les photos ont leur propre document depuis qu'elles pesaient un tiers de
    // la place du profil — et faisaient jeter les blocs de l'enfant. Elles
    // partent donc à part, sans jamais bousculer une construction.
    photosNuage?.pousser();
    flash.style.opacity = 0.9;
    setTimeout(() => { flash.style.opacity = 0; }, 120);
    // Le chemin dit dans le toast est le vrai : un bouton, l'album.
    toast('📸 Photo rangée dans 🖼️ Souvenirs !', 0x9fd8e8);
  });

  // ---- daily treasure -------------------------------------------------------
  const today = () => new Date().toISOString().slice(0, 10);
  let treasure = null, treasureMesh = null;
  function ensureTreasure() {
    if (records.treasureDate === today()) { treasure = null; return; }
    if (treasure) return;
    for (let i = 0; i < 24; i++) {
      const h = hashStr(today() + ':' + i);
      const ang = (h % 6283) / 1000;
      const dist = 60 + (h % 200);
      const x = Math.round(Math.sin(ang) * dist), z = Math.round(Math.cos(ang) * dist);
      const th = world.terrainHeight(x, z);
      if (th > WATER_LEVEL + 1 && !world.cityAt(x, z)) {
        treasure = { x, z, y: th + 1 };
        break;
      }
    }
  }

  function updateTreasure(dt) {
    ensureTreasure();
    if (!treasure) { if (treasureMesh) { scene.remove(treasureMesh); treasureMesh = null; } return; }
    const d = Math.hypot(player.pos.x - treasure.x, player.pos.z - treasure.z);
    if (d < 60 && !treasureMesh) {
      treasureMesh = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8),
        new THREE.MeshLambertMaterial({ color: 0xf2c14a }));
      box.position.y = 0.6;
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 30, 8),
        new THREE.MeshBasicMaterial({ color: 0xfff1a8, transparent: true, opacity: 0.35 }));
      beam.position.y = 15;
      treasureMesh.add(box, beam);
      treasureMesh.position.set(treasure.x + 0.5, treasure.y, treasure.z + 0.5);
      scene.add(treasureMesh);
    }
    if (treasureMesh) treasureMesh.rotation.y += dt;
    if (d < 3.5) {
      records.treasureDate = today();
      scene.remove(treasureMesh); treasureMesh = null; treasure = null;
      records.treasures++; saveRecords();
      // Le sac et le feu d'artifice sont partis avec l'atelier (v255) : la
      // récompense, c'est la fête — et un trésor de plus au compteur.
      toast('💰 TRÉSOR DU JOUR trouvé ! Bravo !', 0xffd75e);
      emojiBurst(['💰', '🪙', '🎉', '⭐'], 30);
    }
  }

  function treasureHint() {
    ensureTreasure();
    if (!treasure) { toast('💰 Trésor du jour déjà trouvé — reviens demain !', 0xcccccc); return; }
    const dx = treasure.x - player.pos.x, dz = treasure.z - player.pos.z;
    const dist = Math.round(Math.hypot(dx, dz));
    const dir = Math.abs(dx) > Math.abs(dz)
      ? (dx > 0 ? "l'est ➡️" : "l'ouest ⬅️")
      : (dz > 0 ? 'le sud ⬇️' : 'le nord ⬆️');
    toast(`💰 Le trésor du jour est vers ${dir}, à environ ${dist} pas ! Cherche le rayon doré !`, 0xffd75e);
  }
  // L'INDICE DU TRÉSOR EST UN OUTIL DE LA CARTE : il va dans la RANGÉE
  // D'OUTILS, avec « moi » et « tout ».
  //
  // Il était posé en absolu au bas de la modale — donc au bas de l'ÉCRAN,
  // puisque la modale occupe tout l'écran — et il venait donc s'asseoir sur la
  // légende. Sur un téléphone couché, où la fiche descend bien plus bas, il
  // recouvrait la ligne « appui long pour t'y téléporter » : capture de Max à
  // l'appui. Dans la rangée, il ne peut plus recouvrir quoi que ce soit, et il
  // se voit enfin pour ce qu'il est.
  document.getElementById('map-outils')?.insertAdjacentHTML('beforeend',
    '<button id="treasure-hint-btn" title="Où est le trésor du jour ?">💰 trésor</button>');
  document.getElementById('treasure-hint-btn')?.addEventListener('click', () => {
    treasureHint();
    // On referme par le bouton de fermeture, jamais en cachant la modale à la
    // main : c'est lui qui arrête la boucle de dessin de la carte et rend la
    // souris au jeu. Masquée sans être fermée, la carte continuait de se
    // redessiner soixante fois par seconde derrière un écran noir.
    document.getElementById('map-modal-close')?.click();
  });

  // ---- park mini-games ------------------------------------------------------
  const RACE_START = { x: PARK.x - 16, z: PARK.z - 18 };
  const RACE_END = { x: PARK.x - 16, z: PARK.z + 20 };
  let raceTime = null, raceCooldown = 0;
  const PODIUM = { x: PARK.x + 16, z: PARK.z + 20 };
  let parkourDone = false;

  function updatePark(dt) {
    raceCooldown -= dt;
    const ds = Math.hypot(player.pos.x - RACE_START.x - 0.5, player.pos.z - RACE_START.z - 0.5);
    const de = Math.hypot(player.pos.x - RACE_END.x - 0.5, player.pos.z - RACE_END.z - 0.5);
    if (raceTime === null && ds < 2.5 && raceCooldown <= 0) {
      raceTime = 0;
      toast('🏁 COURSE ! File jusqu\'au drapeau à damier !', 0x6ee06e);
    } else if (raceTime !== null) {
      raceTime += dt;
      if (de < 2.5) {
        const t = raceTime;
        raceTime = null; raceCooldown = 5;
        const best = records.bestRace;
        if (!best || t < best) { records.bestRace = t; saveRecords(); toast(`🏁 ${t.toFixed(1)} s — NOUVEAU RECORD !`, 0xffd75e); emojiBurst(['🏁', '🏆'], 16); }
        else toast(`🏁 ${t.toFixed(1)} s (record : ${best.toFixed(1)} s)`, 0x9fd8e8);
      } else if (raceTime > 60) { raceTime = null; }
    }
    // parkour podium
    const baseY = world.terrainHeight(PARK.x, PARK.z);
    if (!parkourDone &&
        Math.abs(player.pos.x - PODIUM.x) < 2 && Math.abs(player.pos.z - PODIUM.z) < 2 &&
        player.pos.y > baseY + 9) {
      parkourDone = true;
      records.parkour++; saveRecords();
      toast('🤸 PARKOUR RÉUSSI ! Champion·ne !', 0xffd75e);
      emojiBurst(['🤸', '🏆', '🎉'], 20);
    }
  }

  // ---- museum statues -------------------------------------------------------
  const MUSEUM = PLACES.find((p) => p.name === 'Musée');
  let statueGroup = null;

  function updateMuseum() {
    const d = Math.hypot(player.pos.x - MUSEUM.x, player.pos.z - MUSEUM.z);
    if (d < 34 && !statueGroup) {
      statueGroup = new THREE.Group();
      const by = world.terrainHeight(MUSEUM.x, MUSEUM.z);
      const caught = creatureManager.collection.slice(0, 12);
      caught.forEach((entry, i) => {
        const sp = creatureManager.species.find((s) => s.id === entry.id);
        if (!sp) return;
        const st = buildCreatureMesh(sp);
        st.scale.setScalar(0.7);
        const col = i % 6, rowz = i < 6 ? 4 : -4;
        st.position.set(MUSEUM.x + (-6 + col * 2.4 | 0) + 0.5, by + 1, MUSEUM.z + rowz + 0.5);
        st.rotation.y = rowz > 0 ? Math.PI : 0;
        statueGroup.add(st);
      });
      scene.add(statueGroup);
      if (caught.length) toast(`🏛️ Le musée expose ${caught.length} de tes créatures !`, 0x9fd8e8);
    } else if (d > 45 && statueGroup) {
      scene.remove(statueGroup);
      statueGroup = null;
    }
  }

  // ---- math pop challenges --------------------------------------------------
  let mathTimer = 150;
  function showMathPop() {
    const a = 5 + Math.floor(Math.random() * 12), b = 2 + Math.floor(Math.random() * 9);
    const blocks = records.blocks;
    const forms = [
      { q: `🥒 Cornichon : « Tu as posé ${blocks} blocs en tout ! Si tu en poses encore ${b}, ça fera combien ? »`, ans: blocks + b },
      { q: `🥒 Cornichon : « J'ai ${a} pommes et j'en trouve ${b} de plus. Combien j'en ai ? »`, ans: a + b },
      { q: `🥒 Cornichon : « Il me faut ${a + b} blocs et j'en ai déjà ${a}. Combien il m'en manque ? »`, ans: b },
    ];
    const f = forms[Math.floor(Math.random() * forms.length)];
    document.getElementById('math-q').textContent = f.q;
    const opts = document.getElementById('math-opts');
    opts.innerHTML = '';
    const answers = [f.ans, f.ans + 1 + Math.floor(Math.random() * 2), Math.max(0, f.ans - 1 - Math.floor(Math.random() * 2))]
      .sort(() => Math.random() - 0.5);
    for (const v of answers) {
      const b2 = document.createElement('button');
      b2.textContent = v;
      b2.addEventListener('click', () => {
        mathPop.style.display = 'none';
        if (v === f.ans) {
          records.mathWins++; saveRecords();
          toast('🧮 Exact ! Bravo !', 0x6ee06e);
          emojiBurst(['🧮', '✅'], 10);
        } else {
          toast(`🥒 Presque ! C'était ${f.ans}.`, 0xcccccc);
        }
      });
      opts.appendChild(b2);
    }
    mathPop.style.display = 'block';
    setTimeout(() => { mathPop.style.display = 'none'; }, 25000);
  }

  // ---- les garages ----------------------------------------------------------
  //
  // Trois gestes, et c'est tout ce que l'enfant a à comprendre : je pose un
  // garage, j'y gare ma voiture, je la retrouve. Le reste — le modèle, le
  // cap, le monde auquel elle appartient — est du travail de scribe, fait
  // dans src/garages.js.

  // On descend d'un véhicule. S'il est dans un garage, il y reste pour de
  // bon ; s'il en sort, la place se libère. Rend `true` quand il a parlé, pour
  // que l'appelant ne double pas le message par un « tu es descendu·e ».
  function rangerAuGarage(monture) {
    if (!monture || !monture.def || !monture.def.garable) return false;
    const ctxJeu = world.ctx;
    // D'abord libérer la place d'où il vient : sans cela, sortir sa voiture du
    // garage pour aller se promener en laisserait un double dedans.
    if (monture.garage) { sortir(ctxJeu, monture.garage); monture.garage = null; }
    const g = garageAutour(ctxJeu, monture.pos.x, monture.pos.y, monture.pos.z);
    if (!g) return false;
    const flotte = (monture.mesh && monture.mesh.userData.flotte) || null;
    const nom = (monture.mesh && monture.mesh.userData.nomVoiture) || monture.def.name;
    garer(ctxJeu, g.id, {
      flotte, nom,
      x: monture.pos.x, y: monture.pos.y, z: monture.pos.z, yaw: monture.yaw,
    });
    monture.garage = g.id;
    toast(`🅿️ ${nom} est garée — tu la retrouveras ici, même demain.`, 0xa8d8ff);
    emojiBurst(['🅿️', '🚗'], 8);
    return true;
  }

  // Rendre à l'enfant ce qu'il a rangé. On ne refabrique une voiture que si
  // aucune n'occupe déjà sa place : la boucle passe toutes les trois secondes,
  // et sans cette garde le garage se remplirait à l'infini.
  let garageTimer = 0;
  function veillerLesGarages(dt) {
    garageTimer -= dt;
    if (garageTimer > 0) return;
    garageTimer = 3;
    const ctxJeu = world.ctx;
    for (const [id, g] of Object.entries(garagesDe(ctxJeu))) {
      if (!g.voiture) continue;
      const v = g.voiture;
      // Ce qui est loin ne se fabrique pas : cinquante voitures invoquées à
      // l'autre bout de la carte, c'est la panne de v161 refaite à neuf.
      if (Math.hypot(player.pos.x - v.x, player.pos.z - v.z) > 140) continue;
      const deja = animalManager.animals.some((a) => a.garage === id
        || (a.def.garable && Math.hypot(a.pos.x - v.x, a.pos.z - v.z) < 3));
      if (deja) continue;
      const auto = animalManager.invoquer('voiture', v.x, v.z, false, { flotte: v.flotte });
      if (!auto) continue;
      auto.garage = id;
      // SUR LE PLANCHER, PAS SUR LE TOIT.
      //
      // `invoquer` pose la bête au SOMMET DE LA COLONNE — et le sommet de la
      // colonne, sous un garage, c'est le toit. La voiture rangée revenait
      // donc sur la casquette de béton, ce que Max a vu du premier coup :
      // « elle n'a pas exactement respecté les mêmes localisations, elle est
      // passée sur le toit ».
      //
      // La hauteur du garage était pourtant écrite depuis le début — on la
      // range en même temps que la place et le modèle — mais on gardait celle
      // que venait de calculer `invoquer`. C'est le même contresens que dans
      // `passants.js` : `sommetColonne` répond sur la COLONNE, pas sur le sol
      // de la pièce où l'on se trouve. Quand on sait où l'on a laissé la
      // voiture, on ne le redemande pas au monde.
      auto.pos.set(v.x, v.y, v.z);
      auto.yaw = v.yaw || 0;
      auto.mesh.position.copy(auto.pos);
      auto.mesh.rotation.y = auto.yaw + Math.PI;
    }
  }

  // ---- riding & pet update --------------------------------------------------
  // L'ALLURE D'UNE MONTURE (v260) : une voiture roule à l'allure de la CLASSE
  // de son modèle (`allureDe`, vehicules.js — citadine, berline, SUV, GT,
  // sportive, hypercar) ; toute autre bête garde l'allure de sa fiche.
  function allureMonture(a) {
    const flotte = a.mesh && a.mesh.userData ? a.mesh.userData.flotte : null;
    if (a.def.key === 'voiture' && flotte) return allureDe(flotte, a.def.allure || 3.4);
    return a.def.allure || 2;
  }
  function updateRide(dt) {
    if (!riding) return;
    if (riding.dying > 0 || !animalManager.animals.includes(riding)) {
      // La monture a disparu sous l'enfant : on descend POUR DE BON, avec tout
      // ce que descendre rend — la marche, le vol, et la carrure de piéton.
      // Sans cela il gardait à pied la boîte d'une voiture (v245).
      const quitte = riding;
      riding = null; quitte.montee = false;
      player.boost = undefined; player.pilote = null;
      player.vitesseAvion = undefined; player.avionEnVol = false; player.roulisAvion = 0;
      player.avionEtat = undefined; player.assietteAvion = 0; player.trainSorti = 1;
      player.gaz = null; player.vitesseVoiture = 0; player.trainVoulu = undefined; player.ventre = false;
      player.interdireVol(false);
      if (player.prendreGabarit) player.prendreGabarit(0);
      return;
    }
    player.boost = allureMonture(riding);
    // PILOTER : la fiche de l'espèce décide, jamais ce fichier. `player.js`
    // remplace alors la marche par la physique de vol — poussée, roulis,
    // assiette — et l'avion reste collé au joueur comme toute monture. C'est
    // ce qui fait que le réseau, la caméra de poursuite et la boîte de
    // collision marchent sans une ligne de plus.
    player.pilote = riding.def.pilote || null;
    if (player.pilote) player.flying = true;
    // ON MONTE À BORD AU SOL, MOTEURS COUPÉS. C'est le bouton ✈️ qui décolle
    // — sinon l'appareil s'arracherait sous les pieds de l'enfant à l'instant
    // où il s'assied, et « monter dedans » deviendrait « tomber du ciel ».
    if (player.pilote && player.avionEnVol === undefined) player.avionEnVol = false;
    const a = riding;
    // La bête pose ses pattes là où l'enfant a les pieds, et c'est le regard
    // qu'on élève à la hauteur de son dos. C'est l'inverse de ce qu'on faisait :
    // avant, on enfonçait la monture dans le sol pour aligner son dos sur nos
    // pieds — passable sur un cheval, absurde sur un éléphant, qu'on aurait vu
    // enterré jusqu'aux oreilles.
    a.pos.set(player.pos.x, player.pos.y, player.pos.z);
    a.vel.set(0, 0, 0);
    a.yaw = player.yaw + Math.PI;
    a.state = 'idle'; a.stateTime = 5; a.cryTimer = 99;
    a.mesh.position.copy(a.pos);
    a.mesh.rotation.y = a.yaw + Math.PI;
    // L'INCLINAISON SE COMPOSE AVANT LE CAP, sinon l'appareil bascule autour
    // de l'axe du MONDE et non du sien : en virage serré on le verrait pencher
    // de travers. L'ordre 'YXZ' applique le roulis (z) en premier, dans le
    // repère du modèle, puis le cap.
    if (player.pilote) {
      a.mesh.rotation.order = 'YXZ';
      a.mesh.rotation.z = player.roulisAvion || 0;
      // L'ASSIETTE (v261) : le nez qui se lève à la rotation, qui pique un
      // peu en finale, qui suit le manche en vol. Rotation autour de l'axe x
      // du modèle, APRÈS le roulis et AVANT le cap (l'ordre YXZ) — un angle
      // positif lève le nez, qui regarde en −z ; le signe est mesuré par un
      // témoin sur la position rendue du nez, pas déduit.
      const assiette = player.assietteAvion || 0;
      a.mesh.rotation.x = assiette;
      // ET L'APPAREIL PIVOTE SUR SON TRAIN PRINCIPAL, pas sur son origine :
      // l'origine est au sol sous le milieu du fuselage, et un nez qui se
      // lèverait autour d'elle enfoncerait la queue dans la piste. On
      // déplace le maillage pour que les roues arrière restent où elles sont.
      const zg = a.mesh.userData.trainPrincipal || 0;
      if (assiette && zg) {
        const dy = zg * Math.sin(assiette), dz = zg * (1 - Math.cos(assiette));
        const ry = a.mesh.rotation.y;
        a.mesh.position.x += Math.sin(ry) * dz;
        a.mesh.position.z += Math.cos(ry) * dz;
        a.mesh.position.y += dy;
      }
      // LE TRAIN rentre et sort : chaque jambe se replie vers la queue
      // autour de son pivot sur le ventre, et disparaît une fois rentrée.
      const train = a.mesh.userData.train;
      if (train) {
        const sorti = player.trainSorti === undefined ? 1 : player.trainSorti;
        for (const t of train) {
          t.rotation.x = -(Math.PI / 2) * (1 - sorti);
          t.visible = sorti > 0.03;
        }
      }
      // LES FLAMMES DES RÉACTEURS (v264) suivent la MANETTE : ce que
      // l'enfant demande, pas ce que l'appareil fait. Manette non touchée,
      // c'est le trajet assisté qui la tient (✈️ : pleins gaz au décollage,
      // l'approche en finale, ralenti au freinage), sinon la vitesse
      // rapportée à la pointe. À l'arrêt, moteurs coupés, rien ne sort. La
      // longueur va d'un rayon et demi à dix rayons de tuyère, et vacille.
      const tuyeres = a.mesh.userData.tuyeres;
      if (tuyeres && tuyeres.length) {
        const v = player.vitesseAvion || 0, p = player.pilote, max = p.max || 1, etat = player.avionEtat;
        const assistee = etat === 'decollage' ? 1
          : etat === 'atterrissage' ? Math.min(1, (p.approche || max) / max)
          : etat === 'freinage' ? 0 : Math.min(1, v / max);
        const poussee = player.gaz != null ? player.gaz : assistee;
        const allumee = poussee > 0.02 || v > 0.5;
        const vacille = 0.92 + 0.08 * Math.sin(a.animTime * 41);
        for (const f of tuyeres) {
          f.visible = allumee;
          f.scale.z = allumee ? Math.max(0.05, (1.5 + 8.5 * poussee) * f.userData.rayon * vacille) : 0.001;
        }
      }
    } else if (a.mesh.rotation.z || a.mesh.rotation.x) {
      a.mesh.rotation.z = 0;      // on rend l'assiette en descendant
      a.mesh.rotation.x = 0;
      for (const f of a.mesh.userData.tuyeres || []) f.visible = false;
    }
    const moving = Math.abs(player.vel.x) + Math.abs(player.vel.z) > 0.5;
    a.animTime += dt;
    const swing = moving ? Math.sin(a.animTime * 10) * 0.6 : 0;
    a.mesh.userData.legs.forEach((leg, i) => { leg.rotation.x = i % 2 ? -swing : swing; });
    // Trois façons d'être porté : dos de bête (`assise`, relative), habitacle
    // simple (`oeil`, hauteur absolue), ou VUE DE POURSUITE (`poursuite`,
    // verdict de Max après deux essais de vue intérieure : « une vue un peu
    // comme GTA, où on voit la voiture par derrière »). La caméra se place
    // derrière et au-dessus du véhicule, dans son repère — la monture tourne
    // avec le regard, donc « derrière » suit le cap — et le cockpit détaillé
    // reste visible à travers les vitres. Si un mur se glisse entre la
    // voiture et la caméra, elle avance devant lui plutôt que d'entrer
    // dans la roche.
    if (a.def.poursuite) {
      const c = a.def.poursuite, cy = Math.cos(player.yaw), sy = Math.sin(player.yaw);
      // La ligne de caméra part du TOIT du véhicule et monte vers l'arrière :
      // échantillonnée trop bas, une simple bordure de trottoir la faisait
      // plonger dans l'aileron. Et jamais plus près que la carrosserie
      // elle-même (3,2) : en deçà, on regarde l'intérieur du moteur.
      const TOIT = 1.4, PLANCHER_RECUL = 3.2;
      const hauteurA = (d) => TOIT + (c.hauteur - TOIT) * (d / c.recul);
      let recul = c.recul;
      for (let d = PLANCHER_RECUL; d <= c.recul; d += 0.6) {
        const bx = player.pos.x + sy * d, bz = player.pos.z + cy * d;
        if (player.world.isSolid(Math.floor(bx),
          Math.floor(player.pos.y + hauteurA(d)), Math.floor(bz))) {
          recul = Math.max(PLANCHER_RECUL, d - 0.6);
          break;
        }
      }
      player.camera.position.set(
        player.pos.x + sy * recul,
        player.pos.y + hauteurA(recul),
        player.pos.z + cy * recul,
      );
    } else if (a.def.oeil != null) player.camera.position.y = player.pos.y + a.def.oeil;
    else player.camera.position.y += a.def.assise || a.def.height * 0.6;
  }

  function updatePet(dt) {
    if (!petMesh) return;
    petBob += dt;
    const behind = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw)).multiplyScalar(1.6);
    const target = new THREE.Vector3(player.pos.x + behind.x + 0.7, player.pos.y + 0.15 + Math.sin(petBob * 3) * 0.12, player.pos.z + behind.z);
    petMesh.position.lerp(target, Math.min(1, dt * 3));
    petMesh.rotation.y = player.yaw;
  }

  // ---- targeted-animal buttons ---------------------------------------------
  let targetTimer = 0;
  // `null` et non chaîne vide : le premier passage doit POSER l'état du bouton
  // — c'est-à-dire le cacher — et non se croire déjà à jour.
  let dernierBord = null;

  // Écrire dans la page à chaque image coûterait plus cher que le calcul
  // lui-même : on ne touche au bouton que quand son état change.
  function majBoutonBord(v) {
    const etat = bord ? `d:${bord.nom}` : v ? `m:${v.emoji}` : '';
    if (etat === dernierBord) return;
    dernierBord = etat;
    const boardB = document.getElementById('board-btn');
    boardB.textContent = bord ? `⬇️ Descendre du ${bord.nom}`
      : v && v.nom === 'voiture' ? '🚗 Conduire cette voiture'
        : `${v ? v.emoji : '🚇'} Monter à bord`;
    boardB.style.display = bord || v ? 'block' : 'none';
    if (etat && targetRow.style.display === 'none') targetRow.style.display = 'flex';
  }
  function updateTargetButtons(dt) {
    // DEUX RYTHMES, PAS UN.
    //
    // Chercher la bête devant soi coûte cher : on parcourt tout le bestiaire,
    // on projette chaque bête sur le regard. Un quart de seconde suffit
    // largement pour un animal qui broute.
    //
    // Mais une monoplace à quatorze mètres par seconde traverse toute la zone
    // d'embarquement entre deux clignements. Il faut donc la guetter à chaque
    // image — et c'est bon marché : quatorze positions calculées sur un tracé.
    //
    // La première version accélérait TOUT le calcul à trente-trois hertz,
    // bestiaire compris. La carte du jeu, elle, expirait : on avait rendu le
    // jeu lent pour rattraper une voiture rapide.
    const v = (() => {
      if (!isRunning() || riding || bord) return null;
      const vv = getVehicules && getVehicules();
      const p = vv ? vv.placeProche(player.pos, RAYON_BORD) : null;
      return p;
    })();
    // ON APPELLE TOUJOURS, MÊME QUAND IL N'Y A RIEN.
    //
    // La garde `if (v || bord)` économisait un appel et coûtait un bouton
    // menteur : quand la rame s'éloignait, plus personne ne disait au bouton
    // de disparaître, et « 🚇 Monter à bord » restait à l'écran au-dessus du
    // vide. L'enfant appuie, rien ne se passe. Et `majBoutonBord` sort tout
    // seul quand l'état n'a pas changé — la garde n'économisait donc rien.
    majBoutonBord(v);
    targetTimer -= dt;
    if (targetTimer > 0) return;
    targetTimer = 0.25;
    const a = animalManager.targeted();
    const nourrissable = isRunning() && a && a.pos.distanceTo(player.pos) < 6
      && a.def.nourrissable !== false;
    // Monter ne se vise pas comme on vise pour nourrir : on prend la bête
    // montable la plus proche devant soi, même de biais. C'est tout l'écart
    // entre un bouton qu'on découvre et un bouton qu'on ne voit jamais.
    const m = isRunning() && !bord ? animalManager.monture() : null;
    const ami = !riding && !bord && !passager && !m ? vehiculeAmiProche() : null;

    const feedB = document.getElementById('feed-btn');
    const rideB = document.getElementById('ride-btn');

    const montrer = nourrissable || m || v || riding || bord || ami || passager;
    targetRow.style.display = montrer ? 'flex' : 'none';
    if (!montrer) return;

    feedB.style.display = nourrissable && !riding && !bord ? 'block' : 'none';
    // ON NE « MONTE » PAS DANS UN AVION, ON LE PILOTE. Le mot compte : c'est
    // le bouton qui dit à l'enfant ce qui va se passer, et piloter n'est pas
    // se faire porter. La règle vit dans la fiche (`pilote`), comme le reste.
    const verbe = (d) => (d && d.pilote ? 'Piloter' : 'Monter');
    rideB.textContent = passager ? '⬇️ Descendre'
      : riding ? '⬇️ Descendre'
        : ami ? `🚗 Monter avec ${ami.nom}`
          : `${m ? m.def.emoji : '🐴'} ${verbe(m && m.def)}`;
    rideB.style.display = riding || m || ami || passager ? 'block' : 'none';
    // Le bouton « à bord » a son propre rythme : on le laisse faire, sinon les
    // deux se contrediraient quatre fois par seconde.
    dernierBord = '';
    majBoutonBord(v);
  }

  // ---- hooks & lifecycle ----------------------------------------------------
  let lastCtxKey = null;

  function update(dt) {
    updateEmotes(dt);
    if (isRunning()) veillerLesGarages(dt);
    if (!isRunning()) {
      // paused (or back at a menu without a full leaveToMainMenu): the
      // floating buttons must not float on top of the menu underneath
      for (const b of [souvenirsBtn, photoBtn]) b.style.display = 'none';
      emoteToggle.style.display = 'none';
      emoteRow.style.display = 'none';
      targetRow.style.display = 'none';
      return;
    }
    const ctxKey = getPosCtx();
    if (ctxKey !== lastCtxKey) {
      lastCtxKey = ctxKey;
      loadSigns(ctxKey);
    }
    updateRide(dt);
    updateBord();
    updatePassager();
    updatePet(dt);
    updateTargetButtons(dt);
    updateTreasure(dt);
    updatePark(dt);
    updateMuseum();
    mathTimer -= dt;
    if (mathTimer <= 0) {
      mathTimer = 200 + Math.random() * 120;
      if (Math.random() < 0.55) showMathPop();
    }
    // buttons only make sense in-game
    for (const b of [souvenirsBtn, photoBtn]) b.style.display = 'flex';
    const net = getNet();
    const amisLa = net && net.active && net.playerCount() > 1;
    emoteToggle.style.display = amisLa ? 'flex' : 'none';
    if (!amisLa && emotesDepliees) { emotesDepliees = false; }
    emoteRow.style.display = amisLa && emotesDepliees ? 'flex' : 'none';
  }

  function onLeave() {
    for (const b of [souvenirsBtn, photoBtn]) b.style.display = 'none';
    emoteToggle.style.display = 'none';
    emotesDepliees = false;
    emoteRow.style.display = 'none';
    targetRow.style.display = 'none';
    panel.style.display = 'none';
    if (riding) { riding = null; player.boost = undefined; }
    debarquer(true);
  }

  function attachNet(net) {
    net.onDuel = onDuelMsg;
    net.onEmote = (peerId, k) => showRemoteEmote(peerId, k);
    net.onSign = (s) => addSign(s); // un panneau reçu s'affiche et se garde, jamais ne se renvoie
  }

  return {
    update,
    onLeave,
    attachNet,
    // La monture que l'enfant est en train de conduire (ou null) : main.js
    // y assied son avatar quand la fiche déclare un `siege` (v249).
    montureConduite: () => riding,
    // Chez qui l'enfant est passager (ou null) : la position réseau
    // l'emporte, et main.js l'assied sur le siège de la voiture de l'ami.
    passagerDe: () => passager,
    monterAvec, vehiculeAmiProche,
    // La bibliothèque de bâtiments vit désormais dans l'inventaire (le +),
    // mais la POSE — devant soi, sol cherché sous chaque colonne, un seul
    // lot réseau — reste ici : c'est fun qui connaît le monde et le réseau.
    poserBati,
    poserMonument,
    decoratePlayersPanel,
    onBlockPlaced() {
      records.blocks++;
      saveRecords();
    },
    onCatch() {
      if (petMesh) { // the companion celebrates with you
        petMesh.rotation.y += Math.PI * 2;
      }
    },
  };
}
