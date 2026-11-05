// LES MATÉRIAUX SCANNÉS DE LA COUCHE HD (v586) — script reproductible.
//
// Télécharge des matériaux PBR photographiés sous licence CC0 (Poly Haven,
// ambientCG), les met à l'échelle du monde (un bloc ≈ 1,1 m : un étage fait
// trois blocs) et les assemble dans deux images de 1 024 pixels qui se posent
// SUR l'atlas peint de `src/matierehd.js` :
//
//   vendor/materiaux/scannes-v1-couleur.jpg   la couleur (albédo × occlusion)
//   vendor/materiaux/scannes-v1-normales.png  R, G : la normale (OpenGL),
//                                             B : la rugosité, en rapport à sa
//                                             moyenne (128 = ×1)
//   vendor/materiaux/scannes-v1.json          où chaque tuile est rangée, et
//                                             combien de blocs couvre un scan
//
// Les quatre dernières rangées de l'atlas (cases 32 à 63) étaient libres : on
// y range huit régions de 2 × 2 cases (256 pixels), qui portent un scan de deux
// mètres à 128 pixels par mètre — la finesse de l'atlas peint, sans agrandir
// l'atlas. Quelques tuiles sont remplacées sur place (une case, 128 pixels).
//
// LA COULEUR MOYENNE EST CELLE DU PEINTRE. Chaque scan est ramené, canal par
// canal et en linéaire, à la moyenne de la tuile peinte qu'il remplace : les
// teintes par immeuble (`teinteDuMur`, mesurée sur l'atlas peint), le relais
// proche/loin et l'éclairage réglé sur captures n'ont pas à bouger.
//
// Les noms de fichier portent une version : le cache immuable de la PWA ne
// revalide jamais une URL qu'il connaît. Une retouche prend un nom neuf.
//
// Usage :  cd scripts && node materiaux-scannes.mjs  (sharp, three : package.json)
// Les sources se gardent dans un cache (MATERIAUX_CACHE, défaut : le dossier
// temporaire) ; rien d'autre que les trois fichiers ci-dessus n'est écrit.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, '..');
const SORTIE = path.join(RACINE, 'vendor', 'materiaux');
const CACHE = process.env.MATERIAUX_CACHE || path.join(os.tmpdir(), 'materiaux-scannes');
const VERSION = 'v1';

// `src/matierehd.js` importe three par son nom nu (la carte d'imports de la
// page) : sous node on le résout vers la copie des scripts, même version.
const three = pathToFileURL(path.join(ICI, 'node_modules', 'three', 'build', 'three.module.js')).href;
register('data:text/javascript,' + encodeURIComponent(
  `export async function resolve(s, c, n) { return s === 'three' ? n(${JSON.stringify(three)}, c) : n(s, c); }`));
const { peindreTuileHD } = await import(pathToFileURL(path.join(RACINE, 'src', 'matierehd.js')).href);
const { TUILES_HD, COLS_HD, PX_HD } = await import(pathToFileURL(path.join(RACINE, 'src', 'facadeshd.js')).href);

const TAILLE = COLS_HD * PX_HD;           // 1 024
const BLOC_M = 1.1;                       // un bloc, à l'échelle d'une personne

// Les matériaux. `region` : un numéro de 0 à 7 (2 × 2 cases dans les rangées
// libres) ou 'place' (la case de la tuile, une case). `metres` : la taille
// réelle du scan, donnée par la source. `ao` : la part d'occlusion cuite dans
// la couleur. `aplanir` (0 à 1) : la part des basses fréquences retirée — un
// scan de deux mètres répété tous les deux blocs montre ses grandes taches
// comme un motif (vu en capture : une façade en camouflage). `contraste` :
// l'écart à la moyenne gardé (vu en capture : les trous du calcaire, trop
// sombres, en pointillé sur la façade).
const MATERIAUX = [
  { tuile: 'pierre', region: 0, site: 'ambientcg', id: 'Tiles143', metres: 2.6, ao: 0.5, aplanir: 0.85, contraste: 0.6,
    // un scan de dallage : 2 m réels, posé sur 2,6 m pour que l'assise fasse
    // ≈ 45 cm, celle d'une façade haussmannienne
    pourquoi: 'calcaire clair en assises décalées : la pierre de taille haussmannienne' },
  { tuile: 'enduit', region: 1, site: 'polyhaven', id: 'painted_plaster_wall', metres: 2.0, ao: 0.4, aplanir: 0.7, contraste: 0.8,
    pourquoi: 'enduit peint, grain fin et usure : les vieux quartiers' },
  { tuile: 'brique', region: 2, site: 'polyhaven', id: 'brick_wall_02', metres: 2.0, ao: 0.6, aplanir: 0.6, contraste: 0.9,
    pourquoi: 'brique rouge jointoyée : souches, murs mitoyens, Londres et Lille' },
  { tuile: 'bitume', region: 3, site: 'polyhaven', id: 'asphalt_01', metres: 2.08, ao: 0.5, aplanir: 0.8, contraste: 1,
    pourquoi: 'asphalte de chaussée usé' },
  { tuile: 'trottoir', region: 4, site: 'polyhaven', id: 'asphalt_floor', metres: 2.35, ao: 0.4, aplanir: 0.8, contraste: 1,
    pourquoi: 'asphalte fin des trottoirs de Paris, plus clair' },
  { tuile: 'pave', region: 5, site: 'polyhaven', id: 'cobblestone_square', metres: 1.0, ao: 0.6, aplanir: 0.6, contraste: 0.9,
    pourquoi: 'pavés de granit en rangs' },
  { tuile: 'pierre-lisse', region: 'place', site: 'polyhaven', id: 'grey_plaster_02', metres: 1.0, ao: 0.4, aplanir: 0.9, contraste: 0.45,
    pourquoi: 'pierre lisse des encadrements et corniches, sans joint' },
  { tuile: 'cour', region: 'place', site: 'polyhaven', id: 'cobblestone_floor_01', metres: 1.0, ao: 0.6, aplanir: 0.5, contraste: 0.9,
    pourquoi: 'pavés irréguliers d\'une cour' },
  { tuile: 'ecorce', region: 'place', site: 'polyhaven', id: 'bark_platanus', metres: 1.5, ao: 0.5, aplanir: 0.4, contraste: 1,
    pourquoi: 'écorce de platane, l\'arbre des rues de Paris' },
];

// --- téléchargement ------------------------------------------------------------------

function telecharger(url, fichier) {
  if (fs.existsSync(fichier) && fs.statSync(fichier).size > 0) return fichier;
  fs.mkdirSync(path.dirname(fichier), { recursive: true });
  execFileSync('curl', ['-sSfL', '-o', fichier, url]);
  return fichier;
}

async function sources(m) {
  const dossier = path.join(CACHE, m.id);
  if (m.site === 'polyhaven') {
    const fiche = path.join(dossier, 'fiche.json');
    telecharger(`https://api.polyhaven.com/files/${m.id}`, fiche);
    const f = JSON.parse(fs.readFileSync(fiche, 'utf8'));
    const prendre = (cle) => f[cle] && telecharger(f[cle]['1k'].jpg.url, path.join(dossier, `${cle}.jpg`));
    return { couleur: prendre('Diffuse'), normale: prendre('nor_gl'), rugosite: prendre('Rough'), ao: prendre('AO'),
      page: `https://polyhaven.com/a/${m.id}` };
  }
  const zip = telecharger(`https://ambientcg.com/get?file=${m.id}_1K-JPG.zip`, path.join(dossier, 'paquet.zip'));
  const dezip = path.join(dossier, 'x');
  if (!fs.existsSync(dezip)) execFileSync('unzip', ['-q', '-o', zip, '-d', dezip]);
  const trouver = (suffixe) => {
    const f = fs.readdirSync(dezip).find((n) => n.endsWith(`_${suffixe}.jpg`));
    return f ? path.join(dezip, f) : null;
  };
  return { couleur: trouver('Color'), normale: trouver('NormalGL'), rugosite: trouver('Roughness'), ao: trouver('AmbientOcclusion'),
    page: `https://ambientcg.com/a/${m.id}` };
}

// Une carte réduite à S × S en gardant son raccord : on la pose en 3 × 3, on
// réduit, on garde le centre. Rendu en flottants, un ou trois canaux.
async function reduire(fichier, S, canaux) {
  const { data, info } = await sharp(fichier).removeAlpha().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels;
  const mosaique = Buffer.alloc(W * 3 * H * 3 * C);
  for (let ty = 0; ty < 3; ty++) for (let y = 0; y < H; y++) for (let tx = 0; tx < 3; tx++) {
    data.copy(mosaique, ((ty * H + y) * W * 3 + tx * W) * C, y * W * C, (y + 1) * W * C);
  }
  const petit = await sharp(mosaique, { raw: { width: W * 3, height: H * 3, channels: C } })
    .resize(S * 3, S * 3, { kernel: 'lanczos3' }).extract({ left: S, top: S, width: S, height: S })
    .raw().toBuffer();
  const out = new Float32Array(S * S * canaux);
  for (let i = 0; i < S * S; i++) for (let k = 0; k < canaux; k++) out[i * canaux + k] = petit[i * C + Math.min(k, C - 1)] / 255;
  return out;
}

// Un flou périodique (trois passes de boîte, séparables, en raccord), un canal
// à la fois : la basse fréquence d'une carte, pour l'aplanir.
function flouPeriodique(v, S, canaux, rayon) {
  let a = Float32Array.from(v), b = new Float32Array(v.length);
  for (let passe = 0; passe < 3; passe++) for (const axe of [0, 1]) {
    for (let k = 0; k < canaux; k++) for (let l = 0; l < S; l++) {
      let somme = 0;
      const at = (j) => { const jj = ((j % S) + S) % S; return axe ? (jj * S + l) * canaux + k : (l * S + jj) * canaux + k; };
      for (let j = -rayon; j <= rayon; j++) somme += a[at(j)];
      for (let j = 0; j < S; j++) {
        b[at(j)] = somme / (2 * rayon + 1);
        somme += a[at(j + rayon + 1)] - a[at(j - rayon)];
      }
    }
    [a, b] = [b, a];
  }
  return a;
}

const versLin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const versSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

// La moyenne LINÉAIRE de la tuile peinte, canal par canal (pixels opaques).
function moyennePeinte(nom) {
  const img = peindreTuileHD(nom);
  const s = [0, 0, 0]; let n = 0;
  for (let i = 0; i < img.length; i += 4) {
    if (img[i + 3] < 128) continue;
    for (let k = 0; k < 3; k++) s[k] += versLin(img[i + k] / 255);
    n++;
  }
  return s.map((v) => v / n);
}

// --- l'assemblage ------------------------------------------------------------------

function regionDe(m) {
  if (m.region === 'place') {
    const i = TUILES_HD.indexOf(m.tuile);
    if (i < 0) throw new Error(`tuile inconnue ${m.tuile}`);
    return { x: (i % COLS_HD) * PX_HD, y: Math.floor(i / COLS_HD) * PX_HD, taille: PX_HD };
  }
  const premiereLibre = Math.ceil(TUILES_HD.length / COLS_HD);          // la rangée 4
  const col = 2 * (m.region % (COLS_HD / 2)), row = premiereLibre + 2 * Math.floor(m.region / (COLS_HD / 2));
  if (row + 2 > COLS_HD) throw new Error(`région ${m.region} hors de l'atlas`);
  return { x: col * PX_HD, y: row * PX_HD, taille: 2 * PX_HD };
}

const couleur = Buffer.alloc(TAILLE * TAILLE * 3);
const normales = Buffer.alloc(TAILLE * TAILLE * 3, 128);   // plat, rugosité ×1
const fiche = { version: VERSION, taille: TAILLE, blocM: BLOC_M, regions: [] };
const credits = [];

for (const m of MATERIAUX) {
  const src = await sources(m);
  const { x, y, taille: S } = regionDe(m);
  const alb = await reduire(src.couleur, S, 3);
  const ao = src.ao ? await reduire(src.ao, S, 1) : null;
  const nrm = await reduire(src.normale, S, 3);
  const rug = src.rugosite ? await reduire(src.rugosite, S, 1) : null;

  // couleur : linéaire, occlusion, puis la moyenne du peintre
  const lin = new Float32Array(S * S * 3);
  const somme = [0, 0, 0];
  for (let i = 0; i < S * S; i++) {
    const occ = ao ? Math.pow(ao[i], m.ao) : 1;
    for (let k = 0; k < 3; k++) { lin[i * 3 + k] = versLin(alb[i * 3 + k]) * occ; somme[k] += lin[i * 3 + k]; }
  }
  // les grandes taches retirées, puis l'écart à la moyenne resserré
  const moyAvant = somme.map((v) => v / (S * S));
  const bas = flouPeriodique(lin, S, 3, Math.max(2, Math.round(S / 16)));
  for (let i = 0; i < S * S; i++) for (let k = 0; k < 3; k++) {
    const j = i * 3 + k;
    let v = lin[j] * (1 - m.aplanir + m.aplanir * moyAvant[k] / Math.max(1e-4, bas[j]));
    v = moyAvant[k] + (v - moyAvant[k]) * m.contraste;
    lin[j] = Math.max(0, v);
  }
  somme.fill(0);
  for (let i = 0; i < S * S; i++) for (let k = 0; k < 3; k++) somme[k] += lin[i * 3 + k];
  const cible = moyennePeinte(m.tuile);
  const gain = somme.map((v, k) => cible[k] / (v / (S * S)));
  let rugMoy = 0;
  if (rug) { for (let i = 0; i < S * S; i++) rugMoy += rug[i]; rugMoy /= S * S; }
  for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
    const i = py * S + px, o = ((y + py) * TAILLE + (x + px)) * 3;
    for (let k = 0; k < 3; k++) couleur[o + k] = Math.round(255 * versSrgb(Math.min(1, lin[i * 3 + k] * gain[k])));
    // la normale : x, y renormalisés (la réduction raccourcit les vecteurs)
    let nx = nrm[i * 3] * 2 - 1, ny = nrm[i * 3 + 1] * 2 - 1, nz = nrm[i * 3 + 2] * 2 - 1;
    const l = Math.hypot(nx, ny, Math.max(0.05, nz)) || 1;
    nx /= l; ny /= l;
    normales[o] = Math.round((nx * 0.5 + 0.5) * 255);
    normales[o + 1] = Math.round((ny * 0.5 + 0.5) * 255);
    const r = rug ? Math.max(0.5, Math.min(1.5, rug[i] / rugMoy)) : 1;
    normales[o + 2] = Math.round(r * 127.5);
  }
  fiche.regions.push({ tuile: m.tuile, x, y, taille: S, blocs: +(m.metres / BLOC_M).toFixed(4) });
  credits.push({ ...m, page: src.page });
  console.log(`${m.tuile.padEnd(13)} ← ${m.id.padEnd(22)} ${S} px, ${(m.metres / BLOC_M).toFixed(2)} blocs, gain ${gain.map((g) => g.toFixed(2)).join(' ')}`);
}

fs.mkdirSync(SORTIE, { recursive: true });
await sharp(couleur, { raw: { width: TAILLE, height: TAILLE, channels: 3 } }).jpeg({ quality: 90, chromaSubsampling: '4:4:4' })
  .toFile(path.join(SORTIE, `scannes-${VERSION}-couleur.jpg`));
await sharp(normales, { raw: { width: TAILLE, height: TAILLE, channels: 3 } }).png({ compressionLevel: 9 })
  .toFile(path.join(SORTIE, `scannes-${VERSION}-normales.png`));
fs.writeFileSync(path.join(SORTIE, `scannes-${VERSION}.json`), JSON.stringify(fiche, null, 1) + '\n');
for (const f of [`scannes-${VERSION}-couleur.jpg`, `scannes-${VERSION}-normales.png`]) {
  console.log(f, (fs.statSync(path.join(SORTIE, f)).size / 1024).toFixed(0), 'Ko');
}
console.log('\nCrédits (à recopier dans vendor/materiaux/LICENSE.md) :');
for (const c of credits) console.log(`- ${c.tuile} : ${c.id} — ${c.page} (${c.metres} m) — ${c.pourquoi}`);
