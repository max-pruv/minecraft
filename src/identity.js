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
const MODEL_URL = './vendor/face-models';

// Once a device has proved who a child is, it stays trusted for a month —
// they are not asked again every single time they sit down to play.
const TRUST_DAYS = 30;

// Brute-force brake: 3 misses freezes identification for an hour, and each
// further round of misses doubles it. Tapping your own card still works —
// this only slows down someone poking at other people's accounts.
const MAX_FAILS = 3;
const LOCK_BASE_MS = 60 * 60 * 1000;
const LOCK_MAX_MS = 24 * 60 * 60 * 1000;

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
function loadFaceApi(onProgress) {
  if (faceapiPromise) return faceapiPromise;
  faceapiPromise = (async () => {
    onProgress?.('Préparation du scanner…');
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
    onProgress?.('Chargement du scanner… (une seule fois)');
    await f.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await f.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await f.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    // NB: no blank-canvas warm-up here. It hung on iPad (a canvas with no
    // backing store never came back), leaving the child stuck on "presque
    // prêt". The first real detection pays the kernel-compilation cost
    // instead, and the capture loop says so while it happens.
    return f;
  })().catch((e) => { faceapiPromise = null; throw e; });
  return faceapiPromise;
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
    try { return JSON.parse(this.raw.get(LOCK_KEY)) || { fails: 0, strikes: 0, until: 0 }; }
    catch { return { fails: 0, strikes: 0, until: 0 }; }
  }

  saveLock(s) {
    try { this.raw.set(LOCK_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  }

  lockedFor() {
    const s = this.lockState();
    return Math.max(0, s.until - Date.now());
  }

  registerFailure() {
    const s = this.lockState();
    s.fails = (s.fails || 0) + 1;
    if (s.fails >= MAX_FAILS) {
      s.strikes = (s.strikes || 0) + 1;
      s.fails = 0;
      s.until = Date.now() + Math.min(LOCK_BASE_MS * 2 ** (s.strikes - 1), LOCK_MAX_MS);
    }
    this.saveLock(s);
    return s;
  }

  registerSuccess(name) {
    this.saveLock({ fails: 0, strikes: 0, until: 0 });
    if (name) this.trust(name);
  }

  // Shows the "come back later" screen when frozen. Returns true if locked.
  guardLocked() {
    const ms = this.lockedFor();
    if (ms <= 0) return false;
    const mins = Math.ceil(ms / 60000);
    const txt = mins >= 60 ? `${Math.ceil(mins / 60)} h` : `${mins} min`;
    this.show('⏳ Trop d\'essais', `Pour protéger les comptes, la reconnaissance est en pause. Réessaie dans ${txt}.`);
    this.say('Tu peux toujours toucher ta carte pour jouer 🙂');
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

  async detect(video) {
    const f = await loadFaceApi();
    const res = await f
      .detectSingleFace(video, new f.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
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
      const w = video.videoWidth, h = video.videoHeight;
      if (!w || !h) return null;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(video, 0, 0, w, h);
      const g = c.getContext('2d');
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
      #id-sub { color:#9fb0d0; font-size:15px; line-height:1.5; margin-bottom:14px; }
      #id-stage { position:relative; width:230px; height:230px; margin:0 auto 14px;
        border-radius:50%; overflow:hidden; background:#0a0e18;
        border:4px solid #3a6ad0; display:none; }
      #id-stage.scan { border-color:#ffd75e; animation:idpulse 1s ease-in-out infinite; }
      #id-stage.ok { border-color:#5ab46e; }
      @keyframes idpulse { 0%,100%{ box-shadow:0 0 0 0 rgba(255,215,94,.5) }
        50%{ box-shadow:0 0 0 14px rgba(255,215,94,0) } }
      #id-video { width:100%; height:100%; object-fit:cover; transform:scaleX(-1); }
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
      <h2 id="id-title"></h2>
      <div id="id-sub"></div>
      <div id="id-stage"><video id="id-video" playsinline muted></video></div>
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

  show(title, sub) {
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

  async enrollFace(name, onDone) {
    this.show(`📸 Regarde la caméra, ${name} !`,
      "Les 3 photos se prennent toutes seules dès que je vois ton visage — reste bien en face ! (aucune photo n'est gardée, juste une empreinte secrète)");
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
      await loadFaceApi((m) => this.say(m));
    } catch {
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
    const deadline = Date.now() + 60000;
    this.el.stage.className = 'scan';
    while (sigs.length < 3 && Date.now() < deadline) {
      if (this.el.modal.style.display === 'none') return; // cancelled
      // the very first detection compiles the models — say so, it is slow
      this.say(first
        ? '⏳ Je me réveille… (quelques secondes la première fois)'
        : `Cliché ${sigs.length + 1}/3 — place ton visage dans le rond 😊`);
      const shot = await this.detect(this.el.video);
      first = false;
      if (shot) {
        sigs.push(shot.sig);
        if (!look) look = this.sampleLook(this.el.video, shot.res); // for the avatar
        this.el.shots.children[sigs.length - 1].classList.add('on');
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
      this.say("Je n'ai pas réussi à te voir 😕 — on fait un code secret.", 'err');
      setTimeout(() => this.enrollPin(name, onDone), 1800);
      return;
    }
    const e = this.local[name] || (this.local[name] = {});
    e.faces = sigs.slice(-KEEP_SIGNATURES);
    // kept against the name, not the active profile: a brand-new account
    // enrols before the game has switched into it, and this survives the
    // reload so their character still ends up looking like them
    if (look) e.look = look;
    this.saveLocal();
    this.pushToCloud(name);
    this.registerSuccess(name); // this device now knows them
    if (look) this.onLook?.(name, look);
    this.el.stage.className = 'ok';
    this.say(`✨ C'est toi, ${name} ! Je te reconnaîtrai partout.`, 'ok');
    setTimeout(() => this.enrollPin(name, onDone, true), 1700);
  }

  enrollPin(name, onDone, afterFace = false) {
    this.show('🔢 Ton code secret',
      afterFace ? 'Choisis 6 chiffres, au cas où la photo ne marche pas un jour.'
                : 'Choisis 6 chiffres que tu retiendras bien.');
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
  async verify(name, { onOk, onCancel } = {}) {
    if (this.guardLocked()) return;
    // a child who only set a code shouldn't have the camera opened at them
    if (!this.entry(name).faces.length) {
      this.pinLogin([name], () => onOk?.());
      return;
    }
    await this.recognize([name], {
      onMatch: () => onOk?.(),
      onCancel,
      title: `👋 C'est bien toi, ${name} ?`,
    });
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
  async recognize(names, { onMatch, onCancel, title } = {}) {
    if (this.guardLocked()) return;
    this.show(title || '📸 Regarde la caméra !', 'Je cherche qui tu es…');
    this.el.stage.style.display = 'block';
    this.el.stage.className = 'scan';
    this.button('🔢 Utiliser mon code', 'id-secondary', () => this.pinLogin(names, onMatch));
    this.button('Annuler', 'id-secondary', () => { this.hide(); onCancel?.(); });

    this.syncFromCloud(); // in the background: signatures from other devices

    try {
      this._stream = await this.openCamera(this.el.video);
    } catch {
      this.say("Pas d'accès à la caméra 😕", 'err');
      setTimeout(() => this.pinLogin(names, onMatch), 1500);
      return;
    }
    try {
      await loadFaceApi((m) => this.say(m));
    } catch {
      this.say('Scanner indisponible.', 'err');
      setTimeout(() => this.pinLogin(names, onMatch), 1500);
      return;
    }
    await this.syncFromCloud();

    let firstPass = true;
    const deadline = Date.now() + 40000;
    while (Date.now() < deadline) {
      if (this.el.modal.style.display === 'none') return; // cancelled
      this.say(firstPass
        ? '⏳ Je me réveille… (quelques secondes la première fois)'
        : 'Ne bouge pas… 🔍');
      const sig = await this.snapshot(this.el.video);
      firstPass = false;
      if (sig) {
        const who = this.match(sig, names);
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
    this.registerFailure();
    if (this.guardLocked()) return;
    this.say("Je ne te reconnais pas 🤔 — essaie ton code secret.", 'err');
    setTimeout(() => this.pinLogin(names, onMatch), 1600);
  }

  pinLogin(names, onMatch) {
    this.stopCamera(this._stream);
    this._stream = null;
    if (this.guardLocked()) return;
    this.show('🔢 Ton code secret', 'Tape tes 6 chiffres.');
    this.askPin(async (value) => {
      const who = await this.whoHasPin(value, names);
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
