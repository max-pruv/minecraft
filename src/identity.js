// Playful, password-free identification: a child looks at the camera and the
// game recognises them, on any device. A 6-digit code is the backup.
//
// Privacy: no photo is ever stored or uploaded. face-api.js turns a face into
// a "signature" — 128 numbers describing it — and only that vector travels.
// The backup code is stored hashed, never in clear text.
//
// Everything degrades gracefully: no camera, no permission, bad light or an
// unrecognised face all fall back to the code, and then to simply tapping
// your own card, which never goes away.

const LOCAL_KEY = 'web-minecraft-identity-v1'; // device-wide, NOT per profile
const TRUST_KEY = 'web-minecraft-trust-v1';
const LOCK_KEY = 'web-minecraft-lockout-v1';
const PARENT_CODE = '135246'; // même code que la suppression d'un joueur
const MODEL_URL = './vendor/face-models';

// Once a device has proved who a child is, it stays trusted for a month —
// they are not asked again every single time they sit down to play.
const TRUST_DAYS = 30;

// Frein anti-tâtonnement. Il ne s'agit que d'empêcher un frère ou une sœur de
// tester des codes au hasard, pas de punir : une pause d'une heure a bloqué
// un enfant tout un après-midi pour des bugs qui n'étaient pas les siens.
//
// Trente secondes suffisent largement. Un code à six chiffres compte un
// million de combinaisons ; à trois essais par demi-minute, en épuiser ne
// serait-ce qu'un dixième demanderait plus de mille heures d'acharnement.
// Le plafond de cinq minutes garde donc toute son efficacité tout en restant
// à l'échelle de la patience d'un enfant.
const MAX_FAILS = 3;
const LOCK_BASE_MS = 30 * 1000;
const LOCK_MAX_MS = 5 * 60 * 1000;

// Version du format de verrou. Ceux d'avant ont été posés par le code qui
// enfermait dehors des enfants parfaitement légitimes : on les efface au lieu
// de les faire purger leur peine.
const LOCK_VERSION = 2;

// Sans faute pendant ce délai, on repart de zéro : les sanctions ne
// s'accumulent pas d'un jour sur l'autre.
const STRIKE_FORGET_MS = 15 * 60 * 1000;

// face-api's usual "same person" threshold is 0.6, but on the sample photos
// two *different* people measured as close as 0.52, so that would risk
// opening a sibling's account. Wrongly recognising someone is the one
// failure that actually matters here; not recognising them just falls
// through to the code, which costs nothing. Hence the tighter bar.
const MATCH_MAX_DISTANCE = 0.45;
const MATCH_MARGIN = 0.06;   // best match must beat the runner-up by this much
const KEEP_SIGNATURES = 5;   // rolling window: faces change as kids grow

let faceapiPromise = null;

// Loads the library and its models on first use only, so installing the game
// never pays for 8 MB the child may never need. Cached by the service worker
// afterwards, so it also works offline from then on.
// Le scanner pèse ~8 Mo : sur une connexion mobile, l'attente se compte en
// dizaines de secondes. On les télécharge donc nous-mêmes, en comptant les
// octets, pour montrer une vraie progression — sinon l'enfant fixe un écran
// figé sans savoir si ça avance. La lecture remplit le cache HTTP, si bien
// que le loadFromUri qui suit est instantané.
const ASSETS = [
  ['vendor/face-api.js', 1333943],
  ['vendor/face-models/tiny_face_detector_model-weights_manifest.json', 3000],
  ['vendor/face-models/tiny_face_detector_model.bin', 193321],
  ['vendor/face-models/face_landmark_68_model-weights_manifest.json', 8000],
  ['vendor/face-models/face_landmark_68_model.bin', 356840],
  ['vendor/face-models/face_recognition_model-weights_manifest.json', 19000],
  ['vendor/face-models/face_recognition_model.bin', 6444032],
];
const TOTAL_BYTES = ASSETS.reduce((a, [, n]) => a + n, 0);
const CACHED_FLAG = 'web-minecraft-scanner-cached';

// Taille unique de toutes les images analysées. Deux raisons, et la seconde
// est la plus importante : une caméra de téléphone sort du 1280×720 ou plus,
// qu'il est inutile d'analyser en entier pour un visage qui remplit le cadre ;
// et surtout, le réseau recompile ses calculs dès que la taille de l'image
// change. En figeant la taille, la compilation n'a lieu qu'une fois.
const DETECT_SIZE = 320;

// Déjà téléchargé une fois sur cet appareil : on saute la barre, tout vient
// du cache et l'attente se compte en millisecondes.
function scannerCached() {
  try { return localStorage.getItem(CACHED_FLAG) === '1'; } catch { return false; }
}

async function prefetchAssets(onProgress) {
  let done = 0;
  for (const [path, size] of ASSETS) {
    try {
      const res = await fetch(`./${path}`);
      if (!res.ok || !res.body) { done += size; onProgress?.(done / TOTAL_BYTES); continue; }
      const reader = res.body.getReader();
      for (;;) {
        const { done: end, value } = await reader.read();
        if (end) break;
        done += value.length;
        onProgress?.(Math.min(done / TOTAL_BYTES, 0.99));
      }
    } catch {
      done += size; // hors-ligne ou bloqué : loadFromUri retentera et parlera
      onProgress?.(done / TOTAL_BYTES);
    }
  }
  onProgress?.(1);
}

function loadFaceApi(onProgress, onPercent) {
  if (faceapiPromise) return faceapiPromise;
  faceapiPromise = (async () => {
    const cached = scannerCached();
    onProgress?.(cached ? 'Préparation du scanner…' : 'Je télécharge mon scanner…');
    if (!cached) await prefetchAssets(onPercent);
    if (!window.faceapi) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = './vendor/face-api.js';
        s.onload = resolve;
        s.onerror = () => reject(new Error('scanner indisponible'));
        document.head.appendChild(s);
      });
    }
    const f = window.faceapi;
    onProgress?.('Installation du scanner…');
    await f.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await f.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await f.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    try { localStorage.setItem(CACHED_FLAG, '1'); } catch { /* mode privé */ }

    // Le premier passage compile les calculs du réseau sur le processeur
    // graphique : c'est LUI, pas le téléchargement, qui faisait patienter
    // l'enfant devant « Je me réveille… ». On le paie ici, pendant que la
    // barre est encore à l'écran et qu'attendre est normal, sur une image
    // fabriquée de la taille exacte utilisée ensuite.
    //
    // L'ancien préchauffage plantait sur iPad parce qu'il utilisait un canvas
    // vierge, sans surface de dessin. Celui-ci en a une, il est vraiment
    // peint, et surtout il est protégé par le même garde-fou de temps que les
    // détections : s'il ne répond pas, on passe à la suite sans bloquer.
    onProgress?.('Je prépare mon cerveau… 🧠');
    try {
      const warm = document.createElement('canvas');
      warm.width = DETECT_SIZE;
      warm.height = DETECT_SIZE;
      const g = warm.getContext('2d');
      g.fillStyle = '#808080';
      g.fillRect(0, 0, DETECT_SIZE, DETECT_SIZE);
      // un peu de contraste : un aplat uniforme peut court-circuiter des
      // branches de calcul, et donc ne pas compiler ce qui servira vraiment
      for (let i = 0; i < 60; i++) {
        g.fillStyle = `hsl(${i * 6},60%,${30 + (i % 5) * 8}%)`;
        g.fillRect((i * 37) % DETECT_SIZE, (i * 53) % DETECT_SIZE, 24, 24);
      }
      await Promise.race([
        f.detectSingleFace(warm, new f.TinyFaceDetectorOptions({ inputSize: DETECT_SIZE, scoreThreshold: 0.4 }))
          .withFaceLandmarks().withFaceDescriptor(),
        new Promise((r) => setTimeout(r, 20000)),
      ]);
    } catch { /* le premier vrai passage le refera, en le disant */ }
    // NB: no blank-canvas warm-up here. It hung on iPad (a canvas with no
    // backing store never came back), leaving the child stuck on "presque
    // prêt". The first real detection pays the kernel-compilation cost
    // instead, and the capture loop says so while it happens.
    return f;
  })().catch((e) => { faceapiPromise = null; throw e; });
  return faceapiPromise;
}

// Lance le chargement du scanner en tâche de fond, pendant que l'enfant est
// encore sur l'accueil : quand il touchera « Reconnais-moi », tout sera prêt.
// On s'abstient hors-ligne, en mode économie de données, et sur une connexion
// lente ou facturée — 8 Mo à l'insu du parent ne sont pas un cadeau.
export function prefetchScanner() {
  if (faceapiPromise || scannerCached()) return;
  if (!navigator.onLine) return;
  const c = navigator.connection;
  if (c && (c.saveData || /^(slow-)?2g$/.test(c.effectiveType || ''))) return;
  const start = () => { loadFaceApi().catch(() => {}); };
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 8000 });
  else setTimeout(start, 3000);
}

// Conseils qui montent en précision quand ça traîne. Sur un iPad tenu à bout
// de bras, le visage occupe le quart du cadre et le détecteur ne trouve rien —
// sans un mot pour le dire, l'enfant fixe l'écran et conclut que c'est cassé.
const CONSEILS = [
  [0, '⏳ Regarde bien la caméra'],
  [4, '📏 Approche-toi : ton visage doit remplir le rond'],
  [9, '💡 Mets la lumière devant toi, pas derrière'],
  [15, "🧢 Enlève casquette ou lunettes, et tiens l'appareil à hauteur des yeux"],
  [22, '🙂 Reste bien immobile deux secondes'],
];

function conseil(secondes) {
  let txt = CONSEILS[0][1];
  for (const [t, m] of CONSEILS) if (secondes >= t) txt = m;
  return txt;
}

function distance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; sum += d * d; }
  return Math.sqrt(sum);
}

async function hashPin(name, pin) {
  const data = new TextEncoder().encode(`web-minecraft:${name}:${pin}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export class Identity {
  constructor(cloud, raw) {
    this.cloud = cloud;
    this.raw = raw || {
      get: (k) => localStorage.getItem(k),
      set: (k, v) => localStorage.setItem(k, v),
    };
    this.local = this.loadLocal();
    this.remote = {};   // name -> { faces, pin_hash } pulled from the cloud
    this.injectUI();
  }

  loadLocal() {
    try { return JSON.parse(this.raw.get(LOCAL_KEY)) || {}; } catch { return {}; }
  }

  saveLocal() {
    try { this.raw.set(LOCAL_KEY, JSON.stringify(this.local)); } catch { /* full */ }
  }

  entry(name) {
    const l = this.local[name] || {};
    const r = this.remote[name] || {};
    // local wins for faces (freshest), cloud fills in what this device lacks
    return {
      faces: (l.faces && l.faces.length ? l.faces : r.faces) || [],
      pinHash: l.pinHash || r.pin_hash || null,
    };
  }

  // Tous les comptes contre lesquels on peut légitimement tenter une
  // reconnaissance : ceux de l'appareil, plus ceux du cloud. Un enfant qui
  // arrive sur un appareil neuf n'a rien en local — c'est justement le cas où
  // il a le plus besoin d'être reconnu.
  candidates(names = []) {
    const all = new Set(names.filter(Boolean));
    for (const n of Object.keys(this.local)) if (this.isEnrolled(n)) all.add(n);
    for (const n of Object.keys(this.remote)) if (this.isEnrolled(n)) all.add(n);
    return [...all];
  }

  isEnrolled(name) {
    const e = this.entry(name);
    return e.faces.length > 0 || !!e.pinHash;
  }

  // Skin/hair sampled at enrolment, if this device captured it.
  lookFor(name) {
    return (this.local[name] || {}).look || null;
  }

  // ---- trusted device -------------------------------------------------------

  trustMap() {
    try { return JSON.parse(this.raw.get(TRUST_KEY)) || {}; } catch { return {}; }
  }

  isTrusted(name) {
    return (this.trustMap()[name] || 0) > Date.now();
  }

  trust(name) {
    const m = this.trustMap();
    m[name] = Date.now() + TRUST_DAYS * 86400000;
    try { this.raw.set(TRUST_KEY, JSON.stringify(m)); } catch { /* ignore */ }
  }

  // ---- lockout after repeated failures ---------------------------------------

  lockState() {
    const fresh = () => ({ fails: 0, strikes: 0, until: 0, v: LOCK_VERSION, last: 0 });
    let s;
    try { s = JSON.parse(this.raw.get(LOCK_KEY)); } catch { return fresh(); }
    if (!s) return fresh();
    // verrou hérité de l'ancienne règle : on l'efface plutôt que de le purger
    if (s.v !== LOCK_VERSION) { const f = fresh(); this.saveLock(f); return f; }
    // plus aucune faute depuis un moment : l'ardoise est effacée
    if (s.last && Date.now() - s.last > STRIKE_FORGET_MS && !(s.until > Date.now())) return fresh();
    return s;
  }

  saveLock(s) {
    try { this.raw.set(LOCK_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  }

  clearLock() {
    this.saveLock({ fails: 0, strikes: 0, until: 0, v: LOCK_VERSION, last: 0 });
  }

  lockedFor() {
    const s = this.lockState();
    return Math.max(0, s.until - Date.now());
  }

  registerFailure() {
    const s = this.lockState();
    s.fails = (s.fails || 0) + 1;
    s.last = Date.now();
    if (s.fails >= MAX_FAILS) {
      s.strikes = (s.strikes || 0) + 1;
      s.fails = 0;
      s.until = Date.now() + Math.min(LOCK_BASE_MS * 2 ** (s.strikes - 1), LOCK_MAX_MS);
    }
    this.saveLock(s);
    return s;
  }

  registerSuccess(name) {
    this.saveLock({ fails: 0, strikes: 0, until: 0, v: LOCK_VERSION, last: 0 });
    if (name) this.trust(name);
  }

  // Shows the "come back later" screen when frozen. Returns true if locked.
  // Un parent peut toujours lever la pause : sans cette porte, un enfant que
  // le jeu a bloqué à tort reste dehors une heure entière sans recours.
  guardLocked(retry) {
    const ms = this.lockedFor();
    if (ms <= 0) return false;
    const secs = Math.ceil(ms / 1000);
    const txt = secs < 60 ? `${secs} secondes` : `${Math.ceil(secs / 60)} min`;
    this.show('⏳ Petite pause', `Pour protéger les comptes, la reconnaissance se repose un instant. Réessaie dans ${txt}.`);
    this.say('Tu peux toujours toucher ta carte pour jouer 🙂');
    this.button('👨‍👩‍👧 Un parent débloque', 'id-secondary', () => {
      const code = window.prompt('Code parental :');
      if (code === null) return;
      if (code !== PARENT_CODE) { window.alert('Code incorrect !'); return; }
      this.saveLock({ fails: 0, strikes: 0, until: 0, v: LOCK_VERSION, last: 0 });
      this.hide();
      if (retry) retry(); else this.say('Débloqué ✅');
    });
    this.button('OK', 'id-secondary', () => this.hide());
    return true;
  }

  // Pull every known child's signatures so a brand-new device can recognise
  // them straight away. Safe to call repeatedly; silent when offline.
  async syncFromCloud() {
    if (!navigator.onLine) return;
    try {
      const rows = await this.cloud.identityPullAll();
      this.remote = {};
      for (const r of rows) this.remote[r.name] = r;
    } catch { /* offline: local signatures still work */ }
  }

  async pushToCloud(name) {
    const e = this.local[name];
    if (!e) return;
    try {
      await this.cloud.identityPush(name, { faces: e.faces || [], pinHash: e.pinHash || null });
    } catch { /* will re-sync later */ }
  }

  // ---- camera ---------------------------------------------------------------

  async openCamera(video) {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } },
      audio: false,
    });
    video.srcObject = stream;
    video.setAttribute('playsinline', '');
    video.muted = true;
    await video.play();
    return stream;
  }

  stopCamera(stream) {
    if (stream) for (const t of stream.getTracks()) t.stop();
  }

  // One face signature from the live video, or null if no face is visible.
  async snapshot(video) {
    const res = await this.detect(video);
    return res ? res.sig : null;
  }

  // Recadre le carré central de la vidéo dans un canvas de taille fixe. Le
  // rond de l'interface montre déjà ce carré-là, donc on n'analyse que ce que
  // l'enfant voit — et le réseau reçoit toujours la même taille d'image.
  frame(video) {
    const w = video.videoWidth, h = video.videoHeight;
    if (!w || !h) return null; // le flux n'a pas encore de dimensions
    if (!this._canvas) {
      this._canvas = document.createElement('canvas');
      this._canvas.width = DETECT_SIZE;
      this._canvas.height = DETECT_SIZE;
      this._ctx = this._canvas.getContext('2d', { willReadFrequently: true });
    }
    const side = Math.min(w, h);
    this._ctx.drawImage(video, (w - side) / 2, (h - side) / 2, side, side, 0, 0, DETECT_SIZE, DETECT_SIZE);
    return this._canvas;
  }

  async detect(video) {
    const f = await loadFaceApi();
    // On iOS Safari the GPU backend's first inference can hang forever (the
    // original iPad "presque prêt" freeze — removing the warm-up only moved
    // it here). So every detection races a watchdog; on the first hang or
    // error we switch tf to the CPU backend — slower, but it always answers —
    // and retry.
    const input = this.frame(video);
    // Caméra pas encore prête : ce n'est pas une panne du scanner. Sans ce
    // garde, la toute première détection levait une erreur et faisait basculer
    // la session entière en mode tortue, plus lent, pour rien.
    if (!input) return null;
    const run = () => f
      .detectSingleFace(input, new f.TinyFaceDetectorOptions({
        inputSize: DETECT_SIZE, scoreThreshold: 0.4,
      }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    const withTimeout = (p, ms) => Promise.race([
      p, new Promise((_, rej) => setTimeout(() => rej(new Error('détection trop lente')), ms)),
    ]);
    let res;
    try {
      res = await withTimeout(run(), this._cpuMode ? 30000 : 12000);
    } catch (e) {
      if (this._cpuMode) throw e;
      this._cpuMode = true;
      this.say?.('🐢 Mon scanner rapide ne répond pas — je passe en mode tortue…');
      try { await f.tf.setBackend('cpu'); await f.tf.ready(); } catch { /* cpu is always there */ }
      res = await withTimeout(run(), 30000); // a real failure here surfaces to the caller
    }
    if (!res) return null;
    return {
      // 4 decimals keeps the vector accurate but small enough to sync cheaply
      sig: [...res.descriptor].map((v) => Math.round(v * 10000) / 10000),
      res,
    };
  }

  // Reads skin and hair colour off the same frame, so the child's character
  // can be made to look like them. Only two colours are kept — still no
  // photo, and the child can always change them in the character menu.
  sampleLook(video, res) {
    try {
      // On lit les couleurs sur l'image même qui a servi à la détection : les
      // repères du visage sont exprimés dans SES coordonnées, pas dans celles
      // de la vidéo d'origine (recadrée et redimensionnée avant analyse).
      const c = this._canvas;
      if (!c) return null;
      const w = c.width, h = c.height;
      const g = this._ctx;
      const pts = res.landmarks.positions;
      const box = res.detection.box;

      const patch = (x, y) => {
        x = Math.round(x); y = Math.round(y);
        if (x < 2 || y < 2 || x > w - 3 || y > h - 3) return null;
        const d = g.getImageData(x - 2, y - 2, 5, 5).data;
        let r = 0, gg = 0, b = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
        const n = d.length / 4;
        return [r / n, gg / n, b / n];
      };
      const median = (list) => {
        const ok = list.filter(Boolean);
        if (!ok.length) return null;
        return [0, 1, 2].map((i) => {
          const vals = ok.map((p) => p[i]).sort((a, b) => a - b);
          return Math.round(vals[Math.floor(vals.length / 2)]);
        });
      };
      const hex = (p) => (p[0] << 16) | (p[1] << 8) | p[2];

      // cheeks: between the jaw line and the nose, well clear of eyes/mouth
      const nose = pts[30];
      const skin = median([
        patch((pts[2].x + nose.x) / 2, (pts[2].y + nose.y) / 2),
        patch((pts[14].x + nose.x) / 2, (pts[14].y + nose.y) / 2),
        patch(nose.x, nose.y - box.height * 0.05),
      ]);
      // hair: a band above the eyebrows, roughly where the hairline sits
      const browY = Math.min(pts[19].y, pts[24].y);
      const up = box.height * 0.3;
      const hair = median([
        patch(pts[19].x, browY - up),
        patch(pts[24].x, browY - up),
        patch((pts[19].x + pts[24].x) / 2, browY - up * 1.15),
      ]);
      if (!skin) return null;
      const look = { skin: hex(skin) };
      // if the "hair" sample came back as skin (high forehead) or as a blown
      // out background, keep a sensible default rather than a silly colour
      if (hair) {
        const diff = Math.abs(hair[0] - skin[0]) + Math.abs(hair[1] - skin[1]) + Math.abs(hair[2] - skin[2]);
        const bright = (hair[0] + hair[1] + hair[2]) / 3;
        if (diff > 40 && bright < 235) look.hair = hex(hair);
      }
      return look;
    } catch { return null; }
  }

  // Best matching child for a signature, or null when nothing is close enough.
  match(sig, names) {
    const scored = [];
    for (const name of names) {
      const faces = this.entry(name).faces;
      if (!faces.length) continue;
      const best = Math.min(...faces.map((f) => distance(sig, f)));
      scored.push({ name, d: best });
    }
    if (!scored.length) return null;
    scored.sort((a, b) => a.d - b.d);
    const [first, second] = scored;
    if (first.d > MATCH_MAX_DISTANCE) return null;
    // with several children enrolled, insist on a clear winner
    if (second && second.d - first.d < MATCH_MARGIN) return null;
    return first.name;
  }

  // Un prénom qui change ne doit pas laisser le visage derrière lui.
  //
  // Sans cela, changer de prénom coupe l'enfant en deux : le jeu l'appelle par
  // son nouveau prénom et sauvegarde sa partie dessous, tandis que ses
  // empreintes dorment sous l'ancien. Au « Reconnais-moi » suivant, le
  // scanner le salue sous son ancien nom — et lui ouvre l'ancien compte, vide.
  //
  // On emporte donc les empreintes et le code, puis on vide l'ancien compte :
  // deux comptes pour un même visage, c'est le hasard des empreintes qui
  // décide lequel gagne.
  async rename(ancien, nouveau) {
    if (!ancien || !nouveau || ancien === nouveau) return false;
    const src = this.entry(ancien);
    if (!src.faces.length && !src.pinHash) return false;
    const cible = this.local[nouveau] || (this.local[nouveau] = {});
    // les empreintes du compte d'arrivée en dernier : ce sont les plus
    // récentes, et ce sont elles que la fenêtre glissante doit garder
    cible.faces = [...src.faces, ...(cible.faces || [])].slice(-KEEP_SIGNATURES);
    cible.pinHash = cible.pinHash || src.pinHash;
    if (!cible.look && this.local[ancien] && this.local[ancien].look) {
      cible.look = this.local[ancien].look;
    }
    delete this.local[ancien];
    this.saveLocal();
    await this.pushToCloud(nouveau);
    try {
      await this.cloud.identityPush(ancien, { faces: [], pinHash: null });
      delete this.remote[ancien];
    } catch { /* hors-ligne : l'ancien compte reste, sans conséquence locale */ }
    return true;
  }

  // Keeps the signature fresh as a child grows, using the photo already taken
  // for the successful match — the child is never asked to re-enrol.
  learn(name, sig) {
    const e = this.local[name] || (this.local[name] = {});
    e.faces = [...(e.faces || []), sig].slice(-KEEP_SIGNATURES);
    this.saveLocal();
    this.pushToCloud(name);
  }

  async setPin(name, pin) {
    const e = this.local[name] || (this.local[name] = {});
    e.pinHash = await hashPin(name, pin);
    this.saveLocal();
    await this.pushToCloud(name);
  }

  async checkPin(name, pin) {
    const stored = this.entry(name).pinHash;
    if (!stored) return false;
    return stored === await hashPin(name, pin);
  }

  // Which enrolled child does this code belong to? Lets a child type their
  // code without first saying who they are.
  async whoHasPin(pin, names) {
    for (const name of names) {
      if (await this.checkPin(name, pin)) return name;
    }
    return null;
  }

  // ---- UI -------------------------------------------------------------------

  injectUI() {
    const style = document.createElement('style');
    style.textContent = `
      #id-modal { position:fixed; inset:0; background:rgba(8,10,18,.94); z-index:120;
        display:none; align-items:center; justify-content:center; padding:16px;
        overscroll-behavior:contain; }
      #id-box { width:min(94vw,420px); max-height:92vh; overflow-y:auto; text-align:center;
        background:#121826; border:1px solid rgba(255,255,255,.2); border-radius:18px;
        padding:20px 18px; color:#eef; }
      #id-box h2 { margin:0 0 6px; font-size:21px; }
      /* fil d'Ariane de l'inscription : l'enfant voit toujours où il en est
         et combien il en reste — deux étapes, jamais une de plus */
      #id-steps { display:none; justify-content:center; gap:8px; margin-bottom:12px; }
      #id-steps span { display:flex; align-items:center; gap:5px; font-size:12px;
        padding:4px 10px; border-radius:999px; background:rgba(255,255,255,.07);
        color:#7f90b0; border:1px solid transparent; }
      #id-steps span.on { background:rgba(58,106,208,.25); color:#cfe0ff; border-color:#3a6ad0; }
      #id-steps span.done { background:rgba(90,200,140,.18); color:#a8e6c1; }
      /* téléchargement du scanner : ~8 Mo, il faut le montrer */
      #id-load { display:none; margin:10px 0 4px; }
      #id-load-bar { height:10px; border-radius:999px; background:rgba(255,255,255,.1); overflow:hidden; }
      #id-load-fill { height:100%; width:0%; border-radius:999px; background:linear-gradient(90deg,#3a6ad0,#6fa8ff);
        transition:width .25s ease; }
      #id-load-txt { font-size:12px; color:#9fb0d0; margin-top:6px; }
      /* Le temps d'analyse est incompressible : ce halo qui tourne autour du
         rond dit « ça travaille » quand aucun pourcentage ne peut le dire. */
      #id-stage.busy::after { content:''; position:absolute; inset:-4px; border-radius:50%;
        border:4px solid transparent; border-top-color:#6fa8ff; border-right-color:#6fa8ff;
        animation:id-spin 1s linear infinite; }
      @keyframes id-spin { to { transform:rotate(360deg); } }
      #id-msg.busy::after { content:''; animation:id-dots 1.2s steps(4,end) infinite; }
      @keyframes id-dots { 0%{content:''} 25%{content:'.'} 50%{content:'..'} 75%{content:'...'} }
      #id-sub { color:#9fb0d0; font-size:15px; line-height:1.5; margin-bottom:14px; }
      #id-stage { position:relative; width:230px; height:230px; margin:0 auto 14px;
        border-radius:50%; overflow:hidden; background:#0a0e18;
        border:4px solid #3a6ad0; display:none; }
      #id-stage.scan { border-color:#ffd75e; animation:idpulse 1s ease-in-out infinite; }
      #id-stage.ok { border-color:#5ab46e; }
      @keyframes idpulse { 0%,100%{ box-shadow:0 0 0 0 rgba(255,215,94,.5) }
        50%{ box-shadow:0 0 0 14px rgba(255,215,94,0) } }
      #id-video { width:100%; height:100%; object-fit:cover; transform:scaleX(-1); }
      /* Un gabarit au centre du cercle : la caméra voit large, l'analyse veut
         un visage qui remplit le cadre. Sans repère, l'enfant se place à un
         mètre et le scanner ne trouve rien. */
      #id-guide {
        position:absolute; inset:0; pointer-events:none; display:none;
      }
      #id-stage.scan #id-guide { display:block; }
      #id-guide::before {
        content:''; position:absolute; left:50%; top:46%; transform:translate(-50%,-50%);
        width:56%; height:70%; border:3px dashed rgba(255,255,255,.55);
        border-radius:50% 50% 46% 46%;
      }
      #id-shots { display:flex; gap:8px; justify-content:center; margin-bottom:12px; }
      .id-dot { width:14px; height:14px; border-radius:50%; background:rgba(255,255,255,.18); }
      .id-dot.on { background:#5ab46e; }
      #id-pin { display:none; }
      #id-pin-dots { display:flex; gap:10px; justify-content:center; margin:14px 0; }
      .pin-dot { width:16px; height:16px; border-radius:50%; border:2px solid #4a5a7a; }
      .pin-dot.on { background:#ffd75e; border-color:#ffd75e; }
      #id-pad { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; max-width:280px; margin:0 auto; }
      #id-pad button { padding:16px 0; font-size:24px; border-radius:14px; border:none;
        background:rgba(255,255,255,.1); color:#fff; }
      #id-pad button:active { background:#3a6ad0; }
      #id-actions { display:flex; flex-direction:column; gap:9px; margin-top:16px; }
      #id-actions.grid { display:grid; grid-template-columns:repeat(2,1fr); }
      #id-actions.grid button { padding:11px 4px; font-size:15px; }
      #id-actions button { padding:13px; font-size:16px; border-radius:13px; border:none; }
      .id-primary { background:#3a9a4a; color:#fff; }
      .id-secondary { background:rgba(255,255,255,.12); color:#cdd; }
      #id-msg { min-height:22px; font-size:15px; margin-top:8px; }
      #id-msg.err { color:#ff9d8a; }
      #id-msg.ok { color:#7de08a; }
    `;
    document.head.appendChild(style);

    const box = document.createElement('div');
    box.id = 'id-modal';
    box.innerHTML = `<div id="id-box">
      <div id="id-steps"></div>
      <h2 id="id-title"></h2>
      <div id="id-sub"></div>
      <div id="id-load"><div id="id-load-bar"><div id="id-load-fill"></div></div><div id="id-load-txt"></div></div>
      <div id="id-stage"><video id="id-video" playsinline muted></video><div id="id-guide"></div></div>
      <div id="id-shots"></div>
      <div id="id-pin">
        <div id="id-pin-dots"></div>
        <div id="id-pad"></div>
      </div>
      <div id="id-msg"></div>
      <div id="id-actions"></div>
    </div>`;
    document.body.appendChild(box);

    this.el = {
      modal: box,
      steps: box.querySelector('#id-steps'),
      load: box.querySelector('#id-load'),
      loadFill: box.querySelector('#id-load-fill'),
      loadTxt: box.querySelector('#id-load-txt'),
      title: box.querySelector('#id-title'),
      sub: box.querySelector('#id-sub'),
      stage: box.querySelector('#id-stage'),
      video: box.querySelector('#id-video'),
      shots: box.querySelector('#id-shots'),
      pin: box.querySelector('#id-pin'),
      pinDots: box.querySelector('#id-pin-dots'),
      pad: box.querySelector('#id-pad'),
      msg: box.querySelector('#id-msg'),
      actions: box.querySelector('#id-actions'),
    };

    for (const n of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']) {
      const b = document.createElement('button');
      b.textContent = n;
      if (!n) { b.style.visibility = 'hidden'; }
      b.addEventListener('click', () => this.onPad(n));
      this.el.pad.appendChild(b);
    }
  }

  // Barre de téléchargement du scanner. `null` la range.
  setLoad(pct) {
    if (pct === null) { this.el.load.style.display = 'none'; return; }
    const n = Math.round(Math.max(0, Math.min(1, pct)) * 100);
    this.el.load.style.display = 'block';
    this.el.loadFill.style.width = n + '%';
    this.el.loadTxt.textContent = n < 100
      ? `${n}% — je ne le téléchargerai qu'une seule fois 😊`
      : 'Presque prêt…';
  }

  // Halo tournant autour du rond : la seule façon de dire « ça travaille »
  // quand la durée n'est pas mesurable et qu'aucun pourcentage n'existe.
  busy(on) {
    this.el.stage.classList.toggle('busy', !!on);
    if (!on) this.el.msg.classList.remove('busy');
  }

  show(title, sub) {
    this.busy(false);
    this.el.load.style.display = 'none';
    this.el.steps.style.display = 'none'; // réaffiché par setSteps sur l'inscription
    this.el.title.textContent = title;
    this.el.sub.textContent = sub || '';
    this.el.actions.classList.remove('grid');
    this.el.msg.textContent = '';
    this.el.msg.className = '';
    this.el.stage.style.display = 'none';
    this.el.stage.className = '';
    this.el.shots.innerHTML = '';
    this.el.pin.style.display = 'none';
    this.el.actions.innerHTML = '';
    this.el.modal.style.display = 'flex';
  }

  // Inscription en deux temps : la photo, puis le code de secours. L'enfant
  // voit les deux dès le départ, donc il sait qu'il reste quelque chose après
  // le scan — avant, le code arrivait par surprise et se faisait sauter.
  setSteps(current) {
    const labels = [['1', '📸 Ta photo'], ['2', '🔢 Ton code']];
    this.el.steps.innerHTML = '';
    for (const [n, label] of labels) {
      const s = document.createElement('span');
      const num = Number(n);
      s.className = num === current ? 'on' : (num < current ? 'done' : '');
      s.textContent = (num < current ? '✓ ' : `${n}. `) + label;
      this.el.steps.appendChild(s);
    }
    this.el.steps.style.display = 'flex';
  }

  hide() {
    this.el.modal.style.display = 'none';
    this.stopCamera(this._stream);
    this._stream = null;
  }

  say(msg, kind = '') {
    this.el.msg.textContent = msg;
    this.el.msg.className = kind;
  }

  button(label, kind, onClick) {
    const b = document.createElement('button');
    b.className = kind;
    b.textContent = label;
    b.addEventListener('click', onClick);
    this.el.actions.appendChild(b);
    return b;
  }

  // ---- 6-digit code pad -----------------------------------------------------

  onPad(n) {
    if (!this._pin) return;
    if (n === '⌫') this._pin.value = this._pin.value.slice(0, -1);
    else if (n && this._pin.value.length < 6) this._pin.value += n;
    else return;
    this.renderPinDots();
    if (this._pin.value.length === 6) this._pin.onFull(this._pin.value);
  }

  renderPinDots() {
    this.el.pinDots.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const d = document.createElement('div');
      d.className = 'pin-dot' + (i < this._pin.value.length ? ' on' : '');
      this.el.pinDots.appendChild(d);
    }
  }

  askPin(onFull) {
    this._pin = { value: '', onFull };
    this.el.pin.style.display = 'block';
    this.renderPinDots();
  }

  clearPin() {
    if (this._pin) this._pin.value = '';
    this.renderPinDots();
  }

  // ---- flows ----------------------------------------------------------------

  // Sign-up for a child who has no face/code yet — including the profiles
  // that already existed before this feature arrived. Skippable at every
  // step: a child who skips everything keeps playing exactly as before.
  async enroll(name, { onDone, direct = false } = {}) {
    // a brand-new account has just been through name + grade, so it goes
    // straight to the scan; the code is still one tap away from there
    if (direct) return this.enrollFace(name, onDone);
    this.show(`Salut ${name} ! 🔒`, "On sécurise ton compte pour que personne d'autre ne joue à ta place. C'est rapide et rigolo !");
    this.button('📸 Scanner mon visage', 'id-primary', () => this.enrollFace(name, onDone));
    this.button('🔢 Juste un code secret', 'id-secondary', () => this.enrollPin(name, onDone));
    this.button('Plus tard', 'id-secondary', () => { this.hide(); onDone?.(false); });
  }

  async enrollFace(name, onDone, refresh = false) {
    this.show(`📸 Regarde la caméra, ${name} !`,
      (refresh
        ? 'Je prends 3 nouvelles photos pour te reconnaître encore mieux — tu changes en grandissant !'
        : 'Les 3 photos se prennent toutes seules dès que je vois ton visage.')
      + " Approche-toi jusqu'à remplir le rond en pointillés, bien en face."
      + " (aucune photo n'est gardée, juste une empreinte secrète)");
    // le fil d'Ariane n'a de sens qu'à l'inscription : une mise à jour de
    // photos est une action isolée, pas la première étape de quelque chose
    if (!refresh) this.setSteps(1);
    this.el.stage.style.display = 'block';
    for (let i = 0; i < 3; i++) {
      const d = document.createElement('div');
      d.className = 'id-dot';
      this.el.shots.appendChild(d);
    }
    this.button('🔢 Plutôt un code secret', 'id-secondary', () => {
      this.stopCamera(this._stream); this._stream = null;
      this.enrollPin(name, onDone);
    });
    this.button('Annuler', 'id-secondary', () => { this.hide(); onDone?.(false); });

    try {
      this._stream = await this.openCamera(this.el.video);
    } catch {
      this.say("Pas d'accès à la caméra 😕 — on va faire un code secret à la place.", 'err');
      setTimeout(() => this.enrollPin(name, onDone), 1600);
      return;
    }
    try {
      await loadFaceApi((m) => this.say(m), (p) => this.setLoad(p));
      this.setLoad(null);
    } catch {
      this.setLoad(null);
      this.say('Scanner indisponible — on fait un code secret.', 'err');
      setTimeout(() => this.enrollPin(name, onDone), 1600);
      return;
    }

    // Shots are taken automatically as soon as a face is visible, but the
    // button makes that obvious — the first version gave no clue whether
    // anything was happening.
    const sigs = [];
    let look = null;
    let first = true;
    const debut = Date.now();
    const deadline = debut + 60000;
    // les secondes ne comptent que depuis la dernière photo réussie : après un
    // cliché, on repart des conseils simples plutôt que de continuer à
    // haranguer un enfant qui s'en sort très bien
    let depuisCliche = debut;
    this.el.stage.className = 'scan';
    while (sigs.length < 3 && Date.now() < deadline) {
      if (this.el.modal.style.display === 'none') return; // cancelled
      this.say(`Cliché ${sigs.length + 1}/3 — ${conseil((Date.now() - depuisCliche) / 1000)}`,
        first ? 'busy' : '');
      this.busy(true); // une analyse dure : montrer que ça tourne
      let shot = null;
      try {
        shot = await this.detect(this.el.video);
      } catch {
        break; // scanner really down on this device — the code path takes over
      }
      first = false;
      this.busy(false);
      if (shot) {
        sigs.push(shot.sig);
        if (!look) look = this.sampleLook(this.el.video, shot.res); // for the avatar
        this.el.shots.children[sigs.length - 1].classList.add('on');
        depuisCliche = Date.now();
        this.say(`📸 Cliché ${sigs.length}/3 pris !`, 'ok');
        await new Promise((r) => setTimeout(r, 700)); // slight pose change
      } else {
        this.say('🔍 Je ne vois pas encore ton visage — approche-toi un peu !');
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    this.stopCamera(this._stream);
    this._stream = null;

    if (sigs.length === 0) {
      if (refresh) { // ses anciennes photos restent valables, rien n'est perdu
        this.say("Je n'ai pas réussi à te voir 😕 — tes photos d'avant marchent toujours.", 'err');
        setTimeout(() => { this.hide(); onDone?.(false); }, 2200);
        return;
      }
      this.say("Je n'ai pas réussi à te voir 😕 — on fait un code secret.", 'err');
      setTimeout(() => this.enrollPin(name, onDone), 1800);
      return;
    }
    // Ce visage appartient-il déjà à quelqu'un ?
    //
    // Un même enfant sous deux prénoms, et c'est le hasard des empreintes qui
    // décide lequel le jeu salue au « Reconnais-moi » — celui qui en a le plus,
    // ou la mieux réussie, l'emporte. Le doublon ne se voit pas au moment où
    // il se crée : il se paie des jours plus tard, quand le jeu appelle
    // l'enfant par un prénom qu'il n'utilise plus et lui ouvre un compte vide.
    // Alors on pose la question tout de suite, tant qu'elle est simple.
    const autres = this.candidates().filter((n) => n !== name);
    const connu = autres.length ? sigs.map((s) => this.match(s, autres)).find(Boolean) : null;
    if (connu) {
      const choix = await new Promise((resolve) => {
        this.show('😊 Je te reconnais !', `Ce visage, c'est déjà celui de ${connu}. C'est bien toi ?`);
        this.button(`✅ Oui — je m'appelle ${name} maintenant`, 'id-primary', () => resolve('fusion'));
        this.button('🙅 Non, on est deux personnes', 'id-secondary', () => resolve('separe'));
      });
      if (choix === 'fusion') {
        this.say('🧳 Je rassemble tes affaires…', 'busy');
        await this.rename(connu, name);
        try { await this.onRenamed?.(connu, name); } catch { /* la partie suit quand même */ }
      }
      this.el.stage.style.display = 'block';
    }

    const e = this.local[name] || (this.local[name] = {});
    // On complète au lieu de remplacer : si les nouvelles photos sont ratées
    // (contre-jour, grimace), les anciennes le reconnaissent encore. La
    // fenêtre glissante fait que les plus vieilles finissent par sortir, donc
    // l'empreinte suit l'enfant qui grandit sans jamais l'enfermer dehors.
    e.faces = [...(e.faces || []), ...sigs].slice(-KEEP_SIGNATURES);
    // kept against the name, not the active profile: a brand-new account
    // enrols before the game has switched into it, and this survives the
    // reload so their character still ends up looking like them
    if (look) e.look = look;
    this.saveLocal();
    this.pushToCloud(name);
    this.registerSuccess(name); // this device now knows them
    if (look) this.onLook?.(name, look);
    this.el.stage.className = 'ok';
    if (refresh) {
      this.say(`✨ C'est bon ${name} — je te reconnaîtrai encore mieux !`, 'ok');
      setTimeout(() => { this.hide(); onDone?.(true); }, 1800);
      return;
    }
    this.say(`✨ C'est toi, ${name} ! Étape 1 terminée — on passe au code 🔢`, 'ok');
    setTimeout(() => this.enrollPin(name, onDone, true), 1700);
  }

  enrollPin(name, onDone, afterFace = false) {
    this.show('🔢 Ton code secret',
      afterFace ? "Dernière étape ! Choisis 6 chiffres — c'est ta clé de secours si la photo ne marche pas un jour."
                : 'Choisis 6 chiffres que tu retiendras bien.');
    this.setSteps(2);
    let first = null;
    this.askPin(async (value) => {
      if (!first) {
        first = value;
        this.clearPin();
        this.say('Encore une fois, pour être sûr 🙂');
        return;
      }
      if (value !== first) {
        first = null;
        this.clearPin();
        this.say('Les deux codes sont différents — on recommence !', 'err');
        return;
      }
      await this.setPin(name, value);
      this.say('🎉 Code enregistré ! Ton compte est sécurisé.', 'ok');
      setTimeout(() => { this.hide(); onDone?.(true); }, 1400);
    });
    this.button('Plus tard', 'id-secondary', () => { this.hide(); onDone?.(!!afterFace); });
  }

  // Proves a specific child is really the one sitting there. Used when a
  // secured profile is picked on a device that hasn't seen them for a while;
  // a trusted device skips this entirely for 30 days.
  // `strict` : ici on ne cherche pas « qui es-tu ? » mais « es-tu bien lui ? ».
  // Sans ça, la reconnaissance comparait au passage tous les comptes connus,
  // et le frère reconnu à la place de la sœur ouvrait quand même la porte —
  // de quoi changer le code secret de quelqu'un d'autre.
  async verify(name, { onOk, onCancel } = {}) {
    if (this.guardLocked()) return;
    // a child who only set a code shouldn't have the camera opened at them
    if (!this.entry(name).faces.length) {
      this.pinLogin([name], () => onOk?.(), true);
      return;
    }
    await this.recognize([name], {
      onMatch: (who) => { if (who === name) onOk?.(); else onCancel?.(); },
      onCancel,
      strict: true,
      title: `👋 C'est bien toi, ${name} ?`,
    });
  }

  // Depuis « Mon personnage » : rafraîchir ses photos (un enfant change vite)
  // ou changer son code. On redemande d'abord de prouver qui on est, sinon
  // n'importe qui trouvant l'appareil ouvert pourrait s'approprier le compte.
  // Un compte pas encore sécurisé n'a rien à prouver : on l'inscrit.
  secureChange(name, kind, onDone) {
    if (!name) return;
    if (!this.isEnrolled(name)) return this.enroll(name, { onDone });

    // Changer le code exige le code actuel, pas le visage. Se laisser
    // reconnaître prouve seulement qu'on est bien devant l'appareil ; ça ne
    // prouve pas qu'on connaît le secret qu'on s'apprête à remplacer.
    if (kind === 'pin' && this.entry(name).pinHash) {
      return this.askCurrentPin(name, () => this.enrollPin(name, onDone), () => onDone?.(false));
    }
    const go = () => {
      if (kind === 'pin') this.enrollPin(name, onDone);
      else this.enrollFace(name, onDone, true);
    };
    this.verify(name, { onOk: go, onCancel: () => onDone?.(false) });
  }

  // Demande le code en cours avant d'en choisir un autre. Les erreurs
  // comptent comme partout ailleurs : on ne devine pas un code ici non plus.
  askCurrentPin(name, onOk, onCancel) {
    if (this.guardLocked(() => this.askCurrentPin(name, onOk, onCancel))) return;
    this.show('🔐 Ton code actuel', `D'abord ton code d'aujourd'hui, ${name} — après on en choisira un nouveau.`);
    this.askPin(async (value) => {
      if (await this.checkPin(name, value)) {
        this.registerSuccess(name);
        this.say('👍 C\'est bien toi !', 'ok');
        setTimeout(onOk, 900);
        return;
      }
      this.clearPin();
      this.registerFailure();
      if (this.guardLocked(() => this.askCurrentPin(name, onOk, onCancel))) return;
      const left = MAX_FAILS - this.lockState().fails;
      this.say(`Ce n'est pas ton code 🤔 (encore ${left} essai${left > 1 ? 's' : ''})`, 'err');
    });
    // Un enfant oublie son code : sans cette porte il ne pourrait plus jamais
    // en changer, et le message « demande à un parent » serait une impasse.
    this.button('J\'ai oublié mon code', 'id-secondary', () => {
      const code = window.prompt('Un parent doit taper son code pour remettre le code de l\'enfant à zéro :');
      if (code === null) return;
      if (code !== PARENT_CODE) { window.alert('Code incorrect !'); return; }
      this.clearLock();
      onOk();
    });
    this.button('Annuler', 'id-secondary', () => { this.hide(); onCancel?.(); });
  }

  // "Me connecter à mon compte": a device that has never seen this child.
  // Their signature lives in the cloud under their first name, so the camera
  // (or their code) is enough to find the account and bring it onto this
  // device — nothing to type, no password anywhere.
  async loginToAccount({ onMatch } = {}) {
    if (this.guardLocked()) return;
    this.show('🔑 Me connecter à mon compte', 'Je regarde qui tu es et je retrouve ton compte…');
    if (!navigator.onLine) {
      this.say("Pas de connexion internet — il en faut une la première fois sur un nouvel appareil.", 'err');
      this.button('OK', 'id-secondary', () => this.hide());
      return;
    }
    this.say('Recherche des comptes…');
    await this.syncFromCloud();
    const accounts = Object.keys(this.remote).filter((n) => this.entry(n).faces.length || this.entry(n).pinHash);
    if (!accounts.length) {
      this.say("Aucun compte trouvé — crée-en un, c'est juste en dessous !", 'err');
      this.button('OK', 'id-secondary', () => this.hide());
      return;
    }
    await this.recognize(accounts, { onMatch, title: '🔑 Regarde la caméra !' });
  }

  // "Reconnais-moi !" from the who-screen: look at the camera, get switched
  // to your own profile. Falls back to the code, then to tapping a card.
  async recognize(names, { onMatch, onCancel, title, strict = false } = {}) {
    if (this.guardLocked(() => this.recognize(names, { onMatch, onCancel, title, strict }))) return;
    this.show(title || '📸 Regarde la caméra !',
      'Approche ton visage jusqu\'à remplir le rond en pointillés, bien en face.');
    this.el.stage.style.display = 'block';
    this.el.stage.className = 'scan';
    // Les noms passés ici ne sont qu'une préférence : la liste réelle inclut
    // toujours les comptes du cloud. Sans ça, un appareil neuf — qui n'a plus
    // aucun profil local — cherchait dans une liste vide : ni le visage ni le
    // code ne pouvaient aboutir, et chaque essai comptait vers le verrouillage.
    // Sauf en mode strict, où la question n'est plus « qui es-tu ? » mais
    // « es-tu bien celui-là ? » : élargir reviendrait à laisser le frère
    // valider à la place de la sœur.
    const pinPool = () => (strict ? names : this.candidates(names));
    this.button('🔢 Utiliser mon code', 'id-secondary', () => this.pinLogin(pinPool(), onMatch, strict));
    this.button('Annuler', 'id-secondary', () => { this.hide(); onCancel?.(); });

    await this.syncFromCloud(); // signatures et codes des autres appareils

    try {
      this._stream = await this.openCamera(this.el.video);
    } catch {
      this.say("Pas d'accès à la caméra 😕", 'err');
      setTimeout(() => this.pinLogin(pinPool(), onMatch, strict), 1500);
      return;
    }
    try {
      await loadFaceApi((m) => this.say(m), (p) => this.setLoad(p));
      this.setLoad(null);
    } catch {
      this.setLoad(null);
      this.say('Scanner indisponible.', 'err');
      setTimeout(() => this.pinLogin(pinPool(), onMatch, strict), 1500);
      return;
    }
    await this.syncFromCloud();
    const pool = strict ? names.filter((n) => this.isEnrolled(n)) : this.candidates(names);

    let firstPass = true;
    const debut = Date.now();
    const deadline = debut + 40000;
    while (Date.now() < deadline) {
      if (this.el.modal.style.display === 'none') return; // cancelled
      this.say(conseil((Date.now() - debut) / 1000), firstPass ? 'busy' : '');
      this.busy(true);
      let sig = null;
      try {
        sig = await this.snapshot(this.el.video);
      } catch {
        // scanner really down on this device — go straight to the code
        this.stopCamera(this._stream);
        this._stream = null;
        this.busy(false);
        this.say('Mon scanner est en panne ici 😕 — ton code secret !', 'err');
        setTimeout(() => this.pinLogin(pinPool(), onMatch, strict), 1400);
        return;
      }
      firstPass = false;
      this.busy(false);
      if (sig) {
        const who = this.match(sig, pool);
        if (who) {
          this.learn(who, sig); // stays accurate as they grow
          this.registerSuccess(who);
          this.el.stage.className = 'ok';
          this.say(`🎉 Merci ${who}, je t'ai reconnu !`, 'ok');
          this.stopCamera(this._stream);
          this._stream = null;
          setTimeout(() => { this.hide(); onMatch?.(who); }, 1300);
          return;
        }
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    this.stopCamera(this._stream);
    this._stream = null;
    // Un échec ne compte que s'il y avait vraiment quelqu'un à reconnaître :
    // sinon le jeu punissait l'enfant pour sa propre incapacité à chercher.
    if (pool.length) this.registerFailure();
    if (this.guardLocked()) return;
    this.say(pool.length
      ? "Je ne te reconnais pas 🤔 — essaie ton code secret."
      : "Je n'ai encore aucun compte à reconnaître — tape ton code 🔢", 'err');
    setTimeout(() => this.pinLogin(strict ? names : pool, onMatch, strict), 1600);
  }

  pinLogin(names, onMatch, strict = false) {
    this.stopCamera(this._stream);
    this._stream = null;
    if (this.guardLocked(() => this.pinLogin(names, onMatch, strict))) return;
    this.show('🔢 Ton code secret', 'Tape tes 6 chiffres.');
    // Le cloud peut ne pas avoir encore été lu (appareil neuf, réseau lent) :
    // on le relit ici, sinon un code parfaitement valide serait refusé faute
    // de savoir à qui le comparer.
    const ready = this.syncFromCloud().catch(() => {});
    this.askPin(async (value) => {
      await ready;
      const who = await this.whoHasPin(value, strict ? names : this.candidates(names));
      if (who) {
        this.registerSuccess(who);
        this.say(`🎉 Bonjour ${who} !`, 'ok');
        setTimeout(() => { this.hide(); onMatch?.(who); }, 1100);
      } else {
        this.clearPin();
        this.registerFailure();
        if (this.guardLocked()) return;
        const left = MAX_FAILS - this.lockState().fails;
        this.say(`Ce code ne marche pas 🤔 (encore ${left} essai${left > 1 ? 's' : ''})`, 'err');
      }
    });
    // En mode strict la porte est étroite — un seul compte accepté. Si son
    // visage a mal été enregistré et qu'il n'a pas mis de code, l'enfant
    // n'aurait plus aucun moyen de toucher à son propre compte : un parent
    // peut alors ouvrir.
    if (strict) {
      this.button('Demander à un parent', 'id-secondary', () => {
        const code = window.prompt('Un parent doit taper son code :');
        if (code === null) return;
        if (code !== PARENT_CODE) { window.alert('Code incorrect !'); return; }
        this.clearLock();
        this.hide();
        onMatch?.(names[0]);
      });
    }
    this.button('Annuler', 'id-secondary', () => this.hide());
  }

  // ---- new account: name, school grade, then the security steps -------------

  createAccount({ grades, onDone } = {}) {
    this.show('✨ Nouveau joueur', 'Comment tu t\'appelles ?');
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 12;
    input.placeholder = 'Ton prénom';
    input.style.cssText = 'width:100%;padding:12px;font-size:16px;border-radius:12px;border:1px solid #46587e;background:#0e1420;color:#fff;text-align:center;';
    this.el.actions.appendChild(input);
    input.focus();
    const next = () => {
      const name = input.value.trim().slice(0, 12);
      if (!name) { this.say('Écris ton prénom 🙂', 'err'); return; }
      this.askGrade(name, grades, onDone);
    };
    input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') next(); });
    this.button('Continuer ➜', 'id-primary', next);
    this.button('Annuler', 'id-secondary', () => this.hide());
  }

  // The school grade sets the starting difficulty of the quizzes, so it is
  // asked up front rather than left at a default the child never revisits.
  askGrade(name, grades, onDone) {
    this.show(`🎓 Salut ${name} !`, "Tu es dans quelle classe ? Ça règle la difficulté des quiz (ça s'ajuste tout seul ensuite).");
    this.el.actions.classList.add('grid');
    grades.forEach(([fr, us], i) => {
      this.button(`${fr} · ${us}`, 'id-secondary',
        () => { this.el.actions.classList.remove('grid'); this.hide(); onDone?.({ name, grade: i }); });
    });
  }
}
