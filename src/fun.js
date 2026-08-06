// Fun & social systems: item bag, breeding, riding, companions, duels,
// crafting, shared chest, text signs, fireworks, emotes, photos, daily
// treasure, park mini-games, quests, records & hats, museum statues and
// little math challenges. Everything persists per profile via the storage
// shim; world-scoped data (signs, chest) is keyed by the world code.

import * as THREE from 'three';
import { buildCreatureMesh, TYPES } from './creatures.js';
import { PLACES, PARK, WATER_LEVEL } from './world.js';

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
    isNight, getWeather, getPosCtx, getProfiles } = ctx;

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
    /* La colonne démarre sous le bouton carte, encoche comprise : sans
       var(--safe-top) les deux se superposaient sur les iPhone à Dynamic
       Island, où la barre d'état pousse tout de ~59 px vers le bas. */
    .fun-btn { position:fixed; left:10px; width:44px; height:44px; border-radius:12px;
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
    .emote-row { position:fixed; left:10px; bottom:150px; display:none; flex-direction:column;
      gap:8px; z-index:30; }
    .emote-row button { width:44px; height:44px; border-radius:12px; font-size:22px;
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
    .photo-grid .del { position:absolute; top:4px; right:4px; background:rgba(0,0,0,.6);
      color:#fff; border:none; border-radius:8px; font-size:13px; padding:2px 7px; }
  `;
  document.head.appendChild(style);

  const el = (html) => {
    const d = document.createElement('div');
    d.innerHTML = html;
    const node = d.firstElementChild;
    document.body.appendChild(node);
    return node;
  };

  const mkBtn = (emoji, top, title) => {
    const b = el(`<button class="fun-btn" style="top:calc(${top}px + var(--safe-top))" title="${title}">${emoji}</button>`);
    return b;
  };
  // le bouton carte tient de 34 à 74 px (sous la zone sûre) : on part à 84
  const atelierBtn = mkBtn('🛠️', 84, 'Atelier');
  const fwBtn = mkBtn('🎆', 136, "Feu d'artifice");
  const photoBtn = mkBtn('📸', 188, 'Photo');
  const recordsBtn = mkBtn('🏆', 240, 'Records');

  const emoteRow = el(`<div class="emote-row" id="emote-row">
    <button data-k="👋">👋</button><button data-k="💃">💃</button><button data-k="❤️">❤️</button>
  </div>`);

  const targetRow = el(`<div class="fun-target" id="fun-target">
    <button id="feed-btn">🍼 Nourrir</button><button id="ride-btn">🐴 Monter</button>
  </div>`);

  const panel = el(`<div class="fun-panel" id="fun-main-panel">
    <button class="fun-close">✕</button>
    <div class="fun-tabs">
      <button class="fun-tab on" data-t="craft">🛠️ Atelier</button>
      <button class="fun-tab" data-t="chest">📦 Coffre</button>
      <button class="fun-tab" data-t="quest">📜 Quête</button>
      <button class="fun-tab" data-t="sign">🪧 Panneau</button>
    </div>
    <div id="fun-tab-body"></div>
  </div>`);

  const recordsPanel = el(`<div class="fun-panel" id="fun-records-panel">
    <button class="fun-close">✕</button>
    <div class="fun-tabs">
      <button class="fun-tab on" data-t="records">🏆 Records</button>
      <button class="fun-tab" data-t="hats">🎩 Chapeaux</button>
      <button class="fun-tab" data-t="photos">📸 Souvenirs</button>
    </div>
    <div id="fun-records-body"></div>
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

  for (const p of [panel, recordsPanel]) {
    p.querySelector('.fun-close').addEventListener('click', () => { p.style.display = 'none'; });
  }

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

  const RIDEABLE = new Set(['horse', 'deer', 'wolf']);
  function toggleRide(a) {
    if (riding) {
      riding = null;
      player.boost = juiceTimer > 0 ? 1.45 : undefined;
      toast('🐴 Tu es descendu·e.', 0xd8c9a4);
      return;
    }
    if (!a || !RIDEABLE.has(a.def.key)) return;
    riding = a;
    a.state = 'idle';
    toast(`${a.def.emoji} En selle sur ${a.def.name} ! Vitesse ×2 — refais pareil pour descendre.`, 0xffe07a);
    emojiBurst([a.def.emoji, '💨'], 8);
  }

  let juiceTimer = 0;

  document.addEventListener('keydown', (e) => {
    if (!isRunning()) return;
    if (e.code === 'KeyN') feed(animalManager.targeted());
    if (e.code === 'KeyM') toggleRide(animalManager.targeted());
    if (e.code === 'KeyG') launchFirework();
  });
  document.getElementById('feed-btn').addEventListener('click', () => feed(animalManager.targeted()));
  document.getElementById('ride-btn').addEventListener('click', () => toggleRide(riding ? null : animalManager.targeted()));

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
      const m = `🙈 ${myName()} lance un cache-cache ! Comptez jusqu'à 20 puis cherchez !`;
      net.sendChat(myName(), m);
      cloud.chatSend(myName(), m).catch(() => {});
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
  let currentTab = 'craft';
  const tabBody = panel.querySelector('#fun-tab-body');
  panel.querySelectorAll('.fun-tab').forEach((t) => {
    t.addEventListener('click', () => {
      currentTab = t.dataset.t;
      panel.querySelectorAll('.fun-tab').forEach((o) => o.classList.toggle('on', o === t));
      renderTab();
    });
  });

  function bagSummary(target) {
    const entries = Object.entries(bag);
    return entries.length
      ? entries.map(([k, v]) => `${k} ×${v}`).join(' · ')
      : 'Ton sac est vide — chasse des animaux pour trouver des trésors !';
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
    }
  }

  atelierBtn.addEventListener('click', () => {
    if (panel.style.display === 'block') { panel.style.display = 'none'; return; }
    panel.style.display = 'block';
    renderTab();
  });

  // ---- records, hats & photos ----------------------------------------------
  let recTab = 'records';
  const recBody = recordsPanel.querySelector('#fun-records-body');
  recordsPanel.querySelectorAll('.fun-tab').forEach((t) => {
    t.addEventListener('click', () => {
      recTab = t.dataset.t;
      recordsPanel.querySelectorAll('.fun-tab').forEach((o) => o.classList.toggle('on', o === t));
      renderRecords();
    });
  });

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
        grid.appendChild(d);
      });
      recBody.appendChild(grid);
    }
  }

  recordsBtn.addEventListener('click', () => {
    if (recordsPanel.style.display === 'block') { recordsPanel.style.display = 'none'; return; }
    recordsPanel.style.display = 'block';
    renderRecords();
  });

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
    flash.style.opacity = 0.9;
    setTimeout(() => { flash.style.opacity = 0; }, 120);
    toast('📸 Photo ajoutée à tes souvenirs ! (menu 🏆)', 0x9fd8e8);
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
    player.boost = 2.0;
    const a = riding;
    a.pos.set(player.pos.x, player.pos.y - a.def.height * 0.55, player.pos.z);
    a.vel.set(0, 0, 0);
    a.yaw = player.yaw + Math.PI;
    a.state = 'idle'; a.stateTime = 5; a.cryTimer = 99;
    a.mesh.position.copy(a.pos);
    a.mesh.rotation.y = a.yaw + Math.PI;
    const moving = Math.abs(player.vel.x) + Math.abs(player.vel.z) > 0.5;
    a.animTime += dt;
    const swing = moving ? Math.sin(a.animTime * 10) * 0.6 : 0;
    a.mesh.userData.legs.forEach((leg, i) => { leg.rotation.x = i % 2 ? -swing : swing; });
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
  function updateTargetButtons(dt) {
    targetTimer -= dt;
    if (targetTimer > 0) return;
    targetTimer = 0.25;
    const a = animalManager.targeted();
    const show = isRunning() && a && a.pos.distanceTo(player.pos) < 6;
    targetRow.style.display = show || riding ? 'flex' : 'none';
    if (show || riding) {
      document.getElementById('feed-btn').style.display = riding ? 'none' : 'block';
      const rideB = document.getElementById('ride-btn');
      rideB.textContent = riding ? '⬇️ Descendre' : `${a && RIDEABLE.has(a.def.key) ? a.def.emoji : '🐴'} Monter`;
      rideB.style.display = riding || (a && RIDEABLE.has(a.def.key)) ? 'block' : 'none';
    }
  }

  // ---- hooks & lifecycle ----------------------------------------------------
  let lastCtxKey = null;

  function update(dt) {
    updateFireworks(dt);
    updateEmotes(dt);
    if (!isRunning()) {
      // paused (or back at a menu without a full leaveToMainMenu): the
      // floating buttons must not float on top of the menu underneath
      for (const b of [atelierBtn, fwBtn, photoBtn, recordsBtn]) b.style.display = 'none';
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
    for (const b of [atelierBtn, fwBtn, photoBtn, recordsBtn]) b.style.display = 'flex';
    const net = getNet();
    emoteRow.style.display = net && net.active ? 'flex' : 'none';
  }

  function onLeave() {
    for (const b of [atelierBtn, fwBtn, photoBtn, recordsBtn]) b.style.display = 'none';
    emoteRow.style.display = 'none';
    targetRow.style.display = 'none';
    panel.style.display = 'none';
    recordsPanel.style.display = 'none';
    if (riding) { riding = null; player.boost = undefined; }
  }

  function attachNet(net) {
    net.onDuel = onDuelMsg;
    net.onEmote = (peerId, k) => showRemoteEmote(peerId, k);
    net.onSign = (s) => addSign(s); // save locally, never re-upload
    net.onChest = (items) => chestChanged(items || {});
  }

  return {
    update,
    onLeave,
    attachNet,
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
