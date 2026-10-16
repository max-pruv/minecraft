// SONDE (banc-lot3) : la famille du nuage de `reseau.js` rougit une fois sur
// trois des deux côtés, toujours « ❌ Personne n'a répondu dans ce monde »
// après une douzaine de secondes. Hypothèse : l'invité FRAPPE (`nuage-coucou`)
// avant d'avoir posé son curseur (`_amorcer` : deux lectures). Si l'hôte relève
// sa boîte et répond pendant ce temps, sa réponse a un numéro INFÉRIEUR au
// curseur que l'invité pose ensuite : il ne la lira jamais.
// Le vrai `BusNuage`, un relais en mémoire (la règle de tests/nuage.js), et
// des latences de lecture tirées au hasard ; on compte les présentations
// perdues. SRC=<dossier src> pour rejouer un autre arbre.
const src = process.env.SRC || new URL('../src/', import.meta.url).pathname;
const { BusNuage } = await import(src + '/relaisnuage.js');

const dormir = (ms) => new Promise((f) => setTimeout(f, ms));
function relaisEnMemoire(latence) {
  const rows = []; let seq = 0;
  return {
    configured: true,
    async relaisLire(code, apres = 0, limite = 200) { await dormir(latence()); return rows.filter((r) => r.code === code && r.id > apres).slice(0, limite); },
    async relaisDernier(code) { await dormir(latence()); const r = rows.filter((x) => x.code === code); return r.length ? r[r.length - 1].id : 0; },
    async relaisEcrire(code, de, vers, msg) { await dormir(latence()); rows.push({ id: ++seq, code, de, vers, msg }); },
    async relaisNettoyer() {},
  };
}

const ESSAIS = Number(process.env.ESSAIS || 40);
let perdus = 0;
for (let k = 0; k < ESSAIS; k++) {
  // un banc chargé : une lecture prend de 20 à 600 ms
  const cloud = relaisEnMemoire(() => 20 + Math.random() * 580);
  const code = 'c' + k;
  // l'hôte, déjà là, relève sa boîte et répond à toute présentation
  const hote = new BusNuage(cloud, code, 'hote', { surPair: (c) => c.on('data', () => {}) });
  hote.surPair = (c) => { c.send({ t: 'hello', name: 'Hote' }); };
  hote.demarrer();
  // l'invité arrive à n'importe quel moment APRÈS que l'hôte a posé son curseur
  // (deux lectures de 600 ms au plus) : c'est la situation du jeu, où l'hôte
  // attend depuis longtemps
  await dormir(1300 + Math.random() * 2000);
  let recu = false;
  const invite = new BusNuage(cloud, code, 'invite', {});
  invite.demarrer();
  const conn = invite.connecter('hote');
  conn.on('data', (m) => { if (m && m.t === 'hello') recu = true; });
  const t0 = Date.now();
  while (!recu && Date.now() - t0 < 12000) await dormir(100);
  if (!recu) perdus++;
  hote.arreter(); invite.arreter();
}
console.log(`présentations de l'hôte perdues : ${perdus} sur ${ESSAIS}`);
process.exit(0);
