// Educational timer mode for a French-American first grader.
// Professeur Cornichon's quiz starts every session and returns every 5
// minutes of play. 4 correct answers extend play time. Difficulty adapts
// per skill from the child's history; random fast-clicking is detected,
// frozen for 10 seconds, and penalized with extra required answers.

const SESSION_SECONDS = 5 * 60;
const NEEDED_CORRECT = 4;
const STORAGE_KEY = 'web-minecraft-edu-v1';
const RECENT_CAP = 80;          // question keys remembered to avoid repeats
const MIN_ANSWER_DELAY = 0.8;   // clicks faster than this are ignored (s)
const FAST_WRONG_DELAY = 2.5;   // a wrong answer faster than this is suspicious
const FREEZE_SECONDS = 10;
const MAX_EXTRA = 4;            // penalty cap: at most 4+4 correct required

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
// Generators take a difficulty level (1..3) and return
// { key, prompt, correct, wrongs }. Language generators treat 2 and 3 alike.

function numWrongs(answer, level, count = 3) {
  const deltaPool = level >= 3 ? [100, 10, 200, 110] : level === 2 ? [10, 1, 20, 11] : [1, 2, 3];
  const set = new Set();
  let guard = 0;
  while (set.size < count && guard++ < 60) {
    const d = pick(deltaPool) * (rnd(2) ? 1 : -1);
    const w = answer + d;
    if (w !== answer && w >= 0) set.add(String(w));
  }
  // top up with simple offsets if the pool was too tight
  let off = 1;
  while (set.size < count) { if (answer + off >= 0) set.add(String(answer + off)); off = off > 0 ? -off : -off + 1; }
  return [...set];
}

const round10 = (n) => Math.round(n / 10) * 10;

const EN_NAMES = ['Sam', 'Mia', 'Leo', 'Ava'];
const FR_NAMES = ['Léa', 'Tom', 'Emma', 'Hugo'];

function addOperands(level) {
  if (level >= 3) return [round10(100 + rnd(400)), round10(100 + rnd(300))];
  if (level === 2) return rnd(2) ? [10 + rnd(80), round10(10 + rnd(40))] : [round10(10 + rnd(60)), 10 + rnd(30)];
  return [1 + rnd(10), 1 + rnd(10)];
}

const MATH_GENS = [
  { skill: 'add', gen(level) {
    const [a, b] = addOperands(level);
    const fr = rnd(2);
    return {
      key: `add-${a}-${b}-${fr}`,
      prompt: fr ? `Combien font ${a} + ${b} ?` : `What is ${a} + ${b}?`,
      correct: String(a + b), wrongs: numWrongs(a + b, level),
    };
  } },
  { skill: 'sub', gen(level) {
    // build a = answer + b so the result is always clean and positive
    const [answer, b] = addOperands(level);
    const a = answer + b;
    const fr = rnd(2);
    return {
      key: `sub-${a}-${b}-${fr}`,
      prompt: fr ? `Combien font ${a} − ${b} ?` : `What is ${a} − ${b}?`,
      correct: String(answer), wrongs: numWrongs(answer, level),
    };
  } },
  { skill: 'missing', gen(level) {
    const [a, miss] = addOperands(level);
    const c = a + miss;
    const fr = rnd(2);
    return {
      key: `miss-${a}-${c}-${fr}`,
      prompt: fr ? `${a} + ❓ = ${c}. Quel est le nombre caché ?` : `${a} + ❓ = ${c}. What is the missing number?`,
      correct: String(miss), wrongs: numWrongs(miss, level),
    };
  } },
  { skill: 'compare', gen(level) {
    const base = level >= 3 ? 100 + rnd(800) : level === 2 ? 10 + rnd(900) : 5 + rnd(90);
    const spread = level >= 3 ? 30 : level === 2 ? 200 : 40;
    const nums = [...new Set([base, base + 1 + rnd(spread), Math.max(1, base - 1 - rnd(spread)), base + 2 + rnd(spread)])];
    if (nums.length < 4) return null;
    const big = rnd(2);
    const answer = big ? Math.max(...nums) : Math.min(...nums);
    return {
      key: `cmp-${nums.join('-')}-${big}`,
      prompt: rnd(2)
        ? (big ? 'Quel est le plus GRAND nombre ?' : 'Quel est le plus PETIT nombre ?')
        : (big ? 'Which number is the BIGGEST?' : 'Which number is the SMALLEST?'),
      correct: String(answer),
      wrongs: shuffle(nums.filter((n) => n !== answer)).slice(0, 3).map(String),
    };
  } },
  { skill: 'skip', gen(level) {
    const step = level >= 3 ? pick([50, 100, 25]) : level === 2 ? pick([3, 4, 25]) : pick([2, 5, 10]);
    const down = level >= 2 && rnd(3) === 0;
    const start = step * (2 + rnd(4)) + (down ? step * 4 : 0);
    const dir = down ? -1 : 1;
    const seq = [start, start + dir * step, start + dir * 2 * step];
    const answer = start + dir * 3 * step;
    return {
      key: `skip-${step}-${start}-${dir}`,
      prompt: rnd(2)
        ? `Quel nombre vient après : ${seq.join(', ')}, … ?`
        : `What number comes next: ${seq.join(', ')}, …?`,
      correct: String(answer),
      wrongs: [String(answer + dir * step), String(answer - dir * step), String(answer + (level >= 2 ? 10 : 1))],
    };
  } },
  { skill: 'wordEN', gen(level) {
    const name = pick(EN_NAMES);
    const [base, delta] = addOperands(Math.min(level, 2));
    const add = rnd(2);
    const item = pick(['apples', 'marbles', 'stickers', 'blocks']);
    const answer = add ? base + delta : base;
    const a = add ? base : base + delta;
    return {
      key: `wpen-${name}-${a}-${delta}-${add}-${item}`,
      prompt: add
        ? `${name} has ${a} ${item}. ${name} gets ${delta} more. How many ${item} now?`
        : `${name} has ${a} ${item}. ${name} gives away ${delta}. How many ${item} are left?`,
      correct: String(answer), wrongs: numWrongs(answer, level),
    };
  } },
  { skill: 'wordFR', gen(level) {
    const name = pick(FR_NAMES);
    const [base, delta] = addOperands(Math.min(level, 2));
    const add = rnd(2);
    const item = pick(['billes', 'bonbons', 'images', 'crayons']);
    const answer = add ? base + delta : base;
    const a = add ? base : base + delta;
    return {
      key: `wpfr-${name}-${a}-${delta}-${add}-${item}`,
      prompt: add
        ? `${name} a ${a} ${item}. Il/elle en gagne ${delta}. Combien de ${item} en tout ?`
        : `${name} a ${a} ${item}. Il/elle en donne ${delta}. Combien de ${item} il reste ?`,
      correct: String(answer), wrongs: numWrongs(answer, level),
    };
  } },
  { skill: 'shapes', gen(level) {
    const shapes = [
      ['triangle', 'un triangle', 3], ['square', 'un carré', 4],
      ['rectangle', 'un rectangle', 4], ['pentagon', 'un pentagone', 5],
      ['hexagon', 'un hexagone', 6], ['octagon', 'un octogone', 8],
    ];
    const [en, frName, sides] = pick(shapes);
    const corners = level >= 2 && rnd(2);
    const fr = rnd(2);
    return {
      key: `shape-${en}-${fr}-${corners ? 'c' : 's'}`,
      prompt: corners
        ? (fr ? `Combien de sommets a ${frName} ?` : `How many corners does a ${en} have?`)
        : (fr ? `Combien de côtés a ${frName} ?` : `How many sides does a ${en} have?`),
      correct: String(sides),
      wrongs: [...new Set([sides + 1, Math.max(1, sides - 1), sides + 2])].map(String),
    };
  } },
  { skill: 'double', gen(level) {
    const a = level >= 3 ? round10(100 + rnd(300)) : level === 2 ? round10(20 + rnd(50)) : 2 + rnd(9);
    const half = rnd(2);
    const fr = rnd(2);
    const answer = half ? a : a * 2;
    return {
      key: `dbl-${a}-${half}-${fr}`,
      prompt: half
        ? (fr ? `Quelle est la moitié de ${a * 2} ?` : `What is half of ${a * 2}?`)
        : (fr ? `Quel est le double de ${a} ?` : `What is double ${a}?`),
      correct: String(answer), wrongs: numWrongs(answer, level),
    };
  } },
  { skill: 'place', gen(level) {
    const n = level >= 2 ? 100 + rnd(899) : 11 + rnd(88);
    const digits = level >= 2 ? ['centaines', 'dizaines', 'unités'] : ['dizaines', 'unités'];
    const enDigits = level >= 2 ? ['hundreds', 'tens', 'ones'] : ['tens', 'ones'];
    const di = rnd(digits.length);
    const answer = String(n).padStart(3, '0')[3 - digits.length + di];
    const fr = rnd(2);
    return {
      key: `place-${n}-${di}-${fr}`,
      prompt: fr
        ? `Dans le nombre ${n}, quel est le chiffre des ${digits[di]} ?`
        : `In the number ${n}, what is the ${enDigits[di]} digit?`,
      correct: String(Number(answer)),
      wrongs: shuffle([...new Set(String(n).split('').map(Number))].filter((d) => String(d) !== String(Number(answer))).concat([9, 0, 5, 3]).map(String)).slice(0, 3),
    };
  } },
  { skill: 'frnum', gen(level) {
    const tiers = {
      1: [[1, 'un'], [2, 'deux'], [3, 'trois'], [4, 'quatre'], [5, 'cinq'], [6, 'six'], [7, 'sept'], [8, 'huit'], [9, 'neuf'], [10, 'dix'], [11, 'onze'], [12, 'douze']],
      2: [[13, 'treize'], [14, 'quatorze'], [15, 'quinze'], [16, 'seize'], [17, 'dix-sept'], [18, 'dix-huit'], [20, 'vingt'], [30, 'trente']],
      3: [[21, 'vingt et un'], [32, 'trente-deux'], [40, 'quarante'], [45, 'quarante-cinq'], [50, 'cinquante'], [60, 'soixante'], [55, 'cinquante-cinq']],
    };
    const tier = tiers[Math.min(level, 3)];
    const i = rnd(tier.length);
    const [n, word] = tier[i];
    const wrongs = shuffle(tier.filter((_, j) => j !== i).map((t) => t[1])).slice(0, 3);
    return {
      key: `frnum-${n}`,
      prompt: `Comment s'écrit le nombre ${n} en lettres ?`,
      correct: word, wrongs,
    };
  } },
];

// -- English -----------------------------------------------------------------

const EN_PLURALS = {
  1: [
    ['dog', 'dogs', ['dogges', 'dogs’']], ['cat', 'cats', ['cates', 'catss']],
    ['box', 'boxes', ['boxs', 'boxies']], ['bus', 'buses', ['buss', 'busies']],
    ['baby', 'babies', ['babys', 'babyes']], ['fox', 'foxes', ['foxs', 'foxies']],
    ['wish', 'wishes', ['wishs', 'wishies']], ['story', 'stories', ['storys', 'storyes']],
  ],
  2: [
    ['child', 'children', ['childs', 'childrens']], ['mouse', 'mice', ['mouses', 'mices']],
    ['foot', 'feet', ['foots', 'feets']], ['tooth', 'teeth', ['tooths', 'teeths']],
    ['man', 'men', ['mans', 'mens']], ['woman', 'women', ['womans', 'womens']],
    ['leaf', 'leaves', ['leafs', 'leafes']], ['sheep', 'sheep', ['sheeps', 'sheepes']],
  ],
};

const EN_OPPOSITES = {
  1: [['hot', 'cold'], ['big', 'small'], ['up', 'down'], ['fast', 'slow'], ['happy', 'sad'], ['day', 'night'], ['open', 'closed'], ['full', 'empty']],
  2: [['begin', 'end'], ['early', 'late'], ['loud', 'quiet'], ['wide', 'narrow'], ['heavy', 'light'], ['always', 'never'], ['remember', 'forget'], ['above', 'below']],
};

const EN_RHYMES = {
  1: [['cat', 'hat', ['dog', 'cup', 'pen']], ['tree', 'bee', ['car', 'sun', 'map']], ['cake', 'lake', ['fish', 'bird', 'door']], ['star', 'car', ['moon', 'book', 'hand']], ['ball', 'tall', ['ring', 'nose', 'milk']]],
  2: [['night', 'bright', ['nose', 'nest', 'noon']], ['rain', 'train', ['road', 'ring', 'rock']], ['sound', 'ground', ['sand', 'song', 'seed']], ['chair', 'bear', ['chin', 'coat', 'corn']], ['snow', 'grow', ['snap', 'green', 'gate']]],
};

const EN_FILLS = {
  1: [
    ['I ___ a red ball.', 'have', ['has', 'haves', 'having']],
    ['She ___ happy today.', 'is', ['are', 'am', 'be']],
    ['We ___ to school.', 'go', ['goes', 'going', 'gone']],
    ['The dog ___ very fast.', 'runs', ['run', 'running', 'runned']],
    ['They ___ playing outside.', 'are', ['is', 'am', 'be']],
    ['He ___ two brothers.', 'has', ['have', 'haves', 'is']],
  ],
  2: [
    ['Yesterday we ___ to the park.', 'went', ['goed', 'go', 'gone']],
    ['She ___ a bird this morning.', 'saw', ['seed', 'seen', 'sees']],
    ['Last night I ___ very tired.', 'was', ['were', 'am', 'be']],
    ['The kids ___ at the beach yesterday.', 'were', ['was', 'are', 'is']],
    ['He ___ his homework already.', 'did', ['done', 'doed', 'do']],
    ['We ___ a sandcastle last summer.', 'built', ['builded', 'build', 'builds']],
  ],
};

const EN_SPELLS = {
  1: [['friend', ['frend', 'freind']], ['school', ['scool', 'skool']], ['house', ['hause', 'howse']], ['water', ['watter', 'woter']], ['little', ['littel', 'litle']], ['because', ['becuse', 'becoz']]],
  2: [['through', ['thru', 'throught']], ['Wednesday', ['Wensday', 'Wednsday']], ['beautiful', ['beutiful', 'beautifull']], ['together', ['togather', 'togeter']], ['different', ['diferent', 'differant']], ['favorite', ['favorit', 'favourrite']]],
};

const tier = (level) => (level >= 2 ? 2 : 1);

const ENGLISH_GENS = [
  { skill: 'enPlural', gen(level) {
    const [word, correct, wrongs] = pick(EN_PLURALS[tier(level)]);
    return { key: `plural-${word}`, prompt: `What is the plural of "${word}"?`, correct, wrongs };
  } },
  { skill: 'enOpposite', gen(level) {
    const pairs = EN_OPPOSITES[tier(level)];
    const i = rnd(pairs.length);
    const [word, correct] = pairs[i];
    const wrongs = shuffle(pairs.filter((_, j) => j !== i).map((p) => p[1])).slice(0, 3);
    return { key: `opp-${word}`, prompt: `What is the opposite of "${word}"?`, correct, wrongs };
  } },
  { skill: 'enRhyme', gen(level) {
    const [word, correct, wrongs] = pick(EN_RHYMES[tier(level)]);
    return { key: `rhyme-${word}`, prompt: `Which word rhymes with "${word}"?`, correct, wrongs };
  } },
  { skill: 'enFill', gen(level) {
    const [sentence, correct, wrongs] = pick(EN_FILLS[tier(level)]);
    return { key: `fillen-${correct}-${sentence.length}`, prompt: `Fill in the blank: "${sentence}"`, correct, wrongs };
  } },
  { skill: 'enSpell', gen(level) {
    const [correct, wrongs] = pick(EN_SPELLS[tier(level)]);
    return { key: `spell-${correct}`, prompt: 'Which word is spelled correctly?', correct, wrongs };
  } },
  { skill: 'enCategory', gen() {
    const cats = [
      ['a fruit', ['apple', 'banana', 'pear', 'grape']],
      ['an animal', ['rabbit', 'horse', 'duck', 'fish']],
      ['a color', ['blue', 'green', 'pink', 'purple']],
      ['something you wear', ['shoes', 'hat', 'shirt', 'socks']],
    ];
    const others = ['chair', 'table', 'spoon', 'book', 'rain', 'cloud', 'road', 'song'];
    const [label, members] = pick(cats);
    const correct = pick(members);
    return { key: `cat-${label}-${correct}`, prompt: `Which one is ${label}?`, correct, wrongs: shuffle(others).slice(0, 3) };
  } },
];

// -- French ------------------------------------------------------------------

const FR_ORTHO = {
  1: [['oiseau', '🐦', ['oiso', 'oizo']], ['maison', '🏠', ['mèzon', 'maizon']], ['école', '🏫', ['écol', 'ékole']], ['garçon', '👦', ['garson', 'garcon']], ['chapeau', '🎩', ['chapo', 'chapau']], ['souris', '🐭', ['sourie', 'souri']], ['gâteau', '🎂', ['gato', 'gâto']], ['soleil', '☀️', ['solei', 'soleille']]],
  2: [['papillon', '🦋', ['papiyon', 'papillion']], ['écureuil', '🐿️', ['écureil', 'écurueil']], ['grenouille', '🐸', ['grenouye', 'grenouile']], ['montagne', '⛰️', ['montagn', 'montangne']], ['citrouille', '🎃', ['citrouye', 'citrouile']], ['baleine', '🐋', ['balène', 'balaine']], ['éléphant', '🐘', ['éléfant', 'élephan']], ['bibliothèque', '📚', ['biblioteque', 'bibliotèque']]],
};

const FR_FILLS = {
  1: [
    ['Le chat ___ du lait.', 'boit', ['bois', 'boivent', 'boire']],
    ["Je ___ à l'école.", 'vais', ['va', 'vont', 'aller']],
    ['Nous ___ au parc.', 'allons', ['allez', 'vont', 'aller']],
    ['Tu ___ un gâteau.', 'manges', ['mange', 'mangent', 'manger']],
    ['Ils ___ au football.', 'jouent', ['joue', 'joues', 'jouer']],
    ['Elle ___ une pomme.', 'mange', ['manges', 'mangent', 'manger']],
  ],
  2: [
    ["Hier, j'___ mangé une pomme.", 'ai', ['a', 'ont', 'est']],
    ['Nous ___ très contents.', 'sommes', ['êtes', 'sont', 'suis']],
    ['Ils ___ deux chats à la maison.', 'ont', ['a', 'ai', 'sont']],
    ['Vous ___ arrivés en retard.', 'êtes', ['est', 'sommes', 'sont']],
    ['Demain, nous ___ à la plage.', 'irons', ['allons', 'irez', 'vont']],
    ['Elle ___ tombée dans la cour.', 'est', ['a', 'ai', 'ont']],
  ],
};

const FR_ARTICLES = {
  1: { options: ['le', 'la', 'les'], words: [['pomme', 'la'], ['chien', 'le'], ['maison', 'la'], ['ballon', 'le'], ['voiture', 'la'], ['livre', 'le'], ['fleurs', 'les'], ['soleil', 'le'], ['lune', 'la'], ['jouets', 'les']] },
  2: { options: ['un', 'une', 'des'], words: [['orange', 'une'], ['arbre', 'un'], ['étoiles', 'des'], ['histoire', 'une'], ['oiseau', 'un'], ['chaussures', 'des'], ['île', 'une'], ['escargot', 'un']] },
};

const FR_PLURALS = {
  1: [['un chat', 'des chats', ['des chat', 'des chates']], ['un jeu', 'des jeux', ['des jeus', 'des jeues']], ['un bateau', 'des bateaux', ['des bateaus', 'des bateauz']], ['un oiseau', 'des oiseaux', ['des oiseaus', 'des oiseauz']], ['un nez', 'des nez', ['des nezs', 'des nezes']]],
  2: [['un cheval', 'des chevaux', ['des chevals', 'des chevaus']], ['un animal', 'des animaux', ['des animals', 'des animaus']], ['un journal', 'des journaux', ['des journals', 'des journaus']], ['un travail', 'des travaux', ['des travails', 'des travaus']], ['un œil', 'des yeux', ['des œils', 'des yeuxs']]],
};

const FR_TRADS = {
  1: [['dog', 'chien', ['chat', 'cheval', 'lapin']], ['cat', 'chat', ['chien', 'oiseau', 'souris']], ['apple', 'pomme', ['poire', 'banane', 'fraise']], ['red', 'rouge', ['bleu', 'vert', 'jaune']], ['water', 'eau', ['lait', 'jus', 'pain']], ['sun', 'soleil', ['lune', 'étoile', 'nuage']]],
  2: [['butterfly', 'papillon', ['oiseau', 'abeille', 'libellule']], ['squirrel', 'écureuil', ['hérisson', 'renard', 'lapin']], ['rainbow', 'arc-en-ciel', ['orage', 'nuage', 'éclair']], ['winter', 'hiver', ['été', 'automne', 'printemps']], ['moon', 'lune', ['étoile', 'soleil', 'ciel']], ['strawberry', 'fraise', ['framboise', 'cerise', 'prune']]],
};

const FR_ADJS = {
  1: [
    ['Le ballon est ___ (green).', 'vert', ['verte', 'verts']],
    ['La pomme est ___ (green).', 'verte', ['vert', 'vertes']],
    ['La voiture est ___ (blue).', 'bleue', ['bleu', 'bleus']],
    ['Le ciel est ___ (blue).', 'bleu', ['bleue', 'bleus']],
  ],
  2: [
    ['La neige est ___ (white).', 'blanche', ['blanc', 'blanches']],
    ['Le lapin est ___ (white).', 'blanc', ['blanche', 'blancs']],
    ['Ma sœur est ___ (happy).', 'heureuse', ['heureux', 'heureuses']],
    ['Mon frère est ___ (happy).', 'heureux', ['heureuse', 'heureuxs']],
    ['Les fleurs sont ___ (pretty).', 'jolies', ['jolie', 'jolis']],
  ],
};

const FRENCH_GENS = [
  { skill: 'frOrtho', gen(level) {
    const [correct, emoji, wrongs] = pick(FR_ORTHO[tier(level)]);
    return { key: `ortho-${correct}`, prompt: `Comment s'écrit le mot pour ${emoji} ?`, correct, wrongs };
  } },
  { skill: 'frConjug', gen(level) {
    const [sentence, correct, wrongs] = pick(FR_FILLS[tier(level)]);
    return { key: `fillfr-${correct}-${sentence.length}`, prompt: `Complète la phrase : « ${sentence} »`, correct, wrongs };
  } },
  { skill: 'frArticle', gen(level) {
    const { options, words } = FR_ARTICLES[tier(level)];
    const [word, correct] = pick(words);
    return { key: `art-${word}`, prompt: `Quel mot manque ? « ___ ${word} »`, correct, wrongs: options.filter((a) => a !== correct) };
  } },
  { skill: 'frPlural', gen(level) {
    const [single, correct, wrongs] = pick(FR_PLURALS[tier(level)]);
    return { key: `plurfr-${single}`, prompt: `${single} → ${correct.split(' ')[0]} … ?`, correct, wrongs };
  } },
  { skill: 'frTrad', gen(level) {
    const [en, correct, wrongs] = pick(FR_TRADS[tier(level)]);
    return { key: `trad-${en}`, prompt: `Comment dit-on « ${en} » en français ?`, correct, wrongs };
  } },
  { skill: 'frAdj', gen(level) {
    const [sentence, correct, wrongs] = pick(FR_ADJS[tier(level)]);
    return { key: `adj-${correct}-${sentence.length}`, prompt: `Complète : « ${sentence} »`, correct, wrongs };
  } },
  { skill: 'frCalendar', gen(level) {
    if (tier(level) === 2) {
      const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
      const i = rnd(12);
      const correct = months[(i + 1) % 12];
      const wrongs = shuffle(months.filter((m) => m !== correct && m !== months[i])).slice(0, 3);
      return { key: `mois-${months[i]}`, prompt: `Quel mois vient après ${months[i]} ?`, correct, wrongs };
    }
    const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    const i = rnd(7);
    const correct = days[(i + 1) % 7];
    const wrongs = shuffle(days.filter((d) => d !== correct && d !== days[i])).slice(0, 3);
    return { key: `jour-${days[i]}`, prompt: `Quel jour vient après ${days[i]} ?`, correct, wrongs };
  } },
];

const CATEGORIES = [
  { name: 'Math', gens: MATH_GENS, maxLevel: 3, defaultLevel: 2 },
  { name: 'English', gens: ENGLISH_GENS, maxLevel: 2, defaultLevel: 1 },
  { name: 'Français', gens: FRENCH_GENS, maxLevel: 2, defaultLevel: 1 },
];

const SKILL_META = {};
for (const cat of CATEGORIES) {
  for (const g of cat.gens) SKILL_META[g.skill] = { cat: cat.name, maxLevel: cat.maxLevel, defaultLevel: cat.defaultLevel };
}

// ============================ MODE =========================================

export class EducationMode {
  // hooks: { onPause(), onResume(), toast(msg, color) }
  constructor(hooks) {
    this.hooks = hooks;
    this.data = this.load();
    this.enabled = true; // always on — there is no way to turn it off
    this.recent = new Set(this.data.recent || []);
    this.skills = this.data.skills || {}; // skill -> { level, hist: [] }
    this.remaining = 0;
    // Every fresh page load owes a quiz: answering questions is how the
    // game starts, and it also makes refreshing pointless as an escape.
    this.quizDue = true;
    this.quizActive = false;
    this.correctCount = 0;
    this.questionCount = 0;
    this.neededExtra = 0;   // penalty questions from detected random clicking
    this.suspicion = 0;     // fast-wrong-answer counter
    this.frozen = false;
    this.current = null;
    this.shownAt = 0;
    this.locked = false;
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
    this.data.skills = this.skills;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); } catch { /* ignore */ }
  }

  today() {
    if (!this.data.days) this.data.days = {};
    const key = todayKey();
    if (!this.data.days[key]) this.data.days[key] = { play: 0, correct: [], wrong: 0 };
    return this.data.days[key];
  }

  // ---------- adaptive difficulty ----------

  skillState(skill) {
    if (!this.skills[skill]) {
      this.skills[skill] = { level: SKILL_META[skill].defaultLevel, hist: [] };
    }
    return this.skills[skill];
  }

  recordOutcome(skill, ok) {
    const s = this.skillState(skill);
    s.hist.push(ok ? 1 : 0);
    if (s.hist.length > 8) s.hist.shift();
    if (s.hist.length >= 4) {
      const rate = s.hist.reduce((a, b) => a + b, 0) / s.hist.length;
      const max = SKILL_META[skill].maxLevel;
      if (rate >= 0.8 && s.level < max) { s.level++; s.hist = []; }
      else if (rate <= 0.4 && s.level > 1) { s.level--; s.hist = []; }
    }
    this.save();
  }

  categoryLevel(catName) {
    const skills = Object.keys(SKILL_META).filter((k) => SKILL_META[k].cat === catName);
    const levels = skills.map((k) => (this.skills[k] ? this.skills[k].level : SKILL_META[k].defaultLevel));
    return Math.round((levels.reduce((a, b) => a + b, 0) / levels.length) * 10) / 10;
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

  needed() { return NEEDED_CORRECT + this.neededExtra; }

  // ---------- quiz ----------

  startQuiz() {
    this.quizActive = true;
    this.quizDue = true;
    this.remaining = 0;
    this.save();
    this.correctCount = 0;
    this.questionCount = 0;
    this.neededExtra = 0;
    this.suspicion = 0;
    this.frozen = false;
    this.hooks.onPause();
    this.el.quiz.style.display = 'flex';
    this.renderStars();
    this.nextQuestion();
  }

  pickQuestion() {
    if (this.categoryQueue.length === 0) this.categoryQueue = shuffle(CATEGORIES);
    const category = this.categoryQueue.pop();
    for (let attempt = 0; attempt < 30; attempt++) {
      const def = pick(category.gens);
      const level = this.skillState(def.skill).level;
      const q = def.gen(level);
      if (!q) continue;
      if (this.recent.has(q.key) && attempt < 25) continue;
      this.recent.add(q.key);
      if (this.recent.size > RECENT_CAP) {
        this.recent = new Set([...this.recent].slice(-RECENT_CAP));
      }
      const options = shuffle([q.correct, ...q.wrongs.slice(0, 3)]);
      return { ...q, category: category.name, skill: def.skill, level, options, answerIndex: options.indexOf(q.correct) };
    }
    return null;
  }

  nextQuestion() {
    this.locked = false;
    this.frozen = false;
    this.current = this.pickQuestion();
    this.questionCount++;
    this.shownAt = performance.now();
    this.el.feedback.textContent = '';
    this.el.feedback.className = '';
    this.el.category.textContent = `${this.current.category} · N${this.current.level}`;
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
    if (this.locked || this.frozen) return;
    const elapsed = (performance.now() - this.shownAt) / 1000;
    if (elapsed < MIN_ANSWER_DELAY) return; // too fast to even have read it

    this.locked = true;
    const correct = i === this.current.answerIndex;
    const buttons = [...this.el.options.children];
    buttons.forEach((b) => b.classList.add('disabled'));

    if (correct) {
      this.suspicion = Math.max(0, this.suspicion - 1);
      btn.classList.add('good');
      this.correctCount++;
      this.el.feedback.textContent = pick(['Bravo ! 🎉', 'Super ! ⭐', 'Génial ! 🌟', 'Excellent ! 🏆', 'Oui ! 💪']);
      this.el.feedback.className = 'good';
      this.recordOutcome(this.current.skill, true);
      this.today().correct.push({
        c: this.current.category,
        q: this.current.prompt,
        a: this.current.correct,
        t: Date.now(),
      });
      this.save();
      this.renderStars(true);
      setTimeout(() => {
        if (this.correctCount >= this.needed()) this.celebrate();
        else this.nextQuestion();
      }, 1400);
    } else {
      btn.classList.add('bad');
      buttons[this.current.answerIndex].classList.add('good');
      this.el.feedback.textContent = `La bonne réponse était : ${this.current.correct}`;
      this.el.feedback.className = 'bad';
      this.recordOutcome(this.current.skill, false);
      this.today().wrong++;
      this.save();

      // random-clicking detection: wrong AND answered suspiciously fast
      if (elapsed < FAST_WRONG_DELAY) {
        this.suspicion++;
        if (this.suspicion === 2) {
          this.el.feedback.textContent = 'Hé ! Tu cliques trop vite sans lire 🧐 Prends ton temps !';
        }
        if (this.suspicion >= 3) {
          setTimeout(() => this.freeze(), 1200);
          return;
        }
      }
      setTimeout(() => this.nextQuestion(), 2300);
    }
  }

  freeze() {
    this.frozen = true;
    this.suspicion = 0;
    if (this.neededExtra < MAX_EXTRA) this.neededExtra++;
    this.renderStars();
    this.el.question.textContent = 'Non non — tu cliques n\'importe comment ! 🙅';
    this.el.category.textContent = '⛔';
    this.el.feedback.className = 'bad';
    let left = FREEZE_SECONDS;
    const renderFreeze = () => {
      this.el.options.innerHTML =
        `<div class="quiz-freeze">Lis bien chaque question avant de répondre.<br>` +
        `Une question à réussir <b>en plus</b> a été ajoutée (${this.needed()} ⭐ maintenant).<br><br>` +
        `Reprise dans <b>${left}</b> s…</div>`;
    };
    renderFreeze();
    const iv = setInterval(() => {
      left--;
      if (left <= 0) {
        clearInterval(iv);
        this.nextQuestion();
      } else {
        renderFreeze();
      }
    }, 1000);
  }

  renderStars(pop = false) {
    this.el.stars.innerHTML = '';
    for (let i = 0; i < this.needed(); i++) {
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
    this.el.feedback.textContent = `${this.needed()} bonnes réponses — champion !`;
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
      `<div>✅ Bonnes réponses : <b>${t.correct.length}</b> · ❌ Erreurs : <b>${t.wrong}</b></div>` +
      `<div>📈 Niveaux : Math <b>${this.categoryLevel('Math')}</b>/3 · English <b>${this.categoryLevel('English')}</b>/2 · Français <b>${this.categoryLevel('Français')}</b>/2</div>`;
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
