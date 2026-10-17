// LES COMMANDES SIMPLIFIÉES (Max, octobre 2026). « Une main pour bouger, une
// main pour agir » : à gauche le joystick, à droite une pilule d'action et
// trois boutons au plus, en haut à droite UN menu. Les petits boutons dispersés
// d'avant (pause, sac, réglages, maison, caméra, messages, joueurs, souvenirs,
// photo) ne disparaissent pas : ils restent dans la page, avec leurs
// gestionnaires, et le menu les APPUIE. Rien de ce qu'ils faisaient n'est
// réécrit, et un témoin qui les touche par leur `id` les trouve toujours.
//
// Aucun import : ce module ne sait rien du monde, il reçoit ce qu'il lui faut.

// Des icônes au trait fin, blanches, sans libellé — retour de Max sur la
// maquette : « plus de transparence, moins de texte ». Le mot vit dans
// `aria-label`, jamais sous le bouton.
const T = (d, w = 1.8) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const ICONES = {
  menu: T('<path d="M5 8h14M5 16h14"/>', 2),
  carte: T('<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/>'),
  sauter: T('<path d="M12 19V6M6.5 11.5 12 6l5.5 5.5"/>', 2),
  descendre: T('<path d="M12 5v13M6.5 12.5 12 18l5.5-5.5"/>', 2),
  voler: T('<path d="M2.5 14.5 21.5 7l-4.5 9-5-2.5-4 4v-5.5z"/>'),
  construire: T('<path d="M4 8.5 12 4.5l8 4-8 4z"/><path d="M4 8.5v7l8 4 8-4v-7M12 12.5v7"/>'),
  poser: T('<path d="M12 5v14M5 12h14"/>', 2.2),
  casser: T('<path d="M14.5 4.5l5 5M4 20l9.5-9.5M10.5 7.5l6 6"/>', 2),
  frein: T('<circle cx="12" cy="12" r="7.5"/><path d="M12 8.5v4.5M12 16v.01"/>', 2),
  train: T('<circle cx="12" cy="15" r="4.5"/><path d="M12 4v6.5"/>'),
  sac: T('<path d="M6 8h12l-1 12H7z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
  photos: T('<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="m3.5 16 5-5 4 4 2.5-2.5 5 5"/><circle cx="15.5" cy="9" r="1.4"/>'),
  photo: T('<rect x="3" y="7" width="18" height="13" rx="3"/><circle cx="12" cy="13.5" r="3.5"/><path d="M9 7l1.5-2.5h3L15 7"/>'),
  ami: T('<circle cx="9" cy="9" r="3.2"/><path d="M3 19c1-3.5 3.5-5 6-5s5 1.5 6 5"/><path d="M16 6.5a3 3 0 0 1 0 5.5M18 14c1.6.6 2.6 2 3 4"/>'),
  messages: T('<path d="M4.5 5.5h15v10h-9l-4 3.5v-3.5h-2z"/>'),
  camera: T('<rect x="3" y="7" width="12.5" height="10" rx="2.5"/><path d="m15.5 10.5 5-3v9l-5-3"/>'),
  apprendre: T('<path d="M3 8l9-4 9 4-9 4z"/><path d="M7 10v4c0 2 2.5 3.5 5 3.5s5-1.5 5-3.5v-4"/>'),
  reglages: T('<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>'),
  accueil: T('<path d="M4 11l8-7 8 7v9H4z"/>'),
  reprendre: T('<path d="M8 5.5v13l11-6.5z"/>', 2),
};

// Les lignes du menu, dans l'ordre de la maquette. `cible` est le bouton
// d'avant que la ligne appuie ; `quand` dit si le jeu l'offre en ce moment —
// un bouton que le jeu ne montrait qu'en ligne (caméra, messages) ne doit pas
// être offert seul dans son coin : il ne ferait rien, et un bouton qui ne fait
// rien est pire qu'un bouton qui refuse (v228).
const affiche = (el) => !!el && !!el.style.display && el.style.display !== 'none';
export const LIGNES = [
  { cle: 'sac', mot: 'Mon sac', cible: '#inv-btn' },
  { cle: 'photos', mot: 'Mes photos', cible: '.fun-btn[title="Souvenirs"]' },
  { cle: 'photo', mot: 'Prendre une photo', cible: '.fun-btn[title="Photo"]' },
  { cle: 'carte', mot: 'Carte du monde', cible: '#minimap' },
  { cle: 'ami', mot: 'Jouer avec un ami', cible: '#players-btn', repli: 'ami' },
  { cle: 'messages', mot: 'Messages', cible: '#chat-btn', quand: affiche },
  { cle: 'camera', mot: 'Caméra', cible: '#cam-btn', quand: affiche },
  { cle: 'apprendre', mot: 'Apprendre', repli: 'apprendre' },
  { cle: 'reglages', mot: 'Réglages', cible: '#settings-btn' },
  { cle: 'accueil', mot: 'Retour à l\'accueil', cible: '#home-btn', sep: true },
];

// Les anciens boutons que le menu remplace : ils s'effacent de l'écran de jeu
// (classe `hud-simple` du body) et restent atteignables par ces lignes. Un
// témoin de maj.js lit cette liste et exige une ligne par bouton.
export const REMPLACES = ['#pause-btn', '#inv-btn', '#settings-btn', '#cam-btn', '#home-btn',
  '#chat-btn', '#players-btn', '.fun-btn[title="Souvenirs"]', '.fun-btn[title="Photo"]'];

export function initCommandes(h) {
  const $ = (s) => document.querySelector(s);
  const btn = $('#menu-btn'), panneau = $('#menu-jeu'), liste = $('#menu-lignes');
  if (!btn || !panneau || !liste) return null;
  document.body.classList.add('hud-simple');
  btn.innerHTML = ICONES.menu;
  $('#menu-reprendre').insertAdjacentHTML('afterbegin', ICONES.reprendre);
  // Les icônes des boutons ronds : on remplace le pictogramme, jamais le mot
  // (`.lb`), que des témoins lisent et que l'écran ne montre plus (classe
  // visuellement cachée, pas `display: none`).
  const icone = (sel, cle) => {
    const b = $(sel); if (!b) return;
    const ic = b.querySelector('.ic');
    if (ic) ic.innerHTML = ICONES[cle];
    else b.innerHTML = ICONES[cle];
  };
  icone('#jump-btn', 'sauter'); icone('#down-btn', 'descendre'); icone('#fly-btn', 'voler');
  icone('#fm-btn', 'frein'); icone('#train-btn', 'train'); icone('#construire-btn', 'construire');
  icone('#poser-btn', 'poser'); icone('#casser-btn', 'casser'); icone('#map-btn', 'carte');

  for (const l of LIGNES) {
    if (l.sep) liste.insertAdjacentHTML('beforeend', '<div class="menu-sep"></div>');
    liste.insertAdjacentHTML('beforeend',
      `<button class="menu-ligne" data-cle="${l.cle}"${l.cible ? ` data-cible='${l.cible}'` : ''}><span class="menu-ico">${ICONES[l.cle]}</span><span class="menu-mot">${l.mot}</span><span class="menu-note"></span></button>`);
  }

  let ouvert = false;
  const majLignes = () => {
    for (const b of liste.querySelectorAll('.menu-ligne')) {
      const l = LIGNES.find((x) => x.cle === b.dataset.cle);
      const el = l.cible ? $(l.cible) : null;
      const dispo = l.repli ? true : (!!el && (!l.quand || l.quand(el)));
      b.style.display = dispo ? '' : 'none';
      const note = b.querySelector('.menu-note');
      let txt = '';
      if (l.cle === 'messages') { const n = $('#chat-badge'); txt = n && affiche(n) ? n.textContent : ''; }
      if (l.cle === 'camera') txt = el && el.classList.contains('on') ? 'allumée' : '';
      if (l.cle === 'ami' && el && affiche(el)) txt = el.textContent.trim();
      note.textContent = txt;
    }
    const lieu = h.lieu ? h.lieu() : '';
    $('#menu-lieu').textContent = lieu || '';
  };
  const ouvrir = () => {
    if (ouvert || (h.peutOuvrir && !h.peutOuvrir())) return false;
    ouvert = true;
    majLignes();
    panneau.classList.add('ouvert');
    btn.setAttribute('aria-expanded', 'true');
    if (h.pauser) h.pauser();
    return true;
  };
  const fermer = (reprendre = true) => {
    if (!ouvert) return;
    ouvert = false;
    panneau.classList.remove('ouvert');
    btn.setAttribute('aria-expanded', 'false');
    if (reprendre && h.reprendre) h.reprendre();
  };
  btn.addEventListener('click', () => (ouvert ? fermer() : ouvrir()));
  $('#menu-reprendre').addEventListener('click', () => fermer());
  panneau.addEventListener('click', (e) => { if (e.target === panneau) fermer(); });
  liste.addEventListener('click', (e) => {
    const b = e.target.closest('.menu-ligne');
    if (!b) return;
    const l = LIGNES.find((x) => x.cle === b.dataset.cle);
    // On rend la partie d'abord, PUIS on appuie le bouton d'avant : c'est
    // exactement l'état dans lequel il était touché avant le menu.
    fermer();
    const el = l.cible ? $(l.cible) : null;
    if (l.repli === 'ami' && !(el && affiche(el))) { if (h.jouerAvecUnAmi) h.jouerAvecUnAmi(); return; }
    if (l.repli === 'apprendre') { if (h.apprendre) h.apprendre(); return; }
    if (el) el.click();
  });

  // Les messages non lus clignotaient sur le bouton 💬 ; il est dans le menu,
  // donc c'est le menu qui porte la pastille.
  const chat = $('#chat-btn');
  if (chat && window.MutationObserver) {
    const suivre = () => btn.classList.toggle('non-lu', chat.classList.contains('unread'));
    new MutationObserver(suivre).observe(chat, { attributes: true, attributeFilter: ['class', 'style'] });
    suivre();
  }

  // CONSTRUIRE EST UN MODE QU'ON CHOISIT, PAS UN ÉTAT QU'ON SUBIT. Hors
  // construction, la barre de blocs et la pioche s'effacent, et toucher l'écran
  // ne pose ni ne casse rien : on regarde autour de soi sans abîmer le monde.
  const construire = (oui) => {
    const avant = document.body.classList.contains('construction');
    if (oui === undefined) oui = !avant;
    if (oui === avant) return oui;
    document.body.classList.toggle('construction', oui);
    const cb = $('#construire-btn');
    if (cb) cb.setAttribute('aria-pressed', oui ? 'true' : 'false');
    if (h.surConstruction) h.surConstruction(oui);
    return oui;
  };
  $('#construire-btn')?.addEventListener('click', () => construire());
  $('#construction-fin')?.addEventListener('click', () => construire(false));
  const outil = (casser) => {
    if (h.choisirOutil) h.choisirOutil(casser);
    $('#poser-btn')?.classList.toggle('actif', !casser);
    $('#casser-btn')?.classList.toggle('actif', !!casser);
  };
  // `click` ET `touchstart` : le doigt de l'enfant passe par le second (le
  // canvas en dessous ne doit pas le recevoir), un témoin par le premier.
  for (const [sel, casser] of [['#poser-btn', false], ['#casser-btn', true]]) {
    const b = $(sel); if (!b) continue;
    b.addEventListener('click', () => outil(casser));
    b.addEventListener('touchstart', (e) => { e.preventDefault(); outil(casser); }, { passive: false });
  }
  const cb = $('#construire-btn');
  if (cb) cb.addEventListener('touchstart', (e) => { e.preventDefault(); construire(); }, { passive: false });
  outil(h.outilCasse ? h.outilCasse() : true);

  return {
    ouvrir, fermer: () => fermer(), estOuvert: () => ouvert, construire,
    enConstruction: () => document.body.classList.contains('construction'), outil, majLignes,
  };
}
