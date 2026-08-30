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

// LA FUSION DES GARAGES vit dans src/garages.js, avec le reste de leur
// mécanique — c'est là qu'on saura pourquoi elle horodate. Ici on l'applique,
// comme les autres fusions de ce fichier.
import { fusionnerGarages } from './garages.js';

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
  ['web-minecraft-worlds-del-v1', 'worldsDel'],
  ['web-minecraft-pos-v1', 'pos'],
  ['web-minecraft-edits-v3', 'edits'],
  ['web-minecraft-garages-v1', 'garages'],
];

// LES PHOTOS NE VOYAGENT PLUS AVEC LES BLOCS.
//
// Elles étaient dans le même document que tout le reste, et elles y pesaient
// un tiers de la place : trois cent dix-neuf kilo-octets sur les neuf cents
// permis, pour Marlon. Or ce sont des JPEG déjà compressés — ils ne se
// réduisent pas — et le jeu, arrivé au plafond, jetait d'abord ces photos
// puis LES BLOCS LES PLUS ANCIENS de l'enfant. Un souvenir de vacances lui
// coûtait sa maison.
//
// Elles ont donc leur propre document, rangé sous « prénom~photos » — la même
// convention que l'espace parent, déjà en place. Il ne barre plus jamais la
// route à une construction.
const PHOTOS_CLE = 'web-minecraft-photos-v1';
const nomPhotos = (nom) => `${nom}~photos`;

const MAX_PHOTOS = 8;

// LES BLOCS SE COMPRESSENT CINQ FOIS.
//
// Ce sont des coordonnées répétitives — « -240,34,200 » mille fois de suite,
// à trois chiffres près — et c'est exactement ce que la compression avale.
// Mesuré sur la vraie sauvegarde de Marlon : 577 Ko de blocs deviennent
// 118 Ko. Le navigateur sait le faire tout seul depuis iOS 16.4, sans rien
// installer.
//
// Le champ compressé porte un NOM DIFFÉRENT (`editsz`) plutôt que de remplacer
// `edits`. C'est délibéré : une tablette restée sur l'ancienne version lit un
// document sans `edits`, garde donc ses propres blocs et les republie en
// clair. Elle ne comprend rien au nouveau champ, mais elle n'abîme rien — là
// où un `edits` devenu illisible lui aurait fait croire à un monde vide.
const compressionDispo = () => typeof CompressionStream === 'function';

async function comprimer(valeur) {
  const octets = new TextEncoder().encode(JSON.stringify(valeur));
  const flux = new Blob([octets]).stream().pipeThrough(new CompressionStream('gzip'));
  const brut = new Uint8Array(await new Response(flux).arrayBuffer());
  // base64 par tranches : passer trois cent mille octets d'un coup à
  // String.fromCharCode fait déborder la pile d'appels sur iOS.
  let s = '';
  for (let i = 0; i < brut.length; i += 8192) {
    s += String.fromCharCode(...brut.subarray(i, i + 8192));
  }
  return btoa(s);
}

async function decomprimer(b64) {
  const s = atob(b64);
  const brut = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) brut[i] = s.charCodeAt(i);
  const flux = new Blob([brut]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(flux).text());
}
// Neuf cents kilo-octets étaient déjà atteints par Marlon : le jeu jetait ses
// blocs pour tenir dedans. Avec les photos sorties et les blocs compressés,
// quatre méga-octets laissent passer environ six cent mille blocs — trente-cinq
// fois ce qu'il a posé jusqu'ici. C'est un plafond de sécurité contre un
// document devenu fou, plus une contrainte de place.
const MAX_BYTES = 4000000;

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

// Les mondes retirés. Une union ne sait pas représenter une absence voulue :
// l'enfant effaçait un monde, la synchronisation suivante le retrouvait dans le
// document du serveur et le remettait — sur sa tablette comme sur l'autre. Il
// faut donc garder la trace du geste, pas seulement son résultat.
//
// Une pierre tombale porte la date du retrait. Le monde ne revient que s'il est
// rouvert APRÈS — ce qui est exactement ce qu'on veut : retaper son code doit
// le faire revenir, la synchronisation non.
const RETRAITS_MAX = 20;
function mergeRetraits(a = {}, b = {}) {
  const out = {};
  for (const [code, t] of [...Object.entries(a || {}), ...Object.entries(b || {})]) {
    if (!code) continue;
    if (out[code] === undefined || num(t) > num(out[code])) out[code] = num(t);
  }
  return Object.fromEntries(
    Object.entries(out).sort((x, y) => y[1] - x[1]).slice(0, RETRAITS_MAX),
  );
}

function mergeWorlds(a = [], b = [], retraits = {}, cap = 5) {
  const out = new Map();
  for (const w of [...(a || []), ...(b || [])]) {
    if (!w || !w.code) continue;
    if (num(retraits[w.code]) >= num(w.t)) continue;   // retiré après la dernière visite
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
// la reconnaît à ses valeurs, des couples [id, date], et on la range dans le
// monde local plutôt que de la jeter.
//
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

// Ne garder que les mondes encore là. Sert aux blocs comme aux positions :
// les deux sont rangés par code de monde.
function filtrerParMonde(carte, garder) {
  const out = {};
  for (const [ctx, v] of Object.entries(carte || {})) if (garder(ctx)) out[ctx] = v;
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
    // Une sauvegarde qui échoue en silence, c'est un enfant qui construit
    // pendant une heure pour rien. On compte les échecs d'affilée et on le
    // dit — pas dès le premier, un réseau a le droit de hoqueter.
    this.onSaveState = null; // ('ok' | 'retard' | 'ko') => void
    this.failures = 0;
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
    out.worldsDel = mergeRetraits(local.worldsDel, remote.worldsDel);
    out.worlds = mergeWorlds(local.worlds, remote.worlds, out.worldsDel);
    // Ce que le monde retiré emporte avec lui : ses blocs et la position où
    // l'enfant s'était arrêté. Sans cela le monde disparaissait de la liste
    // mais son contenu restait dans le document, et remontait entier au
    // premier code retapé — ou pesait pour rien jusqu'à la fin des temps.
    const vivant = (ctx) => ctx === 'local' || !(num(out.worldsDel[ctx]) > 0);
    out.pos = filtrerParMonde(mergePos(local.pos, remote.pos), vivant);
    out.edits = filtrerParMonde(mergeAllEdits(local.edits, remote.edits), vivant);
    // Les garages suivent les blocs : rangés par monde, et emportés quand le
    // monde est retiré. Sans `filtrerParMonde`, la voiture d'un monde effacé
    // pèserait dans le document jusqu'à la fin des temps.
    //
    // UN CHAMP VIDE DES DEUX CÔTÉS DOIT RESTER ABSENT — et c'est un piège qui
    // a coûté une livraison. Fabriquer un objet vide là où il n'y avait RIEN
    // fait mentir la comparaison d'en dessous : `undefined` contre `{}`, c'est
    // différent, donc « oui, quelque chose est descendu », donc UN
    // RECHARGEMENT DE LA PAGE. Livré en v188, vu au banc dès le lendemain :
    // Alice rejoint le monde, sa page se recharge dans la seconde et sa
    // session meurt — sur une tablette neuve, où le champ n'existe pas encore.
    // Tout champ ajouté ici doit suivre la même règle.
    const garages = filtrerParMonde(fusionnerGarages(local.garages, remote.garages), vivant);
    if (Object.keys(garages).length) out.garages = garages;
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

  // LA TAILLE QUI COMPTE EST CELLE DE CE QUI PART.
  //
  // L'ancienne version pesait le document EN CLAIR et le comparait au plafond.
  // Elle se croyait donc pleine cinq fois trop tôt et jetait les blocs d'un
  // enfant qui avait encore toute la place. On compresse d'abord, on pèse
  // ensuite, et on ne taille que si le paquet réel déborde vraiment.
  async ajuster(state) {
    let paquet = await this.resserrer(state);
    if (JSON.stringify(paquet).length <= MAX_BYTES) return { paquet, dropped: [] };

    // Au-delà seulement : les blocs les plus récents d'abord, tous mondes
    // confondus — tailler monde par monde en sacrifierait un entier. On
    // divise par deux jusqu'à ce que ça rentre plutôt que de deviner un
    // nombre : ce qui compte est que ça passe, pas un chiffre rond.
    const tous = [];
    for (const [ctx, map] of Object.entries(normalizeEdits(state.edits))) {
      for (const [k, entry] of Object.entries(map || {})) tous.push([ctx, k, entry]);
    }
    tous.sort((a, b) => num(b[2][1]) - num(a[2][1]));
    let garde = tous.length;
    for (let i = 0; i < 12 && garde > 500; i++) {
      garde = Math.floor(garde / 2);
      const edits = {};
      for (const [ctx, k, entry] of tous.slice(0, garde)) (edits[ctx] || (edits[ctx] = {}))[k] = entry;
      paquet = await this.resserrer({ ...state, edits });
      if (JSON.stringify(paquet).length <= MAX_BYTES) break;
    }
    return { paquet, dropped: ['anciens blocs'] };
  }

  // Le document tel qu'il part : blocs compressés si le navigateur sait le
  // faire, en clair sinon. Rien d'autre ne change de forme.
  async resserrer(state) {
    if (!compressionDispo() || !state.edits) return state;
    try {
      const { edits, ...reste } = state;
      return { ...reste, editsz: await comprimer(edits) };
    } catch { return state; }   // au pire on envoie en clair, jamais rien de perdu
  }

  // Et tel qu'il revient.
  async dilater(state) {
    if (!state || !state.editsz) return state;
    try {
      const { editsz, ...reste } = state;
      return { ...reste, edits: await decomprimer(editsz) };
    } catch { return state; }   // document illisible : on garde ce qu'on a en local
  }

  // Les photos, sur leur propre document. Elles ne partent qu'avec l'album,
  // et ne pèsent plus jamais sur les blocs.
  async photosPousser() {
    const nom = this.getName();
    if (!nom || !this.cloud.configured) return;
    const photos = (readJson(PHOTOS_CLE) || []).slice(0, MAX_PHOTOS);
    try { await this.cloud.statePush(nomPhotos(nom), { photos }, false); }
    catch { /* la prochaine photo réessaiera */ }
  }

  async photosTirer() {
    const nom = this.getName();
    if (!nom || !this.cloud.configured) return [];
    try {
      const doc = await this.cloud.statePull(nomPhotos(nom));
      const distantes = (doc && doc.photos) || [];
      const local = readJson(PHOTOS_CLE) || [];
      const tout = [...new Set([...local, ...distantes])].slice(0, MAX_PHOTOS);
      writeJson(PHOTOS_CLE, tout);
      return tout;
    } catch { return readJson(PHOTOS_CLE) || []; }
  }

  async pull() {
    const name = this.getName();
    if (!name || !this.cloud.configured || !navigator.onLine) return { changed: false };
    let remote = null;
    try {
      remote = await this.cloud.statePull(name);
    } catch {
      this.noteFailure();
      return { changed: false };
    }
    // Lecture réussie : on sait désormais ce que le cloud contient, donc ce
    // qu'on écrira ensuite aura du sens. En cas d'échec on reste sur la
    // réserve et la boucle réessaiera de lire.
    this.hydrated = true;
    if (!remote) { await this.push(); return { changed: false }; } // first device: seed it
    remote = await this.dilater(remote);
    const { state, changed } = this.merge(this.snapshot(), remote);
    this.apply(state);
    // Cette lecture-ci arrive APRÈS que le jeu a chargé son monde depuis le
    // stockage de l'appareil. Sans prévenir la partie en cours, les blocs et
    // la position qu'on vient de descendre ne vivent que dans le stockage —
    // et la première sauvegarde du monde, encore périmé en mémoire, les
    // écrase. C'est ainsi qu'une construction faite sur un autre appareil
    // pouvait disparaître.
    if (changed && this.onMerged) this.onMerged(state);
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
        const remote = await this.dilater(await this.cloud.statePull(name));
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
    const body = JSON.stringify({ ...local, [STATE_TS]: 0 }); // ignore the clock when diffing
    if (body === this.lastPushed) return; // nothing actually changed
    const { paquet, dropped } = await this.ajuster(local);
    try {
      await this.cloud.statePush(name, paquet, keepalive);
      this.lastPushed = body;
      this.noteSuccess();
      if (dropped.length && this.onTrim) this.onTrim(dropped);
    } catch {
      this.noteFailure(); // réessayé au tour suivant, mais plus en silence
    }
  }

  noteSuccess() {
    const avant = this.failures;
    this.failures = 0;
    if (avant && this.onSaveState) this.onSaveState('ok');
  }

  noteFailure() {
    this.failures++;
    if (this.onSaveState) this.onSaveState(this.failures >= 2 ? 'ko' : 'retard');
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
