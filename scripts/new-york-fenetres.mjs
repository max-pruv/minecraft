// Masques lumineux des photos de sumitmangela, CC BY 4.0.
// Les baies sont repérées DANS les recadrages 512×512 de new-york.mjs.
// Un seuil de luminance allumait aussi les ombres d'escaliers, les garde-corps
// et les climatiseurs. Ici seules des surfaces vitrées choisies s'allument.
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// [gauche, haut, droite, bas], à l'intérieur des vitres et hors des meneaux.
const BAIES = {
  'facade-brique': [[72,24,94,72],[151,150,171,205],[349,160,370,204],[438,283,455,325],[73,420,93,468],[350,420,368,468]],
  'facade-brownstone': [[38,114,53,145],[158,123,176,151],[304,171,316,198],[377,243,393,270],[425,242,440,270],[160,353,176,377],[79,392,92,417]],
  'facade-brique-2': [[33,53,43,66],[164,33,182,54],[220,67,234,91],[287,161,309,184],[391,161,418,216],[169,315,184,344],[365,284,384,306],[55,440,62,476],[198,413,214,433],[432,442,445,468]],
  'facade-brique-3': [[61,11,85,59],[170,40,194,60],[332,11,347,31],[96,144,110,170],[206,125,229,170],[357,125,398,171],[40,265,53,282],[173,240,194,253],[410,242,427,284],[61,350,86,392],[307,462,325,477]],
  'facade-brique-4': [[55,96,92,119],[106,131,120,154],[442,133,464,153],[21,260,40,284],[58,226,70,247],[80,260,94,281],[443,229,465,251],[24,359,41,382],[170,358,187,384],[57,389,74,414]],
  'facade-calcaire': [[65,14,80,25],[257,62,272,73],[173,110,187,120],[382,158,396,168],[87,206,101,217],[278,347,292,358],[194,396,209,407],[428,444,442,455],[111,491,125,504]],
  'facade-calcaire-2': [[25,47,32,61],[128,94,139,111],[289,91,299,104],[428,97,437,108],[182,185,192,200],[319,232,328,246],[457,236,466,248],[24,327,32,340],[237,371,245,383],[291,417,299,430],[401,465,409,478]],
  'facade-calcaire-3': [[37,51,41,62],[113,100,118,112],[192,125,196,136],[333,170,337,181],[463,204,468,215],[283,254,287,265],[157,298,161,308],[385,341,389,350],[237,391,241,400],[487,458,491,467]],
  'facade-verre': [[11,35,31,59],[114,84,133,113],[285,84,305,113],[183,131,203,157],[424,179,443,204],[80,229,99,254],[252,278,270,304],[389,326,408,354],[149,376,169,404],[458,424,478,452],[44,473,66,503]],
  'facade-verre-2': [[24,65,46,91],[115,111,136,130],[58,182,78,203],[145,208,164,228],[85,331,105,349],[27,369,47,389],[116,418,135,437],[275,335,289,367],[370,95,392,122],[449,273,470,300]],
};

export async function ecrireFenetres(nom, dossier) {
  const rectangles = BAIES[nom];
  if (!rectangles) throw new Error(`Façade sans relevé de fenêtres : ${nom}`);
  const pixels = Buffer.alloc(512 * 512);
  for (const [i, [x0, y0, x1, y1]] of rectangles.entries()) {
    if (!(0 <= x0 && x0 < x1 && x1 <= 512 && 0 <= y0 && y0 < y1 && y1 <= 512)) throw new Error(`Baie invalide : ${nom}`);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++)
      pixels[y * 512 + x] = 170 + (i * 31) % 85;
  }
  await sharp(pixels, { raw: { width: 512, height: 512, channels: 1 } })
    .blur(.6).jpeg({ quality: 90 }).toFile(path.join(dossier, `${nom}-nuit.jpg`));
}

// Régénération autonome, sans réimporter les monuments ni leurs grosses sources.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dossier = process.argv[2] || 'vendor/newyork';
  for (const nom of Object.keys(BAIES)) await ecrireFenetres(nom, dossier);
  console.log(`${Object.keys(BAIES).length} masques lumineux régénérés`);
}
