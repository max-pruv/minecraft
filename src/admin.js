// Vue parent : qui joue, depuis quand, où, et dans quel état est son compte.
//
// Réservée à un prénom (ADMIN_NAME) et protégée par le code parent. Ce n'est
// pas un rempart : la clé publique du cloud est, par construction, dans la
// page — quiconque sait s'en servir peut lire ces mêmes tables. C'est une
// commodité de famille, pas un contrôle d'accès, et il vaut mieux le dire
// que le laisser croire.
//
// Le style tranche volontairement avec le reste du jeu : ici on lit un
// tableau, on ne joue pas. Police système, lignes denses, pas de pixel art.

const ADMIN_NAME = 'Max';
const PARENT_CODE = '135246';

const CSS = `
:root { --adm-fond: #0a0e14; --adm-carte: #121821; --adm-trait: #1e2733; --adm-doux: #7d8899; }
#adm-overlay {
  position: fixed; inset: 0; z-index: 120; display: none;
  background: var(--adm-fond); color: #e8eef6; overflow: auto;
  font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased; -webkit-overflow-scrolling: touch;
}
#adm-overlay.on { display: block; }
/* Sur un iPhone, l'heure et la batterie flottent au-dessus de la page :
   sans cette marge, le titre et les boutons passaient dessous. */
#adm-wrap {
  max-width: 1180px; margin: 0 auto;
  padding: calc(16px + var(--safe-top, 0px)) 14px calc(36px + var(--safe-bottom, 0px));
}

/* La barre du haut s'enroule au lieu de pousser « Fermer » hors de l'écran. */
#adm-head {
  display: flex; align-items: baseline; gap: 10px 12px; flex-wrap: wrap; margin-bottom: 14px;
}
#adm-head h2 { font-size: 20px; font-weight: 650; margin: 0; letter-spacing: -.3px; }
#adm-head .grow { flex: 1 1 auto; }
#adm-sub { color: var(--adm-doux); font-size: 12.5px; }
.adm-btn {
  font: inherit; font-size: 13px; padding: 7px 13px; border-radius: 9px; cursor: pointer;
  background: #1a2230; color: #e8eef6; border: 1px solid var(--adm-trait);
  transition: background .12s, border-color .12s;
}
.adm-btn:hover { background: #232e3f; border-color: #2c3a4d; }
.adm-btn:active { transform: translateY(1px); }
.adm-btn.danger { background: #2a1618; border-color: #4d2427; color: #ff9d95; }
.adm-btn.danger:hover { background: #3a1d20; }
.adm-btn:disabled { opacity: .3; cursor: default; }

/* Bandeau de chiffres : il défile lui aussi, plutôt que d'empiler cinq
   pavés sur toute la hauteur d'un téléphone. */
.adm-cards {
  display: grid; grid-auto-flow: column; grid-auto-columns: minmax(132px, 1fr);
  gap: 8px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 2px;
  scrollbar-width: thin;
}
.adm-card {
  background: var(--adm-carte); border: 1px solid var(--adm-trait);
  border-radius: 11px; padding: 10px 12px;
  /* même hauteur pour tous : une étiquette sur deux lignes ne doit pas
     décaler la carte d'à côté */
  display: flex; flex-direction: column; justify-content: center; min-height: 66px;
}
.adm-card b { display: block; font-size: 20px; font-weight: 650; letter-spacing: -.5px; }
.adm-card span { color: var(--adm-doux); font-size: 11.5px; }

/* Un vrai tableau, qui défile horizontalement. La colonne des prénoms reste
   collée à gauche : sans elle, on fait glisser deux colonnes et on ne sait
   plus de qui on parle. */
.adm-scroll {
  overflow-x: auto; -webkit-overflow-scrolling: touch;
  border: 1px solid var(--adm-trait); border-radius: 12px; background: var(--adm-carte);
}
table.adm { width: 100%; min-width: 860px; border-collapse: separate; border-spacing: 0; font-size: 13px; }
table.adm th {
  position: sticky; top: 0; z-index: 2;
  text-align: left; font-weight: 500; color: var(--adm-doux); font-size: 11px;
  text-transform: uppercase; letter-spacing: .6px; white-space: nowrap;
  padding: 10px 12px; background: #161d27; border-bottom: 1px solid var(--adm-trait);
}
table.adm td {
  padding: 11px 12px; border-top: 1px solid var(--adm-trait); vertical-align: middle;
  white-space: nowrap;
}
table.adm tbody tr:first-child td { border-top: 0; }
table.adm tbody tr:hover td { background: #161d27; }
table.adm th:first-child, table.adm td:first-child {
  position: sticky; left: 0; z-index: 3; background: var(--adm-carte);
  box-shadow: 1px 0 0 var(--adm-trait);
}
table.adm th:first-child { z-index: 4; background: #161d27; }
table.adm tbody tr:hover td:first-child { background: #161d27; }
.adm-hint {
  display: none; color: var(--adm-doux); font-size: 11.5px; margin: 7px 2px 0;
}
@media (max-width: 940px) { .adm-hint { display: block; } }

.adm-name { font-weight: 650; font-size: 14px; }
.adm-me { color: #7ee787; font-size: 10.5px; margin-left: 5px; font-weight: 500; }
.adm-dim { color: var(--adm-doux); font-size: 12px; }
/* Les lignes de détail ont le droit de passer à la ligne — sauf sous le
   prénom, que couper en deux rend illisible. */
table.adm td .adm-dim { white-space: normal; }
table.adm td:first-child .adm-dim { white-space: nowrap; }
.adm-live { display: inline-flex; align-items: center; gap: 6px; color: #7ee787; font-weight: 500; }
.adm-dot {
  display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #3fb950;
  box-shadow: 0 0 0 3px rgba(63,185,80,.16); animation: admPulse 2s ease-in-out infinite;
}
@keyframes admPulse { 50% { opacity: .3; } }
.adm-live.pause { color: #d6b775; }
.adm-live.pause .adm-dot { background: #d29922; box-shadow: 0 0 0 3px rgba(210,153,34,.14); }
.adm-tag {
  display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 20px;
  border: 1px solid var(--adm-trait); background: #161d27; margin-right: 4px; white-space: nowrap;
}
.adm-tag.warn { color: #ffd08a; border-color: #5d4a1c; background: #241d10; }
.adm-tag.ok { color: #7ee787; border-color: #1f5030; background: #0f2018; }
.adm-actions .adm-btn + .adm-btn { margin-left: 6px; }
.adm-rythme select {
  font: inherit; font-size: 12.5px; padding: 5px 8px; border-radius: 8px;
  background: #0d131c; color: #e8eef6; border: 1px solid var(--adm-trait);
}
.adm-note { color: var(--adm-doux); font-size: 11.5px; margin-top: 18px; line-height: 1.6; }
#adm-msg { min-height: 18px; font-size: 12.5px; color: #7ee787; margin: 10px 2px 0; }
#adm-msg.err { color: #ff9d95; }

/* Fenêtre maison plutôt que les boîtes du navigateur : celles-ci sont
   moches, coupées sur iOS, et donnent au code parental l'air d'un bug. */
#adm-modal {
  position: fixed; inset: 0; z-index: 130; display: none;
  align-items: center; justify-content: center; padding: 20px;
  background: rgba(2, 5, 10, .72); backdrop-filter: blur(3px);
}
#adm-modal.on { display: flex; }
#adm-modal-card {
  width: min(360px, 100%); background: #161b22; border: 1px solid #30363d;
  border-radius: 14px; padding: 20px; box-shadow: 0 18px 50px rgba(0,0,0,.55);
}
#adm-modal-title { font-size: 16px; font-weight: 600; margin-bottom: 6px; }
#adm-modal-sub { color: #8b949e; font-size: 13px; line-height: 1.5; margin-bottom: 14px; }
#adm-modal-input {
  font: inherit; width: 100%; padding: 11px 12px; border-radius: 9px;
  background: #0d1117; color: #e6edf3; border: 1px solid #30363d; text-align: center;
}
#adm-modal-input.code { font-size: 22px; letter-spacing: 8px; }
#adm-modal-err { color: #ff9d95; font-size: 12.5px; min-height: 17px; margin-top: 7px; }
#adm-modal-actions { display: flex; gap: 8px; margin-top: 12px; }
#adm-modal-actions .adm-btn { flex: 1; padding: 9px 12px; }
#adm-modal-actions .adm-btn.go { background: #21482e; border-color: #2d6a3f; color: #b7f0c8; }
/* Sur un téléphone on ne compresse plus : on fait défiler. Les fiches
   empilées demandaient un écran entier par enfant et interdisaient toute
   comparaison — or comparer est justement ce qu'on vient faire ici. */
@media (max-width: 620px) {
  #adm-wrap { padding: calc(14px + var(--safe-top, 0px)) 12px calc(32px + var(--safe-bottom, 0px)); }
  #adm-head h2 { font-size: 18px; }
  .adm-cards { grid-auto-columns: minmax(118px, 1fr); }
  table.adm td, table.adm th { padding-left: 10px; padding-right: 10px; }
}
`;

const HTML = `
<div id="adm-wrap">
  <div id="adm-head">
    <h2>Espace parent</h2>
    <span class="grow"></span>
    <button class="adm-btn" id="adm-refresh">Actualiser</button>
    <button class="adm-btn" id="adm-close">Fermer</button>
  </div>
  <div id="adm-sub"></div>
  <div class="adm-cards" id="adm-cards"></div>
  <div class="adm-scroll">
    <table class="adm">
      <thead><tr>
        <th>Joueur</th><th>En ce moment</th><th>Aujourd'hui</th>
        <th>Quiz tous les</th><th>Mondes</th><th>Compte</th><th></th>
      </tr></thead>
      <tbody id="adm-rows"></tbody>
    </table>
  </div>
  <div class="adm-hint">← fais glisser le tableau pour voir le reste →</div>
  <div id="adm-msg"></div>
  <p class="adm-note">
    Les empreintes de visage sont des suites de nombres : aucune photo n'est
    conservée nulle part. Les codes sont stockés hachés — même ici, personne
    ne peut les lire ; on ne peut que les effacer, l'enfant en choisit alors
    un nouveau à sa prochaine connexion.<br>
    Cette page lit les mêmes données que le jeu, avec la même clé publique :
    elle range l'information, elle ne la protège pas.
  </p>
</div>
`;

const MODAL_HTML = `
<div id="adm-modal-card">
  <div id="adm-modal-title"></div>
  <div id="adm-modal-sub"></div>
  <input id="adm-modal-input" autocomplete="off" />
  <div id="adm-modal-err"></div>
  <div id="adm-modal-actions">
    <button class="adm-btn" id="adm-modal-no">Annuler</button>
    <button class="adm-btn go" id="adm-modal-yes">Valider</button>
  </div>
</div>
`;

// Exporté à part : la page doit pouvoir décider d'afficher le bouton avant
// même d'avoir construit le panneau.
export const isAdminName = (name) =>
  (name || '').trim().toLowerCase() === ADMIN_NAME.toLowerCase();

// Le jeu envoie un signe de vie toutes les 20 s : au-delà de trois battements
// manqués, on ne prétend plus que l'enfant est là.
const PRESENCE_MS = 70000;

// Intervalle entre deux séries de questions. Les bornes sont celles du jeu :
// en deçà on harcèle, au-delà le mode éducatif devient décoratif.
const RYTHMES = [3, 4, 5, 6, 8, 10, 12, 15, 20, 30];

const jour = () => new Date().toISOString().slice(0, 10);

function duree(sec) {
  const s = Math.max(0, Math.round(sec || 0));
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}

function depuis(iso) {
  if (!iso) return '—';
  const d = Date.now() - new Date(iso).getTime();
  if (!isFinite(d)) return '—';
  const min = Math.round(d / 60000);
  if (min < 2) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.round(h / 24);
  return j < 30 ? `il y a ${j} j` : new Date(iso).toLocaleDateString('fr-FR');
}

const recent = (...dates) => dates.filter(Boolean).sort().pop() || null;

// Le taux de réussite se calcule sur des réponses, pas sur du temps.
//
// `quiz` compte les SECONDES passées en quiz, pas les questions posées :
// diviser les bonnes réponses par ce nombre-là donnait des « 11 % justes »
// aussi alarmants qu'imaginaires : 208 bonnes réponses sur 246 questions,
// c'est 85 %.
function reponses(l) {
  const total = l.justes + l.faux;
  const temps = l.quiz > 5 ? ` · ${duree(l.quiz)} de quiz` : '';
  if (!total) return `aucune question${temps}`;
  return `${total} question${total > 1 ? 's' : ''} · ${Math.round((l.justes / total) * 100)} % justes${temps}`;
}

// « En ce moment » : connecté ou non, et si oui, où. Un enfant sur l'écran
// d'accueil est connecté sans jouer — la nuance compte quand on se demande
// s'il faut l'appeler pour le dîner.
function presence(l) {
  const secondaire = `${l.appareils.size || 0} appareil${l.appareils.size > 1 ? 's' : ''}`;
  if (!l.live) {
    return `<span class="adm-dim">hors ligne</span><div class="adm-dim">vu ${depuis(l.vu)} · ${secondaire}</div>`;
  }
  const { monde, joue, joueurs } = l.live;
  // Être dans un monde et être aux commandes sont deux choses : un quiz ou
  // l'écran de pause met le jeu en attente sans faire quitter le monde.
  const ou = monde
    ? `monde ${monde}${joueurs > 1 ? ` · ${joueurs} joueurs` : ' · seul'}`
    : 'son monde local';
  let etat;
  if (monde) {
    etat = `<span class="adm-live${joue ? '' : ' pause'}"><i class="adm-dot"></i>${ou}${joue ? '' : ' · en pause'}</span>`;
  } else if (joue) {
    etat = '<span class="adm-live"><i class="adm-dot"></i>joue — son monde local</span>';
  } else {
    etat = '<span class="adm-live pause"><i class="adm-dot"></i>connecté, au menu</span>';
  }
  return `${etat}<div class="adm-dim">${secondaire}</div>`;
}

export class AdminPanel {
  constructor(cloud, identity, getName) {
    this.cloud = cloud;
    this.identity = identity;
    this.getName = getName;
    this.el = null;
  }

  // Le bouton n'apparaît que pour ce compte-là. Un enfant ne doit pas même
  // savoir que la porte existe.
  visibleFor(name) { return isAdminName(name); }

  mount() {
    if (this.el) return;
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    const div = document.createElement('div');
    div.id = 'adm-overlay';
    div.innerHTML = HTML;
    document.body.appendChild(div);
    this.el = div;
    div.querySelector('#adm-close').addEventListener('click', () => this.hide());
    div.querySelector('#adm-refresh').addEventListener('click', () => this.load());

    const modal = document.createElement('div');
    modal.id = 'adm-modal';
    modal.innerHTML = MODAL_HTML;
    document.body.appendChild(modal);
    this.modal = modal;
  }

  // Boîte de saisie maison. Résout avec le texte saisi, ou null si on annule.
  // `attendu` : on refuse sur place au lieu de refermer et de faire recommencer.
  ask({ titre, sous, valider, type = 'text', ok = 'Valider', code = false }) {
    this.mount();
    const m = this.modal;
    const champ = m.querySelector('#adm-modal-input');
    const err = m.querySelector('#adm-modal-err');
    m.querySelector('#adm-modal-title').textContent = titre;
    m.querySelector('#adm-modal-sub').textContent = sous || '';
    m.querySelector('#adm-modal-yes').textContent = ok;
    champ.type = type;
    champ.value = '';
    champ.className = code ? 'code' : '';
    if (code) { champ.inputMode = 'numeric'; champ.maxLength = 8; } else { champ.removeAttribute('inputmode'); champ.removeAttribute('maxlength'); }
    err.textContent = '';
    m.classList.add('on');
    setTimeout(() => champ.focus(), 30);

    return new Promise((resolve) => {
      const fermer = (valeur) => {
        m.classList.remove('on');
        champ.removeEventListener('keydown', surTouche);
        oui.removeEventListener('click', surOui);
        non.removeEventListener('click', surNon);
        resolve(valeur);
      };
      const surOui = () => {
        const v = champ.value.trim();
        const souci = valider ? valider(v) : null;
        if (souci) { err.textContent = souci; champ.value = ''; champ.focus(); return; }
        fermer(v);
      };
      const surNon = () => fermer(null);
      const surTouche = (e) => {
        e.stopPropagation(); // le jeu écoute aussi le clavier
        if (e.key === 'Enter') surOui();
        if (e.key === 'Escape') surNon();
      };
      const oui = m.querySelector('#adm-modal-yes');
      const non = m.querySelector('#adm-modal-no');
      oui.addEventListener('click', surOui);
      non.addEventListener('click', surNon);
      champ.addEventListener('keydown', surTouche);
    });
  }

  async open() {
    // Deuxième verrou : le prénom seul ne prouve rien, l'appareil peut être
    // resté ouvert sur ce profil.
    this.mount();
    const code = await this.ask({
      titre: '🔒 Espace parent',
      sous: 'Tape le code parental pour ouvrir.',
      type: 'password', code: true, ok: 'Ouvrir',
      valider: (v) => (v === PARENT_CODE ? null : 'Code incorrect.'),
    });
    if (code === null) return;
    this.el.classList.add('on');
    this.load();
    // La présence n'a de sens que fraîche : on relit tant que la vue est
    // ouverte, et seulement tant qu'elle l'est.
    clearInterval(this._tick);
    this._tick = setInterval(() => {
      if (this.el && this.el.classList.contains('on')) this.load();
      else clearInterval(this._tick);
    }, 20000);
  }

  hide() {
    clearInterval(this._tick);
    if (this.el) this.el.classList.remove('on');
  }

  message(txt, err = false) {
    const m = this.el.querySelector('#adm-msg');
    m.textContent = txt;
    m.className = err ? 'err' : '';
  }

  async load() {
    this.el.querySelector('#adm-sub').textContent = 'Lecture…';
    if (!this.cloud.configured) {
      this.el.querySelector('#adm-sub').textContent = 'Pas de cloud configuré sur cet appareil.';
      return;
    }
    let identites = [], etats = [], temps = [], reglages = [];
    try {
      [identites, etats, temps, reglages] = await Promise.all([
        this.cloud.selectAll('player_identity', 'select=name,faces,pin_hash,updated_at'),
        this.cloud.selectAll('player_state', 'select=name,state,updated_at'),
        this.cloud.selectAll('play_time', 'select=name,device_id,day,play,quiz,correct,wrong,updated_at'),
        this.cloud.selectAll('player_prefs', 'select=name,prefs,updated_at'),
      ]);
    } catch {
      this.el.querySelector('#adm-sub').textContent = 'Cloud injoignable — réessaie plus tard.';
      return;
    }

    const par = new Map();
    const entree = (nom) => {
      if (!par.has(nom)) {
        par.set(nom, {
          nom, faces: 0, code: false, majId: null, majEtat: null, majTemps: null,
          mondes: [], blocs: 0, dex: 0, aujourdhui: 0, total: 0,
          quiz: 0, justes: 0, faux: 0, appareils: new Set(), live: null, majPrefs: null,
          supprime: false, rythme: 6,
        });
      }
      return par.get(nom);
    };

    for (const r of identites) {
      const e = entree(r.name);
      e.faces = (r.faces || []).length;
      e.code = !!r.pin_hash;
      e.majId = r.updated_at;
    }
    for (const r of etats) {
      const e = entree(r.name);
      const s = r.state || {};
      e.majEtat = r.updated_at;
      e.dex = (s.dex || []).length;
      e.mondes = (s.worlds || []).map((w) => w.code).filter(Boolean);
      const blocs = s.edits || {};
      for (const [ctx, m] of Object.entries(blocs)) {
        if (!m || typeof m !== 'object') continue;
        const n = Array.isArray(m) ? 1 : Object.keys(m).length;
        e.blocs += n;
        if (ctx !== 'local' && !e.mondes.includes(ctx)) e.mondes.push(ctx);
      }
    }
    for (const r of reglages) {
      const e = entree(r.name);
      e.majPrefs = r.updated_at;
      if ((r.prefs || {}).supprime) e.supprime = true;
      const min = Number((r.prefs || {}).sessionMin);
      if (isFinite(min) && min > 0) e.rythme = Math.round(min);
      const l = (r.prefs || {}).live;
      // Passé ce délai, le battement s'est arrêté : l'appareil est en veille,
      // le jeu fermé, ou le réseau coupé. Dans tous les cas l'enfant n'est
      // plus là, et il vaut mieux ne rien dire que dire une chose fausse.
      if (l && Date.now() - (l.at || 0) < PRESENCE_MS) e.live = l;
    }
    const aujourd = jour();
    for (const r of temps) {
      const e = entree(r.name);
      e.majTemps = recent(e.majTemps, r.updated_at);
      e.total += r.play || 0;
      if (r.day === aujourd) e.aujourdhui += r.play || 0;
      e.quiz += r.quiz || 0;      // secondes passées en quiz
      e.justes += r.correct || 0; // bonnes réponses
      e.faux += r.wrong || 0;
      if (r.device_id) e.appareils.add(r.device_id);
    }

    const lignes = [...par.values()]
      // un compte supprimé garde une ligne vide dans la base : on ne la montre
      // pas, elle ne représente plus personne
      .filter((e) => !e.supprime)
      .map((e) => ({ ...e, vu: recent(e.majId, e.majEtat, e.majTemps, e.majPrefs) }))
      // les connectés d'abord : c'est ce qu'on vient regarder
      .sort((a, b) => (b.live ? 1 : 0) - (a.live ? 1 : 0)
        || String(b.vu || '').localeCompare(String(a.vu || '')));

    this.render(lignes);
  }

  render(lignes) {
    const moi = (this.getName() || '').toLowerCase();
    const actifs = lignes.filter((l) => l.aujourdhui > 0).length;
    const enLigne = lignes.filter((l) => l.live).length;
    const tempsJour = lignes.reduce((a, l) => a + l.aujourdhui, 0);
    const sansCode = lignes.filter((l) => !l.code && l.faces === 0).length;

    this.el.querySelector('#adm-sub').textContent =
      `${lignes.length} joueur${lignes.length > 1 ? 's' : ''} · lu à l'instant`;

    const carte = (v, t) => `<div class="adm-card"><b>${v}</b><span>${t}</span></div>`;
    this.el.querySelector('#adm-cards').innerHTML = [
      carte(lignes.length, 'comptes'),
      carte(enLigne, 'connectés maintenant'),
      carte(actifs, "actifs aujourd'hui"),
      carte(duree(tempsJour), "jeu aujourd'hui"),
      carte(sansCode, 'comptes non protégés'),
    ].join('');

    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    this.el.querySelector('#adm-rows').innerHTML = lignes.map((l) => {
      const secu = [
        l.faces ? `<span class="adm-tag ok">👤 ${l.faces}</span>` : '<span class="adm-tag warn">👤 aucun</span>',
        l.code ? '<span class="adm-tag ok">🔢 code</span>' : '<span class="adm-tag warn">🔢 aucun</span>',
      ].join('');
      const mondes = l.mondes.length
        ? l.mondes.slice(0, 4).map((c) => `<span class="adm-tag">${esc(c)}</span>`).join('')
        : '<span class="adm-dim">—</span>';
      return `<tr>
        <td><span class="adm-name">${esc(l.nom)}</span>${l.nom.toLowerCase() === moi ? '<span class="adm-me">moi</span>' : ''}
            <div class="adm-dim">${l.dex} créature${l.dex > 1 ? 's' : ''} · ${l.blocs} bloc${l.blocs > 1 ? 's' : ''}</div></td>
        <td>${presence(l)}</td>
        <td>${duree(l.aujourdhui)}<div class="adm-dim">${duree(l.total)} au total</div></td>
        <td><span class="adm-rythme"><select data-rythme="${esc(l.nom)}">${
            RYTHMES.map((m) => `<option value="${m}"${m === l.rythme ? ' selected' : ''}>${m} min</option>`).join('')
          }</select></span></td>
        <td>${mondes}</td>
        <td>${secu}<div class="adm-dim">${reponses(l)}</div></td>
        <td class="adm-actions">
          <button class="adm-btn" data-reset="${esc(l.nom)}"
            title="${l.code ? 'Effacer son code et lui en faire choisir un nouveau' : 'Lui demander de choisir un code'}"
            >🔑 ${l.code ? 'Réinitialiser' : 'Créer'}</button>
          <button class="adm-btn danger" data-suppr="${esc(l.nom)}" title="Supprimer ce compte">🗑️ Supprimer</button>
        </td>
      </tr>`;
    }).join('');

    for (const b of this.el.querySelectorAll('[data-reset]')) {
      b.addEventListener('click', () => this.resetPin(b.getAttribute('data-reset')));
    }
    for (const b of this.el.querySelectorAll('[data-suppr]')) {
      b.addEventListener('click', () => this.supprimer(b.getAttribute('data-suppr')));
    }
    for (const sel of this.el.querySelectorAll('[data-rythme]')) {
      sel.addEventListener('change', () => this.setRythme(sel.getAttribute('data-rythme'), Number(sel.value)));
    }
  }

  // On n'impose jamais un code : on efface l'ancien et on demande au jeu de
  // réclamer un nouveau code à l'enfant. Le parent n'a donc à en connaître
  // aucun — et c'est de toute façon tout ce qu'il peut faire, les codes étant
  // stockés hachés.
  async resetPin(nom) {
    const reponse = await this.ask({
      titre: `Nouveau code pour ${nom} ?`,
      sous: "Son ancien code cesse de marcher tout de suite, et le jeu lui en demandera "
        + "un nouveau à sa prochaine ouverture. Son visage reste enregistré. "
        + "Tape le code parental pour confirmer.",
      type: 'password', code: true, ok: 'Réinitialiser',
      valider: (v) => (v === PARENT_CODE ? null : 'Code incorrect.'),
    });
    if (reponse === null) return;
    try {
      const ligne = await this.cloud.identityPull(nom);
      await this.cloud.identityPush(nom, { faces: (ligne && ligne.faces) || [], pinHash: null });
      // et sur cet appareil, sinon la copie locale le remettrait en place
      if (this.identity.local[nom]) {
        delete this.identity.local[nom].pinHash;
        this.identity.saveLocal();
      }
      // La consigne voyage avec les réglages : le jeu la lit au lancement.
      const prefs = (await this.cloud.prefsPull(nom)) || {};
      await this.cloud.prefsPush(nom, { ...prefs, codeADefinir: true });
      this.message(`${nom} choisira un nouveau code à sa prochaine ouverture.`);
      this.load();
    } catch {
      this.message(`Impossible de réinitialiser le code de ${nom} — réessaie.`, true);
    }
  }

  // Le réglage part dans les réglages du joueur, d'où le jeu le relit au
  // lancement suivant — sur n'importe lequel de ses appareils.
  async setRythme(nom, minutes) {
    try {
      const prefs = (await this.cloud.prefsPull(nom)) || {};
      await this.cloud.prefsPush(nom, { ...prefs, sessionMin: minutes });
      this.message(`${nom} : quiz toutes les ${minutes} minutes.`);
    } catch {
      this.message(`Impossible de changer le rythme de ${nom} — réessaie.`, true);
      this.load();
    }
  }

  // Supprimer, avec une limite qu'il faut dire : la clé publique du jeu peut
  // vider une ligne, pas la retirer de la base. On efface donc tout ce qu'elle
  // contient — visage, code, partie, temps de jeu — et le compte disparaît du
  // jeu comme de cette liste. La ligne vide, elle, ne s'enlève que depuis le
  // tableau de bord Supabase.
  async supprimer(nom) {
    const saisi = await this.ask({
      titre: `Supprimer ${nom} ?`,
      sous: 'Son visage, son code, ses mondes, ses créatures et son temps de jeu seront '
        + "effacés. C'est définitif : il n'y a pas de corbeille. "
        + `Écris « ${nom} » pour confirmer.`,
      ok: 'Supprimer',
      valider: (v) => (v.toLowerCase() === nom.toLowerCase() ? null : 'Ce n\'est pas le bon prénom.'),
    });
    if (saisi === null) return;
    try {
      await this.cloud.identityPush(nom, { faces: [], pinHash: null });
      await this.cloud.statePush(nom, {});
      await this.cloud.prefsPush(nom, { supprime: true });
      // le temps de jeu vit sur une ligne par appareil et par jour
      const jours = await this.cloud.selectAll(
        'play_time', `name=eq.${encodeURIComponent(nom)}&select=device_id,day`);
      for (const r of jours) {
        await this.cloud.timePush(nom, r.device_id, r.day,
          { play: 0, quiz: 0, correct: 0, wrong: 0, qs: [] });
      }
      delete this.identity.local[nom];
      this.identity.saveLocal();
      this.message(`Compte de ${nom} supprimé.`);
      this.load();
    } catch {
      this.message(`Impossible de supprimer ${nom} — réessaie.`, true);
    }
  }
}
