// La visio : se voir vraiment, et s'entendre vraiment.
//
// Trois pannes bien réelles se logeaient ici, et ce module les traite chacune.
//
// 1. Le carré noir. La vignette de l'autre était créée avec le son actif. Le
//    navigateur — Safari en tête — refuse de lancer tout seul une lecture qui
//    porte du son : play() était rejeté, l'appel de secours était avalé par un
//    catch vide, et il ne restait qu'un rectangle sombre. On sépare donc
//    l'image du son : la vignette est MUETTE, donc elle démarre toujours ; le
//    son part dans un élément à lui, et s'il est refusé on demande une touche
//    à l'enfant, une seule fois, plutôt que de se taire pour toujours.
//
// 2. Le silence. Même cause, même remède : le son a maintenant son propre
//    élément, sa propre tentative, et un rattrapage au premier contact avec
//    l'écran.
//
// 3. Le Wi-Fi public. Quand la partie passe par le nuage, aucun flux vidéo ne
//    circule : la visio a besoin d'un lien direct que ce réseau interdit. On
//    ne laisse pas l'enfant devant un cadre vide — on envoie une image fixe
//    toutes les deux secondes par le même tuyau que les blocs. Ce n'est pas la
//    télévision, mais on se voit, on se reconnaît, on se fait coucou. Le son,
//    lui, ne passe pas : on le dit franchement au lieu de laisser croire.

// ---- le son qui attend une touche ------------------------------------------

const enAttenteDeSon = new Set();
let ecouteArmee = false;
let direQuIlFautToucher = null;

// Réveille tout ce qui attendait la permission de faire du bruit. Un simple
// contact avec l'écran suffit au navigateur : on le guette une fois, partout.
function armerLeReveil() {
  if (ecouteArmee) return;
  ecouteArmee = true;
  const reveil = () => {
    for (const el of [...enAttenteDeSon]) {
      el.muted = false;
      el.play().then(() => enAttenteDeSon.delete(el)).catch(() => {});
    }
    if (!enAttenteDeSon.size) {
      document.removeEventListener('pointerdown', reveil, true);
      document.removeEventListener('keydown', reveil, true);
      ecouteArmee = false;
    }
  };
  document.addEventListener('pointerdown', reveil, true);
  document.addEventListener('keydown', reveil, true);
}

// À appeler une fois au démarrage : comment prévenir l'enfant qu'il doit
// toucher l'écran pour entendre.
export function surSonEnAttente(fn) { direQuIlFautToucher = fn; }

// Fait sonner un flux distant. Retourne l'élément audio pour qu'on puisse le
// retirer quand le pair s'en va.
export function jouerLeSon(flux, nom) {
  const audio = document.createElement('audio');
  audio.autoplay = true;
  audio.setAttribute('playsinline', '');
  audio.srcObject = flux;
  audio.style.display = 'none';
  document.body.appendChild(audio);
  audio.play().catch(() => {
    // Refusé faute de geste : on ne renonce pas, on attend le premier contact.
    enAttenteDeSon.add(audio);
    armerLeReveil();
    if (direQuIlFautToucher) direQuIlFautToucher(nom);
  });
  return audio;
}

export function arreterLeSon(audio) {
  if (!audio) return;
  enAttenteDeSon.delete(audio);
  try { audio.pause(); } catch { /* déjà arrêté */ }
  audio.srcObject = null;
  audio.remove();
}

// ---- la caméra lente, par le nuage -----------------------------------------

export const PHOTO_MS = 2000;     // une image toutes les deux secondes
const PHOTO_L = 160;              // assez pour se reconnaître, assez petit
const PHOTO_H = 120;
const PHOTO_Q = 0.5;              // ~5 ko une fois encodée : ça passe partout

// Prend une photo du flux local et la rend en texte, prête à voyager dans un
// message de jeu ordinaire.
export function photographier(video, canvas) {
  if (!video || !video.videoWidth) return null;
  const c = canvas || document.createElement('canvas');
  c.width = PHOTO_L; c.height = PHOTO_H;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  // On recadre au centre : le portrait tient dans le cadre même si la caméra
  // filme en 4:3 et la vignette en 16:9.
  const rap = video.videoWidth / video.videoHeight;
  const cible = PHOTO_L / PHOTO_H;
  let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;
  if (rap > cible) { sw = video.videoHeight * cible; sx = (video.videoWidth - sw) / 2; }
  else { sh = video.videoWidth / cible; sy = (video.videoHeight - sh) / 2; }
  try {
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, PHOTO_L, PHOTO_H);
    return c.toDataURL('image/jpeg', PHOTO_Q);
  } catch { return null; }
}

// Le photographe : tant qu'il tourne, il envoie une image de temps en temps.
export class Photographe {
  // lireLeFlux() : rend l'élément <video> local, ou rien s'il n'y en a pas.
  // envoyer(dataURL) : expédie l'image (par le nuage, par le direct, peu
  // importe — c'est un message de jeu comme un autre).
  constructor(lireLeFlux, envoyer, periode = PHOTO_MS) {
    this.lireLeFlux = lireLeFlux;
    this.envoyer = envoyer;
    this.periode = periode;
    this.canvas = null;
    this._timer = null;
  }

  get actif() { return !!this._timer; }

  demarrer() {
    if (this._timer) return;
    this.canvas = this.canvas || document.createElement('canvas');
    const tour = () => {
      const video = this.lireLeFlux ? this.lireLeFlux() : null;
      const img = photographier(video, this.canvas);
      if (img) this.envoyer(img);
    };
    tour();                                   // la première tout de suite
    this._timer = setInterval(tour, this.periode);
  }

  arreter() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }
}
