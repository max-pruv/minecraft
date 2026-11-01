// Rejoue le témoin café exact de parishd sur une racine git au choix.
// node tests/sonde-terrasse.cjs [racine-du-jeu]
const path=require('node:path'),fs=require('node:fs');const assert=require('node:assert/strict');
const root=path.resolve(process.argv[2] || path.join(__dirname,'..')),{Banc}=require(path.join(root,'tests/banc.js'));
const source=fs.readFileSync(path.join(__dirname,'parishd.js'),'utf8');
const marque='const auVolant = await tab.evaluate(';const debut=source.indexOf(marque)+marque.length;const fin=source.indexOf('\n    });\n    // la voiture fait 4,4',debut);
if(debut<marque.length||fin<0)throw Error('témoin introuvable');const scenario=source.slice(debut,fin)+'\n}';
(async()=>{console.log('Préparation du témoin :',root);const b=new Banc({portJeu:8490,portPairs:9490});await b.ouvrir();try{
 const p=await b.jouerSeul('TerrasseIsolee',{rr:3,ombres:1,pret:true,params:'&hd=2',viewport:{width:420,height:760}});
 await p.evaluate(()=>{const g=__game;g.player.flying=true;g.player.pos.set(-260,85,280);g.player.vel.set(0,0,0);g.player.yaw=0;g.player.pitch=-1.2;});
 await p.waitForFunction(()=>!!__game.chunkMeshes.get('-17,17')?.facades?.visible,null,{timeout:90000});
 console.log('Terrasse affichée, essai de conduite');
 const r=await p.evaluate('('+scenario+')()');console.log(root,JSON.stringify(r));
 assert(!r.err&&r.monte&&r.parcouru>1.5&&(r.ecrasee?r.plusPres<2.2:r.plusPres>2.2));assert.deepEqual(p.erreurs,[]);
 console.log('✅ la terrasse est écrasée ou arrête la voiture, sans interférence d’une autre voiture');
}finally{await b.fermer()}})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
