// Sauvetage one-shot : lit le progrès de TOUS les profils locaux de cet
// appareil et l'envoie dans le cloud (table player_state), profil par profil.
//
// Conçu pour être injecté via un marque-page sur un appareil resté en v47 —
// une version d'avant la portabilité, qui ne savait pas encore pousser le
// progrès complet. Le script est autonome (aucun module, aucune dépendance)
// et re-fusionne l'état distant avant d'écrire, avec les mêmes règles que
// src/sync.js : ce que l'enfant a fait ailleurs entre-temps survit.
(function () {
  'use strict';
  if (window.__rescueRan) { alert('Sauvetage déjà lancé — recharge la page pour recommencer.'); return; }
  window.__rescueRan = true;

  const CFG = window.__RESCUE_CLOUD || {
    url: 'https://rtwutlmzwxgljtvfchsj.supabase.co',
    key: 'sb_publishable_o9J7dculBThdKCQLbdvHng_Zm-QuMQU',
  };
  const HEADERS = { 'Content-Type': 'application/json', apikey: CFG.key, Authorization: 'Bearer ' + CFG.key };

  // [clé localStorage, champ du document d'état] — même mapping que src/sync.js
  const FIELDS = [
    ['web-minecraft-dex-v1', 'dex'],
    ['web-minecraft-meat-v1', 'meat'],
    ['web-minecraft-bag-v1', 'bag'],
    ['web-minecraft-records-v1', 'records'],
    ['web-minecraft-pet-v1', 'pet'],
    ['web-minecraft-quest-v1', 'quest'],
    ['web-minecraft-hotbar-v1', 'hotbar'],
    ['web-minecraft-worlds-v1', 'worlds'],
    ['web-minecraft-pos-v1', 'pos'],
    ['web-minecraft-photos-v1', 'photos'],
    ['web-minecraft-edits-v2', 'edits'],
  ];
  const MAX_BYTES = 900000;
  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);

  // Lecture BRUTE : le shim de la page suffixe les clés du profil actif, on
  // passe à côté pour lire n'importe quel profil explicitement.
  const rawGet = window.__rawStorage
    ? window.__rawStorage.get
    : (k) => localStorage.getItem(k);
  const keyFor = (key, profileId) => (profileId === 1 ? key : key + '::p' + profileId);
  function readJson(key, profileId) {
    try {
      const raw = rawGet(keyFor(key, profileId));
      return raw === null || raw === undefined ? undefined : JSON.parse(raw);
    } catch { return undefined; }
  }

  // ---- règles de fusion (copie autonome de src/sync.js) ----
  function mergeDex(a, b) {
    if (!Array.isArray(a)) a = [];
    if (!Array.isArray(b)) b = [];
    const out = new Map();
    for (const e of [].concat(a, b)) {
      if (!e || e.id === undefined) continue;
      const prev = out.get(e.id);
      out.set(e.id, prev ? Object.assign({}, prev, {
        count: Math.max(num(prev.count), num(e.count)),
        bestLevel: Math.max(num(prev.bestLevel), num(e.bestLevel)),
      }) : Object.assign({}, e));
    }
    return Array.from(out.values());
  }
  function mergeCounts(a, b) {
    const out = Object.assign({}, b || {});
    for (const k of Object.keys(a || {})) out[k] = Math.max(num(a[k]), num(out[k]));
    return out;
  }
  function mergeRecords(a, b, aNewer) {
    a = a || {}; b = b || {};
    const out = {};
    for (const k of new Set([].concat(Object.keys(a), Object.keys(b)))) {
      const av = a[k], bv = b[k];
      if (k === 'hats') out[k] = Array.from(new Set([].concat(av || [], bv || [])));
      else if (k === 'hat' || k === 'treasureDate') out[k] = (aNewer ? av : bv) ?? av ?? bv;
      else if (typeof av === 'number' || typeof bv === 'number') out[k] = Math.max(num(av), num(bv));
      else out[k] = av ?? bv;
    }
    return out;
  }
  function mergeQuest(a, b) {
    if (!a) return b;
    if (!b) return a;
    if (a.date === b.date) {
      return Object.assign({}, a, { done: !!(a.done || b.done), progress: Math.max(num(a.progress), num(b.progress)) });
    }
    return a.date > b.date ? a : b;
  }
  function mergeWorlds(a, b) {
    const out = new Map();
    for (const w of [].concat(a || [], b || [])) {
      if (!w || !w.code) continue;
      const prev = out.get(w.code);
      if (!prev || num(w.t) > num(prev.t)) out.set(w.code, w);
    }
    return Array.from(out.values()).sort((x, y) => num(y.t) - num(x.t)).slice(0, 5);
  }
  function mergePos(a, b) {
    const out = Object.assign({}, b || {});
    for (const ctx of Object.keys(a || {})) {
      if (!out[ctx] || num(a[ctx].t) >= num(out[ctx].t)) out[ctx] = a[ctx];
    }
    return out;
  }
  function mergeEdits(a, b) {
    const out = Object.assign({}, b || {});
    for (const k of Object.keys(a || {})) {
      const entry = a[k];
      if (!Array.isArray(entry)) continue;
      const prev = out[k];
      if (!prev) { out[k] = entry; continue; }
      if (num(entry[1]) > num(prev[1]) || (num(entry[1]) === num(prev[1]) && entry[0] > prev[0])) out[k] = entry;
    }
    return out;
  }
  function merge(local, remote) {
    if (!remote || typeof remote !== 'object') return local;
    const localNewer = num(local._t) >= num(remote._t);
    const pick = (f) => (localNewer ? local[f] ?? remote[f] : remote[f] ?? local[f]);
    const out = Object.assign({}, remote, local);
    out.dex = mergeDex(local.dex, remote.dex);
    out.meat = Math.max(num(local.meat), num(remote.meat));
    out.bag = mergeCounts(local.bag, remote.bag);
    out.records = mergeRecords(local.records, remote.records, localNewer);
    out.quest = mergeQuest(local.quest, remote.quest);
    out.worlds = mergeWorlds(local.worlds, remote.worlds);
    out.pos = mergePos(local.pos, remote.pos);
    out.edits = mergeEdits(local.edits, remote.edits);
    out.photos = Array.from(new Set([].concat(local.photos || [], remote.photos || []))).slice(0, 8);
    out.pet = pick('pet');
    out.hotbar = pick('hotbar');
    return out;
  }
  // Même politique que sync.js : si c'est trop gros, on abandonne d'abord les
  // photos, jamais la collection.
  function trim(state) {
    if (JSON.stringify(state).length <= MAX_BYTES) return state;
    const out = Object.assign({}, state);
    out.photos = (out.photos || []).slice(0, 2);
    if (JSON.stringify(out).length > MAX_BYTES && out.edits) {
      const entries = Object.entries(out.edits).sort((a, b) => num(b[1][1]) - num(a[1][1]));
      out.edits = Object.fromEntries(entries.slice(0, 4000));
    }
    return out;
  }

  // ---- bannière de progression ----
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;inset:auto 10px 10px 10px;z-index:99999;background:#1b2340;color:#fff;'
    + 'border:3px solid #9fd8e8;border-radius:14px;padding:14px 16px;font:15px/1.5 sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.5)';
  box.innerHTML = '<b>🚚 Sauvetage du progrès…</b><div id="rescue-log"></div>';
  document.body.appendChild(box);
  const log = (msg) => {
    const d = document.createElement('div');
    d.textContent = msg;
    box.querySelector('#rescue-log').appendChild(d);
  };

  // La page de déménagement attend ce signal avant de rediriger — émis dans
  // tous les cas, succès comme échec, pour ne jamais la bloquer.
  let okCount = 0;
  const finish = () => window.dispatchEvent(new CustomEvent('rescue-done', { detail: { ok: okCount } }));

  (async () => {
    let reg = null;
    try { reg = JSON.parse(rawGet('web-minecraft-profiles-v1')); } catch { /* absent */ }
    let profiles = reg && Array.isArray(reg.list) ? reg.list : [];
    if (!profiles.length) {
      // pas de registre de profils : appareil mono-joueur, clés non suffixées
      let solo = null;
      try { solo = JSON.parse(rawGet('web-minecraft-profile-v1')); } catch { /* absent */ }
      if (solo && solo.name) profiles = [{ id: 1, name: solo.name }];
    }
    if (!profiles.length) { log('❌ Aucun profil trouvé sur cet appareil.'); return; }

    for (const p of profiles) {
      if (!p || !p.name) continue;
      const state = { _t: Date.now() };
      for (const [key, field] of FIELDS) {
        const v = readJson(key, p.id);
        if (v !== undefined) state[field] = v;
      }
      const nDex = Array.isArray(state.dex) ? state.dex.length : 0;
      const nBlocks = state.edits ? Object.keys(state.edits).length : 0;
      if (!nDex && !nBlocks && state.meat === undefined && !state.records) {
        log('· ' + p.name + ' : rien à sauver ici');
        continue;
      }
      try {
        const q = CFG.url + '/rest/v1/player_state?name=eq.' + encodeURIComponent(p.name) + '&select=state';
        const res = await fetch(q, { headers: HEADERS });
        const rows = res.ok ? await res.json() : [];
        const remote = rows && rows[0] ? rows[0].state : null;
        const finalState = trim(merge(state, remote));
        const push = await fetch(CFG.url + '/rest/v1/player_state', {
          method: 'POST',
          headers: Object.assign({ Prefer: 'resolution=merge-duplicates' }, HEADERS),
          body: JSON.stringify([{ name: p.name, state: finalState }]),
        });
        if (!push.ok) throw new Error('HTTP ' + push.status);
        okCount++;
        log('✅ ' + p.name + ' : ' + nDex + ' créature(s), ' + nBlocks + ' bloc(s) envoyés au cloud');
      } catch (e) {
        log('❌ ' + p.name + ' : échec (' + e.message + ') — réessaie plus tard');
      }
    }
    log(okCount ? '🎉 Terminé ! Ouvre le jeu sur la nouvelle adresse avec le même prénom.'
      : '😕 Rien n\'a pu être envoyé — vérifie la connexion et réessaie.');
  })().catch((e) => log('❌ Erreur inattendue : ' + e.message)).finally(finish);
})();
