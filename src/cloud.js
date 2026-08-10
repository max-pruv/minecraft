// Cloud save of shared worlds via Supabase (plain PostgREST calls — no SDK).
// Each world is one row keyed by its room code; the value is the full
// timestamped edit log, merged client-side last-writer-wins before every
// push, so devices can save concurrently without losing anything.
//
// Setup (once, free tier): create a Supabase project, run this SQL in the
// SQL editor, then fill in SUPABASE_URL and SUPABASE_ANON_KEY below:
//
//   create table world_saves (
//     code text primary key,
//     blocks jsonb not null,
//     updated_at timestamptz default now()
//   );
//   alter table world_saves enable row level security;
//   create policy "anon read"  on world_saves for select using (true);
//   create policy "anon write" on world_saves for insert with check (true);
//   create policy "anon update" on world_saves for update using (true);
//
// The anon key is designed to be public in client apps. If both constants
// are empty the game silently runs without cloud saves (pure P2P sync).

const SUPABASE_URL = 'https://rtwutlmzwxgljtvfchsj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o9J7dculBThdKCQLbdvHng_Zm-QuMQU';

const PUSH_INTERVAL = 15000;

export class CloudSave {
  constructor(world, toast) {
    this.world = world;
    this.toast = toast;
    this.code = null;
    this.timer = null;
    this.lastPushed = '';

    // overrides: localStorage (set once from the console, survives updates)
    // then query params (used by tests): ?cloud=http://host:port&cloudkey=K
    let url = SUPABASE_URL, key = SUPABASE_ANON_KEY;
    try {
      const saved = JSON.parse(localStorage.getItem('web-minecraft-cloud-v1') || 'null');
      if (saved && saved.url && saved.key) { url = saved.url; key = saved.key; }
    } catch { /* ignore */ }
    const qs = new URLSearchParams(location.search);
    if (qs.get('cloud')) { url = qs.get('cloud'); key = qs.get('cloudkey') || 'anon'; }
    this.url = url;
    this.key = key;
  }

  get configured() { return !!(this.url && this.key); }

  headers(extra = {}) {
    return {
      'Content-Type': 'application/json',
      apikey: this.key,
      Authorization: `Bearer ${this.key}`,
      ...extra,
    };
  }

  async pull() {
    const res = await fetch(
      `${this.url}/rest/v1/world_saves?code=eq.${encodeURIComponent(this.code)}&select=blocks`,
      { headers: this.headers() }
    );
    if (!res.ok) throw new Error(`cloud pull ${res.status}`);
    const rows = await res.json();
    return rows.length ? rows[0].blocks : null;
  }

  async push(keepalive = false) {
    const body = JSON.stringify([{
      code: this.code,
      blocks: this.world.exportEdits(),
      updated_at: new Date().toISOString(),
    }]);
    if (body === this.lastPushed) return; // nothing changed since last push
    const res = await fetch(`${this.url}/rest/v1/world_saves`, {
      method: 'POST',
      headers: this.headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body,
      keepalive,
    });
    if (!res.ok) throw new Error(`cloud push ${res.status}`);
    this.lastPushed = body;
  }

  // ---- world chat: messages persist in the database per world code --------

  async chatHistory(limit = 60) {
    if (!this.configured || !this.code) return [];
    const res = await fetch(
      `${this.url}/rest/v1/world_chat?code=eq.${encodeURIComponent(this.code)}&select=name,msg,created_at&order=id.desc&limit=${limit + 40}`,
      { headers: this.headers() }
    );
    if (!res.ok) throw new Error(`chat pull ${res.status}`);
    // system rows (signs…) live in the same table under names starting with __
    return (await res.json()).filter((m) => !String(m.name).startsWith('__')).slice(0, limit).reverse();
  }

  // signs planted in the world persist as special rows of the chat table
  async signHistory() {
    if (!this.configured || !this.code) return [];
    const res = await fetch(
      `${this.url}/rest/v1/world_chat?code=eq.${encodeURIComponent(this.code)}&name=eq.__sign&select=msg&order=id.desc&limit=80`,
      { headers: this.headers() }
    );
    if (!res.ok) return [];
    const signs = [];
    for (const row of await res.json()) {
      try { signs.push(JSON.parse(row.msg)); } catch { /* skip bad rows */ }
    }
    return signs;
  }

  signSend(sign) { return this.chatSend('__sign', JSON.stringify(sign)); }

  // ---- player preferences: language, grade & character follow the name -----
  // Keyed by the child's first name, so their settings travel between
  // devices — Alice on the iPad and Alice on a laptop share one profile.

  async prefsPull(name) {
    if (!this.configured || !name) return null;
    // `no-store` : cette lecture sert à savoir si un parent vient de décider
    // quelque chose. Une réponse ressortie d'un cache, si courte soit sa durée
    // de vie, ferait croire que rien n'a changé — et c'est précisément la
    // question qu'on pose.
    const res = await fetch(
      `${this.url}/rest/v1/player_prefs?name=eq.${encodeURIComponent(name)}&select=prefs`,
      { headers: this.headers(), cache: 'no-store' }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows.length ? rows[0].prefs : null;
  }

  // Plusieurs documents d'un coup, en UNE requête.
  //
  // Le jeu guette deux choses toutes les deux secondes : les consignes d'un
  // parent, et les invitations d'un ami. Les lire séparément, c'est doubler
  // le trafic d'une boucle qui tourne en permanence sur la tablette d'un
  // enfant. `in.(…)` les ramène ensemble, et le résultat est rendu par nom.
  async prefsPullMany(names) {
    const vide = new Map();
    if (!this.configured || !names.length) return vide;
    const liste = names.map((n) => `"${String(n).replace(/"/g, '')}"`).join(',');
    const res = await fetch(
      `${this.url}/rest/v1/player_prefs?name=in.(${encodeURIComponent(liste)})&select=name,prefs`,
      { headers: this.headers(), cache: 'no-store' }
    );
    if (!res.ok) return vide;
    for (const r of await res.json()) vide.set(r.name, r.prefs);
    return vide;
  }

  async prefsPush(name, prefs) {
    if (!this.configured || !name) return;
    await fetch(`${this.url}/rest/v1/player_prefs`, {
      method: 'POST',
      headers: this.headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify([{ name, prefs, updated_at: new Date().toISOString() }]),
    });
  }

  // Qui est là, en ce moment, sur tous les appareils de la maison.
  //
  // La présence était déjà écrite — chaque tablette pose `live` dans ses
  // réglages toutes les vingt secondes — mais seul l'espace parent la lisait.
  // C'est pourtant elle qui permet à un enfant de voir qu'un autre est
  // connecté ailleurs, et de l'inviter.
  async presences() {
    if (!this.configured) return [];
    const res = await fetch(
      `${this.url}/rest/v1/player_prefs?select=name,prefs`,
      { headers: this.headers(), cache: 'no-store' }
    );
    if (!res.ok) return [];
    return (await res.json())
      .map((r) => ({ nom: r.name, live: (r.prefs || {}).live }))
      .filter((p) => p.live && p.live.at);
  }

  // ---- whole-profile state, keyed by first name --------------------------
  // Everything a child collects (dex, bag, records, worlds, buildings…) so
  // it follows them to any device. localStorage stays the working copy —
  // this is the durable one — so the game is unaffected when offline.

  async statePull(name) {
    if (!this.configured || !name) return null;
    const res = await fetch(
      `${this.url}/rest/v1/player_state?name=eq.${encodeURIComponent(name)}&select=state`,
      { headers: this.headers() }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows.length ? rows[0].state : null;
  }

  async statePush(name, state, keepalive = false) {
    if (!this.configured || !name) return;
    await fetch(`${this.url}/rest/v1/player_state`, {
      method: 'POST',
      headers: this.headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify([{ name, state, updated_at: new Date().toISOString() }]),
      keepalive,
    });
  }

  // ---- identity: face signatures & backup PIN, keyed by first name -------
  // Only a 128-number face "signature" is ever stored — never a photo. The
  // PIN is stored hashed. Both travel with the name so a child is
  // recognised on a device they have never used before.

  async identityPull(name) {
    if (!this.configured || !name) return null;
    const res = await fetch(
      `${this.url}/rest/v1/player_identity?name=eq.${encodeURIComponent(name)}&select=faces,pin_hash`,
      { headers: this.headers() }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows.length ? rows[0] : null;
  }

  async identityPullAll() {
    if (!this.configured) return [];
    const res = await fetch(
      `${this.url}/rest/v1/player_identity?select=name,faces,pin_hash`,
      { headers: this.headers() }
    );
    if (!res.ok) return [];
    return res.json();
  }

  async identityPush(name, { faces, pinHash }) {
    if (!this.configured || !name) return;
    const row = { name, updated_at: new Date().toISOString() };
    if (faces !== undefined) row.faces = faces;
    if (pinHash !== undefined) row.pin_hash = pinHash;
    await fetch(`${this.url}/rest/v1/player_identity`, {
      method: 'POST',
      headers: this.headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify([row]),
    });
  }

  // Lecture libre d'une table, pour la vue parent. Volontairement générique :
  // elle ne sert qu'à regarder, jamais à écrire.
  async selectAll(table, query = 'select=*') {
    if (!this.configured) return [];
    const res = await fetch(`${this.url}/rest/v1/${table}?${query}`, { headers: this.headers() });
    if (!res.ok) return [];
    return res.json();
  }

  // ---- play time: cross-device totals per child --------------------------
  // Each device pushes its OWN per-day tally under its own device id; the
  // client sums every device's rows to get the true total for that child,
  // so switching between an iPad and a phone never loses (or resets) time.

  async timePush(name, deviceId, day, stats, keepalive = false) {
    if (!this.configured || !name) return;
    await fetch(`${this.url}/rest/v1/play_time`, {
      method: 'POST',
      headers: this.headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify([{ name, device_id: deviceId, day, ...stats, updated_at: new Date().toISOString() }]),
      keepalive,
    });
  }

  async timePull(name) {
    if (!this.configured || !name) return [];
    const res = await fetch(
      `${this.url}/rest/v1/play_time?name=eq.${encodeURIComponent(name)}&select=device_id,day,play,quiz,correct,wrong,qs`,
      { headers: this.headers() }
    );
    if (!res.ok) return [];
    return res.json();
  }

  async chatSend(name, msg) {
    if (!this.configured || !this.code) return;
    await fetch(`${this.url}/rest/v1/world_chat`, {
      method: 'POST',
      headers: this.headers({ Prefer: 'return=minimal' }),
      body: JSON.stringify([{ code: this.code, name, msg }]),
    });
  }

  // Joins a world: pull the cloud copy, merge it in, push the merged log
  // back, then keep pushing changes in the background.
  async attach(code) {
    if (!this.configured) return false;
    this.code = code;
    try {
      const blocks = await this.pull();
      if (blocks) {
        const applied = this.world.mergeEdits(blocks);
        if (applied > 0) this.world.saveEdits();
      }
      await this.push();
      this.toast('☁️ Sauvegarde cloud active — rien ne sera perdu !', 0x9fd8e8);
    } catch {
      this.toast('☁️ Sauvegarde cloud indisponible pour le moment', 0xff9d5e);
    }
    clearInterval(this.timer);
    this.timer = setInterval(() => { this.push().catch(() => {}); }, PUSH_INTERVAL);
    this._onHide = () => {
      if (document.visibilityState === 'hidden') this.push(true).catch(() => {});
    };
    document.addEventListener('visibilitychange', this._onHide);
    // pagehide fires more reliably than beforeunload on iOS home-screen apps
    this._onPageHide = () => { this.push(true).catch(() => {}); };
    window.addEventListener('pagehide', this._onPageHide);
    return true;
  }

  detach() {
    clearInterval(this.timer);
    this.timer = null;
    if (this._onHide) document.removeEventListener('visibilitychange', this._onHide);
    if (this._onPageHide) window.removeEventListener('pagehide', this._onPageHide);
    this.code = null;
  }
}
