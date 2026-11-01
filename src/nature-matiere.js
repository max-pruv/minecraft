// Matières photographiques continues : coordonnées du MONDE, jamais du bloc.
// Aucun déplacement des sommets : le contact, les routes et les sauvegardes
// gardent exactement leur surface. Le relief ci-dessous n'est que de détail.
import * as THREE from 'three';

const DECLARATIONS = `
uniform sampler2D solsNature;
uniform float naturePrete;
varying highp vec3 vNaturePosition;
varying vec3 vNatureNormale;
varying float vNatureTuile;
float hasardNature(vec2 p) {
  p = mod(p, 4096.0);
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float bruitNature(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hasardNature(i), hasardNature(i+vec2(1,0)), f.x),
             mix(hasardNature(i+vec2(0,1)), hasardNature(i+vec2(1,1)), f.x), f.y);
}
vec4 echantillonNature(float couche, vec2 p) {
  vec2 origine = vec2(mod(couche, 4.0), 1.0-floor(couche/4.0)) * vec2(.25,.5);
  // Une marge de 8 texels tient les mipmaps à distance des matières voisines.
  vec2 taille = vec2(.25,.5) * (496.0/512.0);
  vec2 uv = origine + vec2(8.0/2048.0,8.0/1024.0) + fract(p) * taille;
  #if __VERSION__ >= 300
    return textureGrad(solsNature, uv, dFdx(p)*taille, dFdy(p)*taille);
  #else
    return texture2D(solsNature, uv);
  #endif
}
vec4 matiereNature(float couche, vec2 p, float melange) {
  // Deux orientations et deux périodes incommensurables : pas de damier.
  return mix(echantillonNature(couche, p),
    echantillonNature(couche, mat2(.8,-.6,.6,.8)*p*.731+vec2(.37,.19)), melange);
}
`;

const SURFACE = `
float tuileNature = floor(vNatureTuile + .5);
bool estNature = tuileNature <= 4.0 || tuileNature == 13.0 || tuileNature == 15.0 || tuileNature == 19.0 || tuileNature == 345.0 || tuileNature == 346.0;
float hauteurNature = .5;
if (estNature && naturePrete > .5) {
  vec3 p = vNaturePosition;
  vec3 n = normalize(vNatureNormale);
  float macro = bruitNature(p.xz*.035);
  float detail = bruitNature(p.xz*.23+13.0);
  float brassage = smoothstep(.15,.85,bruitNature(p.xz*.11));
  float aride = 0.0;
  vec4 mat;
  if (tuileNature < 1.5) {
    vec4 prairie = matiereNature(0.0,p.xz*.19,brassage);
    vec4 alpage = matiereNature(1.0,p.xz*.27,brassage);
    vec4 seche = matiereNature(2.0,p.xz*.24,brassage);
    // La teinte climatique reste celle du monde (vColor). Elle décide aussi
    // de la part de chaume dans les steppes et la savane.
    #ifdef USE_COLOR
      aride = smoothstep(.05,.55,vColor.r/max(vColor.g,.001)-1.08);
    #endif
    mat = mix(prairie,alpage,smoothstep(.35,.75,macro)*.65);
    mat = mix(mat,seche,clamp(aride*.7+smoothstep(.56,.87,macro)*.5,0.0,.85));
    vec4 terre = matiereNature(3.0,p.xz*.31,brassage);
    float solNu = smoothstep(.62,.82,detail)*smoothstep(.43,.69,macro);
    mat = mix(mat,terre,solNu*.8);
    if (n.y < .8) {
      vec4 pierre = matiereNature(5.0,p.xz*.25,brassage);
      mat = mix(mat,pierre,(1.0-smoothstep(.25,.86,n.y))*.75);
    }
  } else {
    float couche = 3.0;
    if (tuileNature == 3.0 || tuileNature == 346.0) couche = 5.0;
    if (tuileNature == 4.0) couche = 6.0;
    if (tuileNature == 13.0 || tuileNature == 19.0) couche = 7.0;
    if (tuileNature == 15.0) couche = 4.0;
    mat = matiereNature(couche,p.xz*.28,brassage);
    if (abs(n.y) < .8) {
      // Projection sur les flancs : une falaise ne tire pas ses texels.
      vec3 w = pow(abs(n),vec3(4)); w /= max(dot(w,vec3(1)),.001);
      mat = mat*w.y + matiereNature(couche,p.zy*.28,brassage)*w.x
        + matiereNature(couche,p.xy*.28,brassage)*w.z;
    }
    if (tuileNature == 345.0 || tuileNature == 346.0) mat.rgb *= vec3(1.35,.63,.36);
    if (tuileNature == 19.0) mat.rgb *= vec3(.65,.86,1.03);
  }
  // Les photographies sont sRGB ; un sampler personnalisé ne fait pas la
  // conversion automatique du map_fragment de Three r160.
  mat.rgb = mix(mat.rgb/12.92,pow((mat.rgb+.055)/1.055,vec3(2.4)),step(vec3(.04045),mat.rgb));
  #ifdef USE_COLOR
    // Le chaume photographié a déjà sa couleur dorée : limiter la seconde
    // coloration du climat évite de brûler les rouges de la savane.
    if (tuileNature < 1.5) mat.rgb /= mix(vec3(1.0),max(vColor.rgb,vec3(.001)),aride*.75);
  #endif
  mat.rgb *= .90 + macro*.20;
  diffuseColor *= vec4(mat.rgb,1.0);
  hauteurNature = mat.a;
} else {
  diffuseColor *= texture2D(map, vTuile.xy + fract(vUvTuile) * vTuile.zw);
}
`;

export function enrichirNature(materiau, renderer) {
  // Texture de secours valide dès la compilation, puis chargement local.
  // L'échec laisse l'ancien atlas visible ; aucune promesse non capturée.
  const secours = new THREE.DataTexture(new Uint8Array([128,128,128,128]),1,1);
  secours.needsUpdate = true;
  const uniforms = { solsNature: { value: secours }, naturePrete: { value: 0 } };
  const pret = new Promise((resolve) => {
    new THREE.TextureLoader().load(new URL('../vendor/nature/sols-v1.webp',import.meta.url).href, (texture) => {
      texture.colorSpace = THREE.NoColorSpace;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = Math.min(8,renderer.capabilities.getMaxAnisotropy());
      uniforms.solsNature.value = texture;
      uniforms.naturePrete.value = 1;
      secours.dispose(); resolve(true);
    }, undefined, () => resolve(false));
  });
  const compilerAvant = materiau.onBeforeCompile;
  materiau.onBeforeCompile = (shader, rendu) => {
    compilerAvant(shader, rendu);
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying highp vec3 vNaturePosition;
        varying vec3 vNatureNormale;
        varying float vNatureTuile;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vNaturePosition = (modelMatrix*vec4(position,1.0)).xyz;
        vNatureNormale = mat3(modelMatrix)*normal;
        vec2 natUV = tuile.xy + fract(uv)*tuile.zw;
        vNatureTuile = floor(natUV.x*20.0) + floor((1.0-natUV.y)*40.0)*20.0;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n'+DECLARATIONS)
      .replace('diffuseColor *= texture2D(map, vTuile.xy + fract(vUvTuile) * vTuile.zw);',SURFACE)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        // Gradient de hauteur dans l'espace de la vue, borné à distance :
        // pas de déplacement, pas de scintillement du grain à l'horizon.
        if (estNature && naturePrete > .5) {
          vec3 dx = dFdx(-vViewPosition), dy = dFdy(-vViewPosition);
          vec3 rx = cross(dy,normal), ry = cross(normal,dx);
          float determinant = dot(dx,rx);
          vec3 gradient = sign(determinant)*(dFdx(hauteurNature)*rx+dFdy(hauteurNature)*ry);
          float force = .035 * (1.0-smoothstep(18.0,75.0,length(vViewPosition)));
          normal = normalize(abs(determinant)*normal-force*gradient);
        }`);
  };
  materiau.customProgramCacheKey = () => 'nature-photographique-v1';
  materiau.needsUpdate = true;
  materiau.userData.nature = { uniforms, pret };
  return materiau.userData.nature;
}

// Une eau continue, animée par la même horloge que la houle géométrique.
// Le ciel de la scène donne sa teinte aux reflets, y compris au crépuscule.
export function enrichirEau(materiau,scene) {
  const compilerAvant = materiau.onBeforeCompile;
  materiau.onBeforeCompile = (shader,rendu) => {
    compilerAvant(shader,rendu);
    shader.uniforms.temps = materiau.userData.temps;
    shader.uniforms.cielEau = { value: scene.fog?.color || scene.background || new THREE.Color(0x9fbaca) };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>',`#include <common>\n varying highp vec3 vPositionEau;\n varying float vSurfaceEau;`)
      .replace('#include <worldpos_vertex>',`#include <worldpos_vertex>\n vPositionEau=(modelMatrix*vec4(transformed,1.0)).xyz;\n vSurfaceEau=normal.y;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>',`#include <common>
        varying highp vec3 vPositionEau;
        varying float vSurfaceEau;
        uniform float temps;
        uniform vec3 cielEau;`)
      .replace('diffuseColor *= texture2D(map, vTuile.xy + fract(vUvTuile) * vTuile.zw);',`
        float rides = sin(vPositionEau.x*.7+vPositionEau.z*.43+temps*.8)
          * sin(vPositionEau.z*.59-vPositionEau.x*.21-temps*.6);
        diffuseColor *= vec4(mix(vec3(.018,.115,.14),vec3(.055,.23,.25),rides*.25+.5),1.0);`)
      .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        vec3 normaleMonde = vec3(
          .09*cos(vPositionEau.x*1.7+vPositionEau.z*.8+temps*1.3),1.0,
          .07*cos(vPositionEau.z*2.1-vPositionEau.x*.6+temps*1.7));
        if (vSurfaceEau > .5) normal = normalize(mat3(viewMatrix)*normaleMonde);`)
      .replace('#include <opaque_fragment>',`
        float fresnelEau = vSurfaceEau > .5 ? .025+.65*pow(1.0-max(dot(normal,normalize(vViewPosition)),0.0),5.0) : 0.0;
        outgoingLight=mix(outgoingLight,cielEau*.75,fresnelEau);
        #include <opaque_fragment>`);
  };
  materiau.customProgramCacheKey = () => 'eau-continue-v1';
  materiau.needsUpdate = true;
}

// Le panorama garde sa grille légère. À cette distance, seules les grandes
// variations doivent survivre : pas de texture fine ni de végétation ajoutée.
export function enrichirHorizon(materiau) {
  materiau.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>',`#include <common>\n varying highp vec2 vPaysage;`)
      .replace('#include <begin_vertex>',`#include <begin_vertex>\n vPaysage=(modelMatrix*vec4(position,1.0)).xz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>',`#include <common>
        varying highp vec2 vPaysage;
        float variationPaysage(vec2 p) {
          return sin(p.x*.037+sin(p.y*.019)*1.6)*sin(p.y*.029+sin(p.x*.013));
        }`)
      .replace('#include <color_fragment>',`#include <color_fragment>
        #ifdef USE_COLOR
          if (vColor.g > vColor.r*1.12 && vColor.g > vColor.b*1.25) {
            float variation=variationPaysage(vPaysage);
            diffuseColor.rgb *= vec3(.91,.88,.84)*(.96+variation*.13);
          }
        #endif`);
  };
  materiau.customProgramCacheKey = () => 'paysage-nature-v1';
}
