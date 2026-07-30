// Educational timer mode for a French-American first grader.
// Every 5 minutes of play, Professeur Cornichon asks quiz questions (math,
// English, French). 4 correct answers extend play time by 5 more minutes.
// Play time and every correct answer are saved to localStorage.

const SESSION_SECONDS = 5 * 60;
const NEEDED_CORRECT = 4;
const STORAGE_KEY = 'web-minecraft-edu-v1';
const RECENT_CAP = 80; // remember this many question keys to avoid repeats

const rnd = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rnd(arr.length)];
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ============================ QUESTION BANK =================================
// Each generator returns { key, prompt, correct, wrongs } — key identifies the
// exact question so recently asked ones are skipped.

function numWrongs(answer, count = 3) {
  const set = new Set();
  while (set.size < count) {
    const delta = (1 + rnd(3)) * (rnd(2) ? 1 : -1);
    const w = answer + delta;
    if (w !== answer && w >= 0) set.add(w);
  }
  return [...set].map(String);
}

const EN_NAMES = ['Sam', 'Mia', 'Leo', 'Ava'];
const FR_NAMES = ['Léa', 'Tom', 'Emma', 'Hugo'];

const MATH_GENS = [
  () => { // addition
    const a = 1 + rnd(10), b = 1 + rnd(10);
    const fr = rnd(2);
    return {
      key: `add-${a}-${b}-${fr}`,
      prompt: fr ? `Combien font ${a} + ${b} ?` : `What is ${a} + ${b}?`,
      correct: String(a + b), wrongs: numWrongs(a + b),
    };
  },
  () => { // subtraction
    const a = 5 + rnd(14), b = 1 + rnd(a - 1);
    const fr = rnd(2);
    return {
      key: `sub-${a}-${b}-${fr}`,
      prompt: fr ? `Combien font ${a} − ${b} ?` : `What is ${a} − ${b}?`,
      correct: String(a - b), wrongs: numWrongs(a - b),
    };
  },
  () => { // missing addend
    const a = 1 + rnd(9), c = a + 1 + rnd(9);
    const fr = rnd(2);
    return {
      key: `miss-${a}-${c}-${fr}`,
      prompt: fr ? `${a} + ❓ = ${c}. Quel est le nombre caché ?` : `${a} + ❓ = ${c}. What is the missing number?`,
      correct: String(c - a), wrongs: numWrongs(c - a),
    };
  },
  () => { // biggest / smallest
    const nums = shuffle([...new Set([rnd(90) + 5, rnd(90) + 5, rnd(90) + 5, rnd(90) + 5])]);
    if (nums.length < 4) return null;
    const big = rnd(2);
    const answer = big ? Math.max(...nums) : Math.min(...nums);
    const fr = rnd(2);
    return {
      key: `cmp-${nums.join('-')}-${big}`,
      prompt: fr
        ? (big ? 'Quel est le plus GRAND nombre ?' : 'Quel est le plus PETIT nombre ?')
        : (big ? 'Which number is the BIGGEST?' : 'Which number is the SMALLEST?'),
      correct: String(answer),
      wrongs: nums.filter((n) => n !== answer).map(String),
    };
  },
  () => { // skip counting
    const step = pick([2, 5, 10]);
    const start = step * (1 + rnd(4));
    const seq = [start, start + step, start + step * 2];
    const answer = start + step * 3;
    const fr = rnd(2);
    return {
      key: `skip-${step}-${start}`,
      prompt: fr
        ? `Quel nombre vient après : ${seq.join(', ')}, … ?`
        : `What number comes next: ${seq.join(', ')}, …?`,
      correct: String(answer),
      wrongs: [String(answer + step), String(answer - step), String(answer + 1)],
    };
  },
  () => { // english word problem
    const name = pick(EN_NAMES);
    const a = 3 + rnd(9), b = 1 + rnd(a - 1);
    const add = rnd(2);
    const item = pick(['apples', 'marbles', 'stickers', 'blocks']);
    const answer = add ? a + b : a - b;
    return {
      key: `wpen-${name}-${a}-${b}-${add}-${item}`,
      prompt: add
        ? `${name} has ${a} ${item}. ${name} gets ${b} more. How many ${item} now?`
        : `${name} has ${a} ${item}. ${name} gives away ${b}. How many ${item} are left?`,
      correct: String(answer), wrongs: numWrongs(answer),
    };
  },
  () => { // french word problem
    const name = pick(FR_NAMES);
    const a = 3 + rnd(9), b = 1 + rnd(a - 1);
    const add = rnd(2);
    const item = pick(['billes', 'bonbons', 'images', 'crayons']);
    const answer = add ? a + b : a - b;
    return {
      key: `wpfr-${name}-${a}-${b}-${add}-${item}`,
      prompt: add
        ? `${name} a ${a} ${item}. Il/elle en gagne ${b}. Combien de ${item} en tout ?`
        : `${name} a ${a} ${item}. Il/elle en donne ${b}. Combien de ${item} il reste ?`,
      correct: String(answer), wrongs: numWrongs(answer),
    };
  },
  () => { // shapes
    const shapes = [
      ['triangle', 'un triangle', 3], ['square', 'un carré', 4],
      ['rectangle', 'un rectangle', 4], ['pentagon', 'un pentagone', 5],
      ['hexagon', 'un hexagone', 6],
    ];
    const [en, frName, sides] = pick(shapes);
    const fr = rnd(2);
    return {
      key: `shape-${en}-${fr}`,
      prompt: fr ? `Combien de côtés a ${frName} ?` : `How many sides does a ${en} have?`,
      correct: String(sides),
      wrongs: [...new Set([sides + 1, Math.max(1, sides - 1), sides + 2])].map(String),
    };
  },
  () => { // doubles & halves
    const a = 2 + rnd(9);
    const half = rnd(2);
    const fr = rnd(2);
    const answer = half ? a : a * 2;
    return {
      key: `dbl-${a}-${half}-${fr}`,
      prompt: half
        ? (fr ? `Quelle est la moitié de ${a * 2} ?` : `What is half of ${a * 2}?`)
        : (fr ? `Quel est le double de ${a} ?` : `What is double ${a}?`),
      correct: String(answer), wrongs: numWrongs(answer),
    };
  },
  () => { // tens and ones
    const n = 11 + rnd(49);
    const tens = rnd(2);
    const answer = tens ? Math.floor(n / 10) : n % 10;
    const fr = rnd(2);
    return {
      key: `tens-${n}-${tens}-${fr}`,
      prompt: fr
        ? `Dans le nombre ${n}, combien de ${tens ? 'dizaines' : 'unités'} ?`
        : `In the number ${n}, how many ${tens ? 'tens' : 'ones'}?`,
      correct: String(answer), wrongs: numWrongs(answer),
    };
  },
  () => { // french numbers in letters
    const words = ['un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze'];
    const n = rnd(12);
    const wrongs = shuffle(words.filter((_, i) => i !== n)).slice(0, 3);
    return {
      key: `frnum-${n}`,
      prompt: `Comment s'écrit le nombre ${n + 1} en lettres ?`,
      correct: words[n], wrongs,
    };
  },
];

const ENGLISH_GENS = [
  () => { // plurals
    const items = [
      ['dog', 'dogs', ['dogges', 'dogs’']], ['cat', 'cats', ['cates', 'catss']],
      ['box', 'boxes', ['boxs', 'boxies']], ['bus', 'buses', ['buss', 'busies']],
      ['baby', 'babies', ['babys', 'babyes']], ['fox', 'foxes', ['foxs', 'foxies']],
      ['wish', 'wishes', ['wishs', 'wishies']], ['story', 'stories', ['storys', 'storyes']],
    ];
    const [word, correct, wrongs] = pick(items);
    return {
      key: `plural-${word}`,
      prompt: `What is the plural of "${word}"?`,
      correct, wrongs,
    };
  },
  () => { // opposites
    const pairs = [
      ['hot', 'cold'], ['big', 'small'], ['up', 'down'], ['fast', 'slow'],
      ['happy', 'sad'], ['day', 'night'], ['open', 'closed'], ['full', 'empty'],
      ['soft', 'hard'], ['light', 'dark'],
    ];
    const i = rnd(pairs.length);
    const [word, correct] = pairs[i];
    const wrongs = shuffle(pairs.filter((_, j) => j !== i).map((p) => p[1])).slice(0, 3);
    return {
      key: `opp-${word}`,
      prompt: `What is the opposite of "${word}"?`,
      correct, wrongs,
    };
  },
  () => { // rhymes
    const sets = [
      ['cat', 'hat', ['dog', 'cup', 'pen']], ['tree', 'bee', ['car', 'sun', 'map']],
      ['cake', 'lake', ['fish', 'bird', 'door']], ['star', 'car', ['moon', 'book', 'hand']],
      ['ball', 'tall', ['ring', 'nose', 'milk']], ['night', 'light', ['days', 'moon', 'bed']],
      ['bug', 'rug', ['ant', 'leaf', 'tree']],
    ];
    const [word, correct, wrongs] = pick(sets);
    return {
      key: `rhyme-${word}`,
      prompt: `Which word rhymes with "${word}"?`,
      correct, wrongs,
    };
  },
  () => { // sight-word fill in the blank
    const sentences = [
      ['I ___ a red ball.', 'have', ['has', 'haves', 'having']],
      ['She ___ happy today.', 'is', ['are', 'am', 'be']],
      ['We ___ to school.', 'go', ['goes', 'going', 'gone']],
      ['The dog ___ very fast.', 'runs', ['run', 'running', 'runned']],
      ['They ___ playing outside.', 'are', ['is', 'am', 'be']],
      ['He ___ two brothers.', 'has', ['have', 'haves', 'is']],
      ['Look at ___ big tree!', 'that', ['them', 'those', 'they']],
      ['Can you ___ me, please?', 'help', ['helps', 'helping', 'helped']],
    ];
    const [sentence, correct, wrongs] = pick(sentences);
    return {
      key: `fillen-${correct}-${sentence.length}`,
      prompt: `Fill in the blank: "${sentence}"`,
      correct, wrongs,
    };
  },
  () => { // spelling
    const words = [
      ['friend', ['frend', 'freind']], ['school', ['scool', 'skool']],
      ['house', ['hause', 'howse']], ['water', ['watter', 'woter']],
      ['little', ['littel', 'litle']], ['because', ['becuse', 'becoz']],
      ['yellow', ['yelow', 'yellou']], ['people', ['peple', 'peopel']],
    ];
    const [correct, wrongs] = pick(words);
    return {
      key: `spell-${correct}`,
      prompt: 'Which word is spelled correctly?',
      correct, wrongs,
    };
  },
  () => { // categories
    const cats = [
      ['a fruit', ['apple', 'banana', 'pear', 'grape']],
      ['an animal', ['rabbit', 'horse', 'duck', 'fish']],
      ['a color', ['blue', 'green', 'pink', 'purple']],
      ['something you wear', ['shoes', 'hat', 'shirt', 'socks']],
    ];
    const others = ['chair', 'table', 'spoon', 'book', 'rain', 'cloud', 'road', 'song'];
    const i = rnd(cats.length);
    const [label, members] = cats[i];
    const correct = pick(members);
    const wrongs = shuffle(others).slice(0, 3);
    return {
      key: `cat-${label}-${correct}`,
      prompt: `Which one is ${label}?`,
      correct, wrongs,
    };
  },
  () => { // starting letter
    const sets = [
      ['B', 'bird', ['cat', 'sun', 'fish']], ['S', 'sun', ['ball', 'tree', 'dog']],
      ['M', 'moon', ['star', 'rock', 'leaf']], ['T', 'tiger', ['lion', 'bear', 'wolf']],
      ['P', 'pizza', ['taco', 'soup', 'rice']], ['D', 'duck', ['goose', 'hen', 'owl']],
    ];
    const [letter, correct, wrongs] = pick(sets);
    return {
      key: `letter-${letter}`,
      prompt: `Which word starts with the letter ${letter}?`,
      correct, wrongs,
    };
  },
];

const FRENCH_GENS = [
  () => { // orthographe avec indice emoji
    const words = [
      ['oiseau', '🐦', ['oiso', 'oizo']], ['maison', '🏠', ['mèzon', 'maizon']],
      ['école', '🏫', ['écol', 'ékole']], ['garçon', '👦', ['garson', 'garcon']],
      ['chapeau', '🎩', ['chapo', 'chapau']], ['souris', '🐭', ['sourie', 'souri']],
      ['jardin', '🌷', ['jardain', 'jardun']], ['gâteau', '🎂', ['gato', 'gâto']],
      ['poisson', '🐟', ['poison', 'poissson']], ['soleil', '☀️', ['solei', 'soleille']],
    ];
    const [correct, emoji, wrongs] = pick(words);
    return {
      key: `ortho-${correct}`,
      prompt: `Comment s'écrit le mot pour ${emoji} ?`,
      correct, wrongs,
    };
  },
  () => { // texte à trous — verbes
    const sentences = [
      ['Le chat ___ du lait.', 'boit', ['bois', 'boivent', 'boire']],
      ["Je ___ à l'école.", 'vais', ['va', 'vont', 'aller']],
      ['Nous ___ au parc.', 'allons', ['allez', 'vont', 'aller']],
      ['Tu ___ un gâteau.', 'manges', ['mange', 'mangent', 'manger']],
      ['Ils ___ au football.', 'jouent', ['joue', 'joues', 'jouer']],
      ['Elle ___ une pomme.', 'mange', ['manges', 'mangent', 'manger']],
      ['Vous ___ très gentils.', 'êtes', ['est', 'sont', 'suis']],
      ['Mon frère ___ vite.', 'court', ['cours', 'courent', 'courir']],
    ];
    const [sentence, correct, wrongs] = pick(sentences);
    return {
      key: `fillfr-${correct}-${sentence.length}`,
      prompt: `Complète la phrase : « ${sentence} »`,
      correct, wrongs,
    };
  },
  () => { // le / la / les
    const words = [
      ['pomme', 'la'], ['chien', 'le'], ['maison', 'la'], ['ballon', 'le'],
      ['voiture', 'la'], ['livre', 'le'], ['fleurs', 'les'], ['soleil', 'le'],
      ['lune', 'la'], ['jouets', 'les'],
    ];
    const [word, correct] = pick(words);
    return {
      key: `art-${word}`,
      prompt: `Quel mot manque ? « ___ ${word} »`,
      correct,
      wrongs: ['le', 'la', 'les'].filter((a) => a !== correct),
    };
  },
  () => { // pluriels
    const items = [
      ['un chat', 'des chats', ['des chat', 'des chates']],
      ['un cheval', 'des chevaux', ['des chevals', 'des chevaus']],
      ['un jeu', 'des jeux', ['des jeus', 'des jeues']],
      ['un bateau', 'des bateaux', ['des bateaus', 'des bateauz']],
      ['un oiseau', 'des oiseaux', ['des oiseaus', 'des oiseauz']],
      ['un nez', 'des nez', ['des nezs', 'des nezes']],
    ];
    const [single, correct, wrongs] = pick(items);
    return {
      key: `plurfr-${single}`,
      prompt: `${single} → ${correct.split(' ')[0]} … ?`,
      correct, wrongs,
    };
  },
  () => { // traduction anglais → français
    const words = [
      ['dog', 'chien', ['chat', 'cheval', 'lapin']], ['cat', 'chat', ['chien', 'oiseau', 'souris']],
      ['bird', 'oiseau', ['poisson', 'chat', 'arbre']], ['apple', 'pomme', ['poire', 'banane', 'fraise']],
      ['red', 'rouge', ['bleu', 'vert', 'jaune']], ['blue', 'bleu', ['rouge', 'noir', 'blanc']],
      ['water', 'eau', ['lait', 'jus', 'pain']], ['house', 'maison', ['école', 'jardin', 'voiture']],
      ['sun', 'soleil', ['lune', 'étoile', 'nuage']], ['tree', 'arbre', ['fleur', 'herbe', 'feuille']],
    ];
    const [en, correct, wrongs] = pick(words);
    return {
      key: `trad-${en}`,
      prompt: `Comment dit-on « ${en} » en français ?`,
      correct, wrongs,
    };
  },
  () => { // accord de l'adjectif
    const items = [
      ['Le ballon est ___ (green).', 'vert', ['verte', 'verts']],
      ['La pomme est ___ (green).', 'verte', ['vert', 'vertes']],
      ['La voiture est ___ (blue).', 'bleue', ['bleu', 'bleus']],
      ['Le ciel est ___ (blue).', 'bleu', ['bleue', 'bleus']],
      ['La fleur est ___ (small).', 'petite', ['petit', 'petits']],
      ['Le chat est ___ (small).', 'petit', ['petite', 'petites']],
    ];
    const [sentence, correct, wrongs] = pick(items);
    return {
      key: `adj-${correct}-${sentence.length}`,
      prompt: `Complète : « ${sentence} »`,
      correct, wrongs,
    };
  },
  () => { // jours de la semaine
    const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    const i = rnd(7);
    const correct = days[(i + 1) % 7];
    const wrongs = shuffle(days.filter((d) => d !== correct && d !== days[i])).slice(0, 3);
    return {
      key: `jour-${days[i]}`,
      prompt: `Quel jour vient après ${days[i]} ?`,
      correct, wrongs,
    };
  },
];

const CATEGORIES = [
  { name: 'Math', gens: MATH_GENS },
  { name: 'English', gens: ENGLISH_GENS },
  { name: 'Français', gens: FRENCH_GENS },
];

// ============================ MODE =========================================

export class EducationMode {
  // hooks: { onPause(), onResume(), toast(msg, color) }
  constructor(hooks) {
    this.hooks = hooks;
    this.data = this.load();
    this.enabled = true; // always on — there is no way to turn it off
    this.recent = new Set(this.data.recent || []);
    this.remaining = 0;
    // Every fresh page load owes a quiz: answering questions is how the
    // game starts, and it also makes refreshing pointless as an escape.
    this.quizDue = true;
    this.quizActive = false;
    this.correctCount = 0;
    this.questionCount = 0;
    this.current = null;
    this.locked = false; // answer buttons disabled during feedback
    this.warned60 = false;
    this.warned10 = false;
    this.saveTimer = 0;
    this.categoryQueue = [];

    this.el = {
      timer: document.getElementById('edu-timer'),
      quiz: document.getElementById('quiz'),
      category: document.getElementById('quiz-category'),
      question: document.getElementById('quiz-question'),
      options: document.getElementById('quiz-options'),
      stars: document.getElementById('quiz-stars'),
      feedback: document.getElementById('quiz-feedback'),
      count: document.getElementById('quiz-count'),
      panel: document.getElementById('edu-panel'),
      panelBody: document.getElementById('edu-panel-body'),
    };

    document.getElementById('edu-btn').addEventListener('click', () => this.togglePanel());
    document.getElementById('edu-panel-close').addEventListener('click', () => this.togglePanel());

    // Persist the timer state on tab close/refresh.
    window.addEventListener('beforeunload', () => this.save());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.save();
    });
  }

  // ---------- persistence ----------

  load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
  }

  save() {
    this.data.recent = [...this.recent].slice(-RECENT_CAP);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); } catch { /* ignore */ }
  }

  today() {
    if (!this.data.days) this.data.days = {};
    const key = todayKey();
    if (!this.data.days[key]) this.data.days[key] = { play: 0, correct: [], wrong: 0 };
    return this.data.days[key];
  }

  // ---------- timer ----------

  update(dt, running) {
    if (running) {
      this.today().play += dt;
      this.saveTimer -= dt;
      if (this.saveTimer <= 0) { this.saveTimer = 10; this.save(); }
    }

    this.el.timer.style.display = 'block';

    if (running && !this.quizActive) {
      // a quiz owed from a previous session (e.g. after a refresh) reopens now
      if (this.quizDue) { this.startQuiz(); return; }
      this.remaining -= dt;
      if (this.remaining <= 60 && !this.warned60) {
        this.warned60 = true;
        this.hooks.toast('⏱ Quiz du Prof. Cornichon dans 1 minute !', 0xffd75e);
      }
      if (this.remaining <= 10 && !this.warned10) {
        this.warned10 = true;
        this.hooks.toast('⏱ Prépare-toi... le quiz arrive !', 0xff9d5e);
      }
      if (this.remaining <= 0) this.startQuiz();
    }

    const t = Math.max(0, this.remaining);
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    this.el.timer.textContent = `⏱ ${m}:${String(s).padStart(2, '0')}`;
    this.el.timer.classList.toggle('urgent', t <= 60);
  }

  // ---------- quiz ----------

  startQuiz() {
    this.quizActive = true;
    this.quizDue = true;
    this.remaining = 0;
    this.save(); // a refresh from here reopens the quiz, it never skips it
    this.correctCount = 0;
    this.questionCount = 0;
    this.hooks.onPause();
    this.el.quiz.style.display = 'flex';
    this.renderStars();
    this.nextQuestion();
  }

  pickQuestion() {
    if (this.categoryQueue.length === 0) this.categoryQueue = shuffle(CATEGORIES);
    const category = this.categoryQueue.pop();
    for (let attempt = 0; attempt < 30; attempt++) {
      const q = pick(category.gens)();
      if (!q) continue;
      if (this.recent.has(q.key) && attempt < 25) continue;
      this.recent.add(q.key);
      if (this.recent.size > RECENT_CAP) {
        this.recent = new Set([...this.recent].slice(-RECENT_CAP));
      }
      const options = shuffle([q.correct, ...q.wrongs.slice(0, 3)]);
      return { ...q, category: category.name, options, answerIndex: options.indexOf(q.correct) };
    }
    return null;
  }

  nextQuestion() {
    this.locked = false;
    this.current = this.pickQuestion();
    this.questionCount++;
    this.el.feedback.textContent = '';
    this.el.feedback.className = '';
    this.el.category.textContent = this.current.category;
    this.el.category.dataset.cat = this.current.category;
    this.el.question.textContent = this.current.prompt;
    this.el.count.textContent = `Question ${this.questionCount}`;
    this.el.options.innerHTML = '';
    this.current.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-opt';
      btn.textContent = opt;
      btn.addEventListener('click', () => this.answer(i, btn));
      this.el.options.appendChild(btn);
    });
  }

  answer(i, btn) {
    if (this.locked) return;
    this.locked = true;
    const correct = i === this.current.answerIndex;
    const buttons = [...this.el.options.children];
    buttons.forEach((b) => b.classList.add('disabled'));

    if (correct) {
      btn.classList.add('good');
      this.correctCount++;
      this.el.feedback.textContent = pick(['Bravo ! 🎉', 'Super ! ⭐', 'Génial ! 🌟', 'Excellent ! 🏆', 'Oui ! 💪']);
      this.el.feedback.className = 'good';
      this.today().correct.push({
        c: this.current.category,
        q: this.current.prompt,
        a: this.current.correct,
        t: Date.now(),
      });
      this.save();
      this.renderStars(true);
      setTimeout(() => {
        if (this.correctCount >= NEEDED_CORRECT) this.celebrate();
        else this.nextQuestion();
      }, 1400);
    } else {
      btn.classList.add('bad');
      buttons[this.current.answerIndex].classList.add('good');
      this.el.feedback.textContent = `La bonne réponse était : ${this.current.correct}`;
      this.el.feedback.className = 'bad';
      this.today().wrong++;
      this.save();
      setTimeout(() => this.nextQuestion(), 2300);
    }
  }

  renderStars(pop = false) {
    this.el.stars.innerHTML = '';
    for (let i = 0; i < NEEDED_CORRECT; i++) {
      const star = document.createElement('span');
      star.textContent = i < this.correctCount ? '⭐' : '☆';
      if (pop && i === this.correctCount - 1) star.className = 'star-pop';
      this.el.stars.appendChild(star);
    }
  }

  celebrate() {
    this.confetti();
    this.el.question.textContent = '+5 minutes de jeu ! 🎮';
    this.el.category.textContent = '🏆';
    this.el.count.textContent = '';
    this.el.feedback.textContent = `${NEEDED_CORRECT} bonnes réponses — champion !`;
    this.el.feedback.className = 'good';
    // pointer lock needs a real click, so resuming goes through a button
    this.el.options.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'quiz-opt quiz-continue';
    btn.textContent = '▶ Continuer à jouer !';
    btn.addEventListener('click', () => {
      this.el.quiz.style.display = 'none';
      this.quizActive = false;
      this.quizDue = false;
      this.remaining = SESSION_SECONDS;
      this.warned60 = false;
      this.warned10 = false;
      this.save();
      this.hooks.onResume();
    });
    this.el.options.appendChild(btn);
  }

  confetti() {
    const container = document.getElementById('confetti');
    const colors = ['#e8613c', '#4a90d9', '#58b04c', '#e8c53c', '#8a6ad0', '#ff7eb6'];
    for (let i = 0; i < 70; i++) {
      const p = document.createElement('div');
      p.className = 'confetti-piece';
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = colors[rnd(colors.length)];
      p.style.animationDelay = Math.random() * 0.6 + 's';
      p.style.animationDuration = 1.6 + Math.random() * 1.2 + 's';
      p.style.transform = `rotate(${Math.random() * 360}deg)`;
      container.appendChild(p);
      setTimeout(() => p.remove(), 3200);
    }
  }

  // ---------- stats panel ----------

  formatDuration(seconds) {
    const m = Math.round(seconds / 60);
    if (m < 60) return `${m} min`;
    return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
  }

  togglePanel() {
    const open = this.el.panel.style.display === 'block';
    if (open) { this.el.panel.style.display = 'none'; return; }
    this.renderPanel();
    this.el.panel.style.display = 'block';
  }

  renderPanel() {
    const body = this.el.panelBody;
    body.innerHTML = '';
    const t = this.today();
    const days = this.data.days || {};

    const summary = document.createElement('div');
    summary.className = 'edu-summary';
    summary.innerHTML =
      `<div><b>Aujourd'hui</b></div>` +
      `<div>🕐 Temps de jeu : <b>${this.formatDuration(t.play)}</b></div>` +
      `<div>✅ Bonnes réponses : <b>${t.correct.length}</b> · ❌ Erreurs : <b>${t.wrong}</b></div>`;
    body.appendChild(summary);

    if (t.correct.length > 0) {
      const h = document.createElement('div');
      h.className = 'edu-heading';
      h.textContent = "Ses bonnes réponses d'aujourd'hui :";
      body.appendChild(h);
      for (const item of [...t.correct].reverse()) {
        const row = document.createElement('div');
        row.className = 'edu-row';
        const time = new Date(item.t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        row.innerHTML = `<span class="edu-cat" data-cat="${item.c}">${item.c}</span> ${item.q} → <b>${item.a}</b> <span class="edu-time">${time}</span>`;
        body.appendChild(row);
      }
    }

    const past = Object.keys(days).filter((k) => k !== todayKey()).sort().reverse().slice(0, 14);
    if (past.length > 0) {
      const h = document.createElement('div');
      h.className = 'edu-heading';
      h.textContent = 'Jours précédents :';
      body.appendChild(h);
      for (const key of past) {
        const d = days[key];
        const row = document.createElement('div');
        row.className = 'edu-row';
        row.innerHTML = `<b>${key}</b> — 🕐 ${this.formatDuration(d.play)} · ✅ ${d.correct.length} · ❌ ${d.wrong}`;
        body.appendChild(row);
      }
    }

    const total = Object.values(days).reduce((a, d) => a + d.play, 0);
    const totalCorrect = Object.values(days).reduce((a, d) => a + d.correct.length, 0);
    const footer = document.createElement('div');
    footer.className = 'edu-summary';
    footer.innerHTML = `<div><b>Total</b> : 🕐 ${this.formatDuration(total)} · ✅ ${totalCorrect} bonnes réponses</div>`;
    body.appendChild(footer);
  }
}
