// Partager le jeu.
//
// Un enfant qui veut jouer avec un cousin n'a aucun moyen de lui donner
// l'adresse : il faudrait qu'un adulte la retape. D'où ce petit bouton
// discret tout en bas du menu, et derrière lui deux façons de transmettre le
// lien selon qui est en face :
//
//   — le **QR code**, quand l'ami est dans la même pièce : il le vise avec
//     l'appareil photo de sa tablette et il est dans le jeu ;
//   — le **partage du téléphone** (SMS, WhatsApp, courriel…), quand il est
//     ailleurs. C'est la feuille de partage du système, donc l'enfant
//     retrouve les applications qu'il connaît, sans qu'on ait à les
//     énumérer nous-mêmes.
//
// Le code QR est fabriqué sur l'appareil, sans aucun service extérieur : le
// lien d'un enfant ne part pas chez un tiers pour être transformé en image.

// L'adresse publique du jeu. Une page servie depuis un vrai domaine partage
// SON adresse — si la maison déménage, le lien suit sans qu'on y pense. Mais
// une page ouverte depuis le banc d'essai ou depuis un fichier local partage
// l'adresse canonique : « http://127.0.0.1:8322 » ne mène nulle part pour un
// cousin.
const ADRESSE_CANONIQUE = 'https://minecraft-fam.vercel.app/';

export function lienDuJeu() {
  const h = (typeof location !== 'undefined' && location.hostname) || '';
  const local = !h || h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local')
    || h.endsWith('.localhost') || location.protocol === 'file:';
  if (local) return ADRESSE_CANONIQUE;
  return location.origin + location.pathname.replace(/index\.html$/, '');
}

const MESSAGE = 'Viens jouer avec moi ! On construit, on explore et on apprend :';

// La bibliothèque de QR pèse cinquante kilo-octets pour un bouton qu'on
// touche une fois de temps en temps : elle n'est chargée qu'à la première
// ouverture du panneau, puis gardée. (Le service worker la met en cache, donc
// elle marche aussi hors ligne dès la deuxième fois.)
let qrcode = null;
async function chargerQR() {
  if (!qrcode) qrcode = (await import('../vendor/qrcode.module.js')).default;
  return qrcode;
}

// Dessine le code dans le canvas, en noir sur blanc et avec sa marge : un
// QR sans marge blanche autour ne se lit pas, c'est l'erreur classique.
export async function dessinerQR(canvas, texte) {
  const qr = (await chargerQR())(0, 'M');   // 0 = la version s'ajuste au texte
  qr.addData(texte);
  qr.make();
  const n = qr.getModuleCount();
  const MARGE = 4;                          // en modules, comme le veut la norme
  const cote = canvas.width;
  const pas = Math.floor(cote / (n + MARGE * 2));
  const decalage = Math.floor((cote - pas * n) / 2);
  const g = canvas.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, cote, cote);
  g.fillStyle = '#000';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) g.fillRect(decalage + c * pas, decalage + r * pas, pas, pas);
    }
  }
  return n;
}

// La feuille de partage du système. Elle n'existe pas partout — sur un
// ordinateur de bureau, notamment —, d'où les deux chemins de repli : le
// presse-papier, puis la sélection du texte si même lui est refusé.
export async function partagerLien(lien, { toast } = {}) {
  const texte = `${MESSAGE} ${lien}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Viens jouer !', text: MESSAGE, url: lien });
      return 'partage';
    } catch (e) {
      // L'enfant a fermé la feuille : ce n'est pas une panne, on ne dit rien.
      if (e && e.name === 'AbortError') return 'annule';
    }
  }
  try {
    await navigator.clipboard.writeText(texte);
    if (toast) toast('🔗 Lien copié ! Colle-le dans un message.');
    return 'copie';
  } catch {
    if (toast) toast('🔗 Voici le lien : ' + lien);
    return 'affiche';
  }
}

// WhatsApp accepte un lien d'ouverture universel, et les SMS aussi : ce sont
// les deux applications que les enfants d'ici utilisent pour s'inviter. Elles
// sont proposées en clair quand la feuille de partage du système n'existe pas.
export const lienWhatsApp = (lien) =>
  `https://wa.me/?text=${encodeURIComponent(`${MESSAGE} ${lien}`)}`;
export const lienSMS = (lien) =>
  `sms:?&body=${encodeURIComponent(`${MESSAGE} ${lien}`)}`;
