// Le rendu photographique doit atteindre le vrai jeu, garder ses sols et
// ses routes, et fonctionner avec les ombres et les reflets activés.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { Banc } = require('./banc.js');

(async () => {
  const banc = new Banc({ portJeu: 8461, portPairs: 9461 });
  await banc.ouvrir();
  try {
    const page = await banc.jouerSeul('Sylvestre', {
      rr: 3, ombres: 1, pret: true, params: '&hd=2&arbres=1&saison=ete',
      viewport: { width: 1280, height: 800 },
    });
    await page.waitForFunction(() => [...__game.chunkMeshes.values()].some(m =>
      m.solid?.material.userData.nature?.uniforms.naturePrete.value === 1), null, { timeout: 60000 });
    console.log('✅ les matières photographiques se chargent dans le vrai jeu');
    const preuve = await page.evaluate(async () => {
      const { buildChunkTampons } = await import('/src/mesher.js');
      const { emettrePrairie } = await import('/src/prairie.js');
      const { GeomBufferHD } = await import('/src/facadeshd.js');
      const { grilleSol } = await import('/src/solcontinu.js');
      const g = __game, w = g.world;
      let touffes = 0, sommetsMax = 0, solidesIdentiques = true, routesPropres = true;
      const identique = (a,b) => {
        if (!a || !b) return a===b;
        return Object.keys(a).every(k => a[k].length===b[k].length && a[k].every((v,i)=>v===b[k][i]));
      };
      // Les deux morceaux de chaque côté d'une couture, sur trois rangées.
      for (let dz=-1;dz<=1;dz++) for (let dx=0;dx<=1;dx++) {
        const cx=-98+dx,cz=-156+dz;
        w.ensureChunk(cx,cz);
        const avant=buildChunkTampons(w,cx,cz,{detail:true,prairie:false});
        const apres=buildChunkTampons(w,cx,cz,{detail:true});
        solidesIdentiques &&= identique(avant.solid,apres.solid) && identique(avant.water,apres.water);
        touffes += apres.prairie||0;
        const grille=grilleSol(w,cx,cz,16), buf=new GeomBufferHD();
        emettrePrairie(buf,w,grille,w.teintesDuMorceau(cx,cz));
        sommetsMax=Math.max(sommetsMax,buf.positions.length/3);
        // Le même terrain longé par une chaussée : aucune herbe sur son
        // corridor, même si son accotement porte un bloc GRASS.
        const corridor=w.corridorEn;
        try {
          w.corridorEn=()=>({piece:'route'});
          const route=new GeomBufferHD();
          routesPropres &&= emettrePrairie(route,w,grille,null)===0;
        } finally { w.corridorEn=corridor; }
      }
      g.player.pos.set(-1560,w.terrainHeight(-1560,-2488)+2,-2488);
      return {touffes,sommetsMax,solidesIdentiques,routesPropres};
    });
    assert(proofOK(preuve), JSON.stringify(preuve));
    console.log('✅ les sols, l’eau et leurs indices restent identiques ; la végétation épargne les routes', preuve);
    await page.waitForFunction(() => {
      const m=__game.chunkMeshes.get('-98,-156');
      return m?.solid && m.facades?.visible;
    }, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      const m=[...__game.chunkMeshes.values()].find(m=>m.solid).solid.material;
      m.userData.nature.uniforms.naturePrete.value=0;
    });
    const capturer = async (fichier) => {
      const image = await page.evaluate(() => {
        const g=__game;g.renderer.render(g.scene,g.camera);return g.renderer.domElement.toDataURL('image/png');
      });
      const png=Buffer.from(image.split(',')[1],'base64');fs.writeFileSync(fichier,png);return png;
    };
    const avant = await capturer('/tmp/nature-avant.png');
    await page.evaluate(() => {
      const m=[...__game.chunkMeshes.values()].find(m=>m.solid).solid.material;
      m.userData.nature.uniforms.naturePrete.value=1;
    });
    await page.waitForTimeout(500);
    const apres = await capturer('/tmp/nature-apres.png');
    const differences = await page.evaluate(async ([avant,apres]) => {
      const lire = async (source) => {
        const image = new Image(); image.src='data:image/png;base64,'+source;
        await image.decode();
        const canvas=document.createElement('canvas'); canvas.width=1280; canvas.height=800;
        const ctx=canvas.getContext('2d'); ctx.drawImage(image,0,0);
        return ctx.getImageData(0,0,1280,800).data;
      };
      const a=await lire(avant),b=await lire(apres);
      let differences=0;
      // Le sol occupe le bas de l'image. On exclut le sac et la minicarte.
      for(let y=450;y<700;y++) for(let x=180;x<1100;x++) {
        const i=(y*1280+x)*4;
        if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>25) differences++;
      }
      return differences;
    },[avant.toString('base64'),apres.toString('base64')]);
    assert(differences>30000,`la photographie doit être visible : ${differences} pixels`);
    assert.deepEqual(page.erreurs,[]);
    console.log(`✅ le nouveau rendu atteint le sol à l’écran (${differences} pixels), aucune erreur de shader ou JavaScript`);
  } finally { await banc.fermer(); }
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});

function proofOK(p) {
  return p.touffes>0 && p.sommetsMax<=1536 && p.solidesIdentiques && p.routesPropres;
}
