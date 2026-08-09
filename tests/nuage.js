// Un Supabase de poche : juste ce que le jeu appelle, et rien de plus.
//
// Les réglages d'un enfant vivent dans un document JSON unique, écrit à la fois
// par sa tablette et par l'espace parent. C'est là qu'un réglage parental
// disparaissait, et cela ne se voit qu'en regardant ce que le serveur contient
// vraiment — d'où ce serveur-ci, qu'on peut interroger depuis le test.

const http = require('http');

function servirLeNuage(port) {
  const prefs = new Map();     // prénom -> réglages
  const temps = new Map();     // "prénom|appareil|jour" -> ligne
  const etats = new Map();     // prénom -> profil complet
  const mondes = new Map();    // code -> blocs

  const lire = (req) => new Promise((ok) => {
    let corps = '';
    req.on('data', (c) => { corps += c; });
    req.on('end', () => { try { ok(JSON.parse(corps)); } catch { ok([]); } });
  });
  const json = (res, valeur) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(valeur));
  };
  const egal = (url, champ) => {
    const m = (url.searchParams.get(champ) || '').match(/^eq\.(.+)$/);
    return m ? decodeURIComponent(m[1]) : null;
  };

  const serveur = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Expose-Headers', '*');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    const url = new URL(req.url, 'http://x');
    const table = url.pathname.replace('/rest/v1/', '');

    const tables = {
      player_prefs: { magasin: prefs, cle: (r) => r.name, champ: 'name',
        ligne: (k, v) => ({ name: k, prefs: v, updated_at: new Date().toISOString() }),
        seul: (v) => ({ prefs: v }) },
      player_state: { magasin: etats, cle: (r) => r.name, champ: 'name',
        ligne: (k, v) => ({ name: k, state: v }), seul: (v) => ({ state: v }) },
      world_saves: { magasin: mondes, cle: (r) => r.code, champ: 'code',
        ligne: (k, v) => ({ code: k, blocks: v.blocks }), seul: (v) => ({ blocks: v.blocks }) },
    };

    if (tables[table]) {
      const t = tables[table];
      if (req.method === 'GET') {
        const k = egal(url, t.champ);
        if (k !== null) return json(res, t.magasin.has(k) ? [t.seul(t.magasin.get(k))] : []);
        return json(res, [...t.magasin.entries()].map(([k2, v]) => t.ligne(k2, v)));
      }
      if (req.method === 'POST') {
        for (const r of await lire(req)) {
          t.magasin.set(t.cle(r), table === 'player_prefs' ? r.prefs
            : table === 'player_state' ? r.state : r);
        }
        res.writeHead(201); return res.end('');
      }
    }

    if (table.startsWith('play_time')) {
      if (req.method === 'GET') {
        const nom = egal(url, 'name');
        return json(res, [...temps.values()].filter((r) => !nom || r.name === nom));
      }
      if (req.method === 'POST') {
        for (const r of await lire(req)) temps.set(`${r.name}|${r.device_id}|${r.day}`, r);
        res.writeHead(201); return res.end('');
      }
    }

    if (table.startsWith('player_identities')) {
      if (req.method === 'GET') return json(res, []);
      if (req.method === 'POST') { res.writeHead(201); return res.end(''); }
    }
    if (table.startsWith('world_chat')) {
      if (req.method === 'GET') return json(res, []);
      if (req.method === 'POST') { res.writeHead(201); return res.end(''); }
    }

    res.writeHead(404); res.end('');
  });

  return new Promise((ok) => serveur.listen(port, '127.0.0.1', () => ok({
    serveur,
    // ce que le test veut savoir : ce qui est RÉELLEMENT enregistré
    reglages: (nom) => prefs.get(nom),
    poserReglages: (nom, v) => prefs.set(nom, v),
    fermer: () => serveur.close(),
  })));
}

module.exports = { servirLeNuage };
