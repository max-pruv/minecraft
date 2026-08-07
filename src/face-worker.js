// Le scanner de visages dans un fil séparé.
//
// Reconnaître un visage est un calcul de réseau de neurones qui dure plusieurs
// centaines de millisecondes. Sur le fil principal, il gelait l'écran « Qui
// joue ? » à chaque tentative — et la boucle en enchaîne une toutes les 200 ms.
// Ici, l'interface reste fluide pendant que le calcul tourne à côté.
//
// Ce fil n'est jamais indispensable : identity.js repart sur le calcul direct
// si quoi que ce soit échoue ici. C'est ce qui rend le déplacement sans risque
// sur des navigateurs où les fils séparés n'ont pas accès au processeur
// graphique.

/* eslint-env worker */

let pret = null;

async function preparer(modelUrl) {
  if (pret) return pret;
  pret = (async () => {
    importScripts('../vendor/face-api.js');
    const f = self.faceapi;
    if (!f) throw new Error('face-api absent du fil');

    // face-api détecte son environnement en cherchant `window` et `document`.
    // Un fil séparé n'a ni l'un ni l'autre : sa détection automatique échoue,
    // et monkeyPatch refuse de compléter un environnement inexistant. On lui
    // en fournit donc un de toutes pièces, bâti sur OffscreenCanvas, qui rend
    // exactement les mêmes services que les toiles du document.
    if (typeof OffscreenCanvas === 'undefined') throw new Error('OffscreenCanvas absent');
    const absent = (quoi) => () => { throw new Error(`${quoi} : indisponible dans un fil séparé`); };
    f.env.setEnv({
      Canvas: OffscreenCanvas,
      CanvasRenderingContext2D: self.OffscreenCanvasRenderingContext2D,
      Image: self.ImageBitmap,
      ImageData: self.ImageData,
      Video: class {},                     // aucune vidéo ne traverse la frontière
      createCanvasElement: () => new OffscreenCanvas(1, 1),
      createImageElement: absent('createImageElement'),
      createVideoElement: absent('createVideoElement'),
      fetch: self.fetch.bind(self),
      readFile: absent('readFile'),
    });

    await f.nets.tinyFaceDetector.loadFromUri(modelUrl);
    await f.nets.faceLandmark68Net.loadFromUri(modelUrl);
    await f.nets.faceRecognitionNet.loadFromUri(modelUrl);
    return f;
  })().catch((e) => { pret = null; throw e; });
  return pret;
}

self.onmessage = async (e) => {
  const { id, type, modelUrl, largeur, hauteur, pixels, taille, seuil } = e.data;
  try {
    if (type === 'init') {
      await preparer(modelUrl);
      self.postMessage({ id, type: 'pret' });
      return;
    }
    if (type === 'detect') {
      const f = await preparer(modelUrl);
      // face-api n'accepte pas une ImageData brute : il attend une toile ou un
      // tenseur. On repeint donc les pixels reçus dans une OffscreenCanvas,
      // déclarée plus haut comme le type de toile de cet environnement.
      const image = new ImageData(new Uint8ClampedArray(pixels), largeur, hauteur);
      const toile = new OffscreenCanvas(largeur, hauteur);
      toile.getContext('2d').putImageData(image, 0, 0);
      const res = await f
        .detectSingleFace(toile, new f.TinyFaceDetectorOptions({ inputSize: taille, scoreThreshold: seuil }))
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (!res) { self.postMessage({ id, type: 'resultat', res: null }); return; }
      // On ne renvoie que ce qui sert de l'autre côté : l'empreinte, les
      // repères du visage et le cadre. Les objets de face-api ne traversent
      // pas la frontière entre fils.
      self.postMessage({
        id,
        type: 'resultat',
        res: {
          descriptor: Array.from(res.descriptor),
          landmarks: { positions: res.landmarks.positions.map((p) => ({ x: p.x, y: p.y })) },
          detection: {
            box: {
              x: res.detection.box.x, y: res.detection.box.y,
              width: res.detection.box.width, height: res.detection.box.height,
            },
            score: res.detection.score,
          },
        },
      });
      return;
    }
  } catch (err) {
    self.postMessage({ id, type: 'erreur', message: String(err && err.message || err) });
  }
};
