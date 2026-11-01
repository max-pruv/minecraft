// Bestiaire commun : modèles d'artistes, anatomies articulées de secours,
// ressources partagées et animation par instance. La physique reste au lecteur.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { clone as clonerSquelette } from '../vendor/SkeletonUtils.js';
import { partagerTout, liberer } from './liberer.js';
import { anatomieAnimal } from './anatomie-animaux.js';

export const ANIMAUX_HD = {
  cow:{h:1.1,fichiers:['vache','vache-pie']}, pig:{h:.8}, sheep:{h:1},
  horse:{h:1.4,fichiers:['cheval']}, chicken:{h:.7}, rabbit:{h:.6,fichiers:['lapin']},
  goat:{h:1}, deer:{h:1.3,fichiers:['cerf']}, fox:{h:.7,fichiers:['renard']}, wolf:{h:.9},
  squirrel:{h:.5}, duck:{h:.7}, turtle:{h:.5}, crab:{h:.5}, penguin:{h:.9},
  elephant:{h:3.1}, zebre:{h:1.8,fichiers:['cheval'],robe:'zebre'}, ane:{h:1.4},
  chameau:{h:2.2}, lama:{h:1.7}, autruche:{h:2.4}, sanglier:{h:1.1}, ours:{h:1.7,fichiers:['ours']},
  cheval:{h:1.5,fichiers:['cheval']}, cheval_blanc:{h:1.5,fichiers:['cheval'],robe:'blanc'},
  cheval_noir:{h:1.5,fichiers:['cheval'],robe:'noir'}, poney:{h:1.2,fichiers:['cheval']},
  poule:{h:.6}, poule_rousse:{h:.6}, poule_grise:{h:.6}, coq:{h:.8}, poussin:{h:.3},
  oie:{h:.9}, colombe:{h:.35}, paon:{h:1.1}, cochon:{h:.75}, porcelet:{h:.5},
  mouton:{h:.85}, agneau:{h:.6}, vache:{h:1.25,fichiers:['vache','vache-pie']},
  chien:{h:.75}, levrier:{h:.75}, chat:{h:.5,fichiers:['chat']}, chat_roux:{h:.5,fichiers:['chat'],robe:'roux'},
  oiseau:{h:.4},
};
const prototypes=new Map(), anatomies=new Map(), demandes=new Map(), attentes=new Map();
const loader=new GLTFLoader();
const URL_BASE=new URL('../vendor/animaux/',import.meta.url).href;
const pause=()=>new Promise(r=>setTimeout(r,0));
let preparerProgramme=null;

// Fourrure fine, laine, écailles et plumes des anatomies de secours : motif
// tridimensionnel attaché au corps, sans damier ni atlas de pixels grossis.
function habiller(m,espece,statique=false,robe=null) {
  const temps={value:0},allure={value:0};
  m.onBeforeCompile=(shader)=>{
    shader.uniforms.pasAnimal=temps; shader.uniforms.allureAnimal=allure;
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>',`#include <common>
        varying vec3 vPeauAnimal;
        uniform float pasAnimal;
        uniform float allureAnimal;`)
      .replace('#include <begin_vertex>',`#include <begin_vertex>
        vPeauAnimal=position;
        ${statique?`
        // Les scans statiques sont normalisés puis aplatis dans leur repère.
        // Le haut du corps ne bouge pas ; chaque patte fléchit à son épaule.
        float ancrage=1.0-smoothstep(.22,.56,position.y);
        ancrage*=smoothstep(.025,.09,abs(position.x));
        float diagonale=(position.x*position.z>0.0)?0.0:3.14159265;
        float angle=sin(pasAnimal+diagonale)*allureAnimal*.24*ancrage;
        float py=position.y-.48;
        transformed.y=.48+cos(angle)*py;
        transformed.z+=sin(angle)*py;
        `:''}`);
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>',`#include <common>
        varying vec3 vPeauAnimal;
        float grainAnimal(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}`)
      .replace('#include <color_fragment>',`#include <color_fragment>
        ${!m.map?`
        float grain=grainAnimal(floor(vPeauAnimal*850.0));
        float poil=sin(vPeauAnimal.y*1300.0+sin(vPeauAnimal.x*170.0)*5.0)*.025;
        diffuseColor.rgb*=.91+grain*.15+poil;
        `:''}
        ${robe==='zebre'?`
        float rayure=sin(vPeauAnimal.z*35.0+sin(vPeauAnimal.y*9.0)*1.2+abs(vPeauAnimal.x)*7.0);
        diffuseColor.rgb=vec3(mix(.025,.72,smoothstep(-.13,.13,rayure)));
        `:robe==='blanc'?'diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.72),.72);'
          :robe==='noir'?'diffuseColor.rgb*=.14;'
          :robe==='roux'?'diffuseColor.rgb*=vec3(1.3,.75,.4);':''}`);
  };
  m.customProgramCacheKey=()=>`animal-hd-${statique?'scan':'rig'}-${m.map?'photo':'peau'}-${robe||''}`;
  return {temps,allure};
}

function nommerMembres(g) {
  // Les références d'Object3D dans userData ne se clonent pas avec JSON.
  // Le prototype porte des noms ; chaque copie retrouve SES propres membres.
  for(const [nom,noeud] of Object.entries(g.userData.membres||{})) noeud.name='anatomie_'+nom;
  g.userData={};
}

function normaliser(scene,animations,nom) {
  scene.updateMatrixWorld(true);
  scene.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
  let boite=new THREE.Box3().setFromObject(scene,true);
  const taille=boite.getSize(new THREE.Vector3()),centre=boite.getCenter(new THREE.Vector3());
  // Le sommet de la silhouette (oreilles, cornes) donne le côté de la tête.
  // Mesuré sur les sommets transformés, pas supposé à partir du nom du fichier.
  const tete=new THREE.Vector3(),p=new THREE.Vector3(); let n=0;
  scene.traverse(o=>{
    if(!o.isMesh)return;
    for(let i=0;i<o.geometry.attributes.position.count;i++) {
      o.getVertexPosition(i,p); p.applyMatrix4(o.matrixWorld);
      if(p.y>boite.max.y-taille.y*.08){tete.add(p);n++;}
    }
  });
  if(n)tete.divideScalar(n).sub(centre);
  const groupe=new THREE.Group(); groupe.add(scene);
  groupe.rotation.y=n?Math.atan2(tete.x,-tete.z):0;
  groupe.updateMatrixWorld(true); boite=new THREE.Box3().setFromObject(groupe,true);
  const h=boite.max.y-boite.min.y,c=boite.getCenter(new THREE.Vector3());
  groupe.scale.setScalar(1/h); groupe.position.set(-c.x/h,-boite.min.y/h,-c.z/h);
  groupe.updateMatrixWorld(true);
  let skinned=false;groupe.traverse(o=>{if(o.isSkinnedMesh)skinned=true;});
  let modele=groupe;
  if(!skinned) {
    modele=new THREE.Group();
    groupe.traverse(o=>{
      if(!o.isMesh)return;
      const geo=o.geometry.clone().applyMatrix4(o.matrixWorld);
      const m=new THREE.Mesh(geo,o.material);m.name=o.name;modele.add(m);
    });
  }
  modele.traverse(o=>{
    if(!o.isMesh)return;
    o.frustumCulled=false; o.castShadow=true;o.receiveShadow=true;
    for(const mat of [].concat(o.material)) {
      mat.metalness=0;
      if(!mat.roughnessMap)mat.roughness=.86;
      if(mat.map)mat.map.anisotropy=4;
    }
  });
  partagerTout(modele);
  return {modele,animations,statique:!skinned,nom};
}

export function chargerAnimal(nom) {
  if(demandes.has(nom))return demandes.get(nom);
  if(typeof document==='undefined')return Promise.resolve(null);
  const promesse=loader.loadAsync(URL_BASE+nom+'-v1.glb')
    .then(async g=>{
      const proto=normaliser(g.scene,g.animations,nom);
      prototypes.set(nom,proto);
      if(preparerProgramme)await preparerProgramme(nom);
      for(const ref of attentes.get(nom)||[]) {
        const racine=ref.deref();
        if(racine)installer(racine,proto);
      }
      attentes.delete(nom); return proto;
    }).catch(e=>{
      attentes.delete(nom);
      console.warn('Animal détaillé indisponible : '+nom+' ; anatomie de secours.',e.message);
      return null;
    });
  demandes.set(nom,promesse); return promesse;
}

export async function chargerAnimaux(preparer) {
  if(preparer)preparerProgramme=preparer;
  // Deux analyses au plus à la fois : pas de pic de décodage des textures.
  const noms=[...new Set(Object.values(ANIMAUX_HD).flatMap(f=>f.fichiers||[]))];
  const file=[...noms];
  await Promise.all([0,1].map(async()=>{while(file.length){await chargerAnimal(file.shift());await pause();}}));
}

function copie(proto,espece,robe) {
  const g=clonerSquelette(proto.modele),uniforms=[];
  g.traverse(o=>{
    if(!o.isMesh)return;
    const cloner=m=>{
      const c=m.clone();c.userData.partagee=false;
      uniforms.push(habiller(c,espece,proto.statique,robe));return c;
    };
    o.material=Array.isArray(o.material)?o.material.map(cloner):cloner(o.material);
    if(proto.statique) {
      const source=[].concat(o.material)[0];
      const profondeur=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:source.map,alphaTest:source.alphaTest});
      profondeur.userData.animalHD=true;
      uniforms.push(habiller(profondeur,espece,true,null));
      o.customDepthMaterial=profondeur;
    }
  });
  return {g,uniforms};
}

function installer(racine,proto) {
  if(racine.userData.animalHD?.photo)return;
  const ancien=racine.children.splice(0);
  for(const o of ancien){o.parent=null;liberer(o);}
  const espece=racine.userData.espece,fiche=ANIMAUX_HD[espece];
  const {g,uniforms}=copie(proto,espece,fiche.robe);
  g.scale.multiplyScalar(fiche.h);g.position.multiplyScalar(fiche.h);racine.add(g);
  const mixer=proto.animations.length?new THREE.AnimationMixer(g):null;
  const choisir=mot=>proto.animations.find(a=>mot.test(a.name));
  const marche=choisir(/walk|run|animation/i)||proto.animations[0];
  const repos=choisir(/idle|survey|rest/i);
  const action=mixer&&marche?mixer.clipAction(marche).play():null;
  const idle=mixer&&repos?mixer.clipAction(repos).play():null;
  const os=[];
  if(!mixer)g.traverse(o=>{
    if(!o.isBone)return;
    if(/upper arm|upper leg|thigh|front_shoulder/i.test(o.name))os.push({bone:o,repos:o.quaternion.clone()});
  });
  racine.userData.legs=[];
  racine.userData.animalHD={photo:true,source:proto.nom,uniforms,mixer,action,idle,os,phase:Math.random()*6.28,amplitude:0};
}

export function creerAnimalHD(espece) {
  const fiche=ANIMAUX_HD[espece];
  if(!fiche)throw new Error('Animal non déclaré : '+espece);
  const racine=new THREE.Group();racine.name='animal_'+espece;
  racine.userData.espece=espece;racine.userData.legs=[];
  const noms=fiche.fichiers||[];
  const nom=noms.length?noms[Math.floor(Math.random()*noms.length)]:null;
  if(nom&&prototypes.has(nom)){installer(racine,prototypes.get(nom));return racine;}
  if(!anatomies.has(espece)) {
    const g=anatomieAnimal(espece);nommerMembres(g);
    g.updateMatrixWorld(true);
    const b=new THREE.Box3().setFromObject(g),h=b.max.y-b.min.y;
    g.scale.setScalar(fiche.h/h);g.position.y=-b.min.y*fiche.h/h;
    g.traverse(o=>{
      if(!o.isMesh)return;
      o.material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.86,metalness:0});
      o.castShadow=true;o.receiveShadow=true;
    });
    anatomies.set(espece,{modele:partagerTout(g),statique:false});
  }
  const {g,uniforms}=copie(anatomies.get(espece),espece,fiche.robe);racine.add(g);
  g.traverse(o=>{if(/^anatomie_patte/.test(o.name))racine.userData.legs.push(o);});
  const ailes=[];g.traverse(o=>{if(/^anatomie_aile/.test(o.name))ailes.push(o);});
  racine.userData.animalHD={photo:false,uniforms,phase:Math.random()*6.28,amplitude:0,os:[],ailes};
  if(nom) {
    if(!attentes.has(nom))attentes.set(nom,new Set());
    attentes.get(nom).add(new WeakRef(racine));chargerAnimal(nom);
  }
  return racine;
}

export function animerAnimalHD(racine,dt,vitesse=0) {
  const a=racine.userData.animalHD;
  if(!a)return false;
  const mouvement=Math.min(1,Math.abs(vitesse)*.9);
  a.amplitude+=(mouvement-a.amplitude)*(1-Math.exp(-dt*9));
  a.phase+=dt*(3+Math.min(7,Math.abs(vitesse)*3));
  for(const u of a.uniforms){u.temps.value=a.phase;u.allure.value=a.amplitude;}
  for(let i=0;i<(a.ailes||[]).length;i++) a.ailes[i].rotation.z=(i%2?-1:1)*Math.sin(a.phase)*.48;
  if(a.mixer) {
    if(a.action){a.action.setEffectiveWeight(a.idle?a.amplitude:1);a.action.setEffectiveTimeScale(mouvement>.01?Math.max(.2,Math.min(2,Math.abs(vitesse))):0);}
    if(a.idle)a.idle.setEffectiveWeight(1-a.amplitude);
    a.mixer.update(dt);
  } else if(a.os.length) {
    const q=new THREE.Quaternion(),p=new THREE.Quaternion();
    for(let i=0;i<a.os.length;i++) {
      const r=a.os[i];r.bone.parent.getWorldQuaternion(p);
      q.setFromAxisAngle(new THREE.Vector3(1,0,0).applyQuaternion(p.invert()),Math.sin(a.phase+(i%2?Math.PI:0))*.18*a.amplitude);
      r.bone.quaternion.copy(r.repos).premultiply(q);
    }
  } else for(let i=0;i<racine.userData.legs.length;i++) {
    racine.userData.legs[i].rotation.x=Math.sin(a.phase+(i%2?Math.PI:0))*.34*a.amplitude;
  }
  return true;
}

export function prototypeAnimal(nom){return prototypes.get(nom)||null;}
export function animalPourChauffe(nom) {
  const espece=Object.keys(ANIMAUX_HD).find(k=>ANIMAUX_HD[k].fichiers?.includes(nom));
  const proto=prototypes.get(nom);
  if(!espece||!proto)return null;
  const g=new THREE.Group();g.userData={espece,legs:[]};installer(g,proto);return g;
}
export function animauxPourChauffe(nom) {
  const proto=prototypes.get(nom),robes=new Set(),resultat=[];
  if(!proto)return resultat;
  for(const [espece,fiche] of Object.entries(ANIMAUX_HD)) {
    if(!fiche.fichiers?.includes(nom)||robes.has(fiche.robe||''))continue;
    robes.add(fiche.robe||'');
    const g=new THREE.Group();g.userData={espece,legs:[]};installer(g,proto);resultat.push(g);
  }
  return resultat;
}
export function animauxPrets(){return {prets:prototypes.size,total:new Set(Object.values(ANIMAUX_HD).flatMap(f=>f.fichiers||[])).size};}
