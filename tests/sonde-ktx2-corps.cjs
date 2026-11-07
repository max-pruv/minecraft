// LES CORPS EN KTX2 : MÉMOIRE DE TEXTURES ET CLÉS DE PROGRAMME (chantier 5).
// Usage : node tests/sonde-ktx2-corps.cjs
//
// Deux bras, KTX2 branché puis `?ktx2=0`. Dans chacun, on charge les neuf
// corps de humains.js et le policier, on en pose un de chaque devant la
// caméra, on rend, puis on rend une seconde fois en fondu (les deux variantes
// de présence, v246 : opaque et transparent). On relève :
//   - les octets de textures tenus par les corps (une image comptée une fois) ;
//   - les clés de programme de chaque matériau de corps, dans les deux variantes.
// Les clés doivent être les mêmes dans les deux bras : sinon la chauffe de
// l'accueil ne couvrirait plus les corps, et une compilation tomberait en jeu.
// Le banc rend en logiciel : une texture comprimée y compte un octet par pixel
// (l'iPhone reçoit l'ETC1S opaque à un demi-octet). Isolée : aucune suite ne
// l'importe.
const { Banc } = require('./banc.js');

async function bras(banc, nom, params) {
  const p = await banc.jouerSeul(nom, { rr: 2, params, pret: true });
  return p.evaluate(async () => {
    const H = await import('./src/humains.js');
    const P = await import('./src/presence.js');
    const T = await import('./src/patrouille.js');
    const g = window.__game;
    const THREE = await import('three');
    await H.chargerHumains();
    // le policier se charge par sa patrouille ; on le demande au chargeur commun
    const K = await import('./src/ktx2.js');
    const pol = await K.chargeurModeles().loadAsync(K.urlModele('./vendor/humains/policier.glb'));
    const noms = ['homme-chemise', 'femme-chemise', 'garcon', 'fille', 'homme-denim', 'homme-costume', 'femme-tailleur', 'homme-veste', 'femme-manteau'];
    const cam = g.camera;
    const devant = new THREE.Vector3(0, 0, -4).applyQuaternion(cam.quaternion).add(cam.position);
    const corps = [];
    noms.forEach((n, i) => {
      const enfant = n === 'garcon' || n === 'fille';
      const c = H.construireCorpsRealiste({ modeleHumain: enfant ? undefined : n, tenue: enfant ? 'enfant' : 'passant', genre: n === 'fille' ? 'femme' : 'homme', coupe: n === 'fille' ? 'long' : 'court' });
      if (!c) return;
      c.position.copy(devant).add(new THREE.Vector3((i - 4) * 0.8, -1.5, 0));
      g.scene.add(c);
      corps.push({ nom: n, c });
    });
    pol.scene.position.copy(devant).add(new THREE.Vector3(0, -1.5, -2));
    g.scene.add(pol.scene);
    corps.push({ nom: 'policier', c: pol.scene });
    const PROPS = ['map', 'normalMap', 'alphaMap', 'emissiveMap', 'roughnessMap', 'metalnessMap', 'aoMap'];
    const octets = (t) => {
      if (t.isCompressedTexture && t.mipmaps && t.mipmaps.length) return t.mipmaps.reduce((s, m) => s + ((m && m.data && m.data.byteLength) || 0), 0);
      const img = t.source ? t.source.data : t.image;
      return ((img && img.width) || 0) * ((img && img.height) || 0) * 4 * 4 / 3;
    };
    const vues = new Map(), parCorps = {};
    for (const { nom, c } of corps) c.traverse((o) => {
      if (!o.isMesh) return;
      for (const m of [].concat(o.material)) for (const k of PROPS) {
        const t = m[k];
        if (!t || !t.isTexture) continue;
        const src = t.source || t.image;
        if (vues.has(src)) continue;
        vues.set(src, 1);
        const v = parCorps[nom] || (parCorps[nom] = { mo: 0, n: 0, comp: 0, couleurs: [] });
        v.mo += octets(t) / 1048576; v.n++; if (t.isCompressedTexture) v.comp++;
        if (k === 'map') v.couleurs.push(t.colorSpace);
      }
    });
    const cles = (variante) => {
      g.renderer.render(g.scene, cam);
      const r = {};
      for (const { nom, c } of corps) c.traverse((o) => {
        if (!o.isMesh) return;
        for (const m of [].concat(o.material)) {
          const pr = g.renderer.properties.get(m).currentProgram;
          r[nom + '/' + m.name + '/' + variante] = pr ? pr.cacheKey : null;
        }
      });
      return r;
    };
    const opaques = cles('opaque');
    // la variante de fondu : la présence copie les matériaux et les passe en transparent
    for (const { c } of corps) {
      const npc = { mesh: c, apparitionDouce: true };
      P.actualiserPresence(npc, 100, 0.05, true);
    }
    const fondus = cles('fondu');
    let tot = 0; for (const v of Object.values(parCorps)) tot += v.mo;
    return { tot: +tot.toFixed(1), parCorps, cles: { ...opaques, ...fondus }, ktx2: K.ktx2Branche(), nCorps: corps.length };
  });
}

(async () => {
  const banc = new Banc({ portJeu: 8439, portPairs: 9439 });
  await banc.ouvrir();
  const res = {};
  try {
    for (const [nom, params] of [['CorpsKtx', ''], ['CorpsOrig', '&ktx2=0']]) {
      const r = await bras(banc, nom, params);
      res[nom] = r;
      console.log(`== ${nom} : ktx2 ${r.ktx2}, ${r.nCorps} corps, textures ${r.tot} Mo`);
      for (const [n, v] of Object.entries(r.parCorps)) console.log('  ', n.padEnd(16), v.mo.toFixed(1).padStart(6), 'Mo', v.n, 'images', v.comp ? `(${v.comp} comprimées)` : '', 'couleur:', [...new Set(v.couleurs)].join(','));
    }
    const a = res.CorpsKtx.cles, b = res.CorpsOrig.cles;
    const k = Object.keys(a);
    const diff = k.filter((x) => a[x] !== b[x]);
    const nulles = k.filter((x) => !a[x]);
    const distinctes = new Set(Object.values(a)).size;
    console.log(`clés de programme : ${k.length} matériaux×variantes, ${distinctes} programmes distincts, ${diff.length} différentes entre les bras, ${nulles.length} sans programme`);
    for (const x of diff.slice(0, 6)) console.log('   diff', x);
  } finally { await banc.fermer(); process.exit(0); }
})();
