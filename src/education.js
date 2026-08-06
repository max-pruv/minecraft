// Educational timer mode for a French-American first grader.
// Professeur Cornichon's quiz starts every session and returns every 5
// minutes of play. 4 correct answers extend play time. Difficulty adapts
// per skill from the child's history; random fast-clicking is detected,
// frozen for 10 seconds, and penalized with extra required answers.

const SESSION_SECONDS = 6 * 60;
const NEEDED_CORRECT = 5;
const DAILY_LIMIT_SECONDS = 45 * 60; // hard stop after this much play per day
const PARENT_CODE = '135246';
const MARATHON_CORRECT = 20;         // answering these unlocks another block
const STORAGE_KEY = 'web-minecraft-edu-v1';
const RECENT_CAP = 80;          // question keys remembered to avoid repeats
const MIN_ANSWER_DELAY = 0.8;   // clicks faster than this are ignored (s)
const FAST_WRONG_DELAY = 2.5;   // a wrong answer faster than this is suspicious
const FREEZE_SECONDS = 10;
const MAX_EXTRA = 4;            // penalty cap: at most 4+4 correct required

const rnd = (n) => Math.floor(Math.random() * n);

// Language preference for questions: 'fr', 'en', or 'both' (mix).
export const EDU_PREFS = { lang: 'both' };
const langRoll = () => (EDU_PREFS.lang === 'fr' ? 1 : EDU_PREFS.lang === 'en' ? 0 : rnd(2));

// School grades, French system with the US equivalent. The index maps to
// starting difficulty; the adaptive engine takes over from there.
export const GRADES = [
  ['GS', 'Kindergarten'], ['CP', '1st Grade'], ['CE1', '2nd Grade'], ['CE2', '3rd Grade'],
  ['CM1', '4th Grade'], ['CM2', '5th Grade'], ['6e', '6th Grade'], ['5e', '7th Grade'],
  ['4e', '8th Grade'], ['3e', '9th Grade'], ['2nde', '10th Grade'],
];
const MATH_BY_GRADE = [2, 3, 3, 4, 4, 5, 5, 5, 5, 5, 5];  // Math maxes at 5
const OTHER_BY_GRADE = [1, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3]; // others max at 3
const pick = (arr) => arr[rnd(arr.length)];
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Inline SVG of a shape, shown with geometry questions.
function shapeSVG(name) {
  const attrs = 'fill="#4a90d9" stroke="#fff" stroke-width="3" stroke-linejoin="round"';
  let inner;
  if (name === 'square') inner = `<rect x="30" y="30" width="60" height="60" ${attrs}/>`;
  else if (name === 'rectangle') inner = `<rect x="15" y="40" width="90" height="45" ${attrs}/>`;
  else {
    const sides = { triangle: 3, pentagon: 5, hexagon: 6, octagon: 8 }[name] || 3;
    const pts = [];
    for (let i = 0; i < sides; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / sides;
      pts.push(`${(60 + 42 * Math.cos(a)).toFixed(1)},${(62 + 42 * Math.sin(a)).toFixed(1)}`);
    }
    inner = `<polygon points="${pts.join(' ')}" ${attrs}/>`;
  }
  return `<svg viewBox="0 0 120 120" width="104" height="104">${inner}</svg>`;
}

// ============================ QUESTION BANK =================================
// Generators take a difficulty level (1..3) and return
// { key, prompt, correct, wrongs }. Language generators treat 2 and 3 alike.

function numWrongs(answer, level, count = 3) {
  const deltaPool = level >= 4 ? [1, 10, 100, 90, 110, 11]
    : level === 3 ? [100, 10, 200, 110] : level === 2 ? [10, 1, 20, 11] : [1, 2, 3];
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
  if (level >= 4) return [100 + rnd(800), 100 + rnd(800)];      // carries everywhere
  if (level === 3) return [round10(100 + rnd(400)), round10(100 + rnd(300))];
  if (level === 2) return rnd(2) ? [10 + rnd(80), round10(10 + rnd(40))] : [round10(10 + rnd(60)), 10 + rnd(30)];
  return [1 + rnd(10), 1 + rnd(10)];
}

const MATH_GENS = [
  { skill: 'add', gen(level) {
    const [a, b] = addOperands(level);
    const fr = langRoll();
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
    const fr = langRoll();
    return {
      key: `sub-${a}-${b}-${fr}`,
      prompt: fr ? `Combien font ${a} − ${b} ?` : `What is ${a} − ${b}?`,
      correct: String(answer), wrongs: numWrongs(answer, level),
    };
  } },
  { skill: 'missing', gen(level) {
    const [a, miss] = addOperands(level);
    const c = a + miss;
    const fr = langRoll();
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
      prompt: langRoll()
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
      prompt: langRoll()
        ? `Quel nombre vient après : ${seq.join(', ')}, … ?`
        : `What number comes next: ${seq.join(', ')}, …?`,
      correct: String(answer),
      wrongs: [String(answer + dir * step), String(answer - dir * step), String(answer + (level >= 2 ? 10 : 1))],
    };
  } },
  { skill: 'wordEN', lang: 'en', gen(level) {
    const name = pick(EN_NAMES);
    const [base, delta] = addOperands(Math.min(level, 3));
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
  { skill: 'wordFR', lang: 'fr', gen(level) {
    const name = pick(FR_NAMES);
    const [base, delta] = addOperands(Math.min(level, 3));
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
    const nameQ = rnd(2); // half the time: "what is this shape called?"
    const corners = !nameQ && level >= 2 && rnd(2);
    const fr = langRoll();
    if (nameQ) {
      const correct = fr ? frName.replace(/^une? /, '') : en;
      const others = shapes.filter((s) => s[2] !== sides || s[0] === en).filter((s) => s[0] !== en);
      const wrongs = shuffle(others).slice(0, 3).map((s) => (fr ? s[1].replace(/^une? /, '') : s[0]));
      return {
        key: `shapename-${en}-${fr}`,
        prompt: fr ? 'Comment s\'appelle cette forme ?' : 'What is this shape called?',
        shape: en, correct, wrongs,
      };
    }
    return {
      key: `shape-${en}-${fr}-${corners ? 'c' : 's'}`,
      prompt: corners
        ? (fr ? `Combien de sommets a cette forme ?` : `How many corners does this shape have?`)
        : (fr ? `Combien de côtés a cette forme ?` : `How many sides does this shape have?`),
      shape: en,
      correct: String(sides),
      wrongs: [...new Set([sides + 1, Math.max(1, sides - 1), sides + 2])].map(String),
    };
  } },
  { skill: 'double', gen(level) {
    const a = level >= 3 ? round10(100 + rnd(300)) : level === 2 ? round10(20 + rnd(50)) : 2 + rnd(9);
    const half = rnd(2);
    const fr = langRoll();
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
    const fr = langRoll();
    return {
      key: `place-${n}-${di}-${fr}`,
      prompt: fr
        ? `Dans le nombre ${n}, quel est le chiffre des ${digits[di]} ?`
        : `In the number ${n}, what is the ${enDigits[di]} digit?`,
      correct: String(Number(answer)),
      wrongs: shuffle([...new Set(String(n).split('').map(Number))].filter((d) => String(d) !== String(Number(answer))).concat([9, 0, 5, 3]).map(String)).slice(0, 3),
    };
  } },
  { skill: 'mult', requires: ['add', 3], gen(level) {
    // multiplication unlocks once additions are mastered
    const t = Math.min(level, 3);
    let a, b;
    if (t >= 3) { a = 11 + rnd(14); b = 2 + rnd(4); }        // 12 × 4
    else if (t === 2) { a = 3 + rnd(7); b = 3 + rnd(7); }    // full tables
    else { a = 2 + rnd(9); b = pick([2, 5, 10]); }           // ×2 ×5 ×10
    const answer = a * b;
    const fr = langRoll();
    const wrongs = [...new Set([answer + b, Math.max(1, answer - b), answer + a, answer + 1])]
      .filter((w) => w !== answer).slice(0, 3).map(String);
    return {
      key: `mult-${a}-${b}-${fr}`,
      prompt: fr ? `Combien font ${a} × ${b} ?` : `What is ${a} × ${b}?`,
      correct: String(answer), wrongs,
    };
  } },
  { skill: 'frnum', lang: 'fr', gen(level) {
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
  3: [
    ['knife', 'knives', ['knifes', 'knive']], ['wolf', 'wolves', ['wolfs', 'wolfes']],
    ['city', 'cities', ['citys', 'cityes']], ['half', 'halves', ['halfs', 'halfes']],
    ['hero', 'heroes', ['heros', 'heroses']], ['deer', 'deer', ['deers', 'deeres']],
  ],
};

const EN_OPPOSITES = {
  1: [['hot', 'cold'], ['big', 'small'], ['up', 'down'], ['fast', 'slow'], ['happy', 'sad'], ['day', 'night'], ['open', 'closed'], ['full', 'empty']],
  2: [['begin', 'end'], ['early', 'late'], ['loud', 'quiet'], ['wide', 'narrow'], ['heavy', 'light'], ['always', 'never'], ['remember', 'forget'], ['above', 'below']],
  3: [['whisper', 'shout'], ['appear', 'disappear'], ['huge', 'tiny'], ['brave', 'scared'], ['smooth', 'rough'], ['float', 'sink'], ['ancient', 'modern'], ['victory', 'defeat']],
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
  3: [
    ["I ___ like broccoli at all.", "don't", ["doesn't", "didn't", 'not']],
    ["She ___ finished her drawing yet.", "hasn't", ["haven't", "isn't", "aren't"]],
    ['This tower is ___ than mine.', 'taller', ['tallest', 'more tall', 'tall']],
    ["It's the ___ dog in the whole town.", 'biggest', ['bigger', 'most big', 'big']],
    ['Tomorrow we ___ go to the pool.', 'will', ['wills', 'going', 'are']],
    ['My cousin ___ in Paris for two years.', 'has lived', ['have lived', 'living', 'lives since']],
  ],
};

const EN_SPELLS = {
  1: [['friend', ['frend', 'freind']], ['school', ['scool', 'skool']], ['house', ['hause', 'howse']], ['water', ['watter', 'woter']], ['little', ['littel', 'litle']], ['because', ['becuse', 'becoz']]],
  2: [['through', ['thru', 'throught']], ['Wednesday', ['Wensday', 'Wednsday']], ['beautiful', ['beutiful', 'beautifull']], ['together', ['togather', 'togeter']], ['different', ['diferent', 'differant']], ['favorite', ['favorit', 'favourrite']]],
  3: [['tomorrow', ['tommorow', 'tomorow']], ['sandwich', ['sandwitch', 'sanwich']], ['birthday', ['birfday', 'bithday']], ['chocolate', ['choclate', 'chocolat']], ['grandmother', ['granmother', 'grandmuther']], ['minute', ['minit', 'minnute']]],
};

// clamp a skill level onto the tiers a word bank actually has
const tier = (level, max = 2) => Math.min(Math.max(level, 1), max);

const ENGLISH_GENS = [
  { skill: 'enPlural', gen(level) {
    const [word, correct, wrongs] = pick(EN_PLURALS[tier(level, 3)]);
    return { key: `plural-${word}`, prompt: `What is the plural of "${word}"?`, correct, wrongs };
  } },
  { skill: 'enOpposite', gen(level) {
    const pairs = EN_OPPOSITES[tier(level, 3)];
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
    const [sentence, correct, wrongs] = pick(EN_FILLS[tier(level, 3)]);
    return { key: `fillen-${correct}-${sentence.length}`, prompt: `Fill in the blank: "${sentence}"`, correct, wrongs };
  } },
  { skill: 'enSpell', gen(level) {
    const [correct, wrongs] = pick(EN_SPELLS[tier(level, 3)]);
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
  3: [["aujourd'hui", '📅', ['aujourdui', "aujourd'huit"]], ['beaucoup', '➕', ['bocoup', 'beaucou']], ['monsieur', '🎩', ['messieur', 'monsieu']], ['toujours', '♾️', ['toujour', 'tout-jour']], ['pharmacie', '💊', ['farmacie', 'pharmacit']], ['ciseaux', '✂️', ['sizo', 'ciseau']]],
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
  3: [
    ['Demain, je ___ chez mamie.', 'irai', ['irais', 'iré', 'vais aller']],
    ["Quand j'étais petit, je ___ au parc.", 'jouais', ['joué', 'jouer', 'joue']],
    ["L'année prochaine, nous ___ en CE2.", 'serons', ['sommes', 'serions', 'étions']],
    ['Hier soir, ils ___ la télé.', 'regardaient', ['regardent', 'regarderont', 'regardés']],
    ['Bientôt, tu ___ lire tout seul.', 'sauras', ['sais', 'saura', 'savais']],
    ['Avant, elle ___ peur du noir.', 'avait', ['a', 'aura', 'ayant']],
  ],
};

const FR_HOMOPHONES = [
  ['Il ___ un gros chien. (a / à)', 'a', ['à', 'as', 'ah']],
  ["Je vais ___ l'école. (a / à)", 'à', ['a', 'as', 'ah']],
  ['Mon frère ___ très gentil. (et / est)', 'est', ['et', 'es', 'ai']],
  ['Un chat ___ un chien. (et / est)', 'et', ['est', 'es', 'ai']],
  ['___ va au parc ! (on / ont)', 'On', ['Ont', 'Ons', 'Aux']],
  ['Ils ___ deux vélos. (on / ont)', 'ont', ['on', 'onts', 'ons']],
  ['___ maison est grande. (sa / ça)', 'Sa', ['Ça', 'Sà', 'Ca']],
  ['___ me fait rire ! (sa / ça)', 'Ça', ['Sa', 'Sà', 'Ca']],
  ['Ils mangent ___ gâteaux. (ses / ces)', 'ces', ['ses', 'çes', "c'est"]],
  ['Il range ___ jouets à lui. (ses / ces)', 'ses', ['ces', 'çes', "c'est"]],
];

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
  3: [['lighthouse', 'phare', ['port', 'bateau', 'plage']], ['castle', 'château', ['palais', 'tour', 'pont']], ['knight', 'chevalier', ['roi', 'soldat', 'prince']], ['whale', 'baleine', ['requin', 'dauphin', 'phoque']], ['owl', 'hibou', ['aigle', 'corbeau', 'faucon']], ['thunderstorm', 'orage', ['pluie', 'vent', 'brouillard']]],
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
    const [correct, emoji, wrongs] = pick(FR_ORTHO[tier(level, 3)]);
    return { key: `ortho-${correct}`, prompt: `Comment s'écrit le mot pour ${emoji} ?`, correct, wrongs };
  } },
  { skill: 'frConjug', gen(level) {
    const [sentence, correct, wrongs] = pick(FR_FILLS[tier(level, 3)]);
    return { key: `fillfr-${correct}-${sentence.length}`, prompt: `Complète la phrase : « ${sentence} »`, correct, wrongs };
  } },
  { skill: 'frHomo', requires: ['frConjug', 2], gen() {
    const [sentence, correct, wrongs] = pick(FR_HOMOPHONES);
    return { key: `homo-${correct}-${sentence.length}`, prompt: `Choisis le bon mot : « ${sentence} »`, correct, wrongs };
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
    const [en, correct, wrongs] = pick(FR_TRADS[tier(level, 3)]);
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

// -- Découverte : géographie, civisme, science (France & USA, 7 ans) ---------

const DISCOVERY_SETS = {
  geoFR: {
    1: [
      ['Quelle est la capitale de la France ?', 'Paris', ['Lyon', 'Marseille', 'Nice']],
      ['Dans quel pays se trouve la tour Eiffel ?', 'en France', ['aux États-Unis', 'en Italie', 'en Espagne']],
      ['De quelles couleurs est le drapeau français ?', 'bleu, blanc, rouge', ['rouge, jaune, vert', 'bleu, jaune, rouge', 'vert, blanc, rouge']],
      ['Sur quel continent est la France ?', "l'Europe", ["l'Afrique", "l'Asie", "l'Amérique"]],
      ['Comment s\'appellent les habitants de la France ?', 'les Français', ['les Anglais', 'les Belges', 'les Suisses']],
      ['Quelle mer borde le sud de la France ?', 'la Méditerranée', ["l'Atlantique", 'la Manche', 'la mer du Nord']],
    ],
    2: [
      ['Quel est le plus long fleuve de France ?', 'la Loire', ['la Seine', 'le Rhône', 'la Garonne']],
      ['Quelle rivière traverse Paris ?', 'la Seine', ['la Loire', 'le Rhin', 'la Garonne']],
      ['Quelle est la plus haute montagne de France ?', 'le Mont Blanc', ['le Puy de Dôme', 'le Mont Ventoux', 'le Pic du Midi']],
      ['La devise de la France : Liberté, Égalité… ?', 'Fraternité', ['Solidarité', 'Amitié', 'Sécurité']],
      ['Quel monument parisien est une grande arche ?', "l'Arc de Triomphe", ['le Louvre', 'Notre-Dame', 'le Panthéon']],
    ],
    3: [
      ["Quelle est la capitale de l'Italie ?", 'Rome', ['Venise', 'Milan', 'Naples']],
      ["Quelle est la capitale de l'Angleterre ?", 'Londres', ['Manchester', 'Liverpool', 'Dublin']],
      ["Quelle est la capitale de l'Espagne ?", 'Madrid', ['Barcelone', 'Séville', 'Lisbonne']],
      ["Quel océan borde l'ouest de la France ?", "l'Atlantique", ['le Pacifique', 'la Méditerranée', 'la mer Noire']],
      ['Dans quelle ville est la cathédrale Notre-Dame ?', 'Paris', ['Lyon', 'Reims', 'Marseille']],
    ],
  },
  geoUSA: {
    1: [
      ['Quelle est la capitale des États-Unis ?', 'Washington D.C.', ['New York', 'Los Angeles', 'Chicago']],
      ['Dans quelle ville est la statue de la Liberté ?', 'New York', ['Miami', 'Boston', 'Dallas']],
      ['Quel océan sépare la France et les USA ?', "l'Atlantique", ['le Pacifique', "l'océan Indien", "l'Arctique"]],
      ['De quelles couleurs est le drapeau américain ?', 'rouge, blanc, bleu', ['vert, blanc, rouge', 'bleu, jaune, noir', 'rouge, jaune, bleu']],
      ['Le grand pont rouge de San Francisco s\'appelle… ?', 'le Golden Gate', ['le Brooklyn Bridge', 'le Bay Bridge', 'le London Bridge']],
    ],
    2: [
      ["Combien y a-t-il d'états aux États-Unis ?", '50', ['48', '52', '13']],
      ['Où habite le président des États-Unis ?', 'à la Maison Blanche', ['au Capitole', 'à Central Park', 'au Pentagone']],
      ['Quel est le plus grand état des USA ?', "l'Alaska", ['le Texas', 'la Californie', 'la Floride']],
      ['Dans quel état est San Francisco ?', 'en Californie', ['au Texas', 'en Floride', 'au Nevada']],
      ["Combien d'étoiles sur le drapeau américain ?", '50', ['13', '52', '100']],
    ],
    3: [
      ['Quelle ville est surnommée « The Big Apple » ?', 'New York', ['Chicago', 'Boston', 'Miami']],
      ['Dans quel état est Hollywood ?', 'en Californie', ['au Texas', 'en Floride', 'à New York']],
      ['Quel fleuve a creusé le Grand Canyon ?', 'le Colorado', ['le Mississippi', 'le Missouri', 'le Rio Grande']],
      ['Le mont Rushmore montre des visages de… ?', 'présidents', ['acteurs', 'rois', 'chanteurs']],
      ['Quelle est la plus grande ville des USA ?', 'New York', ['Los Angeles', 'Washington', 'Houston']],
    ],
  },
  civics: {
    1: [
      ['Que dit-on quand on reçoit un cadeau ?', 'merci', ['pardon', 'bonjour', 'au revoir']],
      ['Avant de traverser la rue, on… ?', 'regarde des deux côtés', ['court très vite', 'ferme les yeux', 'saute à pieds joints']],
      ['Qui éteint les incendies ?', 'les pompiers', ['les boulangers', 'les facteurs', 'les dentistes']],
      ['Où jette-t-on une bouteille en plastique ?', 'au recyclage', ['par terre', 'dans la rivière', 'sous le lit']],
      ['Qui soigne les malades ?', 'les médecins', ['les pilotes', 'les peintres', 'les chanteurs']],
    ],
    2: [
      ["À l'école, pour parler, on… ?", 'lève la main', ['crie très fort', 'tape du pied', 'se lève de sa chaise']],
      ['Au feu rouge, les piétons… ?', 'attendent', ['traversent', 'reculent', 'klaxonnent']],
      ['Partager ses jouets, c\'est… ?', 'gentil', ['interdit', 'impossible', 'dangereux']],
      ['Qui vote pour choisir le président ?', 'les adultes', ['les bébés', 'les chats', 'les robots']],
      ['Trier ses déchets, ça aide… ?', 'la planète', ['personne', 'les martiens', 'les jeux vidéo']],
    ],
    3: [
      ["Combien d'étoiles sur le drapeau européen ?", '12', ['27', '50', '10']],
      ['Qui dirige une ville ?', 'le maire', ['le président', 'le directeur', 'le capitaine']],
      ['En France, on peut voter à partir de… ?', '18 ans', ['16 ans', '21 ans', '15 ans']],
      ['Que fait un vétérinaire ?', 'il soigne les animaux', ['il coupe les arbres', 'il conduit les trains', 'il fait le pain']],
      ['En France, on paie en… ?', 'euros', ['dollars', 'francs', 'livres']],
    ],
  },
  science: {
    1: [
      ['Combien de pattes a un insecte ?', '6', ['4', '8', '10']],
      ['Combien de saisons y a-t-il ?', '4', ['2', '3', '6']],
      ['Quel animal pond des œufs ?', 'la poule', ['le chat', 'le chien', 'la vache']],
      ['Pour pousser, une plante a besoin… ?', "d'eau et de lumière", ['de bonbons', 'de musique', 'de jouets']],
      ['La nuit, on voit dans le ciel… ?', 'la lune et les étoiles', ['le soleil', 'des arcs-en-ciel', 'des ballons']],
    ],
    2: [
      ["À quelle température l'eau gèle-t-elle ?", '0 °C', ['10 °C', '100 °C', '50 °C']],
      ['Quelle planète est la plus proche du Soleil ?', 'Mercure', ['la Terre', 'Mars', 'Jupiter']],
      ["L'eau qui bout devient de la… ?", 'vapeur', ['glace', 'neige', 'boue']],
      ['Le soleil se lève à… ?', "l'est", ["l'ouest", 'au nord', 'au sud']],
      ['Combien de planètes dans le système solaire ?', '8', ['7', '9', '12']],
      ['Un aimant attire… ?', 'le fer', ['le bois', 'le plastique', 'le papier']],
    ],
    3: [
      ['Quel organe pompe le sang ?', 'le cœur', ['le cerveau', 'les poumons', "l'estomac"]],
      ['La Terre tourne autour… ?', 'du Soleil', ['de la Lune', 'de Mars', "d'elle-même seulement"]],
      ['Quel gaz respirons-nous pour vivre ?', "l'oxygène", ['le carbone', "l'hélium", 'la vapeur']],
      ['Glace, eau, vapeur : ce sont trois… ?', "états de l'eau", ['couleurs', 'planètes', 'saisons']],
      ['Quelle planète est surnommée la planète rouge ?', 'Mars', ['Vénus', 'Jupiter', 'Saturne']],
      ['Combien de dents de lait a un enfant ?', '20', ['32', '12', '28']],
    ],
  },
};

function discoveryGen(skill) {
  return { skill, gen(level) {
    const t = tier(level, DISCOVERY_SETS[skill][3] ? 3 : 2);
    const set = DISCOVERY_SETS[skill][t];
    const i = rnd(set.length);
    const [prompt, correct, wrongs] = set[i];
    return { key: `disc-${skill}-${t}-${i}`, prompt, correct, wrongs };
  } };
}

const DISCOVERY_GENS = [
  discoveryGen('geoFR'), discoveryGen('geoUSA'),
  discoveryGen('civics'), discoveryGen('science'),
];

const CATEGORIES = [
  { name: 'Math', gens: MATH_GENS, maxLevel: 5, defaultLevel: 3 },
  { name: 'English', gens: ENGLISH_GENS, maxLevel: 3, defaultLevel: 2 },
  { name: 'Français', gens: FRENCH_GENS, maxLevel: 3, defaultLevel: 2 },
  { name: 'Découverte', gens: DISCOVERY_GENS, maxLevel: 3, defaultLevel: 2 },
];

// Friendly skill names for the parent summary.
const SKILL_LABELS = {
  add: 'additions', sub: 'soustractions', missing: 'nombres cachés', compare: 'comparaisons',
  skip: 'suites de nombres', wordEN: 'problèmes (anglais)', wordFR: 'problèmes (français)',
  shapes: 'géométrie', double: 'doubles et moitiés', place: 'dizaines et centaines',
  frnum: 'nombres en lettres', mult: 'multiplications', frHomo: 'homophones (a/à, et/est…)',
  enPlural: 'pluriels anglais', enOpposite: 'contraires (anglais)', enRhyme: 'rimes anglaises',
  enFill: 'phrases à trous (anglais)', enSpell: 'orthographe anglaise', enCategory: 'vocabulaire anglais',
  frOrtho: 'orthographe française', frConjug: 'conjugaison', frArticle: 'articles (le/la/les)',
  frPlural: 'pluriels français', frTrad: 'traduction', frAdj: 'accords', frCalendar: 'jours et mois',
  geoFR: 'géographie France', geoUSA: 'géographie USA', civics: 'civisme', science: 'sciences',
};

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
    // One-time recalibration: the bank proved globally too easy, so every
    // already-known skill jumps a level (adaptive demotion catches any
    // skill that was actually at the right level).
    if (!this.data.boost1) {
      for (const [skill, s] of Object.entries(this.skills)) {
        const meta = SKILL_META[skill];
        if (meta) { s.level = Math.min(s.level + 1, meta.maxLevel); s.hist = []; }
      }
      this.data.boost1 = 1;
    }
    // Resume the unspent play time from the last session: closing or
    // restarting the game must not burn minutes that were already earned.
    // With no time left over (or a refresh mid-quiz), a quiz is owed —
    // so refreshing is never an escape from answering questions.
    const carried = Math.min(this.data.remaining || 0, SESSION_SECONDS);
    this.quizDue = carried < 15;
    this.remaining = this.quizDue ? 0 : carried;
    this.quizActive = false;
    this.hardStopActive = false;
    this.marathon = false;  // 20-question unlock quiz after the daily limit
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
    // cross-device totals (filled in by main.js from the cloud; local-only
    // until then, so everything works fully offline too)
    this.crossDeviceDays = null;
    this.otherDevicesPlaySeconds = 0;

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

    // the in-game academy button is gone — the recap lives on the main menu;
    // the guard keeps older cached HTML working during an update
    const eduBtn = document.getElementById('edu-btn');
    if (eduBtn) eduBtn.addEventListener('click', () => this.togglePanel());
    document.getElementById('edu-panel-close').addEventListener('click', () => this.togglePanel());

    document.getElementById('hardstop-marathon').addEventListener('click', () => this.startMarathon());
    document.getElementById('hardstop-unlock').addEventListener('click', () => this.tryParentCode());
    document.getElementById('hardstop-code').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.tryParentCode();
      e.stopPropagation(); // don't let game key handlers see the code
    });

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
    // remaining play time survives restarts; a quiz in progress saves 0 so
    // reloading mid-quiz restarts the quiz instead of skipping it
    this.data.remaining = this.quizActive || this.quizDue
      ? 0 : Math.max(0, Math.round(this.remaining));
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); } catch { /* ignore */ }
  }

  today() {
    if (!this.data.days) this.data.days = {};
    const key = todayKey();
    if (!this.data.days[key]) this.data.days[key] = { play: 0, quiz: 0, correct: [], wrong: 0, unlocks: 0 };
    if (this.data.days[key].quiz === undefined) this.data.days[key].quiz = 0; // older saves
    return this.data.days[key];
  }

  // Daily allowance grows by one block per parental/marathon unlock.
  allowance() {
    return DAILY_LIMIT_SECONDS * (1 + (this.today().unlocks || 0));
  }

  // ---------- adaptive difficulty ----------

  // Starting difficulty for a category, from the child's school grade.
  gradeBase(cat) {
    const g = this.data.grade;
    if (g === undefined || g === null) return null;
    return cat === 'Math' ? MATH_BY_GRADE[g] : OTHER_BY_GRADE[g];
  }

  // Called at boot and whenever the parent changes language/grade on the
  // home screen. A grade change re-seats every skill at that grade's level;
  // the adaptive engine fine-tunes from there.
  setPrefs(lang, grade) {
    EDU_PREFS.lang = lang || 'both';
    this.categoryQueue = []; // rebuilt with the new language filter
    if (grade !== undefined && grade !== null && grade !== this.data.grade) {
      this.data.grade = grade;
      for (const [skill, s] of Object.entries(this.skills)) {
        const meta = SKILL_META[skill];
        if (!meta) continue;
        s.level = Math.min(Math.max(this.gradeBase(meta.cat), 1), meta.maxLevel);
        s.hist = [];
      }
      this.save();
    }
  }

  skillState(skill) {
    if (!this.skills[skill]) {
      const meta = SKILL_META[skill];
      // a brand-new skill starts near the level the child has already
      // proven in that category across all previous sessions
      const catLevel = Math.floor(this.categoryLevel(meta.cat));
      const base = this.gradeBase(meta.cat) || meta.defaultLevel;
      this.skills[skill] = {
        level: Math.min(Math.max(base, catLevel), meta.maxLevel),
        hist: [],
      };
    }
    return this.skills[skill];
  }

  recordOutcome(skill, ok, fluent = false) {
    const s = this.skillState(skill);
    // lifetime tallies — the long-term memory behind level drift
    if (ok) s.right = (s.right || 0) + 1;
    else s.wrong = (s.wrong || 0) + 1;
    s.hist.push(ok ? 1 : 0);
    if (s.hist.length > 8) s.hist.shift();
    // fluency detector: quick, first-try correct answers mean it's too easy
    s.fastStreak = ok && fluent ? (s.fastStreak || 0) + 1 : 0;
    const max = SKILL_META[skill].maxLevel;
    const last3 = s.hist.slice(-3);
    const last2 = s.hist.slice(-2);
    // 2 fluent answers in a row -> the level is validated, move up right away
    if (ok && s.fastStreak >= 2 && s.level < max) {
      s.level++; s.hist = []; s.fastStreak = 0;
    // 3 in a row right -> harder now (no lingering on easy wins)
    } else if (ok && last3.length === 3 && last3.every((v) => v) && s.level < max) {
      s.level++; s.hist = [];
    // struggling: 2 in a row wrong -> gently step back down
    } else if (!ok && last2.length === 2 && last2.every((v) => !v) && s.level > 1) {
      s.level--; s.hist = [];
    } else if (s.hist.length >= 4) {
      const rate = s.hist.reduce((a, b) => a + b, 0) / s.hist.length;
      if (rate >= 0.8 && s.level < max) { s.level++; s.hist = []; }
      else if (rate <= 0.4 && s.level > 1) { s.level--; s.hist = []; }
    }
    this.save();
  }

  logQuestion(ok) {
    const t = this.today();
    if (!t.qs) t.qs = [];
    t.qs.push({
      c: this.current.category, s: this.current.skill,
      q: this.current.prompt, a: this.current.correct,
      ok, t: Date.now(),
    });
    if (ok) {
      t.correct.push({ c: this.current.category, q: this.current.prompt, a: this.current.correct, t: Date.now() });
      if (this.onCorrect) this.onCorrect(); // hook: hat unlocks & records
    } else {
      t.wrong++;
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
    } else if (this.quizActive || this.hardStopActive) {
      // answering quiz questions (or waiting out a hard stop) is real
      // engagement too — tracked apart from "play" so the daily chart
      // never looks like time went missing
      this.today().quiz += dt;
      this.saveTimer -= dt;
      if (this.saveTimer <= 0) { this.saveTimer = 10; this.save(); }
    }

    this.el.timer.style.display = 'block';

    if (running && !this.quizActive && !this.hardStopActive) {
      // the daily limit is per child, not per device — playing 30 min on
      // an iPad then switching to a phone doesn't reset the clock
      if (this.today().play + this.otherDevicesPlaySeconds >= this.allowance()) { this.startHardStop(); return; }
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
    let text = `⏱ ${m}:${String(s).padStart(2, '0')}`;
    const dailyLeft = this.allowance() - this.today().play;
    if (dailyLeft <= 600) text += ` · ⏰ ${Math.max(0, Math.ceil(dailyLeft / 60))} min`;
    this.el.timer.textContent = text;
    this.el.timer.classList.toggle('urgent', t <= 60);
  }

  needed() {
    return (this.marathon ? MARATHON_CORRECT : NEEDED_CORRECT) + this.neededExtra;
  }

  // ---------- daily hard stop ----------

  startHardStop() {
    this.hardStopActive = true;
    this.hooks.onPause();
    const box = document.getElementById('hardstop');
    box.style.display = 'flex';
    document.getElementById('hardstop-played').textContent =
      `Tu as joué ${this.formatDuration(this.today().play + this.otherDevicesPlaySeconds)} aujourd'hui. Bien joué !`;
    document.getElementById('hardstop-feedback').textContent = '';
    document.getElementById('hardstop-code').value = '';
  }

  grantExtraBlock() {
    this.today().unlocks = (this.today().unlocks || 0) + 1;
    this.save();
    this.hardStopActive = false;
    document.getElementById('hardstop').style.display = 'none';
  }

  tryParentCode() {
    const input = document.getElementById('hardstop-code');
    if (input.value.trim() === PARENT_CODE) {
      this.grantExtraBlock();
      this.hooks.toast('🔑 +45 minutes débloquées !', 0x6ee06e);
      this.hooks.onResume();
    } else {
      input.value = '';
      document.getElementById('hardstop-feedback').textContent = 'Code incorrect !';
    }
  }

  startMarathon() {
    document.getElementById('hardstop').style.display = 'none';
    this.startQuiz(true);
  }

  // ---------- quiz ----------

  // Long-term drift: a skill whose ALL-TIME success rate is high should not
  // sit at its level — every quiz start, promote proven skills. Tallies decay
  // after a promotion so the next one needs fresh evidence.
  applyLifetimeDrift() {
    for (const [skill, s] of Object.entries(this.skills)) {
      const meta = SKILL_META[skill];
      if (!meta) continue;
      const total = (s.right || 0) + (s.wrong || 0);
      if (total >= 8 && (s.right || 0) / total >= 0.8 && s.level < meta.maxLevel) {
        s.level++;
        s.hist = [];
        s.right = Math.floor((s.right || 0) * 0.5);
        s.wrong = Math.floor((s.wrong || 0) * 0.5);
      }
    }
    this.save();
  }

  startQuiz(marathon = false) {
    this.applyLifetimeDrift();
    this.marathon = marathon;
    this.quizActive = true;
    this.quizDue = true;
    this.remaining = 0;
    this.save();
    this.correctCount = 0;
    this.questionCount = 0;
    this.neededExtra = 0;
    this.suspicion = 0;
    this.frozen = false;
    this.streak = 0;
    this.setStats = {}; // per-category correct counts, for the victory title
    this.hooks.onPause();
    this.el.quiz.style.display = 'flex';
    this.renderStars();
    this.nextQuestion();
  }

  pickQuestion() {
    if (this.categoryQueue.length === 0) {
      // a language preference removes the whole other-language category
      this.categoryQueue = shuffle(CATEGORIES.filter((c) =>
        (EDU_PREFS.lang !== 'fr' || c.name !== 'English') &&
        (EDU_PREFS.lang !== 'en' || c.name !== 'Français')));
    }
    const category = this.categoryQueue.pop();
    for (let attempt = 0; attempt < 30; attempt++) {
      const def = pick(category.gens);
      // language-specific skills are skipped when the other language is chosen
      if (def.lang && EDU_PREFS.lang !== 'both' && def.lang !== EDU_PREFS.lang) continue;
      // some skills unlock only once a prerequisite is mastered
      if (def.requires && this.skillState(def.requires[0]).level < def.requires[1]) continue;
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
    this.attempted = 0;
    this.current = this.pickQuestion();
    this.questionCount++;
    this.shownAt = performance.now();
    this.el.feedback.textContent = '';
    this.el.feedback.className = '';
    this.el.category.textContent = `${this.current.category} · N${this.current.level}`;
    this.el.category.dataset.cat = this.current.category;
    this.el.question.textContent = this.current.prompt;
    this.el.question.className = '';
    this.el.count.textContent = `Question ${this.questionCount}`;
    // geometry questions show the actual shape — fair and helpful
    const visual = document.getElementById('quiz-visual');
    if (this.current.shape) {
      visual.innerHTML = shapeSVG(this.current.shape);
      visual.style.display = 'block';
    } else {
      visual.style.display = 'none';
    }
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

    const correct = i === this.current.answerIndex;
    const buttons = [...this.el.options.children];

    if (correct) {
      this.locked = true;
      buttons.forEach((b) => b.classList.add('disabled'));
      this.suspicion = Math.max(0, this.suspicion - 1);
      btn.classList.add('good');
      this.correctCount++;
      this.streak++;
      this.setStats[this.current.category] = (this.setStats[this.current.category] || 0) + 1;
      this.el.feedback.textContent = pick(['Bravo ! 🎉', 'Super ! ⭐', 'Génial ! 🌟', 'Excellent ! 🏆', 'Oui ! 💪']);
      this.el.feedback.className = 'good';
      if (this.streak >= 2) this.showCombo();
      // "fluent" = right on the first try, in under 4.5 seconds
      this.recordOutcome(this.current.skill, true, this.attempted === 0 && elapsed < 4.5);
      this.logQuestion(true);
      this.renderStars(true);
      setTimeout(() => {
        if (this.correctCount >= this.needed()) this.celebrate();
        else this.nextQuestion();
      }, 1400);
      return;
    }

    // wrong answer
    this.streak = 0;
    btn.classList.add('bad', 'disabled');

    // random-clicking detection: wrong AND answered suspiciously fast
    let willFreeze = false;
    if (elapsed < FAST_WRONG_DELAY) {
      this.suspicion++;
      if (this.suspicion >= 3) willFreeze = true;
    }

    // second chance: one retry on the remaining options
    if (!willFreeze && this.attempted === 0) {
      this.attempted = 1;
      this.el.feedback.textContent = this.suspicion === 2
        ? 'Tu cliques trop vite sans lire 🧐 Réfléchis et essaie encore !'
        : pick(['Presque ! Essaie encore 🤔', 'Pas celle-là… tu as une 2e chance !', 'Regarde bien, retente ta chance !']);
      this.el.feedback.className = 'retry';
      return;
    }

    this.locked = true;
    buttons.forEach((b) => b.classList.add('disabled'));
    buttons[this.current.answerIndex].classList.add('good');
    this.el.feedback.textContent = `La bonne réponse était : ${this.current.correct}`;
    this.el.feedback.className = 'bad';
    this.recordOutcome(this.current.skill, false);
    this.logQuestion(false);

    if (willFreeze) {
      setTimeout(() => this.freeze(), 1200);
      return;
    }
    setTimeout(() => this.nextQuestion(), 2300);
  }

  showCombo() {
    const combo = document.getElementById('quiz-combo');
    combo.textContent = `🔥 COMBO ×${this.streak} !`;
    combo.className = 'combo-pop';
    clearTimeout(this._comboTimer);
    this._comboTimer = setTimeout(() => { combo.className = 'combo-hidden'; }, 1300);
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
    if (this.needed() > 8) { // marathon: a counter reads better than 20 stars
      const counter = document.createElement('span');
      counter.textContent = `${this.correctCount} / ${this.needed()} ⭐`;
      if (pop) counter.className = 'star-pop';
      this.el.stars.appendChild(counter);
      return;
    }
    for (let i = 0; i < this.needed(); i++) {
      const star = document.createElement('span');
      star.textContent = i < this.correctCount ? '⭐' : '☆';
      if (pop && i === this.correctCount - 1) star.className = 'star-pop';
      this.el.stars.appendChild(star);
    }
  }

  victoryTitle() {
    const TITLES = {
      Math: ['MATH GÉNIE ! 🧮', 'ROI DES NOMBRES ! 🔢'],
      English: ['WORD WIZARD ! 📚', 'ENGLISH STAR ! ⭐'],
      'Français': ['AS DU FRANÇAIS ! 🥖', 'ORTHO-HÉROS ! ✍️'],
      'Découverte': ['GÉO MASTER ! 🌍', 'PETIT SAVANT ! 🔬'],
    };
    let best = 'Math', bestN = -1;
    for (const [cat, n] of Object.entries(this.setStats || {})) {
      if (n > bestN) { best = cat; bestN = n; }
    }
    return pick(TITLES[best] || TITLES.Math);
  }

  celebrate() {
    this.confetti();
    this.emojiBurst();
    document.getElementById('quiz-visual').style.display = 'none';
    const heroPraise = pick([
      'Capitaine Éclair : « Tu es un vrai héros ! ⚡ »',
      'Super Nova : « Boum ! Une étoile est née ! ✨ »',
      'Prof. Cornichon : « Extraordinaire, jeune génie ! 🥒 »',
      'Marlon : « Trop fort !! On retourne jouer ! 🎉 »',
      'Léo le Bâtisseur : « Solide comme une brique ! 🧱 »',
    ]);
    const reward = this.hooks.reward ? this.hooks.reward() : null;
    const rewardLine = reward
      ? `<br>🎁 Tu gagnes une créature : <b>${reward.name}</b> (${reward.type}) — elle est dans ton Dex !`
      : '';

    this.el.question.textContent = this.victoryTitle();
    this.el.question.className = 'mega-title';
    this.el.category.textContent = '🏆';
    this.el.count.textContent = '';
    this.el.feedback.innerHTML =
      `${this.marathon ? '+45 minutes débloquées !' : `+${SESSION_SECONDS / 60} minutes de jeu !`} 🎮` +
      `<br>${heroPraise}${rewardLine}`;
    this.el.feedback.className = 'good';
    if (this.marathon) this.grantExtraBlock();
    // pointer lock needs a real click, so resuming goes through a button
    this.el.options.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'quiz-opt quiz-continue';
    btn.textContent = '▶ Continuer à jouer !';
    btn.addEventListener('click', () => {
      this.el.quiz.style.display = 'none';
      this.quizActive = false;
      this.quizDue = false;
      this.marathon = false;
      this.remaining = SESSION_SECONDS;
      this.warned60 = false;
      this.warned10 = false;
      this.save();
      this.hooks.onResume();
    });
    this.el.options.appendChild(btn);
  }

  emojiBurst() {
    const container = document.getElementById('confetti');
    const emojis = ['⭐', '🏆', '🔥', '🎉', '💎', '🚀', '🌟', '💪'];
    for (let i = 0; i < 22; i++) {
      const p = document.createElement('span');
      p.className = 'emoji-burst';
      p.textContent = emojis[rnd(emojis.length)];
      p.style.left = 10 + Math.random() * 80 + 'vw';
      p.style.animationDelay = Math.random() * 0.8 + 's';
      p.style.fontSize = 22 + Math.random() * 26 + 'px';
      container.appendChild(p);
      setTimeout(() => p.remove(), 3000);
    }
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

  // Cross-device totals arrive asynchronously from main.js (Supabase pull).
  // Setting them re-renders the panel live if it's currently open.
  setCrossDeviceDays(days, otherDevicesPlaySeconds) {
    this.crossDeviceDays = days;
    this.otherDevicesPlaySeconds = otherDevicesPlaySeconds || 0;
    if (this.el.panel.style.display === 'block') this.renderPanel();
  }

  renderPanel() {
    const body = this.el.panelBody;
    body.innerHTML = '';
    const t = this.today();
    const days = this.crossDeviceDays || this.data.days || {};
    // "aujourd'hui" combines this device's live count with every other
    // device's last known push, so the number is the child's true total
    const td = days[todayKey()] || t;

    const summary = document.createElement('div');
    summary.className = 'edu-summary';
    summary.innerHTML =
      `<div><b>Aujourd'hui</b>${this.crossDeviceDays ? ' <span style="color:#8894b0;font-size:12px">(tous appareils)</span>' : ''}</div>` +
      `<div>🕐 Temps de jeu : <b>${this.formatDuration(td.play)}</b>` +
      (td.quiz > 5 ? ` · 📝 Temps de quiz : <b>${this.formatDuration(td.quiz)}</b>` : '') + `</div>` +
      `<div>✅ Bonnes réponses : <b>${t.correct.length}</b> · ❌ Erreurs : <b>${t.wrong}</b></div>` +
      `<div>📈 Niveaux : Math <b>${this.categoryLevel('Math')}</b>/5 · English <b>${this.categoryLevel('English')}</b>/3 · Français <b>${this.categoryLevel('Français')}</b>/3 · Découverte <b>${this.categoryLevel('Découverte')}</b>/3</div>` +
      `<div>⏰ Limite du jour : <b>${this.formatDuration(this.allowance())}</b> (${t.unlocks || 0} déblocage${(t.unlocks || 0) > 1 ? 's' : ''})</div>`;
    body.appendChild(summary);

    // 📊 stacked bar chart: minutes of play (+ quiz time) per day, 2 weeks.
    // The quiz segment exists so the chart never looks like time "went
    // missing" — answering quiz questions or waiting out a hard stop isn't
    // counted as "jeu", so it's shown separately instead of just vanishing.
    const chartBox = document.createElement('div');
    chartBox.className = 'edu-summary';
    chartBox.innerHTML = '<div><b>📊 Temps par jour (minutes)</b> — touche une barre pour le détail</div>' +
      '<div style="font-size:12px;color:#8894b0;margin-top:2px">' +
      '<span style="color:#ffd75e">■</span> jeu (aujourd\'hui) &nbsp; ' +
      '<span style="color:#5ab46e">■</span> jeu &nbsp; ' +
      '<span style="color:#4a90d9">■</span> quiz</div>';
    const cv = document.createElement('canvas');
    cv.width = 900; cv.height = 240;
    cv.style.width = '100%';
    cv.style.height = 'auto';
    cv.style.cursor = 'pointer';
    chartBox.appendChild(cv);
    body.appendChild(chartBox);

    const dayDetail = document.createElement('div');
    dayDetail.id = 'edu-day-detail';
    dayDetail.className = 'edu-summary';
    dayDetail.style.display = 'none';
    body.appendChild(dayDetail);

    const keys14 = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      keys14.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    const playMins = keys14.map((k) => (days[k] ? Math.round(days[k].play / 60) : 0));
    const quizMins = keys14.map((k) => (days[k] ? Math.round((days[k].quiz || 0) / 60) : 0));
    const totalMins = keys14.map((i2, i) => playMins[i] + quizMins[i]);
    const max = Math.max(10, ...totalMins);
    const PADL = 34, PADB = 34, PADT = 18;
    const W = cv.width - PADL - 8, H = cv.height - PADB - PADT;
    const bw = W / keys14.length;
    let selectedKey = null;

    const draw = () => {
      const g = cv.getContext('2d');
      g.clearRect(0, 0, cv.width, cv.height);
      const step = max <= 20 ? 5 : max <= 60 ? 15 : 30; // y-axis gridlines
      g.strokeStyle = 'rgba(255,255,255,0.12)';
      g.fillStyle = 'rgba(255,255,255,0.45)';
      g.font = '15px system-ui, sans-serif';
      g.textAlign = 'right';
      for (let v = 0; v <= max; v += step) {
        const y = PADT + H - (v / max) * H;
        g.beginPath(); g.moveTo(PADL, y); g.lineTo(PADL + W, y); g.stroke();
        g.fillText(String(v), PADL - 5, y + 5);
      }
      keys14.forEach((k, i) => {
        const x = PADL + i * bw + bw * 0.12;
        const bwPlot = bw * 0.76;
        const playH = (playMins[i] / max) * H;
        const quizH = (quizMins[i] / max) * H;
        if (k === selectedKey) { // highlight the selected column
          g.fillStyle = 'rgba(255,255,255,0.08)';
          g.fillRect(PADL + i * bw, PADT, bw, H);
        }
        g.fillStyle = k === todayKey() ? '#ffd75e' : '#5ab46e'; // today pops in gold
        g.fillRect(x, PADT + H - playH, bwPlot, playH);
        if (quizH > 0) {
          g.fillStyle = '#4a90d9';
          g.fillRect(x, PADT + H - playH - quizH, bwPlot, quizH);
        }
        g.textAlign = 'center';
        if (totalMins[i] > 0) {
          g.fillStyle = '#fff';
          g.font = 'bold 13px system-ui, sans-serif';
          g.fillText(String(totalMins[i]), x + bwPlot / 2, PADT + H - playH - quizH - 5);
        }
        g.fillStyle = k === selectedKey ? '#fff' : 'rgba(255,255,255,0.55)';
        g.font = '11px system-ui, sans-serif';
        g.fillText(`${k.slice(8, 10)}/${k.slice(5, 7)}`, x + bwPlot / 2, PADT + H + 17);
      });
    };
    draw();

    const renderDayDetail = (key) => {
      if (selectedKey === key) { selectedKey = null; dayDetail.style.display = 'none'; draw(); return; }
      selectedKey = key;
      draw();
      const d = days[key] || { play: 0, quiz: 0, correct: [], wrong: 0, qs: [] };
      const [y2, m2, day2] = key.split('-');
      dayDetail.style.display = 'block';
      let html = `<div><b>${day2}/${m2}/${y2}</b>` + (key === todayKey() ? " (aujourd'hui)" : '') + '</div>' +
        `<div>🕐 Jeu : <b>${this.formatDuration(d.play)}</b>` +
        (d.quiz > 5 ? ` · 📝 Quiz : <b>${this.formatDuration(d.quiz)}</b>` : '') + '</div>' +
        `<div>✅ <b>${d.correct.length}</b> bonnes réponses · ❌ <b>${d.wrong}</b> erreurs</div>`;
      const qs = d.qs || [];
      if (qs.length) {
        html += '<div style="margin-top:6px;max-height:220px;overflow-y:auto">';
        for (const item of [...qs].reverse()) {
          const time = new Date(item.t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          const mark = item.ok ? '<span class="mark ok">✓</span>' : '<span class="mark ko">✗</span>';
          html += `<div class="edu-row">${mark} <span class="edu-cat" data-cat="${item.c}">${item.c}</span> ${item.q} → <b>${item.a}</b> <span class="edu-time">${time}</span></div>`;
        }
        html += '</div>';
      } else if (totalMins[keys14.indexOf(key)] === 0) {
        html += '<div style="color:#8894b0">Aucune activité ce jour-là.</div>';
      }
      dayDetail.innerHTML = html;
      dayDetail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    cv.addEventListener('click', (e) => {
      const rect = cv.getBoundingClientRect();
      const scale = cv.width / rect.width;
      const px = (e.clientX - rect.left) * scale;
      if (px < PADL || px > PADL + W) return;
      const i = Math.min(keys14.length - 1, Math.max(0, Math.floor((px - PADL) / bw)));
      renderDayDetail(keys14[i]);
    });

    // Parent digest: what works well / what needs practice, from today's log.
    const qs = t.qs || [];
    if (qs.length >= 2) {
      const bySkill = {};
      for (const item of qs) {
        if (!bySkill[item.s]) bySkill[item.s] = { ok: 0, total: 0 };
        bySkill[item.s].total++;
        if (item.ok) bySkill[item.s].ok++;
      }
      const strong = [], weak = [];
      for (const [skill, st] of Object.entries(bySkill)) {
        if (st.total < 2) continue;
        const label = SKILL_LABELS[skill] || skill;
        if (st.ok / st.total >= 0.75) strong.push(`${label} (${st.ok}/${st.total})`);
        else if (st.ok / st.total <= 0.5) weak.push(`${label} (${st.ok}/${st.total})`);
      }
      const digest = document.createElement('div');
      digest.className = 'edu-summary';
      digest.innerHTML = `<div><b>📋 Bilan du jour</b></div>` +
        (strong.length ? `<div class="edu-strong">🟢 Ça marche bien : ${strong.join(' · ')}</div>` : '') +
        (weak.length ? `<div class="edu-weak">🔴 À travailler : ${weak.join(' · ')}</div>` : '') +
        (!strong.length && !weak.length ? '<div>Encore un peu de données nécessaires…</div>' : '');
      body.appendChild(digest);
    }

    if (qs.length > 0) {
      const h = document.createElement('div');
      h.className = 'edu-heading';
      h.textContent = "Toutes les questions d'aujourd'hui :";
      body.appendChild(h);
      for (const item of [...qs].reverse()) {
        const row = document.createElement('div');
        row.className = 'edu-row';
        const time = new Date(item.t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const mark = item.ok ? '<span class="mark ok">✓</span>' : '<span class="mark ko">✗</span>';
        row.innerHTML = `${mark} <span class="edu-cat" data-cat="${item.c}">${item.c}</span> ${item.q} → <b>${item.a}</b> <span class="edu-time">${time}</span>`;
        body.appendChild(row);
      }
    } else if (t.correct.length > 0) { // older data without the full log
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
        row.style.cursor = 'pointer';
        row.innerHTML = `<b>${key}</b> — 🕐 ${this.formatDuration(d.play)}` +
          (d.quiz > 5 ? ` · 📝 ${this.formatDuration(d.quiz)}` : '') +
          ` · ✅ ${d.correct.length} · ❌ ${d.wrong}`;
        row.addEventListener('click', () => renderDayDetail(key));
        body.appendChild(row);
      }
    }

    const total = Object.values(days).reduce((a, d) => a + d.play, 0);
    const totalQuiz = Object.values(days).reduce((a, d) => a + (d.quiz || 0), 0);
    const totalCorrect = Object.values(days).reduce((a, d) => a + d.correct.length, 0);
    const footer = document.createElement('div');
    footer.className = 'edu-summary';
    footer.innerHTML = `<div><b>Total</b> : 🕐 ${this.formatDuration(total)}` +
      (totalQuiz > 5 ? ` (+ 📝 ${this.formatDuration(totalQuiz)} de quiz)` : '') +
      ` · ✅ ${totalCorrect} bonnes réponses</div>`;
    body.appendChild(footer);
  }
}
