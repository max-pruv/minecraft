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
