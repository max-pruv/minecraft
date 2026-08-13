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
  const relais = [];           // le tuyau de secours : une file de messages
  let relaisSeq = 0;

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
  // `in.("a","b")` : le jeu lit les consignes du parent et l'invitation d'un
  // ami dans la même requête, plutôt que de doubler une boucle qui tourne
  // toutes les deux secondes sur la tablette d'un enfant.
  const dans = (url, champ) => {
    const m = (url.searchParams.get(champ) || '').match(/^in\.\((.*)\)$/);
    if (!m) return null;
    return m[1].split(',').map((v) => decodeURIComponent(v.trim()).replace(/^"|"$/g, ''));
  };

  const identites = new Map();

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
        const plusieurs = dans(url, t.champ);
        if (plusieurs) {
          return json(res, plusieurs.filter((k2) => t.magasin.has(k2))
            .map((k2) => t.ligne(k2, t.magasin.get(k2))));
        }
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

    // Le relais de secours : le tuyau qu'empruntent les tablettes quand le
    // pair-à-pair est bloqué. Une table, des numéros croissants, et chacun
    // relit ce qui lui est adressé.
    if (table.startsWith('world_relay')) {
      if (req.method === 'GET') {
        const code = egal(url, 'code');
        const apres = Number((url.searchParams.get('id') || '').replace('gt.', '')) || 0;
        const desc = /id\.desc/.test(url.searchParams.get('order') || '');
        const limite = Number(url.searchParams.get('limit')) || 200;
        let rows = relais.filter((r) => (!code || r.code === code) && r.id > apres);
        rows.sort((a, b) => (desc ? b.id - a.id : a.id - b.id));
        return json(res, rows.slice(0, limite));
      }
      if (req.method === 'POST') {
        for (const r of await lire(req)) {
          relais.push({ id: ++relaisSeq, code: r.code, de: r.de, vers: r.vers ?? null, msg: r.msg, created_at: Date.now() });
        }
        res.writeHead(201); return res.end('');
      }
      if (req.method === 'DELETE') {
        const code = egal(url, 'code');
        const avant = Date.parse((url.searchParams.get('created_at') || '').replace('lt.', '')) || 0;
        for (let i = relais.length - 1; i >= 0; i--) {
          if ((!code || relais[i].code === code) && relais[i].created_at < avant) relais.splice(i, 1);
        }
        res.writeHead(204); return res.end('');
      }
    }

    // La table des identités, celle que l'espace parent lit en premier.
    //
    // Elle n'était pas servie du tout : toute requête tombait sur le 404 de
    // fin, selectAll rendait un tableau vide, et le panneau parent était
    // éprouvé sans jamais voir une seule identité. Un pan entier de l'écran
    // passait donc au travers des tests.
    if (table.startsWith('player_identity')) {
      if (req.method === 'GET') {
        const nom = egal(url, 'name');
        const lignes = [...identites.values()].filter((r) => !nom || r.name === nom);
        return json(res, lignes);
      }
      if (req.method === 'POST') {
        for (const r of await lire(req)) identites.set(r.name, { ...r, updated_at: r.updated_at || new Date().toISOString() });
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
    // Le profil complet et les blocs d'un monde : c'est là que se voit ce qui
    // survit vraiment à une suppression.
    etat: (nom) => etats.get(nom),
    // Semer du temps de jeu jour par jour : c'est la matière première des
    // filtres de période de l'espace parent.
    poserTemps: (r) => temps.set(`${r.name}|${r.device_id}|${r.day}`, r),
    // Semer une famille : c'est la matière première de l'espace parent.
    poserIdentite: (r) => identites.set(r.name, r),
    poserEtat: (nom, v) => etats.set(nom, v),
    monde: (code) => mondes.get(code),
    // Combien de messages ont VRAIMENT transité par le tuyau de secours :
    // c'est la preuve que la partie est passée par là et pas ailleurs.
    relaisCompte: (code) => relais.filter((r) => !code || r.code === code).length,
    fermer: () => serveur.close(),
  })));
}

module.exports = { servirLeNuage };
