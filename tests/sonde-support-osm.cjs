// Preuve de migration isolée, sans modifier les données de la famille.
// node tests/sonde-support-osm.cjs [capture.png]
const {Banc}=require('./banc.js');const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{const b=new Banc({portJeu:8489,portPairs:9489});await b.ouvrir();try{
 const p=await b.jouerSeul('ToitSauve',{carte:'manhattan',rr:3,pret:true,viewport:{width:430,height:932}});
 const donnees=await p.evaluate(async()=>{
  const {ORIGINE_MANHATTAN:O}=await import('/src/manhattan-world.js');const{DATE_OSM}=await import('/src/manhattan-historique.js');const{BLOCK}=await import('/src/blocks.js');
  const g=__game,x=O.x+20,z=O.z-1239,y=57;
  g.world.mergeEdits({[`${x},${y+1},${z}`]:[BLOCK.LOG,DATE_OSM-1000,0]});
  g.player.pos.set(x+.5,59.01,z+.5);g.player.vel.set(0,0,0);g.player.flying=false;g.player.yaw=.2;g.player.pitch=-.25;
  return {x,z,id:g.world.immeubleEn(20,-1239).id};
 });
 await p.waitForFunction(id=>!!__game.villeRealiste.buildings.get(id),donnees.id,{timeout:120000});
 await p.waitForFunction(()=>__game.player.onGround,null,{timeout:60000});
 const preuve=await p.evaluate(async({x,z,id})=>{
  const T=await import('three'),g=__game,m=g.villeRealiste.buildings.get(id);g.scene.updateMatrixWorld(true);
  const rayon=new T.Raycaster(new T.Vector3(x+.5,159,z+.5),new T.Vector3(0,-1,0));const impacts=rayon.intersectObject(m,true);
  return{support:g.world.getBlock(x,57,z),construction:g.world.getBlock(x,58,z),joueur:g.player.pos.y,maillage:!!m,hautDessine:impacts[0]?.point.y,erreurs:0};
 },donnees);
 console.log('Ancien toit dans le jeu',preuve);assert.equal(preuve.support,11);assert.equal(preuve.construction,5);
 assert(Math.abs(preuve.joueur-59.0001)<.04);assert(Math.abs(preuve.hautDessine-58)<.01);assert.deepEqual(p.erreurs,[]);
 const png=await p.evaluate(()=>{const g=__game;g.renderer.render(g.scene,g.camera);return g.renderer.domElement.toDataURL('image/png')});
 if (process.argv[2]) fs.writeFileSync(process.argv[2],Buffer.from(png.split(',')[1],'base64'));
 console.log('✅ support ancien, construction, joueur posé et immeuble réellement dessiné');
 }finally{await b.fermer()}})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
