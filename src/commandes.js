// LES COMMANDES SIMPLIFIÉES (Max, octobre 2026). « Une main pour bouger, une
// main pour agir » : à gauche le joystick, à droite une pilule d'action et
// trois boutons au plus, en haut à droite UN menu. Les petits boutons dispersés
// d'avant (pause, sac, réglages, maison, caméra, messages, joueurs, souvenirs,
// photo) ne disparaissent pas : ils restent dans la page, avec leurs
// gestionnaires, et le menu les APPUIE. Rien de ce qu'ils faisaient n'est
// réécrit, et un témoin qui les touche par leur `id` les trouve toujours.
//
// Aucun import : ce module ne sait rien du monde, il reçoit ce qu'il lui faut.

// LES ICÔNES (v504). Max : « les icônes ne sont pas suffisamment claires, le
// bouton pour voler n'est pas suffisamment clair ». Celles de la v494 étaient
// au trait fin (1,8 sur 24) : sur le ciel, à la taille d'un pouce, elles se
// lisaient comme des griffonnages. Ici : un trait ÉPAIS (2,4 à 3), UNE idée
// par icône, et des aplats là où une silhouette se reconnaît mieux qu'un
// contour — l'aile de Voler, l'avion qui décolle ou se pose. Tout est dessiné
// ici, en SVG en ligne : ni police d'icônes, ni réseau (le jeu marche hors
// ligne), et aucun dessin emprunté (invariant 4). Le mot vit dans
// `aria-label` et dans `.lb`, jamais sous le bouton.
const T = (d, w = 2.4) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
// Une silhouette d'avion vue de dessus, nez en haut, dessinée pour ce jeu.
const AVION = 'M12 2.6c.9 0 1.5.9 1.5 2V9.4l7 4.2v2.2l-7-2v4.4l2.3 1.8V21L12 20.1 8.2 21v-1.4l2.3-1.8v-4.4l-7 2v-2.2l7-4.2V4.6c0-1.1.6-2 1.5-2z';
const avion = (angle) => `<path fill="currentColor" stroke="none" transform="translate(12 10) rotate(${angle}) scale(.92) translate(-12 -12)" d="${AVION}"/><path d="M3.5 21h17" stroke-width="2.4"/>`;
// Un appareil vu de côté, en aplat : nez à droite, dérive à gauche, décalé de
// `dy` vers le bas (le train rentré pose le ventre sur la roue).
const FUSELAGE = (dy) => `<path fill="currentColor" stroke="none" transform="translate(0 ${dy})" d="M2.6 1.4h2.6l2.4 2.6h9.6c2.4 0 4.3 1 4.6 2.2.1.6-.4 1.2-1.2 1.2H4.2c-1 0-1.7-.6-1.7-1.4z"/>`;
export const ICONES = {
  menu: T('<path d="M4 6.5h16M4 12h16M4 17.5h16"/>', 2.6),
  carte: T('<path d="M8.5 4 3 6.2V20l5.5-2.2 7 2.2L21 17.8V4l-5.5 2.2z"/><path d="M8.5 4v13.8M15.5 6.2V20"/>', 2.2),
  sauter: T('<path d="M12 16V4.5M6.5 10 12 4.5l5.5 5.5"/><path d="M5 20.5h14"/>', 2.8),
  descendre: T('<path d="M12 3.5V15M6.5 9.5 12 15l5.5-5.5"/><path d="M5 20.5h14"/>', 2.8),
  // VOLER : une aile, pleine. Elle ne ressemble à aucun autre bouton du jeu,
  // et un enfant de sept ans la lit « voler » avant de savoir lire le mot.
  voler: T('<path fill="currentColor" stroke="none" transform="translate(12 12) scale(1.12) translate(-12 -11)" d="M2.5 9.5C2.5 7 4.5 5.5 7 5.5c5 0 9.5 1 14.5-1.5-1.3 3.4-3.6 5.2-6.6 5.8 1.8.3 3.6.1 5-.5-1.6 2.9-4.3 4.2-7.3 4.5 1.4.5 2.8.6 4.1.3-2.3 2.9-6 4.2-9.6 3.4C4.1 16.8 2.5 13.6 2.5 9.5z"/>'),
  decoller: T(avion(48)),
  atterrir: T(avion(132)),
  // LE KLAXON ET LA RADIO (v543) : un cornet d'avertisseur, un poste à
  // antenne — au trait épais, reconnaissables à la taille du pouce.
  klaxon: T('<path d="M4 9.5h5l7-4.5v14l-7-4.5H4z" fill="currentColor" fill-opacity=".35"/><path d="M4 9.5h5l7-4.5v14l-7-4.5H4z"/><path d="M19 9.2a4.2 4.2 0 0 1 0 5.6M21.2 6.8a7.3 7.3 0 0 1 0 10.4"/>', 2.2),
  radio: T('<rect x="3.5" y="9" width="17" height="11" rx="2"/><path d="M7 9 16.5 3.5"/><circle cx="14.8" cy="14.5" r="2.4"/><path d="M6.5 13h3.5M6.5 16h3.5"/>', 2.2),
  frein: T('<circle cx="12" cy="12" r="5.8"/><path d="M12 9.2v3.4M12 15.1v.01"/><path d="M4.4 7.2a9.6 9.6 0 0 0 0 9.6M19.6 7.2a9.6 9.6 0 0 1 0 9.6"/>', 2.4),
  // LE TRAIN (v514). Max : « on ne comprend pas que c'est une roue ». Une
  // croix sur un cercle se lisait comme une cible. Ici un appareil vu de
  // côté (aplat, nez à droite, dérive à gauche) et SA roue : un pneu épais,
  // un moyeu, quatre rayons. L'icône dit l'ÉTAT, comme le mot : sorti, la
  // roue pend sous sa jambe ; rentré, elle est collée dans le ventre.
  train: T(`${FUSELAGE(-0.6)}<path d="M12 6.4v2.6"/><circle cx="12" cy="15.6" r="6.1" stroke-width="3.2"/><circle cx="12" cy="15.6" r="2" fill="currentColor" stroke="none"/><path d="M12 11.3v2.1M12 17.8v2.1M7.7 15.6h2.1M14.2 15.6h2.1" stroke-width="2.2"/>`, 2.8),
  trainRentre: T(`<circle cx="12" cy="17" r="3.8" stroke-width="2.8"/><circle cx="12" cy="17" r="1.4" fill="currentColor" stroke="none"/>${FUSELAGE(5.4)}`, 2.6),
  construire: T('<path d="M12 3.2 20 7.6l-8 4.4-8-4.4z" fill="currentColor" fill-opacity=".45"/><path d="M12 3.2 20 7.6v8.8L12 20.8l-8-4.4V7.6zM12 12v8.8M4 7.6 12 12l8-4.4"/>', 2.2),
  poser: T('<path d="M12 4.5v15M4.5 12h15"/>', 3.2),
  // CASSER : une pioche — le geste qu'un enfant connaît des jeux de blocs.
  // Un trait et un arc se lisaient « télécharger » (revue d'écran, ligne 4,
  // v533) : le fer est désormais PLEIN, un croissant aux deux pointes en
  // travers du manche, et le manche finit sur un pommeau. Rien d'une flèche.
  casser: T('<path d="M4.2 19.8 15.4 8.6"/><circle cx="4.2" cy="19.8" r="1.6" fill="currentColor" stroke="none"/>'
    + '<path fill="currentColor" stroke="none" d="M9.2 2.4Q20.6 1.2 21.6 14.8Q16.6 7.4 9.2 2.4z"/>', 2.8),
  pause: T('<path d="M8.5 5v14M15.5 5v14"/>', 3),
  sac: T('<path d="M5.5 9.5h13l-1.2 10.5H6.7z"/><path d="M9 9.5V7a3 3 0 0 1 6 0v2.5"/>', 2.2),
  photos: T('<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="m3.5 16.5 5-5 4 4 2.5-2.5 5 5"/><circle cx="15.5" cy="9.3" r="1.4" fill="currentColor" stroke="none"/>', 2.2),
  photo: T('<rect x="3" y="7" width="18" height="13" rx="3"/><circle cx="12" cy="13.5" r="3.6"/><path d="M9 7l1.5-2.5h3L15 7"/>', 2.2),
  ami: T('<circle cx="9" cy="8.8" r="3.3"/><path d="M3 19.5c.9-3.5 3.4-5.3 6-5.3s5.1 1.8 6 5.3"/><path d="M16 5.8a3.1 3.1 0 0 1 0 6M18 14.2c1.7.6 2.6 2.1 3 4.3"/>', 2.2),
  messages: T('<path d="M4.5 5h15v10.5h-9l-4.5 3.8v-3.8h-1.5z"/>', 2.2),
  camera: T('<rect x="2.8" y="7" width="12.7" height="10" rx="2.5"/><path d="m15.5 10.6 5.5-3.2v9.2l-5.5-3.2"/>', 2.2),
  apprendre: T('<path d="M2.8 8.5 12 4.2l9.2 4.3L12 12.8z"/><path d="M6.8 10.6v4.2c0 1.9 2.4 3.4 5.2 3.4s5.2-1.5 5.2-3.4v-4.2"/>', 2.2),
  reglages: T('<path d="M4 7h9M18 7h2M4 17h3M12 17h8"/><circle cx="15.5" cy="7" r="2.4"/><circle cx="9.5" cy="17" r="2.4"/>', 2.2),
  accueil: T('<path d="M3.8 11.2 12 4l8.2 7.2V20H3.8z"/><path d="M10 20v-5h4v5"/>', 2.2),
  reprendre: T('<path d="M8 5v14l11-7z" fill="currentColor"/>', 2),
  // Sortir de la construction : le cube de Construire, barré d'une croix —
  // on sort par le bouton par lequel on est entré (v520), plus une coche.
  terminer: T('<path d="M10 2.4 16.8 6.2v7.6L10 17.6l-6.8-3.8V6.2z" fill="currentColor" fill-opacity=".25"/><path d="M10 2.4 16.8 6.2v7.6L10 17.6l-6.8-3.8V6.2zM10 10v7.6M3.2 6.2 10 10l6.8-3.8"/><circle cx="17.6" cy="17.6" r="5.6" fill="currentColor" stroke="none"/><path d="M15.4 15.4l4.4 4.4M19.8 15.4l-4.4 4.4" stroke="#fff" stroke-width="2.2"/>', 2.2),
  // Les pilules d'action : l'icône dit le geste, le mot qui suit dit quoi.
  monter: T('<path d="M14 4h5v16h-5"/><path d="M3.5 12H14M10 8l4 4-4 4"/>', 2.4),
  sortir: T('<path d="M10 4H5v16h5"/><path d="M9 12h11.5M16.5 8l4 4-4 4"/>', 2.4),
  volant: T('<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="2.2"/><path d="M3.6 10.8h6.4M14 10.8h6.4M12 14.2v6.4"/>', 2.2),
  piloter: T(`<path fill="currentColor" stroke="none" transform="translate(12 12) rotate(45) scale(.9) translate(-12 -12)" d="${AVION}"/>`),
  nourrir: T('<path d="M12 8.2c-1.2-1-3-1.4-4.6-.8-2.8 1.1-3.4 4.8-1.8 8.3 1.2 2.7 3.4 5 5.2 4.3.6-.2.9-.4 1.2-.4s.6.2 1.2.4c1.8.7 4-1.6 5.2-4.3 1.6-3.5 1-7.2-1.8-8.3-1.6-.6-3.4-.2-4.6.8z"/><path d="M12 8.2c0-2.2.9-3.7 2.6-4.4"/>', 2.2),
  emotes: T('<circle cx="12" cy="12" r="8.6"/><path d="M8.3 14.2c2 2.3 5.4 2.3 7.4 0"/><path d="M9 9.6v.6M15 9.6v.6"/>', 2.4),
  // LA CARTE DU MONDE (v508) : une loupe pour la recherche, et le doigt qui
  // appuie longtemps — un point et l'anneau qui grandit sous lui, comme la
  // cible que la carte dessine pendant l'appui.
  chercher: T('<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5.5 5.5"/>', 2.6),
  appui: T('<circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="7.6"/>', 2.2),
  moi: T('<circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>', 2.2),
  monde: T('<circle cx="12" cy="12" r="8.6"/><path d="M3.4 12h17.2M12 3.4c2.4 2.4 3.6 5.3 3.6 8.6s-1.2 6.2-3.6 8.6c-2.4-2.4-3.6-5.3-3.6-8.6s1.2-6.2 3.6-8.6z"/>', 2),
  tresor: T('<path d="M3.5 10.5h17V20h-17z"/><path d="M3.5 10.5V9a5 5 0 0 1 5-5h7a5 5 0 0 1 5 5v1.5"/><path d="M10.5 13.5h3v3h-3z" fill="currentColor"/>', 2.2),
  boussole: T('<circle cx="12" cy="12" r="8.6"/><path d="m15.6 8.4-2 5.2-5.2 2 2-5.2z" fill="currentColor"/>', 2.2),
  corbeille: T('<path d="M4.5 6.5h15M9.5 6.5V4h5v2.5M6.5 6.5l1 13.5h9l1-13.5"/>', 2.2),
  partager: T('<path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M5 12v8h14v-8"/>', 2.2),
  melanger: T('<path d="M3.5 7h3.5c4 0 6 10 10 10h3.5M3.5 17h3.5c4 0 6-10 10-10h3.5"/><path d="m18 4 3 3-3 3M18 14l3 3-3 3"/>', 2.2),
  // LIBRE : une horloge, pour « libre jusqu'à 18 h » (le badge du temps libre).
  libre: T('<circle cx="12" cy="12" r="8.6"/><path d="M12 7v5.2l3.4 2.2"/>', 2.4),
  etincelle: T('<path d="M12 3.5 13.9 10.1 20.5 12l-6.6 1.9L12 20.5l-1.9-6.6L3.5 12l6.6-1.9z" fill="currentColor"/>', 1.6),
};
// LA PASTILLE D'UNE LIGNE (v504) : un enfant qui ne lit pas encore bien
// reconnaît un rond bleu avant un mot (washington.js). Le rond était un
// emoji ; c'est désormais un disque de la teinte de la ligne.
const TEINTES_PASTILLE = { '🔵': '#2f6fdc', '🔴': '#d8342c', '🟢': '#1c9a4a', '🟡': '#f2c21b', '🟠': '#e8822a',
  '⚪': '#f4f4f4', '🟣': '#8a4fd8', '🟤': '#8a5a34', '⚫': '#222' };
export function pastille(emoji) {
  const c = TEINTES_PASTILLE[emoji];
  return c ? `<svg class="ico pastille" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="${c}" stroke="#fff" stroke-width="2.4"/></svg>` : null;
}
// L'icône d'une pilule et son mot, en une écriture : le mot reste du TEXTE
// (des témoins lisent `textContent`), l'icône ne porte aucun caractère.
export const avecIcone = (cle, mot) => `${ICONES[cle] || cle || ''}<span class="mot">${mot}</span>`;

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
  icone('#klaxon-btn', 'klaxon'); icone('#radio-btn', 'radio');
  icone('#construction-fin', 'terminer');
  icone('#poser-btn', 'poser'); icone('#casser-btn', 'casser'); icone('#map-btn', 'carte');
  // Les petits boutons d'avant, hors de l'écran mais toujours dans la page :
  // plus un emoji sur un bouton du jeu (v504).
  icone('#pause-btn', 'pause'); icone('#inv-btn', 'sac'); icone('#settings-btn', 'reglages');
  icone('#cam-btn', 'camera'); icone('#home-btn', 'accueil'); icone('#chat-btn', 'messages');
  icone('#emote-toggle', 'emotes'); icone('#mode-btn', 'casser');
  for (const [sel, cle] of [['.fun-btn[title="Souvenirs"]', 'photos'], ['.fun-btn[title="Photo"]', 'photo']]) icone(sel, cle);

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
