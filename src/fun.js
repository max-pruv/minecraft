// Fun & social systems: item bag, breeding, riding, companions, duels,
// crafting, shared chest, text signs, fireworks, emotes, photos, daily
// treasure, park mini-games, quests, records & hats, museum statues and
// little math challenges. Everything persists per profile via the storage
// shim; world-scoped data (signs, chest) is keyed by the world code.

import * as THREE from 'three';
import { buildCreatureMesh, TYPES } from './creatures.js';
import { PLACES, PARK, WATER_LEVEL } from './world.js';
import { monumentBati } from './monuments.js';

const BAG_KEY = 'web-minecraft-bag-v1';
const RECORDS_KEY = 'web-minecraft-records-v1';
const PHOTOS_KEY = 'web-minecraft-photos-v1';
const PET_KEY = 'web-minecraft-pet-v1';
const QUEST_KEY = 'web-minecraft-quest-v1';

const HATS = [
  { emoji: '🧢', name: 'Casquette', need: 10 },
  { emoji: '👑', name: 'Couronne', need: 25 },
  { emoji: '🎩', name: 'Chapeau magique', need: 50 },
];

const QUEST_ITEMS = ['🍓 Baies', '🌰 Noisette', '🥚 Œuf', '🍗 Poulet', '🦀 Pince de crabe'];

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
    isNight, getWeather, getPosCtx, getProfiles, getVehicules, photos: photosNuage } = ctx;

  // ---- persistent state -----------------------------------------------------
  const bag = loadJson(BAG_KEY, {});
  const records = { blocks: 0, quizCorrect: 0, treasures: 0, quests: 0, duels: 0,
    fireworks: 0, mathWins: 0, parkour: 0, bestRace: 0, feasts: 0, hats: [], hat: '', ...loadJson(RECORDS_KEY, {}) };
  const saveRecords = () => saveJson(RECORDS_KEY, records);
  const bagAdd = (label, n = 1) => { bag[label] = (bag[label] || 0) + n; saveJson(BAG_KEY, bag); };
  const bagTake = (label, n = 1) => {
    if ((bag[label] || 0) < n) return false;
    bag[label] -= n;
    if (bag[label] <= 0) delete bag[label];
    saveJson(BAG_KEY, bag);
    return true;
  };

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
    .fun-tabs { display:flex; gap:6px; margin-bottom:10px; flex-wrap:wrap; }
    .fun-tab { flex:1; padding:7px 4px; border-radius:10px; border:1px solid rgba(255,255,255,.15);
      background:rgba(255,255,255,.06); color:#cdf; font-size:14px; white-space:nowrap; }
    .fun-tab.on { background:#3a6ad0; color:#fff; }
    .fun-row { display:flex; align-items:center; gap:8px; padding:7px 6px;
      border-bottom:1px solid rgba(255,255,255,.08); }
    .fun-row button { margin-left:auto; padding:6px 12px; border-radius:9px; border:none;
      background:#3a9a4a; color:#fff; font-size:14px; }
    .fun-row button:disabled { background:#3a4152; color:#778; }
    .fun-note { color:#8894b0; font-size:13px; margin:6px 2px; }
    .fun-target { position:fixed; left:50%; transform:translateX(-50%); bottom:96px;
      display:none; gap:8px; z-index:30; }
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
  const atelierBtn = mkBtn('🛠️', 'Atelier');
  const fwBtn = mkBtn('🎆', "Feu d'artifice");
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

  const panel = el(`<div class="fun-panel" id="fun-main-panel">
    <button class="fun-close">✕</button>
    <div class="fun-tabs">
      <button class="fun-tab on" data-t="craft">🛠️ Atelier</button>
      <button class="fun-tab" data-t="chest">📦 Coffre</button>
      <button class="fun-tab" data-t="quest">📜 Quête</button>
      <button class="fun-tab" data-t="sign">🪧 Panneau</button>
      <button class="fun-tab" data-t="chantier">🏗️ Chantier</button>
      <button class="fun-tab" data-t="records">🏆 Records</button>
      <button class="fun-tab" data-t="hats">🎩 Chapeaux</button>
      <button class="fun-tab" data-t="photos">📸 Souvenirs</button>
    </div>
    <div id="fun-tab-body"></div>
  </div>`);

  // Le tableau des scores avait son propre bouton flottant : minuscule et
  // inexploitable en jeu. Records, chapeaux et souvenirs sont désormais des
  // onglets de l'atelier — un bouton de moins à l'écran, rien de perdu.
  const recordsPanel = panel;

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
    if (petMesh) { scene.remove(petMesh); petMesh = null; }
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
    if (!a) return;
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
      riding = null;
      player.boost = juiceTimer > 0 ? 1.45 : undefined;
      toast('🐴 Tu es descendu·e.', 0xd8c9a4);
      return;
    }
    if (!montable(a)) return;
    debarquer();
    riding = a;
    a.state = 'idle';
    const allure = a.def.allure || 2;
    toast(`${a.def.emoji} En selle sur ${a.def.name.toLowerCase()} ! Vitesse ×${allure.toFixed(1).replace('.0', '')}`
      + ' — refais pareil pour descendre.', 0xffe07a);
    emojiBurst([a.def.emoji, '💨'], 8);
  }

  // ---- monter à bord de ce qui roule ---------------------------------------
  // Le métro et les monoplaces tournaient depuis toujours sans qu'on puisse y
  // monter : on les regardait passer. Embarquer, ici, c'est simplement se
  // laisser porter par la place qu'on occupe — le convoi suit son tracé, on
  // suit le convoi.
  let bord = null;

  function debarquer(silencieux = false) {
    if (!bord) return;
    const nom = bord.nom;
    bord = null;
    player.vel.set(0, 0, 0);
    if (!silencieux) toast(`🚶 Tu descends du ${nom}.`, 0xd8c9a4);
  }

  function embarquer() {
    if (bord) { debarquer(); return; }
    const v = getVehicules && getVehicules();
    // Cinq blocs, pas quatre : les voies du métro de Washington sont à quatre
    // blocs de l'axe du quai — une rame à l'arrêt est donc à 4,2 blocs d'un
    // enfant au milieu du quai, et l'ancien rayon la déclarait hors de portée.
    const place = v && v.placeProche(player.pos, 5);
    if (!place) return;
    if (riding) toggleRide(null);
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

  let juiceTimer = 0;

  document.addEventListener('keydown', (e) => {
    if (!isRunning()) return;
    if (e.code === 'KeyN') feed(animalManager.targeted());
    // Une seule touche pour « monter » : sur ce qui vit s'il y a une bête
    // devant soi, à bord sinon. L'enfant n'a pas à savoir laquelle des deux.
    if (e.code === 'KeyM') {
      if (riding) toggleRide(null);
      else if (bord) debarquer();
      else if (animalManager.monture()) toggleRide(animalManager.monture());
      else embarquer();
    }
    if (e.code === 'KeyG') launchFirework();
  });
  document.getElementById('feed-btn').addEventListener('click', () => feed(animalManager.targeted()));
  document.getElementById('ride-btn').addEventListener('click', () => toggleRide(riding ? null : animalManager.monture()));
  document.getElementById('board-btn').addEventListener('click', () => embarquer());

  // ---- fireworks ------------------------------------------------------------
  const fireworks = [];
  function launchFirework(mega = false) {
    if (fireworks.length > 5) return;
    records.fireworks++; saveRecords();
    const bursts = mega ? 3 : 1;
    for (let b = 0; b < bursts; b++) {
      const N = 90;
      const geo = new THREE.BufferGeometry();
      const pts = new Float32Array(N * 3);
      const vels = [];
      for (let i = 0; i < N; i++) {
        const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
        const sp2 = 4 + Math.random() * 5;
        vels.push(new THREE.Vector3(Math.sin(ph) * Math.cos(th) * sp2, Math.cos(ph) * sp2, Math.sin(ph) * Math.sin(th) * sp2));
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
      const colors = [0xff5a5a, 0x5ad0ff, 0xffe05a, 0x8aff5a, 0xd05aff];
      const mesh = new THREE.Points(geo, new THREE.PointsMaterial({
        color: colors[(Math.random() * colors.length) | 0], size: 0.3, transparent: true, opacity: 1,
      }));
      mesh.position.set(player.pos.x + (b - 1) * 5, player.pos.y + 14 + b * 3, player.pos.z + 4);
      scene.add(mesh);
      fireworks.push({ mesh, vels, life: 1.6 });
    }
    emojiBurst(['🎆', '✨'], 8);
  }
  fwBtn.addEventListener('click', () => launchFirework());

  // ---- le chantier commun ----------------------------------------------------
  //
  // Le multijoueur était « côte à côte » : chacun construit dans son coin du
  // même monde. Le chantier donne un but COMMUN : un plan fantôme posé dans le
  // monde, une jauge partagée, et une célébration quand la dernière brique est
  // à sa place — peu importe qui l'a posée.
  //
  // L'avancement n'est jamais synchronisé : il se DÉRIVE du monde. Une cellule
  // est accomplie quand le bloc attendu est à sa place, et le journal de blocs
  // voyage déjà entre les joueurs. Seule la pose du plan (nom + origine)
  // s'échange, par le même chemin que les panneaux et le coffre.
  const B_PLANCHE = 8, B_BUCHE = 5, B_VERRE = 10, B_BRIQUE = 11, B_NEIGE = 12, B_LAINE_ROUGE = 23;

  function planCabane() {
    const c = [];
    for (let x = 0; x <= 4; x++) {
      for (let z = 0; z <= 4; z++) {
        const mur = x === 0 || x === 4 || z === 0 || z === 4;
        for (let y = 0; y <= 2; y++) {
          if (!mur) continue;
          if (z === 4 && (x === 2) && y <= 1) continue;          // la porte
          if (y === 1 && ((x === 0 && z === 2) || (x === 4 && z === 2))) { c.push([x, y, z, B_VERRE]); continue; }
          c.push([x, y, z, B_PLANCHE]);
        }
        c.push([x, 3, z, B_BUCHE]);                              // le toit
      }
    }
    return c;
  }
  function planPhare() {
    const c = [];
    for (let y = 0; y <= 6; y++) {
      for (let x = 0; x <= 2; x++) {
        for (let z = 0; z <= 2; z++) {
          if (x === 1 && z === 1) continue;                      // creux
          c.push([x, y, z, y % 2 === 0 ? B_BRIQUE : B_NEIGE]);   // rayures
        }
      }
    }
    for (let x = 0; x <= 2; x++) for (let z = 0; z <= 2; z++) {
      if (!(x === 1 && z === 1)) c.push([x, 7, z, B_VERRE]);     // la lanterne
      c.push([x, 8, z, B_BUCHE]);                                // le chapeau
    }
    return c;
  }
  function planFusee() {
    const c = [];
    for (let y = 0; y <= 5; y++) {
      for (let x = 0; x <= 2; x++) {
        for (let z = 0; z <= 2; z++) {
          if (x === 1 && z === 1) continue;
          c.push([x, y, z, B_NEIGE]);                            // le fuselage
        }
      }
    }
    for (let x = 0; x <= 2; x++) for (let z = 0; z <= 2; z++) c.push([x, 6, z, B_LAINE_ROUGE]);
    c.push([1, 7, 1, B_LAINE_ROUGE]);                            // la pointe
    for (const [fx, fz] of [[-1, 1], [3, 1], [1, -1], [1, 3]]) {
      c.push([fx, 0, fz, B_BUCHE]);                              // les ailerons
    }
    return c;
  }
  const PLANS_CHANTIER = {
    cabane: { nom: 'Cabane', emoji: '🏡', cellules: planCabane },
    phare: { nom: 'Phare rayé', emoji: '🗼', cellules: planPhare },
    fusee: { nom: 'Fusée', emoji: '🚀', cellules: planFusee },
  };

  let chantier = null;       // { plan, x, y, z, t }
  let chantierFantome = null;   // le groupe de blocs translucides
  let chantierTimer = 0;
  let chantierDernier = -1;  // dernier « faits » annoncé, pour ne parler qu'aux changements
  const chantierKey = () => `web-minecraft-chantier-v1::${getPosCtx() || 'local'}`;
  const chantierHud = document.getElementById('chantier-hud');

  function cellulesDe(ch) {
    const p = PLANS_CHANTIER[ch.plan];
    return p ? p.cellules() : [];
  }
  function avancementChantier() {
    if (!chantier) return null;
    const cellules = cellulesDe(chantier);
    let faits = 0;
    for (const [dx, dy, dz, id] of cellules) {
      if (world.getBlock(chantier.x + dx, chantier.y + dy, chantier.z + dz) === id) faits++;
    }
    return { faits, total: cellules.length };
  }

  const fantomeGeo = new THREE.BoxGeometry(0.86, 0.86, 0.86);
  const fantomeMat = new THREE.MeshBasicMaterial({ color: 0x6ec8ff, transparent: true, opacity: 0.3 });
  function redessinerFantome() {
    if (chantierFantome) { scene.remove(chantierFantome); chantierFantome = null; }
    if (!chantier) return;
    const g = new THREE.Group();
    for (const [dx, dy, dz, id] of cellulesDe(chantier)) {
      if (world.getBlock(chantier.x + dx, chantier.y + dy, chantier.z + dz) === id) continue;
      const m = new THREE.Mesh(fantomeGeo, fantomeMat);
      m.position.set(chantier.x + dx + 0.5, chantier.y + dy + 0.5, chantier.z + dz + 0.5);
      g.add(m);
    }
    scene.add(g);
    chantierFantome = g;
  }

  function adopterChantier(c, { save = true, annonce = false } = {}) {
    if (c && chantier && c.t <= chantier.t) return;   // le plus récent fait foi
    chantier = c || null;
    chantierDernier = -1;
    if (save) saveJson(chantierKey(), chantier);
    redessinerFantome();
    majChantierHud();
    if (annonce && chantier) {
      const p = PLANS_CHANTIER[chantier.plan];
      toast(`🏗️ Chantier ouvert : ${p.emoji} ${p.nom} — construisez-le ensemble !`, 0x6ec8ff);
    }
  }

  function majChantierHud() {
    if (!chantierHud) return;
    const a = avancementChantier();
    if (!a) { chantierHud.style.display = 'none'; return; }
    const p = PLANS_CHANTIER[chantier.plan];
    chantierHud.style.display = 'block';
    chantierHud.textContent = `${p.emoji} ${a.faits}/${a.total}`;
  }

  function poserChantier(nomPlan) {
    if (!PLANS_CHANTIER[nomPlan]) return null;
    // Quatre blocs devant le joueur, au niveau du sol : on voit ce qu'on pose.
    const dx = -Math.sin(player.yaw), dz = -Math.cos(player.yaw);
    const x = Math.round(player.pos.x + dx * 5) - 2;
    const z = Math.round(player.pos.z + dz * 5) - 2;
    const y = world.terrainHeight(x + 1, z + 1) + 1;
    const c = { plan: nomPlan, x, y, z, t: Date.now() };
    adopterChantier(c, { annonce: true });
    const net = getNet();
    if (net && net.active) net.broadcast({ t: 'chantier', c });
    return c;
  }
  function retirerChantier() {
    adopterChantier(null);
    saveJson(chantierKey(), null);
    const net = getNet();
    if (net && net.active) net.broadcast({ t: 'chantier', c: null });
  }

  function suivreChantier(dt) {
    if (!chantier) return;
    chantierTimer -= dt;
    if (chantierTimer > 0) return;
    chantierTimer = 1;
    const a = avancementChantier();
    if (a.faits !== chantierDernier) {
      chantierDernier = a.faits;
      redessinerFantome();
      majChantierHud();
      if (a.faits >= a.total && a.total > 0) {
        // Fini ! La célébration part chez tout le monde : chacun constate la
        // même chose dans son propre monde, personne n'a de message à croire.
        records.chantiers = (records.chantiers || 0) + 1;
        saveRecords();
        launchFirework(true);
        toast('🏗️✨ CHANTIER TERMINÉ ! Bravo les bâtisseurs !', 0xffe05a);
        emojiBurst(['🏗️', '🎉', '⭐'], 18);
        chantier = null;
        saveJson(chantierKey(), null);
        redessinerFantome();
        majChantierHud();
      }
    }
  }
  // au chargement : le chantier du monde où l'on est
  adopterChantier(loadJson(chantierKey(), null), { save: false });

  // Les tests suivent le parcours entier : poser, voir, compter, célébrer.
  if (typeof window !== 'undefined') {
    window.__chantier = {
      poser: poserChantier,
      retirer: retirerChantier,
      etat: () => (chantier ? { ...chantier, ...avancementChantier() } : null),
      chantiers: () => records.chantiers || 0,
      hud: () => (chantierHud && chantierHud.style.display !== 'none' ? chantierHud.textContent : ''),
      // Le bloc attendu à une cellule relative, ou null : le banc s'en sert
      // pour bâtir par le vrai chemin de pose, sans copie du plan dans le test.
      attendu: (dx, dy, dz) => {
        if (!chantier) return null;
        for (const [x, y, z, id] of cellulesDe(chantier)) {
          if (x === dx && y === dy && z === dz) return id;
        }
        return null;
      },
    };
  }

  function updateFireworks(dt) {
    for (const f of [...fireworks]) {
      f.life -= dt;
      if (f.life <= 0) {
        scene.remove(f.mesh);
        fireworks.splice(fireworks.indexOf(f), 1);
        continue;
      }
      const pos = f.mesh.geometry.attributes.position;
      for (let i = 0; i < f.vels.length; i++) {
        f.vels[i].y -= 3.5 * dt;
        pos.setXYZ(i, pos.getX(i) + f.vels[i].x * dt, pos.getY(i) + f.vels[i].y * dt, pos.getZ(i) + f.vels[i].z * dt);
      }
      pos.needsUpdate = true;
      f.mesh.material.opacity = Math.min(1, f.life / 0.8);
    }
  }

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

  function addSign(s, { save = true, send = false, broadcast = false } = {}) {
    if (!s || signs.some((o) => o.x === s.x && o.y === s.y && o.z === s.z)) return;
    signs.push(s);
    renderSign(s);
    if (save) saveJson(signsKey(), signs);
    if (send) cloud.signSend(s).catch?.(() => {}); // only the author uploads
    if (broadcast) {
      const net = getNet();
      if (net && net.active) net.broadcast({ t: 'sign', sign: s });
    }
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

  function plantSign() {
    const text = (window.prompt('Ton message sur le panneau :') || '').trim().slice(0, 40);
    if (!text) return;
    const dirX = -Math.sin(player.yaw), dirZ = -Math.cos(player.yaw);
    const x = Math.floor(player.pos.x + dirX * 2), z = Math.floor(player.pos.z + dirZ * 2);
    let y = Math.floor(player.pos.y);
    while (y > 1 && !world.isSolid(x, y - 1, z)) y--;
    addSign({ x, y, z, text, author: myName(), yaw: player.yaw + Math.PI }, { save: true, send: true, broadcast: true });
    toast('🪧 Panneau planté !', 0xd8c9a4);
    panel.style.display = 'none';
  }

  // ---- shared chest ---------------------------------------------------------
  // the chest is shared by every profile on the device: raw (unsuffixed) storage
  const raw = window.__rawStorage || { get: (k) => localStorage.getItem(k), set: (k, v) => localStorage.setItem(k, v) };
  const chestKey = () => `web-minecraft-chest-v1::${signsCtx || 'local'}`;
  const loadChest = () => { try { return JSON.parse(raw.get(chestKey())) || {}; } catch { return {}; } };
  const saveChest = (c) => { try { raw.set(chestKey(), JSON.stringify(c)); } catch { /* ignore */ } };

  function chestChanged(items) { // remote update
    saveChest(items);
    if (panel.style.display === 'block' && currentTab === 'chest') renderTab();
  }

  function broadcastChest(c) {
    const net = getNet();
    if (net && net.active) net.broadcast({ t: 'chest', items: c });
  }

  // ---- crafting -------------------------------------------------------------
  const RECIPES = [
    { name: '🎂 Festin de fête', needMeat: 3, gives: null,
      effect: () => { records.feasts++; saveRecords(); emojiBurst(['🎂', '🎉', '🥳'], 26); toast('🎂 Festin ! Tout le monde fait la fête !', 0xffd75e); } },
    { name: '🧃 Jus de baies (vitesse ×1,5 pendant 40 s)', need: { '🍓 Baies': 2 }, gives: null,
      effect: () => { juiceTimer = 40; if (!riding) player.boost = 1.45; toast('🧃 Slurp ! Tu cours plus vite !', 0xff9dbb); } },
    { name: '🍪 Cookie géant', need: { '🌰 Noisette': 1, '🥚 Œuf': 1 }, gives: '🍪 Cookie géant',
      effect: () => emojiBurst(['🍪'], 10) },
    { name: '🎆 Fusée de feu d\'artifice (triple !)', need: { '🦀 Pince de crabe': 2 }, gives: '🎆 Fusée',
      effect: () => toast('🎆 Fusée prête ! Elle partira toute seule… BOOM !', 0xffe07a) },
  ];

  // ---- quests ---------------------------------------------------------------
  const today = () => new Date().toISOString().slice(0, 10);
  let quest = loadJson(QUEST_KEY, null);

  function ensureQuest() {
    if (quest && quest.date === today()) return quest;
    const h = hashStr(today() + myName());
    const kind = ['collect', 'catch', 'visit', 'build'][h % 4];
    quest = { date: today(), kind, done: false, progress: 0 };
    if (kind === 'collect') {
      quest.item = QUEST_ITEMS[h % QUEST_ITEMS.length];
      quest.n = 2 + (h % 3);
      quest.text = `Rapporte ${quest.n} × ${quest.item} (chasse les animaux !)`;
    } else if (kind === 'catch') {
      const types = Object.keys(TYPES).filter((t) => t !== 'FELIN');
      quest.type = types[h % types.length];
      quest.text = `Attrape 1 créature de type ${quest.type} avec une balle !`;
    } else if (kind === 'visit') {
      const p = PLACES[h % PLACES.length];
      quest.place = p.name;
      quest.text = `Va visiter : ${p.name} (regarde la carte !)`;
    } else {
      quest.n = 15;
      quest.text = `Pose ${quest.n} blocs pour construire quelque chose !`;
    }
    saveJson(QUEST_KEY, quest);
    return quest;
  }

  function questReward() {
    quest.done = true;
    saveJson(QUEST_KEY, quest);
    records.quests++; saveRecords();
    bagAdd('🎆 Fusée', 2);
    toast('📜 Quête accomplie ! +2 🎆 Fusées dans ton sac !', 0x6ee06e);
    emojiBurst(['📜', '🎉', '⭐'], 22);
  }

  function questCheck() {
    ensureQuest();
    if (quest.done) return false;
    if (quest.kind === 'collect') {
      if ((bag[quest.item] || 0) >= quest.n) { bagTake(quest.item, quest.n); questReward(); return true; }
    } else if (quest.kind === 'build') {
      if (quest.progress >= quest.n) { questReward(); return true; }
    } else if (quest.kind === 'visit') {
      const p = PLACES.find((o) => o.name === quest.place);
      if (p && Math.hypot(player.pos.x - p.x, player.pos.z - p.z) < (p.r || 25)) { questReward(); return true; }
    } else if (quest.kind === 'catch' && quest.progress > 0) { questReward(); return true; }
    return false;
  }

  // ---- atelier panel rendering ----------------------------------------------
  // Sept onglets, un seul corps : les trois derniers (records, chapeaux,
  // souvenirs) viennent du panneau séparé qu'on a supprimé.
  const REC_TABS = ['records', 'hats', 'photos'];
  let currentTab = 'craft';
  const tabBody = panel.querySelector('#fun-tab-body');
  panel.querySelectorAll('.fun-tab').forEach((t) => {
    t.addEventListener('click', () => {
      currentTab = t.dataset.t;
      panel.querySelectorAll('.fun-tab').forEach((o) => o.classList.toggle('on', o === t));
      if (REC_TABS.includes(currentTab)) { recTab = currentTab; renderRecords(); }
      else renderTab();
    });
  });

  function bagSummary(target) {
    const entries = Object.entries(bag);
    return entries.length
      ? entries.map(([k, v]) => `${k} ×${v}`).join(' · ')
      : 'Ton sac est vide — chasse des animaux pour trouver des trésors !';
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

    const t = Date.now();
    const lot = [];
    // On coupe le crieur le temps de bâtir : sinon chaque bloc partirait seul.
    const crieur = world.onOp;
    world.onOp = null;
    try {
      for (const [bx, by, bz, bid] of m.blocs) {
        const x = cx + bx - Math.round((m.emprise.minX + m.emprise.maxX) / 2);
        const y = sol + 1 + (by - m.emprise.minY);
        const z = cz + bz - Math.round((m.emprise.minZ + m.emprise.maxZ) / 2);
        world.setBlock(x, y, z, bid, t);
        lot.push([`${x},${y},${z}`, bid, t]);
      }
    } finally { world.onOp = crieur; }
    world.saveEdits();

    const net = getNet && getNet();
    if (net && net.active && net.sendLot) net.sendLot(lot);
    records.blocks += lot.length;
    saveRecords();
    toast(`${m.emoji} ${m.nom} — ${lot.length.toLocaleString('fr')} blocs posés !`, 0xffd166);
    panel.style.display = 'none';
  }

  function renderTab() {
    if (currentTab === 'craft') {
      let html = `<h3>🛠️ Atelier</h3><div class="fun-note">Sac : ${bagSummary()}</div>
        <div class="fun-note">🍖 Garde-manger : ${ctx.getMeat()} viandes</div>`;
      tabBody.innerHTML = html;
      RECIPES.forEach((r, i) => {
        const row = document.createElement('div');
        row.className = 'fun-row';
        const needTxt = r.needMeat ? `${r.needMeat} viandes` :
          Object.entries(r.need).map(([k, v]) => `${v} × ${k}`).join(' + ');
        row.innerHTML = `<span>${r.name}<br><small style="color:#8894b0">${needTxt}</small></span>`;
        const b = document.createElement('button');
        b.textContent = 'Fabriquer';
        const can = r.needMeat ? ctx.getMeat() >= r.needMeat :
          Object.entries(r.need).every(([k, v]) => (bag[k] || 0) >= v);
        b.disabled = !can;
        b.addEventListener('click', () => {
          if (r.needMeat) { if (!ctx.takeMeat(r.needMeat)) return; }
          else for (const [k, v] of Object.entries(r.need)) bagTake(k, v);
          if (r.gives) bagAdd(r.gives);
          if (r.gives === '🎆 Fusée') { bagTake('🎆 Fusée'); launchFirework(true); }
          r.effect?.();
          renderTab();
        });
        row.appendChild(b);
        tabBody.appendChild(row);
      });
    } else if (currentTab === 'chest') {
      const chest = loadChest();
      tabBody.innerHTML = `<h3>📦 Coffre commun du monde</h3>
        <div class="fun-note">Dépose des objets pour les partager — tout le monde peut les reprendre.</div>
        <div class="fun-note">Ton sac : ${bagSummary()}</div><h3 style="margin-top:10px">Dans le coffre :</h3>`;
      const entries = Object.entries(chest);
      if (!entries.length) tabBody.insertAdjacentHTML('beforeend', '<div class="fun-note">Le coffre est vide.</div>');
      for (const [k, v] of entries) {
        const row = document.createElement('div');
        row.className = 'fun-row';
        row.innerHTML = `<span>${k} ×${v}</span>`;
        const b = document.createElement('button');
        b.textContent = 'Prendre';
        b.addEventListener('click', () => {
          const c2 = loadChest();
          if ((c2[k] || 0) <= 0) return;
          c2[k]--; if (c2[k] <= 0) delete c2[k];
          saveChest(c2); bagAdd(k); broadcastChest(c2); renderTab();
        });
        row.appendChild(b);
        tabBody.appendChild(row);
      }
      tabBody.insertAdjacentHTML('beforeend', '<h3 style="margin-top:10px">Déposer :</h3>');
      for (const [k, v] of Object.entries(bag)) {
        const row = document.createElement('div');
        row.className = 'fun-row';
        row.innerHTML = `<span>${k} ×${v}</span>`;
        const b = document.createElement('button');
        b.textContent = 'Déposer';
        b.addEventListener('click', () => {
          if (!bagTake(k)) return;
          const c2 = loadChest();
          c2[k] = (c2[k] || 0) + 1;
          saveChest(c2); broadcastChest(c2); renderTab();
        });
        row.appendChild(b);
        tabBody.appendChild(row);
      }
    } else if (currentTab === 'quest') {
      ensureQuest();
      tabBody.innerHTML = `<h3>📜 Quête du jour</h3>
        <div class="fun-row"><span>${quest.done ? '✅ ' : ''}${quest.text}</span></div>
        <div class="fun-note">${quest.done ? 'Bravo, reviens demain pour une nouvelle quête !' : 'Récompense : 2 🎆 Fusées'}</div>`;
      if (!quest.done) {
        const b = document.createElement('button');
        b.className = 'fun-tab';
        b.textContent = 'Vérifier ma quête';
        b.addEventListener('click', () => { if (!questCheck()) toast('Pas encore… continue !', 0xcccccc); renderTab(); });
        tabBody.appendChild(b);
      }
    } else if (currentTab === 'sign') {
      tabBody.innerHTML = `<h3>🪧 Panneaux</h3>
        <div class="fun-note">Écris un message sur un panneau planté devant toi — les autres joueurs le verront aussi !</div>`;
      const b = document.createElement('button');
      b.className = 'fun-tab';
      b.textContent = '🪧 Planter un panneau ici';
      b.addEventListener('click', plantSign);
      tabBody.appendChild(b);
    } else if (currentTab === 'chantier') {
      const a = avancementChantier();
      tabBody.innerHTML = `<h3>🏗️ Chantier commun</h3>
        <div class="fun-note">Pose un plan fantôme devant toi, et construisez-le ensemble :
        chaque bloc posé au bon endroit — par n'importe qui — fait avancer la jauge !</div>`;
      if (chantier) {
        const p2 = PLANS_CHANTIER[chantier.plan];
        const enCours = document.createElement('div');
        enCours.className = 'fun-note';
        enCours.textContent = `${p2.emoji} ${p2.nom} en cours : ${a.faits}/${a.total} blocs posés.`;
        tabBody.appendChild(enCours);
        // Où est-il ? Une jauge à 0/71 ne sert à rien si on ne trouve pas le
        // fantôme bleu. Distance et direction, comme pour un ami.
        const du2 = chantier.x + 2 - player.pos.x, dv2 = chantier.z + 2 - player.pos.z;
        const dist = Math.round(Math.hypot(du2, dv2));
        const FLECHES = ['↑ nord', '↗ nord-est', '→ est', '↘ sud-est', '↓ sud', '↙ sud-ouest', '← ouest', '↖ nord-ouest'];
        const oct = ((Math.round(Math.atan2(du2, -dv2) / (Math.PI / 4)) % 8) + 8) % 8;
        const où = document.createElement('div');
        où.className = 'fun-note';
        où.textContent = dist <= 6
          ? '📍 Tu es dessus : les blocs bleus translucides montrent ce qui manque.'
          : `📍 À ${dist} blocs, direction ${FLECHES[oct]}. Cherche les blocs bleus translucides.`;
        tabBody.appendChild(où);
        const arreter = document.createElement('button');
        arreter.className = 'fun-tab';
        arreter.textContent = '🗑️ Abandonner ce chantier';
        arreter.addEventListener('click', () => { retirerChantier(); renderTab(); });
        tabBody.appendChild(arreter);
      } else {
        for (const [cle, p2] of Object.entries(PLANS_CHANTIER)) {
          const b2 = document.createElement('button');
          b2.className = 'fun-tab';
          b2.textContent = `${p2.emoji} Poser : ${p2.nom} (${p2.cellules().length} blocs)`;
          b2.addEventListener('click', () => { poserChantier(cle); panel.style.display = 'none'; });
          tabBody.appendChild(b2);
        }
      }
    }
  }

  atelierBtn.addEventListener('click', () => {
    if (panel.style.display === 'block') { panel.style.display = 'none'; return; }
    panel.style.display = 'block';
    renderTab();
  });

  // Ouvrir l'atelier directement sur un onglet : c'est ce que font les
  // pastilles de l'écran (le garde-manger, la jauge du chantier). Max :
  // « quand on clique, il ne se passe rien » — maintenant, il se passe ça.
  function ouvrirOnglet(t) {
    currentTab = t;
    panel.querySelectorAll('.fun-tab').forEach((o) => o.classList.toggle('on', o.dataset.t === t));
    panel.style.display = 'block';
    if (REC_TABS.includes(t)) { recTab = t; renderRecords(); } else renderTab();
  }
  if (chantierHud) chantierHud.addEventListener('click', () => ouvrirOnglet('chantier'));

  // ---- records, hats & photos ----------------------------------------------
  let recTab = 'records';
  const recBody = tabBody;

  const REC_LABELS = [
    ['blocks', '🧱 Blocs posés'], ['quizCorrect', '✅ Bonnes réponses'], ['treasures', '💰 Trésors trouvés'],
    ['quests', '📜 Quêtes finies'], ['duels', '⚔️ Duels gagnés'], ['fireworks', '🎆 Feux lancés'],
    ['mathWins', '🧮 Défis maths'], ['parkour', '🤸 Parkours réussis'], ['bestRace', '🏁 Meilleure course (s)'],
  ];

  function profileRecords(id) {
    const suffix = id === 1 ? '' : `::p${id}`;
    try { return JSON.parse(raw.get(RECORDS_KEY + suffix)) || {}; } catch { return {}; }
  }

  function renderRecords() {
    if (recTab === 'records') {
      const profiles = getProfiles();
      let html = `<h3>🏆 Tableau des records</h3><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td></td>${profiles.map((p) => `<th style="padding:4px">${p.name}</th>`).join('')}</tr>`;
      for (const [key, label] of REC_LABELS) {
        html += `<tr><td style="padding:4px;color:#aab">${label}</td>` + profiles.map((p) => {
          const r = profileRecords(p.id);
          let v = r[key] || 0;
          if (key === 'bestRace') v = v ? v.toFixed(1) : '—';
          return `<td style="text-align:center">${v}</td>`;
        }).join('') + '</tr>';
      }
      recBody.innerHTML = html + '</table></div>';
    } else if (recTab === 'hats') {
      recBody.innerHTML = `<h3>🎩 Chapeaux</h3>
        <div class="fun-note">Gagne des chapeaux en répondant juste aux quiz ! (${records.quizCorrect} bonnes réponses)</div>`;
      for (const h of HATS) {
        const unlocked = records.hats.includes(h.emoji);
        const row = document.createElement('div');
        row.className = 'fun-row';
        row.innerHTML = `<span>${unlocked ? h.emoji : '🔒'} ${h.name}<br><small style="color:#8894b0">${h.need} bonnes réponses</small></span>`;
        const b = document.createElement('button');
        if (unlocked) {
          b.textContent = records.hat === h.emoji ? 'Porté !' : 'Porter';
          b.addEventListener('click', () => {
            records.hat = records.hat === h.emoji ? '' : h.emoji;
            saveRecords();
            toast(records.hat ? `${records.hat} Tu portes ta ${h.name.toLowerCase()} !` : 'Chapeau rangé.', 0xffe07a);
            renderRecords();
          });
        } else { b.textContent = '🔒'; b.disabled = true; }
        row.appendChild(b);
        recBody.appendChild(row);
      }
    } else {
      const photos = loadJson(PHOTOS_KEY, []);
      // On va chercher celles prises sur les autres appareils : c'est le seul
      // moment où l'album coûte quelque chose, et c'est celui où l'enfant le
      // regarde. Une seule redessinée, s'il y a du neuf.
      photosNuage?.tirer().then((tout) => {
        if (tout && tout.length !== photos.length) renderTab();
      });
      recBody.innerHTML = `<h3>📸 Souvenirs</h3>
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
          renderRecords();
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
      recBody.appendChild(grid);
    }
  }


  edu.onCorrect = () => {
    records.quizCorrect++;
    for (const h of HATS) {
      if (records.quizCorrect >= h.need && !records.hats.includes(h.emoji)) {
        records.hats.push(h.emoji);
        toast(`${h.emoji} BRAVO ! Tu as débloqué : ${h.name} ! (menu 🏆)`, 0xffe07a);
        emojiBurst([h.emoji, '🎉'], 20);
      }
    }
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
    // Le « menu 🏆 » n'existe plus depuis que les records ont déménagé dans
    // l'atelier : le toast montrait un chemin qui ne menait nulle part.
    toast('📸 Photo rangée dans 🛠️ Atelier → 📸 Souvenirs !', 0x9fd8e8);
  });

  // ---- daily treasure -------------------------------------------------------
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
      const h = hashStr(today() + myName());
      for (let i = 0; i < 3; i++) bagAdd(QUEST_ITEMS[(h + i) % QUEST_ITEMS.length]);
      bagAdd('🎆 Fusée');
      toast('💰 TRÉSOR DU JOUR trouvé ! +4 objets dans ton sac !', 0xffd75e);
      emojiBurst(['💰', '🪙', '🎉', '⭐'], 30);
      launchFirework();
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
  // hook the hint into the map modal
  document.getElementById('map-modal')?.insertAdjacentHTML('beforeend',
    '<button id="treasure-hint-btn" style="position:absolute;bottom:14px;left:50%;transform:translateX(-50%);padding:9px 16px;border-radius:12px;border:none;background:#d0a03a;color:#fff;font-size:15px;z-index:5">💰 Indice trésor</button>');
  document.getElementById('treasure-hint-btn')?.addEventListener('click', () => {
    treasureHint();
    document.getElementById('map-modal').style.display = 'none';
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
      launchFirework();
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
          bagAdd(QUEST_ITEMS[Math.floor(Math.random() * QUEST_ITEMS.length)]);
          toast('🧮 Exact ! +1 objet surprise dans ton sac !', 0x6ee06e);
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

  // ---- riding & pet update --------------------------------------------------
  function updateRide(dt) {
    if (juiceTimer > 0) {
      juiceTimer -= dt;
      if (juiceTimer <= 0 && !riding) { player.boost = undefined; toast('🧃 Le jus de baies ne fait plus effet.', 0xcccccc); }
    }
    if (!riding) return;
    if (riding.dying > 0 || !animalManager.animals.includes(riding)) { riding = null; player.boost = undefined; return; }
    player.boost = riding.def.allure || 2.0;
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
    const moving = Math.abs(player.vel.x) + Math.abs(player.vel.z) > 0.5;
    a.animTime += dt;
    const swing = moving ? Math.sin(a.animTime * 10) * 0.6 : 0;
    a.mesh.userData.legs.forEach((leg, i) => { leg.rotation.x = i % 2 ? -swing : swing; });
    player.camera.position.y += a.def.assise || a.def.height * 0.6;
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
    boardB.textContent = bord ? `⬇️ Descendre du ${bord.nom}` : `${v ? v.emoji : '🚇'} Monter à bord`;
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
      const p = vv ? vv.placeProche(player.pos, 5) : null;   // 5 : voir embarquer()
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
    const nourrissable = isRunning() && a && a.pos.distanceTo(player.pos) < 6;
    // Monter ne se vise pas comme on vise pour nourrir : on prend la bête
    // montable la plus proche devant soi, même de biais. C'est tout l'écart
    // entre un bouton qu'on découvre et un bouton qu'on ne voit jamais.
    const m = isRunning() && !bord ? animalManager.monture() : null;

    const feedB = document.getElementById('feed-btn');
    const rideB = document.getElementById('ride-btn');

    const montrer = nourrissable || m || v || riding || bord;
    targetRow.style.display = montrer ? 'flex' : 'none';
    if (!montrer) return;

    feedB.style.display = nourrissable && !riding && !bord ? 'block' : 'none';
    rideB.textContent = riding ? '⬇️ Descendre' : `${m ? m.def.emoji : '🐴'} Monter`;
    rideB.style.display = riding || m ? 'block' : 'none';
    // Le bouton « à bord » a son propre rythme : on le laisse faire, sinon les
    // deux se contrediraient quatre fois par seconde.
    dernierBord = '';
    majBoutonBord(v);
  }

  // ---- hooks & lifecycle ----------------------------------------------------
  let lastCtxKey = null;

  function update(dt) {
    updateFireworks(dt);
    updateEmotes(dt);
    suivreChantier(dt);
    if (!isRunning()) {
      // paused (or back at a menu without a full leaveToMainMenu): the
      // floating buttons must not float on top of the menu underneath
      for (const b of [atelierBtn, fwBtn, photoBtn]) b.style.display = 'none';
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
    for (const b of [atelierBtn, fwBtn, photoBtn]) b.style.display = 'flex';
    const net = getNet();
    const amisLa = net && net.active && net.playerCount() > 1;
    emoteToggle.style.display = amisLa ? 'flex' : 'none';
    if (!amisLa && emotesDepliees) { emotesDepliees = false; }
    emoteRow.style.display = amisLa && emotesDepliees ? 'flex' : 'none';
  }

  function onLeave() {
    for (const b of [atelierBtn, fwBtn, photoBtn]) b.style.display = 'none';
    emoteToggle.style.display = 'none';
    emotesDepliees = false;
    emoteRow.style.display = 'none';
    targetRow.style.display = 'none';
    panel.style.display = 'none';
    recordsPanel.style.display = 'none';
    if (riding) { riding = null; player.boost = undefined; }
    debarquer(true);
  }

  function attachNet(net) {
    net.onDuel = onDuelMsg;
    net.onEmote = (peerId, k) => showRemoteEmote(peerId, k);
    net.onSign = (s) => addSign(s); // save locally, never re-upload
    // Le chantier voyage comme les panneaux : la pose s'échange, l'avancement
    // se dérive du monde. À l'arrivée dans un monde, celui de l'hôte fait foi.
    net.onChantier = (c) => adopterChantier(c, { annonce: !!c });
    net.chantierActuel = () => chantier;
    net.onChest = (items) => chestChanged(items || {});
  }

  return {
    update,
    onLeave,
    attachNet,
    ouvrirOnglet,
    // La bibliothèque de bâtiments vit désormais dans l'inventaire (le +),
    // mais la POSE — devant soi, sol cherché sous chaque colonne, un seul
    // lot réseau — reste ici : c'est fun qui connaît le monde et le réseau.
    poserBati,
    poserMonument,
    decoratePlayersPanel,
    onBlockPlaced() {
      records.blocks++;
      if (quest && quest.kind === 'build' && !quest.done) { quest.progress++; saveJson(QUEST_KEY, quest); }
      saveRecords();
    },
    onCatch(sp) {
      if (quest && quest.kind === 'catch' && !quest.done && sp.type === quest.type) {
        quest.progress++;
        saveJson(QUEST_KEY, quest);
        toast('📜 Créature de la quête attrapée ! Va valider dans 🛠️ → Quête !', 0x6ee06e);
      }
      if (petMesh) { // the companion celebrates with you
        petMesh.rotation.y += Math.PI * 2;
      }
    },
    onHarvest(def) {
      bagAdd(def.meat);
    },
  };
}
