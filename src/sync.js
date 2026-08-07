// Whole-profile portability: everything a child collects lives in the cloud
// under their first name, with localStorage as the working copy.
//
// Local-first by design: the game only ever reads and writes localStorage,
// so it behaves identically offline. This module is the bridge — it pushes
// changes up in the background and merges what other devices did back down.
//
// The merge is per-field rather than last-writer-wins on the whole blob,
// because a blanket overwrite would silently delete whatever the other
// device did in the meantime. Collections union, counters take the max,
// world blocks resolve per block by timestamp, and only genuinely
// single-valued settings fall back to "most recently written wins".

const STATE_TS = '_t'; // when the pushing device last wrote this document

// [localStorage key, field name in the state document]
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
  ['web-minecraft-edits-v3', 'edits'],
];

const MAX_PHOTOS = 8;
const MAX_BYTES = 900000; // keep a single push comfortably small

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch { return undefined; }
}

function writeJson(key, value) {
  try {
    if (value === undefined) return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota — the cloud copy still has it */ }
}

const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);

// ---- per-field merges -------------------------------------------------------

// Creatures caught: a child keeps every species either device saw, and the
// best of each tally — catching on one device never erases the other.
function mergeDex(a = [], b = []) {
  if (!Array.isArray(a)) a = [];
  if (!Array.isArray(b)) b = [];
  const out = new Map();
  for (const e of [...a, ...b]) {
    if (!e || e.id === undefined) continue;
    const prev = out.get(e.id);
    out.set(e.id, prev ? {
      ...prev,
      count: Math.max(num(prev.count), num(e.count)),
      bestLevel: Math.max(num(prev.bestLevel), num(e.bestLevel)),
    } : { ...e });
  }
  return [...out.values()];
}

// Counters take the max rather than the sum: a stale device re-pushing an
// old value must not inflate a total, and must not wipe a newer one either.
function mergeCounts(a = {}, b = {}) {
  const out = { ...(b || {}) };
  for (const [k, v] of Object.entries(a || {})) out[k] = Math.max(num(v), num(out[k]));
  return out;
}

function mergeRecords(a = {}, b = {}, aNewer) {
  const out = {};
  for (const k of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
    const av = (a || {})[k], bv = (b || {})[k];
    if (k === 'hats') out[k] = [...new Set([...(av || []), ...(bv || [])])];
    else if (k === 'hat' || k === 'treasureDate') out[k] = (aNewer ? av : bv) ?? av ?? bv;
    else if (typeof av === 'number' || typeof bv === 'number') out[k] = Math.max(num(av), num(bv));
    else out[k] = av ?? bv;
  }
  return out;
}

// Same day: keep the better progress and stay done if either finished it.
// Different day: the later date is the current quest.
function mergeQuest(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (a.date === b.date) {
    return { ...a, done: !!(a.done || b.done), progress: Math.max(num(a.progress), num(b.progress)) };
  }
  return a.date > b.date ? a : b;
}

function mergeWorlds(a = [], b = [], cap = 5) {
  const out = new Map();
  for (const w of [...(a || []), ...(b || [])]) {
    if (!w || !w.code) continue;
    const prev = out.get(w.code);
    if (!prev || num(w.t) > num(prev.t)) out.set(w.code, w);
  }
  return [...out.values()].sort((x, y) => num(y.t) - num(x.t)).slice(0, cap);
}

// Positions are per world, and each already carries when it was saved.
function mergePos(a = {}, b = {}) {
  const out = { ...(b || {}) };
  for (const [ctx, p] of Object.entries(a || {})) {
    if (!out[ctx] || num(p.t) >= num(out[ctx].t)) out[ctx] = p;
  }
  return out;
}

// Blocks resolve individually by edit time, so two children building in the
// same world on two devices both keep their work. Ties break on block id so
// every device converges on the same result.
function mergeEdits(a = {}, b = {}) {
  const out = { ...(b || {}) };
  for (const [k, entry] of Object.entries(a || {})) {
    if (!Array.isArray(entry)) continue;
    const [id, t] = entry;
    const prev = out[k];
    if (!prev) { out[k] = entry; continue; }
    const [pid, pt] = prev;
    if (num(t) > num(pt) || (num(t) === num(pt) && id > pid)) out[k] = entry;
  }
  return out;
}

// Les blocs sont rangés par monde : { local: {...}, "30953": {...} }. Un
// appareil resté sur l'ancienne version envoie encore une carte unique — on
// la reconnaît à ses valeurs, qui sont des couples [id, date], et on la range
// dans le monde local plutôt que de la jeter.
// Un document peut être mixte : un appareil resté sur l'ancienne version
// republie sa carte plate par-dessus la nouvelle arborescence. On trie donc
// clé par clé plutôt que de juger sur la première.
function normalizeEdits(e) {
  if (!e || typeof e !== 'object') return {};
  const out = {};
  let plat = null;
  for (const [k, v] of Object.entries(e)) {
    if (Array.isArray(v)) (plat || (plat = {}))[k] = v;      // "x,y,z": [id, t]
    else if (v && typeof v === 'object') out[k] = v;         // monde: { ... }
  }
  if (plat) out.local = mergeEdits(plat, out.local);
  return out;
}

function mergeAllEdits(a, b) {
  const A = normalizeEdits(a), B = normalizeEdits(b);
  const out = {};
  for (const ctx of new Set([...Object.keys(A), ...Object.keys(B)])) {
    out[ctx] = mergeEdits(A[ctx], B[ctx]);
  }
  return out;
}

export class ProfileSync {
  constructor(cloud, getName) {
    this.cloud = cloud;
    this.getName = getName;
    this.lastPushed = '';
    this.timer = null;
    // Tant que le cloud n'a pas été lu au moins une fois, ce que contient
    // localStorage ne représente PAS l'enfant : sur un appareil neuf, c'est
    // le vide. Envoyer ce vide remplacerait sa partie par rien. Un enfant a
    // perdu ses mondes exactement comme ça — le temps que la première lecture
    // revienne, l'iPad est passé en arrière-plan et a sauvegardé le néant.
    this.hydrated = false;
    // Set by the game so a push reflects the live world rather than its
    // localStorage projection, which only catches up on a debounced save.
    this.liveEdits = null;   // () => ({ [monde]: { "x,y,z": [id, t] } })
    this.onMerged = null;    // (state) => void, after a background merge
  }

  // Reads the working copy out of localStorage.
  snapshot() {
    const state = { [STATE_TS]: Date.now() };
    for (const [key, field] of FIELDS) {
      const v = readJson(key);
      if (v !== undefined) state[field] = v;
    }
    if (this.liveEdits) {
      try {
        const live = this.liveEdits();
        if (live) state.edits = mergeAllEdits(live, state.edits);
      } catch { /* fall back to the stored copy */ }
    }
    return state;
  }

  merge(local, remote) {
    if (!remote || typeof remote !== 'object') return { state: local, changed: false };
    const localNewer = num(local[STATE_TS]) >= num(remote[STATE_TS]);
    const out = { ...local };
    const pick = (f) => (localNewer ? local[f] ?? remote[f] : remote[f] ?? local[f]);

    out.dex = mergeDex(local.dex, remote.dex);
    out.meat = Math.max(num(local.meat), num(remote.meat));
    out.bag = mergeCounts(local.bag, remote.bag);
    out.records = mergeRecords(local.records, remote.records, localNewer);
    out.quest = mergeQuest(local.quest, remote.quest);
    out.worlds = mergeWorlds(local.worlds, remote.worlds);
    out.pos = mergePos(local.pos, remote.pos);
    out.edits = mergeAllEdits(local.edits, remote.edits);
    out.photos = [...new Set([...(local.photos || []), ...(remote.photos || [])])].slice(0, MAX_PHOTOS);
    // single-valued preferences: the device that wrote most recently wins
    out.pet = pick('pet');
    out.hotbar = pick('hotbar');

    // "changed" means the merge genuinely brought something down that this
    // device did not already have — that is what justifies a reload. Compared
    // field by field so a mere difference in key order never triggers one.
    let changed = false;
    for (const [, field] of FIELDS) {
      if (JSON.stringify(out[field] ?? null) !== JSON.stringify(local[field] ?? null)) {
        changed = true;
        break;
      }
    }
    return { state: out, changed };
  }

  apply(state) {
    for (const [key, field] of FIELDS) {
      if (state[field] !== undefined) writeJson(key, state[field]);
    }
  }

  // Trims the heaviest, least important things first so a big world never
  // costs a child their collection.
  trim(state) {
    let body = JSON.stringify(state);
    if (body.length <= MAX_BYTES) return { state, dropped: [] };
    const dropped = [];
    const out = { ...state };
    if (out.photos && out.photos.length) {
      out.photos = out.photos.slice(0, 2);
      dropped.push('photos');
      body = JSON.stringify(out);
    }
    if (body.length > MAX_BYTES && out.edits) {
      // On garde les blocs les plus récents, tous mondes confondus : sur un
      // seul monde, tailler par monde en sacrifierait un entier.
      const tous = [];
      for (const [ctx, map] of Object.entries(normalizeEdits(out.edits))) {
        for (const [k, entry] of Object.entries(map || {})) tous.push([ctx, k, entry]);
      }
      tous.sort((a, b) => num(b[2][1]) - num(a[2][1]));
      const garde = {};
      for (const [ctx, k, entry] of tous.slice(0, 4000)) (garde[ctx] || (garde[ctx] = {}))[k] = entry;
      out.edits = garde;
      dropped.push('anciens blocs');
    }
    return { state: out, dropped };
  }

  async pull() {
    const name = this.getName();
    if (!name || !this.cloud.configured || !navigator.onLine) return { changed: false };
    let remote = null;
    try { remote = await this.cloud.statePull(name); } catch { return { changed: false }; }
    // Lecture réussie : on sait désormais ce que le cloud contient, donc ce
    // qu'on écrira ensuite aura du sens. En cas d'échec on reste sur la
    // réserve et la boucle réessaiera de lire.
    this.hydrated = true;
    if (!remote) { await this.push(); return { changed: false }; } // first device: seed it
    const { state, changed } = this.merge(this.snapshot(), remote);
    this.apply(state);
    return { changed, state };
  }

  // A push replaces the whole cloud document, so it must never be built from
  // this device alone: two children playing at the same time would each erase
  // the other's last few minutes, whoever pushed last. Re-reading and merging
  // first makes the write additive instead — the same merge rules as the
  // launch pull, so a block another device placed survives this one's save.
  //
  // Skipped when the page is going away (keepalive): there is no time for a
  // round trip then, and the next device to open the game merges anyway.
  async push(keepalive = false) {
    const name = this.getName();
    if (!name || !this.cloud.configured) return;
    if (!this.hydrated) return; // on n'écrase pas ce qu'on n'a pas encore lu
    let local = this.snapshot();
    if (!keepalive && navigator.onLine) {
      try {
        const remote = await this.cloud.statePull(name);
        if (remote) {
          const { state: merged, changed } = this.merge(local, remote);
          local = merged;
          if (changed) {
            this.apply(merged);
            if (this.onMerged) this.onMerged(merged);
          }
        }
      } catch { /* offline or unreachable — push the local copy as-is */ }
    }
    const { state, dropped } = this.trim(local);
    const body = JSON.stringify({ ...state, [STATE_TS]: 0 }); // ignore the clock when diffing
    if (body === this.lastPushed) return; // nothing actually changed
    try {
      await this.cloud.statePush(name, state, keepalive);
      this.lastPushed = body;
      if (dropped.length && this.onTrim) this.onTrim(dropped);
    } catch { /* retried on the next tick */ }
  }

  start(intervalMs = 45000) {
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      // Première lecture ratée (hors-ligne, réseau capricieux) : on réessaie
      // de lire avant d'écrire, sinon l'appareil resterait muet pour toujours.
      if (!this.hydrated) this.pull().catch(() => {});
      else this.push().catch(() => {});
    }, intervalMs);
    this._onHide = () => {
      if (document.visibilityState === 'hidden') this.push(true).catch(() => {});
    };
    document.addEventListener('visibilitychange', this._onHide);
    this._onPageHide = () => { this.push(true).catch(() => {}); };
    window.addEventListener('pagehide', this._onPageHide);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
    if (this._onHide) document.removeEventListener('visibilitychange', this._onHide);
    if (this._onPageHide) window.removeEventListener('pagehide', this._onPageHide);
  }
}
