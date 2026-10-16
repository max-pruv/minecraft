// QUI CRÉE LES TEXTURES EN VOL — la dette de la v406 (« 16 à 266 en vingt
// secondes de vol »). On vole au-dessus de Paris à rr 12 et l'on relève, toutes
// les deux secondes, renderer.info.memory.textures ; puis on NOMME : chaque objet
// sur lequel three pose son écouteur de « dispose » (ce que le pilote tient), les
// textures portées par la scène (matériaux ET textures d'os des squelettes), et
// ce qui est tenu hors de la scène (une fuite, règle v238). Mesuré sur v454 :
// plateau à 107, zéro hors de la scène. Usage : SONDE_S=80 node sonde-textures-vol.cjs
const { Banc } = require('./banc.js');
(async () => {
  const banc = new Banc({ portJeu: 8419, portPairs: 9419 });
  await banc.ouvrir();
  try {
    const p = await banc.jouerSeul('Textures', { rr: 12, dpr: 1 });
    const r = await p.evaluate(async (S) => {
      const g = window.__game;
      const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
      const { positionDe } = await import('./src/mondes.js');
      const P = positionDe('paris');
      const serie = [];
      // Ce que le pilote tient : tout objet sur lequel three pose son écouteur
      // de « dispose » en l'envoyant à la carte graphique (texture ou cible).
      let tex0 = null; g.scene.traverse((o) => { const m = o.material; if (!tex0 && m && m.map) tex0 = m.map; });
      let proto = Object.getPrototypeOf(tex0);
      while (proto && !Object.prototype.hasOwnProperty.call(proto, 'addEventListener')) proto = Object.getPrototypeOf(proto);
      const tenus = new Set();
      const add0 = proto.addEventListener, disp0 = proto.dispatchEvent;
      proto.addEventListener = function (type, f) { if (type === 'dispose' && (this.isTexture || this.isRenderTarget || this.isWebGLRenderTarget)) { tenus.add(this); if (!this.__pile) this.__pile = (new Error().stack || '').split('\n').slice(2, 14).join(' | '); } return add0.call(this, type, f); };
      proto.dispatchEvent = function (e) { if (e && e.type === 'dispose') tenus.delete(this); return disp0.call(this, e); };
      g.player.flying = true;
      g.player.pos.set(P.x - 400, 80, P.z);
      const t0 = performance.now();
      while (performance.now() - t0 < S * 1000) {
        const t = (performance.now() - t0) / 1000;
        g.player.pos.set(P.x - 400 + t * 35, 80, P.z);
        g.player.vel.set(0, 0, 0);
        serie.push(g.renderer.info.memory.textures);
        await dodo(2000);
      }
      const sources = new Map();
      const vues = new Set();
      let squelettes = 0;
      const sq = new Set();
      g.scene.traverse((o) => { if (o.isSkinnedMesh && o.skeleton && !sq.has(o.skeleton)) { sq.add(o.skeleton); squelettes++; if (o.skeleton.boneTexture) vues.add(o.skeleton.boneTexture); } });
      g.scene.traverse((o) => {
        const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        for (const m of ms) for (const k in m) {
          const t = m[k];
          if (!t || !t.isTexture) continue;
          vues.add(t);
          const src = t.source || t.image;
          const cle = src && src.uuid ? src.uuid : (t.uuid);
          const e = sources.get(cle) || { n: 0, mats: new Set(), objs: new Set(), type: t.constructor.name, partagee: !!t.userData.partagee };
          e.n++; e.mats.add(k + ':' + (m.name || m.type)); e.objs.add((o.parent && o.parent.name) || o.name || o.type);
          sources.set(cle, e);
        }
      });
      const props = g.renderer.properties;
      const liste = [...sources.values()].map((e) => ({ n: e.n, type: e.type, partagee: e.partagee, mats: [...e.mats].slice(0, 3).join(','), objs: [...e.objs].slice(0, 2).join(',') }))
        .sort((a, b) => b.n - a.n);
      const horsScene = {};
      for (const t of tenus) {
        if (vues.has(t)) continue;
        const im = t.image || {};
        const cle = (t.isRenderTarget || t.isWebGLRenderTarget ? 'cible ' : '') + t.constructor.name + ' ' + (t.name || '') + ' ' + (im.width || t.width || '?') + 'x' + (im.height || t.height || '?') + (t.userData && t.userData.partagee ? ' partagee' : '');
        horsScene[cle] = (horsScene[cle] || 0) + 1;
        if (!horsScene['pile ' + cle]) horsScene['pile ' + cle] = String(im.constructor && im.constructor.name) + ' ' + t.__pile;
      }
      return { serie, horsDeLaScene: Object.keys(horsScene).filter((k) => !k.startsWith('pile')).reduce((n, k) => n + horsScene[k], 0), squelettes, tenus: tenus.size, horsScene, pilote: g.renderer.info.memory.textures, texturesScene: vues.size, sources: sources.size, liste: liste.slice(0, 40) };
    }, Number(process.env.SONDE_S || 24));
    console.log(JSON.stringify(r, null, 1));
  } catch (e) { console.log('ÉCHEC', e.message); }
  await banc.fermer();
  process.exit(0);
})();
