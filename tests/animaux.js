// Les vraies bêtes, dans le vrai jeu : pas de retour aux cubes, appuis au
// sol, squelettes privés, textures partagées et monte toujours fonctionnelle.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {Banc}=require('./banc.js');
(async()=>{
  const banc=new Banc({portJeu:8462,portPairs:9462});await banc.ouvrir();
  try {
    const page=await banc.jouerSeul('Faustine',{rr:3,ombres:1,pret:true,params:'&hd=2&arbres=1&saison=ete',viewport:{width:1280,height:800}});
    await page.waitForFunction(async()=>{
      const {animauxPrets}=await import('/src/animauxhd.js');const p=animauxPrets();return p.prets===p.total;
    },null,{timeout:90000});
    const preuve=await page.evaluate(async()=>{
      const H=await import('/src/animauxhd.js');const T=await import('three');const {liberer}=await import('/src/liberer.js');
      const erreurs=[],g=__game;let photos=0,boites=0,maxMaillages=0;
      for(const [espece,fiche] of Object.entries(H.ANIMAUX_HD)) {
        const m=H.creerAnimalHD(espece);m.updateMatrixWorld(true);
        const b=new T.Box3().setFromObject(m,true),h=b.max.y-b.min.y;
        if(Math.abs(h-fiche.h)>fiche.h*.025||Math.abs(b.min.y)>.02)erreurs.push({espece,h,attendu:fiche.h,bas:b.min.y});
        if(m.userData.animalHD.photo)photos++;
        let n=0;m.traverse(o=>{if(o.isMesh){n++;if(o.geometry.type==='BoxGeometry')boites++;}});maxMaillages=Math.max(maxMaillages,n);
        liberer(m);
      }
      const a=H.creerAnimalHD('horse'),b=H.creerAnimalHD('horse');
      let ma,mb;a.traverse(o=>{if(o.isSkinnedMesh&&!ma)ma=o});b.traverse(o=>{if(o.isSkinnedMesh&&!mb)mb=o});
      const osPrives=ma.skeleton.bones.every((o,i)=>o!==mb.skeleton.bones[i]);
      const partage=ma.geometry===mb.geometry && ma.material!==mb.material && ma.material.map===mb.material.map;
      const repos=ma.skeleton.bones.map(o=>o.quaternion.clone());
      for(let k=0;k<20;k++)H.animerAnimalHD(a,1/30,1.5);
      const anime=ma.skeleton.bones.some((o,i)=>1-Math.abs(o.quaternion.dot(repos[i]))>.0001);
      const hB=mb.skeleton.bones.map(o=>o.quaternion.toArray().join(','));
      H.animerAnimalHD(a,.2,2);
      const independant=mb.skeleton.bones.every((o,i)=>o.quaternion.toArray().join(',')===hB[i]);
      liberer(a);g.scene.add(b);b.position.copy(g.player.pos);b.position.z-=3;g.renderer.render(g.scene,g.camera);g.scene.remove(b);liberer(b);
      // Une galerie dans le paysage réel, sous le regard de l'enfant.
      const x=-1560,z=-2488,y=g.world.terrainHeight(x,z)+1;
      g.player.pos.set(x,y+.01,z+8);g.player.yaw=0;g.player.pitch=-.1;g.player.vel.set(0,0,0);
      for(const bete of [...g.animalManager.animals]){g.scene.remove(bete.mesh);liberer(bete.mesh);}
      g.animalManager.animals.length=0;
      const figurants=[];
      for(const [i,key] of ['cow','horse','deer','rabbit','zebre','goat'].entries()) {
        const bete=g.animalManager.invoquer(key,x+(i-2.5)*2.1,z);
        if(bete){bete.state='idle';bete.stateTime=100;bete.yaw=Math.PI*.12;figurants.push(bete);}
      }
      return {especes:Object.keys(H.ANIMAUX_HD).length,photos,boites,maxMaillages,erreurs,osPrives,partage,anime,independant,figurants:figurants.length};
    });
    console.log('Mesure du bestiaire',preuve);
    assert.deepEqual(preuve.erreurs,[]);assert.equal(preuve.boites,0);
    assert(preuve.osPrives&&preuve.partage&&preuve.anime&&preuve.independant);
    assert(preuve.photos>=12&&preuve.maxMaillages<=10&&preuve.figurants===6);
    console.log('✅ anatomies sans cube, bonnes dimensions, os privés, marche animée et ressources partagées',preuve);
    await page.waitForFunction(()=>{
      const betes=__game.animalManager.animals.filter(a=>['cow','horse','deer','rabbit'].includes(a.def.key));
      return betes.length>=4&&betes.every(a=>a.onGround);
    },null,{timeout:120000});
    const contact=await page.evaluate(()=>__game.animalManager.animals.filter(a=>['cow','horse','deer','rabbit'].includes(a.def.key)).map(a=>({espece:a.def.key,ecart:a.pos.y-__game.world.solContinu(a.pos.x,a.pos.z),auSol:a.onGround})));
    assert(contact.length>=4&&contact.every(a=>a.auSol&&Math.abs(a.ecart)<.03),JSON.stringify(contact));
    console.log('✅ les animaux détaillés se posent sur le même sol continu',contact);
    assert.deepEqual(page.erreurs,[]);
    const capture=await page.evaluate(()=>{
      const g=__game,betes=g.animalManager.animals.slice(0,6);
      const centre=betes.reduce((c,a)=>({x:c.x+a.pos.x/6,y:c.y+a.pos.y/6,z:c.z+a.pos.z/6}),{x:0,y:0,z:0});
      let meilleur=null;
      // Choisir une ligne de vue libre dans le paysage réel : pas de caméra
      // dans une couronne d'arbre, et aucun bloc effacé pour la capture.
      for(const dx of [-6,0,6])for(const dz of [6,9,12])for(const dy of [1.8,2.8,4]) {
        const p={x:centre.x+dx,y:centre.y+dy,z:centre.z+dz};let masque=0;
        for(const a of betes)for(let i=0;i<16;i++) {
          const t=i/16;
          if(g.world.getBlock(Math.floor(p.x+(a.pos.x-p.x)*t),Math.floor(p.y+(a.pos.y+.65-p.y)*t),Math.floor(p.z+(a.pos.z-p.z)*t))!==0)masque++;
        }
        if(!meilleur||masque<meilleur.masque)meilleur={p,masque};
      }
      const avant=g.camera.position.clone(),rotation=g.camera.quaternion.clone();
      g.camera.position.set(meilleur.p.x,meilleur.p.y,meilleur.p.z);g.camera.lookAt(centre.x,centre.y+.65,centre.z);
      g.renderer.render(g.scene,g.camera);const png=g.renderer.domElement.toDataURL('image/png');
      g.camera.position.copy(avant);g.camera.quaternion.copy(rotation);g.camera.updateMatrixWorld();return png;
    });
    fs.writeFileSync('/tmp/animaux-jeu.png',Buffer.from(capture.split(',')[1],'base64'));
    // Le cheval reste montable ; l'animation au dos d'une bête n'utilise pas
    // la variable de vitesse propre aux voitures (régression possible).
    await page.evaluate(()=>{
      const g=__game,a=g.animalManager.animals.find(a=>a.def.key==='horse');
      g.player.pos.set(a.pos.x,a.pos.y,a.pos.z+1.5);g.player.yaw=0;g.player.pitch=0;
    });
    for(let k=0;k<5;k++) {
      if(await page.evaluate(()=>!!__game.fun.montureConduite()))break;
      await page.evaluate(()=>document.getElementById('ride-btn').click());await page.waitForTimeout(600);
    }
    assert.equal(await page.evaluate(()=>__game.fun.montureConduite()?.def.key),'horse');
    await page.keyboard.down('w');await page.waitForTimeout(1200);await page.keyboard.up('w');
    assert.deepEqual(page.erreurs,[]);
    console.log('✅ le cheval détaillé reste montable et aucune erreur de rendu ou d’animation ne survient');
  } finally {await banc.fermer();}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
