import { getLanguageFromCountry } from './i18n.js';

// Standalone local quiz & feedback generator for Study Rack
// Provides 120+ unique questions per subject, matches question difficulty to grade level,
// localizes math stems to the country's language, and tracks asked questions across quizzes.

const ASKED_STORAGE_KEY = 'studyrack_asked_questions_v1';

const shuffle = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const pickDistractors = (correct, pool, count = 3) => {
  const uniquePool = Array.from(new Set(pool.filter((item) => item !== correct)));
  return shuffle(uniquePool).slice(0, count);
};

const toMCQ = (question, correctAnswer, distractors, minGrade = 0, maxGrade = 12) => ({
  question,
  options: shuffle([correctAnswer, ...distractors.slice(0, 3)]),
  correctAnswer,
  minGrade,
  maxGrade,
});

const parseGradeNum = (grade) => {
  if (grade === 'JK' || grade === 'SK') return 0;
  const match = String(grade).match(/\d+/);
  return match ? parseInt(match[0], 10) : 5;
};

const loadAskedMap = () => {
  try {
    const raw = localStorage.getItem(ASKED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveAskedMap = (map) => {
  try {
    localStorage.setItem(ASKED_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
};

// --- Dynamic Math Generator (localized + grade-appropriate, thousands of unique questions) ---
const MATH_TEXT = {
  en: {
    whatIs: (expr) => `What is ${expr}?`,
    after: (a) => `What number comes right after ${a}?`,
    larger: (s, b) => `Which number is larger: ${s} or ${b}?`,
    solve: (eq) => `Solve for x: ${eq}`,
    pct: (p, base) => `What is ${p}% of ${base}?`,
    perim: (l, w) => `What is the perimeter of a ${l} × ${w} rectangle?`,
    area: (r) => `If a square has side length ${r}, what is its area?`,
    fn: (m, b, x) => `For f(x) = ${m}x + ${b}, what is f(${x})?`,
  },
  ru: {
    whatIs: (expr) => `Сколько будет ${expr}?`,
    after: (a) => `Какое число идёт сразу после ${a}?`,
    larger: (s, b) => `Какое число больше: ${s} или ${b}?`,
    solve: (eq) => `Найдите x: ${eq}`,
    pct: (p, base) => `Сколько составляет ${p}% от ${base}?`,
    perim: (l, w) => `Чему равен периметр прямоугольника ${l} × ${w}?`,
    area: (r) => `Чему равна площадь квадрата со стороной ${r}?`,
    fn: (m, b, x) => `Для f(x) = ${m}x + ${b}, чему равно f(${x})?`,
  },
  fr: {
    whatIs: (expr) => `Combien font ${expr} ?`,
    after: (a) => `Quel nombre vient juste après ${a} ?`,
    larger: (s, b) => `Quel nombre est le plus grand : ${s} ou ${b} ?`,
    solve: (eq) => `Trouvez x : ${eq}`,
    pct: (p, base) => `Combien font ${p}% de ${base} ?`,
    perim: (l, w) => `Quel est le périmètre d’un rectangle de ${l} × ${w} ?`,
    area: (r) => `Si un carré a un côté de ${r}, quelle est son aire ?`,
    fn: (m, b, x) => `Pour f(x) = ${m}x + ${b}, combien vaut f(${x}) ?`,
  },
  es: {
    whatIs: (expr) => `¿Cuánto es ${expr}?`,
    after: (a) => `¿Qué número va justo después de ${a}?`,
    larger: (s, b) => `¿Qué número es mayor: ${s} o ${b}?`,
    solve: (eq) => `Resuelve para x: ${eq}`,
    pct: (p, base) => `¿Cuánto es el ${p}% de ${base}?`,
    perim: (l, w) => `¿Cuál es el perímetro de un rectángulo de ${l} × ${w}?`,
    area: (r) => `Si un cuadrado tiene lado ${r}, ¿cuál es su área?`,
    fn: (m, b, x) => `Para f(x) = ${m}x + ${b}, ¿cuánto es f(${x})?`,
  },
  zh: {
    whatIs: (expr) => `${expr} 等于多少？`,
    after: (a) => `${a} 后面的一个数是多少？`,
    larger: (s, b) => `${s} 和 ${b} 哪个数更大？`,
    solve: (eq) => `解方程求 x：${eq}`,
    pct: (p, base) => `${base} 的 ${p}% 是多少？`,
    perim: (l, w) => `长 ${l}、宽 ${w} 的长方形周长是多少？`,
    area: (r) => `边长为 ${r} 的正方形面积是多少？`,
    fn: (m, b, x) => `已知 f(x) = ${m}x + ${b}，f(${x}) 等于多少？`,
  },
};

const makeMathQuestion = (gradeNum, attempt = 0, lang = 'en') => {
  const t = MATH_TEXT[lang] || MATH_TEXT.en;
  let question = '';
  let answer = 0;

  if (gradeNum <= 2) {
    const maxN = gradeNum === 0 ? 10 + Math.floor(attempt / 5) : 20 + Math.floor(attempt / 3);
    const mode = randInt(0, 3);
    if (mode === 0) {
      const a = randInt(1, maxN);
      const b = randInt(1, maxN);
      answer = a + b;
      question = t.whatIs(`${a} + ${b}`);
    } else if (mode === 1) {
      const a = randInt(2, maxN + 5);
      const b = randInt(1, a);
      answer = a - b;
      question = t.whatIs(`${a} - ${b}`);
    } else if (mode === 2) {
      const a = randInt(1, maxN + 20);
      answer = a + 1;
      question = t.after(a);
    } else {
      const a = randInt(1, maxN);
      const b = randInt(1, maxN);
      const big = a === b ? a + 1 : Math.max(a, b);
      const small = Math.min(a, b);
      answer = big;
      question = t.larger(small, big);
    }
  } else if (gradeNum <= 5) {
    const mode = randInt(0, 3);
    if (mode === 0) {
      const a = randInt(2, 16);
      const b = randInt(2, 16);
      answer = a * b;
      question = t.whatIs(`${a} × ${b}`);
    } else if (mode === 1) {
      const b = randInt(2, 12);
      answer = randInt(2, 18);
      question = t.whatIs(`${b * answer} ÷ ${b}`);
    } else if (mode === 2) {
      const a = randInt(15, 250);
      const b = randInt(10, 250);
      answer = a + b;
      question = t.whatIs(`${a} + ${b}`);
    } else {
      const a = randInt(50, 300);
      const b = randInt(10, a - 1);
      answer = a - b;
      question = t.whatIs(`${a} - ${b}`);
    }
  } else if (gradeNum <= 8) {
    const mode = randInt(0, 3);
    if (mode === 0) {
      const x = randInt(2, 20);
      const a = randInt(2, 9);
      const b = randInt(1, 25);
      answer = x;
      question = t.solve(`${a}x + ${b} = ${a * x + b}`);
    } else if (mode === 1) {
      const pct = [10, 20, 25, 50, 75][randInt(0, 4)];
      const base = randInt(2, 40) * 4;
      answer = (pct / 100) * base;
      question = t.pct(pct, base);
    } else if (mode === 2) {
      const a = randInt(12, 40);
      const b = randInt(3, 14);
      answer = a * b;
      question = t.whatIs(`${a} × ${b}`);
    } else {
      const l = randInt(3, 25);
      const w = randInt(3, 25);
      answer = 2 * (l + w);
      question = t.perim(l, w);
    }
  } else {
    const mode = randInt(0, 3);
    if (mode === 0) {
      const x = randInt(2, 24);
      const a = randInt(2, 12);
      const b = randInt(1, 30);
      answer = x;
      question = t.solve(`${a}x - ${b} = ${a * x - b}`);
    } else if (mode === 1) {
      const base = randInt(2, 14);
      const exp = randInt(2, 3);
      answer = Math.pow(base, exp);
      question = t.whatIs(`${base}^${exp}`);
    } else if (mode === 2) {
      const r = randInt(2, 22);
      answer = r * r;
      question = t.area(r);
    } else {
      const m = randInt(2, 11);
      const x = randInt(2, 15);
      const b = randInt(1, 20);
      answer = m * x + b;
      question = t.fn(m, b, x);
    }
  }

  const distractors = new Set([String(answer)]);
  while (distractors.size < 4) {
    const offset = randInt(-9, 9);
    const candidate = answer + (offset === 0 ? 11 : offset);
    if (candidate >= 0) distractors.add(String(candidate));
  }

  return {
    question,
    options: shuffle(Array.from(distractors)),
    correctAnswer: String(answer),
  };
};

// --- Science Bank + Procedural Generators (120+ questions) ---
const SCIENCE_CURATED = [
  { q: 'Which planet is known as the Red Planet?', a: 'Mars', d: ['Venus', 'Jupiter', 'Saturn'] },
  { q: 'What gas do plants absorb from the air for photosynthesis?', a: 'Carbon dioxide', d: ['Oxygen', 'Nitrogen', 'Helium'] },
  { q: 'What is the boiling point of water at sea level in Celsius?', a: '100°C', d: ['0°C', '50°C', '212°C'] },
  { q: 'What is the freezing point of water in Celsius?', a: '0°C', d: ['32°C', '100°C', '-10°C'] },
  { q: 'Which organ pumps blood throughout the human body?', a: 'Heart', d: ['Lungs', 'Brain', 'Liver'] },
  { q: 'What force pulls objects toward the center of the Earth?', a: 'Gravity', d: ['Magnetism', 'Friction', 'Inertia'] },
  { q: 'What state of matter has a fixed volume but takes the shape of its container?', a: 'Liquid', d: ['Solid', 'Gas', 'Plasma'] },
  { q: 'What state of matter has a fixed shape and fixed volume?', a: 'Solid', d: ['Liquid', 'Gas', 'Plasma'] },
  { q: 'Which part of a plant anchors it in the soil and absorbs water?', a: 'Roots', d: ['Leaves', 'Stem', 'Petals'] },
  { q: 'What is the center of an atom called?', a: 'Nucleus', d: ['Electron', 'Molecule', 'Cell'] },
  { q: 'Which star is at the center of our solar system?', a: 'The Sun', d: ['Polaris', 'Sirius', 'Alpha Centauri'] },
  { q: 'Animals that eat only plants are called what?', a: 'Herbivores', d: ['Carnivores', 'Omnivores', 'Decomposers'] },
  { q: 'Animals that eat only meat are called what?', a: 'Carnivores', d: ['Herbivores', 'Omnivores', 'Producers'] },
  { q: 'Animals that eat both plants and animals are called what?', a: 'Omnivores', d: ['Herbivores', 'Carnivores', 'Autotrophs'] },
  { q: 'How many legs does an insect have?', a: '6', d: ['4', '8', '10'] },
  { q: 'How many legs does a spider have?', a: '8', d: ['6', '4', '10'] },
  { q: 'Which gas makes up most of Earth’s atmosphere?', a: 'Nitrogen', d: ['Oxygen', 'Carbon dioxide', 'Argon'] },
  { q: 'Which organ helps humans breathe by taking in oxygen?', a: 'Lungs', d: ['Stomach', 'Kidneys', 'Heart'] },
  { q: 'Which planet is the largest in our solar system?', a: 'Jupiter', d: ['Saturn', 'Neptune', 'Earth'] },
  { q: 'What process turns liquid water into water vapor?', a: 'Evaporation', d: ['Condensation', 'Precipitation', 'Freezing'] },
  { q: 'What process turns water vapor back into liquid droplets to form clouds?', a: 'Condensation', d: ['Evaporation', 'Melting', 'Sublimation'] },
  { q: 'Which blood cells help fight infections in the body?', a: 'White blood cells', d: ['Red blood cells', 'Platelets', 'Neurons'] },
  { q: 'What simple machine is a ramp?', a: 'Inclined plane', d: ['Pulley', 'Lever', 'Wedge'] },
  { q: 'What is the hardest naturally occurring mineral on Earth?', a: 'Diamond', d: ['Quartz', 'Granite', 'Iron'] },
  { q: 'What instrument is used to view tiny cells and microorganisms?', a: 'Microscope', d: ['Telescope', 'Barometer', 'Compass'] },
  { q: 'What instrument is used to observe distant stars and planets?', a: 'Telescope', d: ['Microscope', 'Thermometer', 'Anemometer'] },
  { q: 'What part of a plant makes food using sunlight?', a: 'Leaves', d: ['Roots', 'Bark', 'Seeds'] },
  { q: 'What is the basic unit of all living things?', a: 'Cell', d: ['Atom', 'Organ', 'Tissue'] },
  { q: 'Which planet is famous for its prominent icy rings?', a: 'Saturn', d: ['Mercury', 'Mars', 'Venus'] },
  { q: 'What kind of rock is formed from cooled lava or magma?', a: 'Igneous rock', d: ['Sedimentary rock', 'Metamorphic rock', 'Limestone'] },
];

const ELEMENTS = [
  ['Hydrogen', 'H'], ['Helium', 'He'], ['Carbon', 'C'], ['Nitrogen', 'N'],
  ['Oxygen', 'O'], ['Sodium', 'Na'], ['Magnesium', 'Mg'], ['Aluminum', 'Al'],
  ['Silicon', 'Si'], ['Phosphorus', 'P'], ['Sulfur', 'S'], ['Chlorine', 'Cl'],
  ['Potassium', 'K'], ['Calcium', 'Ca'], ['Iron', 'Fe'], ['Copper', 'Cu'],
  ['Zinc', 'Zn'], ['Silver', 'Ag'], ['Gold', 'Au'], ['Mercury', 'Hg'],
  ['Lead', 'Pb'], ['Neon', 'Ne'], ['Argon', 'Ar'], ['Tin', 'Sn'],
];

const PLANETS_ORDER = [
  ['1st', 'Mercury'], ['2nd', 'Venus'], ['3rd', 'Earth'], ['4th', 'Mars'],
  ['5th', 'Jupiter'], ['6th', 'Saturn'], ['7th', 'Uranus'], ['8th', 'Neptune'],
];

const WEATHER_TOOLS = [
  ['temperature', 'Thermometer'], ['air pressure', 'Barometer'],
  ['wind speed', 'Anemometer'], ['rainfall amount', 'Rain gauge'],
  ['wind direction', 'Wind vane'], ['humidity', 'Hygrometer'],
];

const ANIMAL_GROUPS = [
  ['Dolphin', 'Mammal'], ['Whale', 'Mammal'], ['Bat', 'Mammal'], ['Kangaroo', 'Mammal'],
  ['Eagle', 'Bird'], ['Penguin', 'Bird'], ['Ostrich', 'Bird'], ['Owl', 'Bird'],
  ['Frog', 'Amphibian'], ['Salamander', 'Amphibian'], ['Toad', 'Amphibian'],
  ['Snake', 'Reptile'], ['Turtle', 'Reptile'], ['Crocodile', 'Reptile'], ['Lizard', 'Reptile'],
  ['Salmon', 'Fish'], ['Shark', 'Fish'], ['Goldfish', 'Fish'], ['Tuna', 'Fish'],
  ['Butterfly', 'Insect'], ['Ant', 'Insect'], ['Bee', 'Insect'], ['Beetle', 'Insect'],
];

const BODY_ORGANS = [
  ['Brain', 'Controls thoughts, memory, and body movements'],
  ['Stomach', 'Breaks down food using acid and enzymes'],
  ['Kidneys', 'Filter waste from the blood to make urine'],
  ['Liver', 'Processes nutrients and filters toxins from blood'],
  ['Skin', 'Protects the body as its largest outer organ'],
  ['Skeleton', 'Supports the body and protects internal organs'],
];

const buildSciencePool = () => {
  const pool = SCIENCE_CURATED.map((i) => toMCQ(i.q, i.a, i.d));
  const allSymbols = ELEMENTS.map(([, s]) => s);
  const allNames = ELEMENTS.map(([n]) => n);

  ELEMENTS.forEach(([name, sym]) => {
    pool.push(toMCQ(`What is the chemical symbol for ${name}?`, sym, pickDistractors(sym, allSymbols), 6, 12));
    pool.push(toMCQ(`Which element has the chemical symbol "${sym}"?`, name, pickDistractors(name, allNames), 6, 12));
  });

  const planetNames = PLANETS_ORDER.map(([, p]) => p);
  PLANETS_ORDER.forEach(([ord, planet]) => {
    pool.push(toMCQ(`Which planet is the ${ord} planet from the Sun?`, planet, pickDistractors(planet, planetNames)));
  });

  const toolNames = WEATHER_TOOLS.map(([, t]) => t);
  WEATHER_TOOLS.forEach(([measure, tool]) => {
    pool.push(toMCQ(`Which weather instrument measures ${measure}?`, tool, pickDistractors(tool, toolNames)));
  });

  const groupNames = ['Mammal', 'Bird', 'Amphibian', 'Reptile', 'Fish', 'Insect'];
  ANIMAL_GROUPS.forEach(([animal, group]) => {
    pool.push(toMCQ(`Which animal group does a ${animal} belong to?`, group, pickDistractors(group, groupNames)));
  });

  const organNames = BODY_ORGANS.map(([o]) => o);
  BODY_ORGANS.forEach(([organ, fn]) => {
    pool.push(toMCQ(`Which human body part: "${fn}"?`, organ, pickDistractors(organ, organNames)));
  });

  return pool;
};

// --- Language Arts Bank + Procedural Generators (120+ questions) ---
const LA_CURATED = [
  { q: 'What punctuation mark ends an interrogative sentence?', a: 'Question mark (?)', d: ['Period (.)', 'Comma (,)', 'Exclamation mark (!)'] },
  { q: 'What is an action word called?', a: 'Verb', d: ['Adjective', 'Pronoun', 'Preposition'] },
  { q: 'What do we call a word that describes a noun?', a: 'Adjective', d: ['Verb', 'Adverb', 'Conjunction'] },
  { q: 'Which sentence uses correct capitalization?', a: 'My friend Maya lives in Toronto.', d: ['my friend maya lives in toronto.', 'My Friend maya lives In toronto.', 'my Friend Maya Lives in Toronto.'] },
  { q: 'What is the main message or lesson of a story called?', a: 'Theme', d: ['Setting', 'Plot', 'Character'] },
  { q: 'Which of these is a compound word?', a: 'Sunflower', d: ['Running', 'Happily', 'Brightness'] },
  { q: 'What does the prefix "un-" mean in "unhappy"?', a: 'Not', d: ['Again', 'Before', 'Very'] },
  { q: 'What does the prefix "re-" mean in "rewrite"?', a: 'Again', d: ['Not', 'Under', 'After'] },
  { q: 'What does the prefix "pre-" mean in "preview"?', a: 'Before', d: ['After', 'Against', 'Without'] },
  { q: 'What does the suffix "-less" mean in "fearless"?', a: 'Without', d: ['Full of', 'Before', 'Small'] },
  { q: 'What does the suffix "-ful" mean in "hopeful"?', a: 'Full of', d: ['Without', 'Opposite of', 'Again'] },
  { q: 'What do we call a word that takes the place of a noun (like "she" or "they")?', a: 'Pronoun', d: ['Adverb', 'Interjection', 'Article'] },
  { q: 'Where and when a story takes place is called the:', a: 'Setting', d: ['Conflict', 'Resolution', 'Climax'] },
  { q: 'What do we call two words that sound the same but have different meanings (like "two" and "too")?', a: 'Homophones', d: ['Synonyms', 'Antonyms', 'Acronyms'] },
  { q: 'Comparing two things using "like" or "as" is called a:', a: 'Simile', d: ['Metaphor', 'Alliteration', 'Onomatopoeia'] },
  { q: 'A word that imitates a sound (like "buzz" or "boom") is:', a: 'Onomatopoeia', d: ['Simile', 'Hyperbole', 'Personification'] },
  { q: 'Giving human qualities to non-human things is called:', a: 'Personification', d: ['Alliteration', 'Idiom', 'Rhyme'] },
  { q: 'What is the sequence of events in a story called?', a: 'Plot', d: ['Genre', 'Tone', 'Author'] },
  { q: 'A word that describes how, when, or where a verb happens is an:', a: 'Adverb', d: ['Adjective', 'Noun', 'Conjunction'] },
  { q: 'Words like "and", "but", and "or" that join clauses are called:', a: 'Conjunctions', d: ['Prepositions', 'Pronouns', 'Interjections'] },
];

const SYNONYMS = [
  ['happy', 'joyful'], ['fast', 'quick'], ['big', 'large'], ['small', 'tiny'], ['smart', 'clever'],
  ['brave', 'courageous'], ['kind', 'gentle'], ['cold', 'chilly'], ['hot', 'warm'], ['bright', 'shiny'],
  ['quiet', 'silent'], ['loud', 'noisy'], ['strong', 'powerful'], ['weak', 'frail'], ['begin', 'start'],
  ['end', 'finish'], ['help', 'assist'], ['build', 'construct'], ['look', 'observe'], ['talk', 'speak'],
  ['laugh', 'chuckle'], ['angry', 'furious'], ['scared', 'afraid'], ['tired', 'sleepy'], ['rich', 'wealthy'],
  ['clean', 'tidy'], ['hard', 'difficult'], ['easy', 'simple'], ['funny', 'humorous'], ['strange', 'unusual'],
  ['gift', 'present'], ['job', 'occupation'], ['road', 'street'], ['house', 'home'], ['child', 'kid'],
  ['boat', 'ship'], ['rock', 'stone'], ['forest', 'woods'], ['ocean', 'sea'], ['error', 'mistake'],
  ['answer', 'reply'], ['ask', 'inquire'], ['choose', 'select'], ['keep', 'save'], ['break', 'shatter'],
  ['fix', 'repair'], ['jump', 'leap'], ['run', 'sprint'], ['walk', 'stroll'], ['eat', 'consume'],
  ['sleep', 'slumber'], ['wealthy', 'affluent'], ['ancient', 'old'], ['modern', 'new'], ['calm', 'peaceful'],
  ['eager', 'enthusiastic'], ['glad', 'pleased'], ['huge', 'enormous'], ['neat', 'orderly'], ['polite', 'courteous'],
];

const ANTONYMS = [
  ['hot', 'cold'], ['up', 'down'], ['day', 'night'], ['light', 'dark'], ['open', 'closed'],
  ['fast', 'slow'], ['early', 'late'], ['happy', 'sad'], ['big', 'small'], ['tall', 'short'],
  ['hard', 'soft'], ['wet', 'dry'], ['full', 'empty'], ['clean', 'dirty'], ['loud', 'quiet'],
  ['strong', 'weak'], ['old', 'new'], ['rich', 'poor'], ['push', 'pull'], ['give', 'take'],
  ['win', 'lose'], ['start', 'stop'], ['north', 'south'], ['east', 'west'], ['in', 'out'],
  ['brave', 'cowardly'], ['bright', 'dim'], ['heavy', 'light'], ['kind', 'cruel'], ['true', 'false'],
  ['near', 'far'], ['thick', 'thin'], ['wide', 'narrow'], ['high', 'low'], ['love', 'hate'],
];

const PLURALS = [
  ['child', 'children'], ['mouse', 'mice'], ['tooth', 'teeth'], ['foot', 'feet'],
  ['goose', 'geese'], ['leaf', 'leaves'], ['wolf', 'wolves'], ['knife', 'knives'],
  ['box', 'boxes'], ['berry', 'berries'], ['story', 'stories'], ['city', 'cities'],
];

const buildLanguageArtsPool = () => {
  const pool = LA_CURATED.map((i) => toMCQ(i.q, i.a, i.d));
  const allSyns = SYNONYMS.map(([, s]) => s);
  SYNONYMS.forEach(([word, syn]) => {
    pool.push(toMCQ(`Which word is a synonym for "${word}"?`, syn, pickDistractors(syn, allSyns)));
  });

  const allAnts = ANTONYMS.map(([, a]) => a);
  ANTONYMS.forEach(([word, ant]) => {
    pool.push(toMCQ(`Which word is an antonym for "${word}"?`, ant, pickDistractors(ant, allAnts)));
  });

  const allPlurals = PLURALS.map(([, p]) => p);
  PLURALS.forEach(([sing, plur]) => {
    pool.push(toMCQ(`What is the correct plural form of "${sing}"?`, plur, pickDistractors(plur, allPlurals)));
  });

  return pool;
};

// --- Geography Bank + Procedural Generators (120+ questions) ---
const GEO_CURATED = [
  { q: 'Which is the largest ocean on Earth?', a: 'Pacific Ocean', d: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean'] },
  { q: 'Which is the smallest ocean on Earth?', a: 'Arctic Ocean', d: ['Indian Ocean', 'Atlantic Ocean', 'Southern Ocean'] },
  { q: 'How many continents are there on Earth?', a: '7', d: ['5', '6', '8'] },
  { q: 'Which imaginary line divides Earth into Northern and Southern Hemispheres?', a: 'Equator', d: ['Prime Meridian', 'Tropic of Cancer', 'Arctic Circle'] },
  { q: 'Which imaginary line runs through Greenwich, England at 0° longitude?', a: 'Prime Meridian', d: ['Equator', 'International Date Line', 'Tropic of Capricorn'] },
  { q: 'Which is the longest river in South America?', a: 'Amazon River', d: ['Nile River', 'Mississippi River', 'Yangtze River'] },
  { q: 'Which is the longest river in Africa?', a: 'Nile River', d: ['Congo River', 'Zambezi River', 'Niger River'] },
  { q: 'Which continent is the Sahara Desert located on?', a: 'Africa', d: ['Asia', 'Australia', 'South America'] },
  { q: 'What is the tallest mountain in the world above sea level?', a: 'Mount Everest', d: ['K2', 'Kilimanjaro', 'Mont Blanc'] },
  { q: 'Which country has the largest land area in the world?', a: 'Russia', d: ['Canada', 'China', 'United States'] },
  { q: 'What kind of map shows countries, borders, and cities?', a: 'Political map', d: ['Topographic map', 'Climate map', 'Weather map'] },
  { q: 'Which direction is opposite of East?', a: 'West', d: ['North', 'South', 'Northeast'] },
  { q: 'Which is the smallest continent by land area?', a: 'Australia', d: ['Europe', 'Antarctica', 'South America'] },
  { q: 'Which continent has no permanent human residents and is covered mostly in ice?', a: 'Antarctica', d: ['Europe', 'South America', 'Australia'] },
  { q: 'Which mountain range separates Europe from Asia?', a: 'Ural Mountains', d: ['Andes', 'Rockies', 'Alps'] },
  { q: 'Which is the longest mountain range in South America?', a: 'Andes', d: ['Himalayas', 'Alps', 'Appalachians'] },
  { q: 'Which sea is the saltiest large body of water between Jordan and Israel?', a: 'Dead Sea', d: ['Red Sea', 'Black Sea', 'Baltic Sea'] },
  { q: 'Which strait separates Asia from North America?', a: 'Bering Strait', d: ['Strait of Gibraltar', 'Strait of Hormuz', 'English Channel'] },
];

const WORLD_CAPITALS = [
  ['Canada', 'Ottawa', 'North America'], ['France', 'Paris', 'Europe'], ['Japan', 'Tokyo', 'Asia'],
  ['United Kingdom', 'London', 'Europe'], ['Italy', 'Rome', 'Europe'], ['Spain', 'Madrid', 'Europe'],
  ['Germany', 'Berlin', 'Europe'], ['Brazil', 'Brasília', 'South America'], ['Australia', 'Canberra', 'Australia/Oceania'],
  ['Mexico', 'Mexico City', 'North America'], ['India', 'New Delhi', 'Asia'], ['China', 'Beijing', 'Asia'],
  ['South Korea', 'Seoul', 'Asia'], ['Egypt', 'Cairo', 'Africa'], ['Argentina', 'Buenos Aires', 'South America'],
  ['Greece', 'Athens', 'Europe'], ['Portugal', 'Lisbon', 'Europe'], ['Norway', 'Oslo', 'Europe'],
  ['Sweden', 'Stockholm', 'Europe'], ['Poland', 'Warsaw', 'Europe'], ['Turkey', 'Ankara', 'Asia/Europe'],
  ['Thailand', 'Bangkok', 'Asia'], ['Kenya', 'Nairobi', 'Africa'], ['Peru', 'Lima', 'South America'],
  ['Chile', 'Santiago', 'South America'], ['Ireland', 'Dublin', 'Europe'], ['Netherlands', 'Amsterdam', 'Europe'],
  ['Austria', 'Vienna', 'Europe'], ['Switzerland', 'Bern', 'Europe'], ['Belgium', 'Brussels', 'Europe'],
  ['Finland', 'Helsinki', 'Europe'], ['Denmark', 'Copenhagen', 'Europe'], ['New Zealand', 'Wellington', 'Australia/Oceania'],
  ['Morocco', 'Rabat', 'Africa'], ['Colombia', 'Bogotá', 'South America'], ['Vietnam', 'Hanoi', 'Asia'],
  ['Philippines', 'Manila', 'Asia'], ['Indonesia', 'Jakarta', 'Asia'], ['Malaysia', 'Kuala Lumpur', 'Asia'],
  ['Iceland', 'Reykjavík', 'Europe'], ['Hungary', 'Budapest', 'Europe'], ['Czech Republic', 'Prague', 'Europe'],
  ['Romania', 'Bucharest', 'Europe'], ['Ukraine', 'Kyiv', 'Europe'], ['Nigeria', 'Abuja', 'Africa'],
  ['South Africa', 'Pretoria', 'Africa'], ['Saudi Arabia', 'Riyadh', 'Asia'], ['Israel', 'Jerusalem', 'Asia'],
  ['Cuba', 'Havana', 'North America'], ['Jamaica', 'Kingston', 'North America'], ['Costa Rica', 'San José', 'North America'],
  ['Ecuador', 'Quito', 'South America'], ['Norway', 'Oslo', 'Europe'], ['Pakistan', 'Islamabad', 'Asia'],
  ['Bangladesh', 'Dhaka', 'Asia'], ['Ethiopia', 'Addis Ababa', 'Africa'],
];

const buildGeographyPool = () => {
  const pool = GEO_CURATED.map((i) => toMCQ(i.q, i.a, i.d));
  const allCapitals = WORLD_CAPITALS.map(([, cap]) => cap);
  const allCountries = WORLD_CAPITALS.map(([c]) => c);
  const continents = ['North America', 'South America', 'Europe', 'Asia', 'Africa', 'Australia/Oceania'];

  WORLD_CAPITALS.forEach(([country, capital, continent], idx) => {
    pool.push(toMCQ(`What is the capital city of ${country}?`, capital, pickDistractors(capital, allCapitals)));
    if (idx < 45) {
      pool.push(toMCQ(`${capital} is the capital city of which country?`, country, pickDistractors(country, allCountries)));
    }
    if (idx < 25 && !continent.includes('/')) {
      pool.push(toMCQ(`On which continent is ${country} located?`, continent, pickDistractors(continent, continents)));
    }
  });

  return pool;
};

// --- History Bank + Procedural Generators (120+ questions) ---
const HISTORY_CURATED = [
  { q: 'Which ancient civilization built the pyramids at Giza?', a: 'Ancient Egypt', d: ['Ancient Rome', 'Ancient Greece', 'Maya'] },
  { q: 'Who was the first person to walk on the Moon in 1969?', a: 'Neil Armstrong', d: ['Buzz Aldrin', 'Yuri Gagarin', 'John Glenn'] },
  { q: 'What invention by Johannes Gutenberg revolutionized the spread of books?', a: 'The printing press', d: ['The steam engine', 'The telegraph', 'The compass'] },
  { q: 'Which ship carried the Pilgrims to North America in 1620?', a: 'Mayflower', d: ['Titanic', 'Santa Maria', 'Endeavour'] },
  { q: 'In which city was the Declaration of Independence signed in 1776?', a: 'Philadelphia', d: ['Boston', 'New York', 'Washington, D.C.'] },
  { q: 'What wall divided Berlin from 1961 until 1989?', a: 'Berlin Wall', d: ['Great Wall', 'Hadrian’s Wall', 'Western Wall'] },
  { q: 'Which empire was ruled by Julius Caesar as dictator?', a: 'Roman Republic / Empire', d: ['Ottoman Empire', 'Persian Empire', 'British Empire'] },
  { q: 'What trade route connected China with the Mediterranean world?', a: 'The Silk Road', d: ['The Spice Sea', 'The Amber Path', 'The Gold Trail'] },
  { q: 'Which global conflict lasted from 1939 to 1945?', a: 'World War II', d: ['World War I', 'The Cold War', 'The Crimean War'] },
  { q: 'Which global conflict lasted from 1914 to 1918?', a: 'World War I', d: ['World War II', 'The Seven Years’ War', 'The Korean War'] },
  { q: 'Which ancient Greek city-state is known as the birthplace of democracy?', a: 'Athens', d: ['Sparta', 'Corinth', 'Thebes'] },
  { q: 'In what year did the Titanic sink?', a: '1912', d: ['1901', '1925', '1939'] },
  { q: 'Who was the first female pilot to fly solo across the Atlantic Ocean?', a: 'Amelia Earhart', d: ['Sally Ride', 'Bessie Coleman', 'Harriet Quimby'] },
  { q: 'Which Renaissance artist painted the ceiling of the Sistine Chapel?', a: 'Michelangelo', d: ['Leonardo da Vinci', 'Raphael', 'Donatello'] },
  { q: 'Which Renaissance polymath painted the "Mona Lisa"?', a: 'Leonardo da Vinci', d: ['Michelangelo', 'Galileo Galilei', 'Botticelli'] },
  { q: 'Which explorer’s expedition completed the first circumnavigation of the Earth?', a: 'Ferdinand Magellan', d: ['Christopher Columbus', 'Vasco da Gama', 'James Cook'] },
  { q: 'What ancient structure in China was built over centuries to protect northern borders?', a: 'Great Wall of China', d: ['Forbidden City', 'Terracotta Army', 'Silk Tower'] },
  { q: 'Which ancient civilization built Machu Picchu in the Andes?', a: 'Inca', d: ['Aztec', 'Maya', 'Olmec'] },
  { q: 'Which medieval document signed in 1215 limited the power of the English king?', a: 'Magna Carta', d: ['Treaty of Versailles', 'Bill of Rights', 'Code of Hammurabi'] },
  { q: 'In which country did the Industrial Revolution begin in the 1700s?', a: 'Great Britain', d: ['France', 'Germany', 'United States'] },
];

const INVENTIONS = [
  ['telephone', 'Alexander Graham Bell'], ['practical light bulb', 'Thomas Edison'],
  ['airplane (first powered flight)', 'Wright brothers'], ['printing press', 'Johannes Gutenberg'],
  ['radio telegraphy', 'Guglielmo Marconi'], ['World Wide Web', 'Tim Berners-Lee'],
  ['penicillin (antibiotic)', 'Alexander Fleming'], ['smallpox vaccine', 'Edward Jenner'],
  ['polio vaccine', 'Jonas Salk'], ['steam engine (improved)', 'James Watt'],
  ['cotton gin', 'Eli Whitney'], ['telegraph', 'Samuel Morse'],
  ['alternating current motor', 'Nikola Tesla'], ['theory of relativity', 'Albert Einstein'],
  ['laws of motion and gravity', 'Isaac Newton'], ['theory of evolution by natural selection', 'Charles Darwin'],
  ['radioactivity research (radium & polonium)', 'Marie Curie'], ['telescope improvements for astronomy', 'Galileo Galilei'],
  ['dynamite', 'Alfred Nobel'], ['assembly line mass production (Model T)', 'Henry Ford'],
];

const HISTORICAL_DATES = [
  ['World War I began', '1914'], ['World War I ended', '1918'],
  ['World War II began', '1939'], ['World War II ended', '1945'],
  ['The Apollo 11 Moon landing took place', '1969'], ['The Berlin Wall fell', '1989'],
  ['The United Nations was founded', '1945'], ['The Wright brothers flew at Kitty Hawk', '1903'],
  ['Christopher Columbus reached the Americas', '1492'], ['The French Revolution began', '1789'],
  ['The Magna Carta was sealed', '1215'], ['The Sputnik 1 satellite was launched', '1957'],
  ['The Euro currency was introduced as an accounting currency', '1999'], ['The Titanic sank', '1912'],
  ['India gained independence', '1947'], ['Canada became a confederation', '1867'],
];

const HISTORICAL_LEADERS = [
  ['Nelson Mandela', 'First Black President of South Africa and anti-apartheid leader'],
  ['Mahatma Gandhi', 'Leader of India’s nonviolent independence movement'],
  ['Cleopatra', 'Last active ruler of the Ptolemaic Kingdom of Egypt'],
  ['Queen Elizabeth I', 'English monarch during the Elizabethan Golden Age'],
  ['Napoleon Bonaparte', 'French military leader and Emperor in the early 1800s'],
  ['Winston Churchill', 'British Prime Minister during most of World War II'],
  ['Joan of Arc', 'French heroine during the Hundred Years’ War'],
  ['Genghis Khan', 'Founder and first Great Khan of the Mongol Empire'],
  ['Marco Polo', 'Venetian merchant who traveled through Asia along the Silk Road'],
  ['Harriet Tubman', 'Abolitionist who led enslaved people to freedom on the Underground Railroad'],
  ['Rosa Parks', 'Civil rights activist whose bus protest sparked the Montgomery Bus Boycott'],
  ['Martin Luther King Jr.', 'Leader of the American Civil Rights Movement'],
];

const buildHistoryPool = () => {
  const pool = HISTORY_CURATED.map((i) => toMCQ(i.q, i.a, i.d));
  const allInventors = INVENTIONS.map(([, p]) => p);
  const allThings = INVENTIONS.map(([t]) => t);

  INVENTIONS.forEach(([thing, person]) => {
    pool.push(toMCQ(`Who is famous for the ${thing}?`, person, pickDistractors(person, allInventors)));
    pool.push(toMCQ(`What is ${person} best known for?`, thing, pickDistractors(thing, allThings)));
  });

  const allDates = HISTORICAL_DATES.map(([, y]) => y);
  const allEvents = HISTORICAL_DATES.map(([e]) => e);
  HISTORICAL_DATES.forEach(([ev, yr]) => {
    pool.push(toMCQ(`In what year did this happen: "${ev}"?`, yr, pickDistractors(yr, allDates)));
    pool.push(toMCQ(`Which historical milestone occurred in ${yr}?`, ev, pickDistractors(ev, allEvents)));
  });

  const allLeaders = HISTORICAL_LEADERS.map(([l]) => l);
  const allRoles = HISTORICAL_LEADERS.map(([, r]) => r);
  HISTORICAL_LEADERS.forEach(([leader, role]) => {
    pool.push(toMCQ(`Who was the "${role}"?`, leader, pickDistractors(leader, allLeaders)));
    pool.push(toMCQ(`How is ${leader} remembered in history?`, role, pickDistractors(role, allRoles)));
  });

  return pool;
};

// --- French Vocab (120 questions: 60 words × 2 directions) ---
const FRENCH_VOCAB = [
  ['Hello', 'Bonjour'], ['Thank you', 'Merci'], ['Goodbye', 'Au revoir'], ['Please', 'S’il vous plaît'],
  ['Yes', 'Oui'], ['No', 'Non'], ['Cat', 'Chat'], ['Dog', 'Chien'], ['Book', 'Livre'], ['School', 'École'],
  ['Red', 'Rouge'], ['Blue', 'Bleu'], ['Green', 'Vert'], ['Yellow', 'Jaune'], ['White', 'Blanc'],
  ['Black', 'Noir'], ['One', 'Un'], ['Two', 'Deux'], ['Three', 'Trois'], ['Four', 'Quatre'],
  ['Five', 'Cinq'], ['Six', 'Six'], ['Seven', 'Sept'], ['Eight', 'Huit'], ['Nine', 'Neuf'],
  ['Ten', 'Dix'], ['Water', 'Eau'], ['Bread', 'Pain'], ['Apple', 'Pomme'], ['House', 'Maison'],
  ['Friend', 'Ami'], ['Sun', 'Soleil'], ['Moon', 'Lune'], ['Star', 'Étoile'], ['Tree', 'Arbre'],
  ['Flower', 'Fleur'], ['Bird', 'Oiseau'], ['Fish', 'Poisson'], ['Horse', 'Cheval'], ['Milk', 'Lait'],
  ['Cheese', 'Fromage'], ['Table', 'Table'], ['Chair', 'Chaise'], ['Window', 'Fenêtre'], ['Door', 'Porte'],
  ['Day', 'Jour'], ['Night', 'Nuit'], ['Morning', 'Matin'], ['Evening', 'Soir'], ['Happy', 'Heureux'],
  ['Big', 'Grand'], ['Small', 'Petit'], ['Good', 'Bon'], ['Hot', 'Chaud'], ['Cold', 'Froid'],
  ['Music', 'Musique'], ['City', 'Ville'], ['Train', 'Train'], ['Car', 'Voiture'], ['Bicycle', 'Vélo'],
];

const buildFrenchPool = () => {
  const pool = [];
  const allFrench = FRENCH_VOCAB.map(([, fr]) => fr);
  const allEnglish = FRENCH_VOCAB.map(([en]) => en);
  FRENCH_VOCAB.forEach(([en, fr]) => {
    pool.push(toMCQ(`How do you say "${en}" in French?`, fr, pickDistractors(fr, allFrench)));
    pool.push(toMCQ(`What does the French word "${fr}" mean in English?`, en, pickDistractors(en, allEnglish)));
  });
  return pool;
};

// --- US History Bank + Procedural Generators (120+ questions) ---
const US_HISTORY_CURATED = [
  { q: 'Who was the first President of the United States?', a: 'George Washington', d: ['Thomas Jefferson', 'Abraham Lincoln', 'John Adams'] },
  { q: 'On which date is Independence Day celebrated in the USA?', a: 'July 4', d: ['May 1', 'November 11', 'January 1'] },
  { q: 'Which President issued the Emancipation Proclamation in 1863?', a: 'Abraham Lincoln', d: ['Andrew Jackson', 'Ulysses S. Grant', 'Theodore Roosevelt'] },
  { q: 'What are the first ten amendments to the U.S. Constitution called?', a: 'The Bill of Rights', d: ['The Federalist Papers', 'The Articles of Confederation', 'The Magna Carta'] },
  { q: 'Which country gifted the Statue of Liberty to the United States?', a: 'France', d: ['United Kingdom', 'Spain', 'Italy'] },
  { q: 'Who gave the famous "I Have a Dream" speech in 1963?', a: 'Martin Luther King Jr.', d: ['Rosa Parks', 'Frederick Douglass', 'Malcolm X'] },
  { q: 'How many original colonies formed the United States?', a: '13', d: ['10', '15', '50'] },
  { q: 'Which war was fought between the Northern and Southern states from 1861 to 1865?', a: 'The American Civil War', d: ['The Revolutionary War', 'The War of 1812', 'World War I'] },
  { q: 'What is the capital city of the United States?', a: 'Washington, D.C.', d: ['New York City', 'Philadelphia', 'Boston'] },
  { q: 'Which movement fought for women’s right to vote in the US?', a: 'Women’s suffrage movement', d: ['Gold Rush', 'Industrial Revolution', 'Space Race'] },
  { q: 'Who was the principal author of the Declaration of Independence?', a: 'Thomas Jefferson', d: ['James Madison', 'John Adams', 'Benjamin Franklin'] },
  { q: 'In what year did the United States declare independence?', a: '1776', d: ['1789', '1812', '1865'] },
  { q: 'Which 1803 land purchase doubled the size of the United States?', a: 'Louisiana Purchase', d: ['Alaska Purchase', 'Gadsden Purchase', 'Oregon Treaty'] },
  { q: 'Who was the U.S. President during the Great Depression and most of World War II?', a: 'Franklin D. Roosevelt', d: ['Herbert Hoover', 'Harry S. Truman', 'Dwight D. Eisenhower'] },
  { q: 'What protest in 1773 involved dumping tea into Boston Harbor?', a: 'Boston Tea Party', d: ['Stamp Act Congress', 'Shays’ Rebellion', 'Whiskey Rebellion'] },
];

const US_PRESIDENTS = [
  ['1st', 'George Washington'], ['2nd', 'John Adams'], ['3rd', 'Thomas Jefferson'],
  ['4th', 'James Madison'], ['5th', 'James Monroe'], ['7th', 'Andrew Jackson'],
  ['16th', 'Abraham Lincoln'], ['18th', 'Ulysses S. Grant'], ['26th', 'Theodore Roosevelt'],
  ['28th', 'Woodrow Wilson'], ['32nd', 'Franklin D. Roosevelt'], ['33rd', 'Harry S. Truman'],
  ['34th', 'Dwight D. Eisenhower'], ['35th', 'John F. Kennedy'], ['36th', 'Lyndon B. Johnson'],
  ['40th', 'Ronald Reagan'], ['44th', 'Barack Obama'],
];

const US_STATES_CAPITALS = [
  ['California', 'Sacramento'], ['Texas', 'Austin'], ['Florida', 'Tallahassee'],
  ['New York', 'Albany'], ['Illinois', 'Springfield'], ['Pennsylvania', 'Harrisburg'],
  ['Ohio', 'Columbus'], ['Georgia', 'Atlanta'], ['North Carolina', 'Raleigh'],
  ['Michigan', 'Lansing'], ['Virginia', 'Richmond'], ['Washington', 'Olympia'],
  ['Arizona', 'Phoenix'], ['Massachusetts', 'Boston'], ['Tennessee', 'Nashville'],
  ['Colorado', 'Denver'], ['Minnesota', 'Saint Paul'], ['Wisconsin', 'Madison'],
  ['Oregon', 'Salem'], ['Nevada', 'Carson City'], ['Utah', 'Salt Lake City'],
  ['Hawaii', 'Honolulu'], ['Alaska', 'Juneau'], ['Maine', 'Augusta'],
  ['Vermont', 'Montpelier'], ['New Mexico', 'Santa Fe'], ['Montana', 'Helena'],
  ['Idaho', 'Boise'], ['Wyoming', 'Cheyenne'], ['North Dakota', 'Bismarck'],
  ['South Dakota', 'Pierre'], ['Nebraska', 'Lincoln'], ['Kansas', 'Topeka'],
  ['Oklahoma', 'Oklahoma City'], ['Louisiana', 'Baton Rouge'], ['Kentucky', 'Frankfort'],
];

const US_AMENDMENTS = [
  ['1st Amendment', 'Protects freedom of speech, religion, press, and assembly'],
  ['13th Amendment', 'Abolished slavery in the United States'],
  ['14th Amendment', 'Granted citizenship and equal protection under the law'],
  ['15th Amendment', 'Prohibited denying voting rights based on race'],
  ['19th Amendment', 'Guaranteed women the right to vote'],
  ['26th Amendment', 'Lowered the national voting age to 18'],
];

const buildUSHistoryPool = () => {
  const pool = US_HISTORY_CURATED.map((i) => toMCQ(i.q, i.a, i.d));
  const presNames = US_PRESIDENTS.map(([, n]) => n);
  US_PRESIDENTS.forEach(([ord, name]) => {
    pool.push(toMCQ(`Who served as the ${ord} President of the United States?`, name, pickDistractors(name, presNames)));
  });

  const stateCaps = US_STATES_CAPITALS.map(([, c]) => c);
  const stateNames = US_STATES_CAPITALS.map(([s]) => s);
  US_STATES_CAPITALS.forEach(([st, cap]) => {
    pool.push(toMCQ(`What is the capital of the U.S. state of ${st}?`, cap, pickDistractors(cap, stateCaps)));
    pool.push(toMCQ(`${cap} is the capital of which U.S. state?`, st, pickDistractors(st, stateNames)));
  });

  const amendNames = US_AMENDMENTS.map(([a]) => a);
  const amendDescs = US_AMENDMENTS.map(([, d]) => d);
  US_AMENDMENTS.forEach(([amend, desc]) => {
    pool.push(toMCQ(`Which U.S. Constitutional amendment "${desc}"?`, amend, pickDistractors(amend, amendNames), 5, 12));
    pool.push(toMCQ(`What did the ${amend} to the U.S. Constitution do?`, desc, pickDistractors(desc, amendDescs), 5, 12));
  });

  return pool;
};

// --- Combinatorial Custom Subject Generator (128+ unique questions) ---
const CUSTOM_ANGLES = [
  {
    stem: (sub, topic, grade) => `In ${sub} (${grade}), why is ${topic} important?`,
    a: (topic) => `It builds a strong foundation for understanding ${topic}`,
    d: ['It makes studying harder on purpose', 'It is only meant to be memorized and forgotten', 'It prevents asking questions'],
  },
  {
    stem: (sub, topic) => `What is the best way to practice ${topic} in ${sub}?`,
    a: (topic) => `Apply ${topic} to small examples and check your results`,
    d: ['Skip the examples and guess', 'Never review mistakes', 'Rush without reading instructions'],
  },
  {
    stem: (sub, topic) => `When you encounter a tough problem about ${topic} in ${sub}, what should you do first?`,
    a: () => 'Break the problem into smaller, manageable steps',
    d: ['Quit immediately', 'Ignore the key details', 'Pick an answer without thinking'],
  },
  {
    stem: (sub, topic) => `How can you tell you have mastered ${topic} in ${sub}?`,
    a: (topic) => `You can explain ${topic} clearly in your own words`,
    d: ['You only glanced at the title', 'You avoided every practice question', 'You memorized one word without context'],
  },
  {
    stem: (sub, topic) => `Which habit helps most when reviewing ${topic} for ${sub}?`,
    a: () => 'Testing yourself and reviewing any errors carefully',
    d: ['Cramming for 30 seconds before class', 'Hiding your notes', 'Skipping feedback'],
  },
  {
    stem: (sub, topic) => `When collaborating with a classmate on ${topic} in ${sub}, what works best?`,
    a: () => 'Share ideas, listen actively, and compare reasoning',
    d: ['Refuse to listen to others', 'Copy answers without discussing', 'Ignore the goal of the activity'],
  },
  {
    stem: (sub, topic) => `If you make a mistake while learning ${topic} in ${sub}, what is the smartest response?`,
    a: () => 'Identify why the mistake happened and try again',
    d: ['Hide the mistake and move on', 'Assume you can never learn it', 'Stop practicing altogether'],
  },
  {
    stem: (sub, topic) => `How does connecting ${topic} to everyday life help in ${sub}?`,
    a: () => 'It makes abstract ideas easier to remember and apply',
    d: ['It distracts from learning anything', 'It removes the need to practice', 'It makes concepts more confusing'],
  },
];

const CUSTOM_TOPICS = [
  'core concepts', 'key vocabulary', 'problem solving', 'real-world examples',
  'step-by-step reasoning', 'pattern recognition', 'critical thinking', 'team projects',
  'experimentation', 'checking your work', 'cause and effect', 'organizing ideas',
  'asking good questions', 'comparing methods', 'creative design', 'time management',
];

const buildCustomPool = (subject, grade) => {
  const pool = [];
  CUSTOM_TOPICS.forEach((topic) => {
    CUSTOM_ANGLES.forEach((angle) => {
      pool.push(toMCQ(angle.stem(subject, topic, grade), angle.a(topic), angle.d));
    });
  });
  return pool;
};

// --- Art, Music, P.E., Coding, Health Banks + Procedural Expanders ---
const ART_CURATED = [
  { q: 'Which three colors are the traditional primary colors in painting?', a: 'Red, Yellow, Blue', d: ['Green, Orange, Purple', 'Black, White, Gray', 'Pink, Brown, Cyan'] },
  { q: 'Mixing red and yellow paint creates which color?', a: 'Orange', d: ['Green', 'Purple', 'Brown'] },
  { q: 'Mixing blue and yellow paint creates which color?', a: 'Green', d: ['Purple', 'Orange', 'Red'] },
  { q: 'Mixing red and blue paint creates which color?', a: 'Purple', d: ['Green', 'Orange', 'Yellow'] },
  { q: 'Who painted the "Mona Lisa"?', a: 'Leonardo da Vinci', d: ['Vincent van Gogh', 'Pablo Picasso', 'Claude Monet'] },
  { q: 'Who painted "The Starry Night"?', a: 'Vincent van Gogh', d: ['Salvador Dalí', 'Michelangelo', 'Frida Kahlo'] },
  { q: 'What do you call a picture of a person?', a: 'Portrait', d: ['Landscape', 'Still life', 'Abstract'] },
  { q: 'What do you call a painting of outdoor scenery like mountains or trees?', a: 'Landscape', d: ['Portrait', 'Caricature', 'Mosaic'] },
  { q: 'Adding white to a color makes a lighter version called a:', a: 'Tint', d: ['Shade', 'Contrast', 'Hue'] },
  { q: 'Adding black to a color makes a darker version called a:', a: 'Shade', d: ['Tint', 'Highlight', 'Pastel'] },
  { q: 'What Japanese art involves folding paper into decorative shapes?', a: 'Origami', d: ['Mosaic', 'Fresco', 'Etching'] },
  { q: 'What do you call art made by arranging small pieces of colored glass or tile?', a: 'Mosaic', d: ['Charcoal', 'Watercolor', 'Printmaking'] },
  { q: 'Which art form involves shaping clay, stone, or metal in 3D?', a: 'Sculpture', d: ['Sketching', 'Calligraphy', 'Origami'] },
  { q: 'What do you call a painting of inanimate objects like fruit or flowers?', a: 'Still life', d: ['Portrait', 'Landscape', 'Self-portrait'] },
];

const ART_TERMS = [
  ['Warm colors', 'Red, orange, and yellow'], ['Cool colors', 'Blue, green, and purple'],
  ['Complementary colors', 'Colors opposite each other on the color wheel'],
  ['Symmetry', 'Balanced proportions where two halves mirror each other'],
  ['Perspective', 'Technique used to show depth and 3D distance on a flat surface'],
  ['Silhouette', 'A dark shape or outline of a subject against a lighter background'],
  ['Calligraphy', 'Decorative handwriting or artistic lettering'],
  ['Collage', 'Art made by gluing paper, photos, or fabric onto a surface'],
  ['Kiln', 'High-temperature oven used to bake clay pottery'],
  ['Easel', 'Upright stand used to hold a canvas while painting'],
  ['Palette', 'Flat board where a painter mixes colors'],
  ['Sketch', 'Quick, rough drawing used to plan a piece of art'],
  ['Texture', 'How a surface feels or looks like it would feel'],
  ['Contrast', 'Strong difference between light and dark or opposite elements'],
  ['Horizon line', 'Where the sky appears to meet the ground in a drawing'],
];

const buildArtPool = () => {
  const pool = ART_CURATED.map((i) => toMCQ(i.q, i.a, i.d));
  const allTerms = ART_TERMS.map(([t]) => t);
  const allDefs = ART_TERMS.map(([, d]) => d);
  ART_TERMS.forEach(([term, def]) => {
    pool.push(toMCQ(`In art, what does "${term}" refer to?`, def, pickDistractors(def, allDefs)));
    pool.push(toMCQ(`Which art term means: "${def}"?`, term, pickDistractors(term, allTerms)));
  });
  return [...pool, ...buildCustomPool('Art', 'all grades')];
};

const MUSIC_CURATED = [
  { q: 'How many beats does a whole note usually get in 4/4 time?', a: '4 beats', d: ['1 beat', '2 beats', '3 beats'] },
  { q: 'How many beats does a half note usually get in 4/4 time?', a: '2 beats', d: ['1 beat', '3 beats', '4 beats'] },
  { q: 'How many beats does a quarter note usually get in 4/4 time?', a: '1 beat', d: ['2 beats', '4 beats', 'Half a beat'] },
  { q: 'How many lines are on a standard musical staff?', a: '5', d: ['4', '6', '8'] },
  { q: 'Which instrument has 88 black and white keys?', a: 'Piano', d: ['Guitar', 'Clarinet', 'Cello'] },
  { q: 'What is the speed of a piece of music called?', a: 'Tempo', d: ['Pitch', 'Harmony', 'Melody'] },
  { q: 'What symbol raises a note by a half step?', a: 'Sharp (#)', d: ['Flat (b)', 'Rest', 'Clef'] },
  { q: 'What symbol lowers a note by a half step?', a: 'Flat (b)', d: ['Sharp (#)', 'Natural', 'Fermata'] },
  { q: 'What do you call a symbol that indicates silence in music?', a: 'Rest', d: ['Chord', 'Scale', 'Measure'] },
  { q: 'A group of four musicians playing together is called a:', a: 'Quartet', d: ['Duet', 'Trio', 'Solo'] },
  { q: 'A group of two musicians playing together is called a:', a: 'Duet', d: ['Trio', 'Quartet', 'Choir'] },
  { q: 'A group of three musicians playing together is called a:', a: 'Trio', d: ['Duet', 'Quartet', 'Solo'] },
];

const INSTRUMENTS = [
  ['Flute', 'Woodwind'], ['Clarinet', 'Woodwind'], ['Oboe', 'Woodwind'], ['Saxophone', 'Woodwind'],
  ['Trumpet', 'Brass'], ['Trombone', 'Brass'], ['Tuba', 'Brass'], ['French horn', 'Brass'],
  ['Violin', 'Strings'], ['Viola', 'Strings'], ['Cello', 'Strings'], ['Harp', 'Strings'],
  ['Snare drum', 'Percussion'], ['Xylophone', 'Percussion'], ['Tambourine', 'Percussion'], ['Cymbals', 'Percussion'],
];

const MUSIC_TERMS = [
  ['Forte (f)', 'Play loudly'], ['Piano (p)', 'Play softly'],
  ['Crescendo', 'Gradually get louder'], ['Decrescendo', 'Gradually get softer'],
  ['Allegro', 'Fast and lively tempo'], ['Adagio', 'Slow tempo'],
  ['Melody', 'The main tune of a song'], ['Harmony', 'Two or more notes played together'],
  ['Rhythm', 'The pattern of long and short sounds in time'], ['Treble clef', 'Clef used for higher-pitched notes'],
];

const buildMusicPool = () => {
  const pool = MUSIC_CURATED.map((i) => toMCQ(i.q, i.a, i.d));
  const families = ['Woodwind', 'Brass', 'Strings', 'Percussion'];
  INSTRUMENTS.forEach(([inst, fam]) => {
    pool.push(toMCQ(`Which instrument family does the ${inst} belong to?`, fam, pickDistractors(fam, families)));
  });
  const allTerms = MUSIC_TERMS.map(([t]) => t);
  const allDefs = MUSIC_TERMS.map(([, d]) => d);
  MUSIC_TERMS.forEach(([term, def]) => {
    pool.push(toMCQ(`What does "${term}" mean in music?`, def, pickDistractors(def, allDefs)));
    pool.push(toMCQ(`Which musical term means "${def}"?`, term, pickDistractors(term, allTerms)));
  });
  return [...pool, ...buildCustomPool('Music', 'all grades')];
};

const PE_CURATED = [
  { q: 'Why is warming up before exercise important?', a: 'It prepares muscles and helps prevent injury', d: ['It makes you tired faster', 'It replaces drinking water', 'It stops your heart from beating'] },
  { q: 'Which nutrient is most important for staying hydrated during sports?', a: 'Water', d: ['Sugar', 'Salt only', 'Caffeine'] },
  { q: 'What does aerobic exercise mainly strengthen?', a: 'Heart and lungs', d: ['Fingernails', 'Hair', 'Teeth'] },
  { q: 'Showing respect for teammates, opponents, and referees is called:', a: 'Sportsmanship', d: ['Offside', 'Foul play', 'Timeout'] },
  { q: 'Which activity is best for improving flexibility?', a: 'Stretching', d: ['Sprinting', 'Heavy lifting only', 'Sitting'] },
  { q: 'What should you do after intense exercise to gradually lower your heart rate?', a: 'Cool down', d: ['Sprint harder', 'Skip water', 'Lie down immediately without moving'] },
  { q: 'In soccer, which player is allowed to use their hands inside their own penalty box?', a: 'Goalkeeper', d: ['Striker', 'Defender', 'Midfielder'] },
  { q: 'Which sport uses a shuttlecock?', a: 'Badminton', d: ['Tennis', 'Squash', 'Pickleball'] },
  { q: 'In baseball, how many strikes result in a strikeout?', a: '3', d: ['2', '4', '5'] },
  { q: 'In volleyball, how many hits is a team allowed before sending the ball over the net?', a: '3', d: ['1', '2', '5'] },
];

const SPORT_PLAYERS = [
  ['Basketball', '5'], ['Soccer', '11'], ['Baseball', '9'], ['Ice hockey', '6'], ['Volleyball', '6'],
];

const buildPEPool = () => {
  const pool = PE_CURATED.map((i) => toMCQ(i.q, i.a, i.d));
  const counts = ['5', '6', '9', '11', '7', '15'];
  SPORT_PLAYERS.forEach(([sport, num]) => {
    pool.push(toMCQ(`How many players from one team are on the field/court at once in ${sport}?`, num, pickDistractors(num, counts)));
  });
  return [...pool, ...buildCustomPool('P.E.', 'all grades')];
};

const CODING_TERMS = [
  ['Variable', 'A named container that stores a value in memory'],
  ['Loop', 'A control structure that repeats a block of code'],
  ['Function', 'A reusable block of code that performs a specific task'],
  ['Conditional (if/else)', 'A statement that runs code only when a condition is true'],
  ['Array / List', 'An ordered collection of items stored under one name'],
  ['Boolean', 'A data type with only two values: true or false'],
  ['String', 'A sequence of text characters enclosed in quotes'],
  ['Integer', 'A whole number without a decimal point'],
  ['Bug', 'An error or flaw in a program that causes unexpected behavior'],
  ['Debugging', 'The process of finding and fixing errors in code'],
  ['Algorithm', 'A step-by-step set of instructions to solve a problem'],
  ['Comment', 'A note in code ignored by the computer, written for humans'],
  ['API', 'An interface that lets two software programs communicate'],
  ['HTML', 'The standard language used to structure web pages'],
  ['CSS', 'The language used to style the appearance of web pages'],
  ['Binary', 'A base-2 number system using only 0s and 1s'],
  ['Bit', 'The smallest unit of data in computing (0 or 1)'],
  ['Byte', 'A group of 8 bits'],
];

const buildCodingPool = () => {
  const pool = [];
  const allTerms = CODING_TERMS.map(([t]) => t);
  const allDefs = CODING_TERMS.map(([, d]) => d);
  CODING_TERMS.forEach(([term, def]) => {
    pool.push(toMCQ(`In coding, what is a "${term}"?`, def, pickDistractors(def, allDefs), 4, 12));
    pool.push(toMCQ(`Which programming term means: "${def}"?`, term, pickDistractors(term, allTerms), 4, 12));
  });
  return [...pool, ...buildCustomPool('Coding', 'all grades')];
};

const HEALTH_FACTS = [
  ['Vitamin C', 'Helps heal wounds and supports the immune system (found in citrus fruits)'],
  ['Calcium', 'Builds strong bones and teeth (found in milk and leafy greens)'],
  ['Protein', 'Helps build and repair muscles and body tissues'],
  ['Carbohydrates', 'Provide the body’s main source of quick energy'],
  ['Sleep', 'Helps the brain store memories and the body recover (8–11 hours for students)'],
  ['Handwashing', 'One of the best ways to stop the spread of germs'],
  ['Sunscreen', 'Protects skin from harmful UV rays outdoors'],
  ['Fiber', 'Supports healthy digestion (found in whole grains, fruits, and vegetables)'],
  ['Dental brushing', 'Removes plaque and prevents cavities when done twice a day'],
  ['Balanced meal', 'Includes fruits, vegetables, grains, and protein'],
];

const buildHealthPool = () => {
  const pool = [];
  const allNames = HEALTH_FACTS.map(([n]) => n);
  const allDescs = HEALTH_FACTS.map(([, d]) => d);
  HEALTH_FACTS.forEach(([name, desc]) => {
    pool.push(toMCQ(`In health & nutrition, what does "${name}" do?`, desc, pickDistractors(desc, allDescs)));
    pool.push(toMCQ(`Which health habit or nutrient: "${desc}"?`, name, pickDistractors(name, allNames)));
  });
  return [...pool, ...buildCustomPool('Health', 'all grades')];
};

const buildSubjectPool = (subject, grade) => {
  switch (subject) {
    case 'Science':
      return buildSciencePool();
    case 'Language Arts':
      return buildLanguageArtsPool();
    case 'Geography':
      return buildGeographyPool();
    case 'History':
      return buildHistoryPool();
    case 'French':
      return buildFrenchPool();
    case 'US History':
      return buildUSHistoryPool();
    case 'Art':
      return buildArtPool();
    case 'Music':
      return buildMusicPool();
    case 'P.E.':
      return buildPEPool();
    case 'Coding':
      return buildCodingPool();
    case 'Health':
      return buildHealthPool();
    default:
      return buildCustomPool(subject, grade);
  }
};

export function generateLocalQuiz(subject, grade, country, length) {
  const count = Number(length) || 10;
  const gradeNum = parseGradeNum(grade);
  const lang = getLanguageFromCountry(country);
  const askedMap = loadAskedMap();
  const prevAsked = new Set(Array.isArray(askedMap[subject]) ? askedMap[subject] : []);
  const seenThisQuiz = new Set();
  const questions = [];

  if (subject === 'Math') {
    let attempts = 0;
    while (questions.length < count && attempts < count * 60) {
      attempts++;
      const q = makeMathQuestion(gradeNum, attempts, lang);
      if (!seenThisQuiz.has(q.question) && !prevAsked.has(q.question)) {
        seenThisQuiz.add(q.question);
        questions.push(q);
      }
    }
    if (questions.length < count) {
      prevAsked.clear();
      while (questions.length < count && attempts < count * 100) {
        attempts++;
        const q = makeMathQuestion(gradeNum, attempts, lang);
        if (!seenThisQuiz.has(q.question)) {
          seenThisQuiz.add(q.question);
          questions.push(q);
        }
      }
    }
    askedMap[subject] = Array.from(new Set([...prevAsked, ...seenThisQuiz])).slice(-300);
    saveAskedMap(askedMap);
    return questions;
  }

  const rawPool = buildSubjectPool(subject, grade);
  // Prioritize questions appropriate for the student's grade level, then adjacent levels if more are needed
  const gradeMatched = shuffle(rawPool.filter((q) => gradeNum >= (q.minGrade ?? 0) && gradeNum <= (q.maxGrade ?? 12)));
  const remainingTier = shuffle(rawPool.filter((q) => !(gradeNum >= (q.minGrade ?? 0) && gradeNum <= (q.maxGrade ?? 12))));
  const fullPool = [...gradeMatched, ...remainingTier];
  const freshPool = fullPool.filter((q) => !prevAsked.has(q.question));

  for (const q of freshPool) {
    if (questions.length >= count) break;
    if (!seenThisQuiz.has(q.question)) {
      seenThisQuiz.add(q.question);
      questions.push(q);
    }
  }

  // Only reset subject history after exhausting all unseen questions in the 120+ bank
  let nextHistory = [...prevAsked, ...seenThisQuiz];
  if (questions.length < count) {
    nextHistory = Array.from(seenThisQuiz);
    for (const q of fullPool) {
      if (questions.length >= count) break;
      if (!seenThisQuiz.has(q.question)) {
        seenThisQuiz.add(q.question);
        nextHistory.push(q.question);
        questions.push(q);
      }
    }
  }

  askedMap[subject] = nextHistory;
  saveAskedMap(askedMap);
  return questions;
}

export function generateLocalFeedback(grade, subject, correctCount, total, mistakes, rightAnswers = []) {
  const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  let perk = '';

  if (pct >= 80) {
    perk = `Awesome job on your ${grade} ${subject} quiz! You answered ${correctCount} out of ${total} (${pct}%) correctly and showed strong understanding.`;
  } else if (pct >= 50) {
    perk = `Good effort on your ${grade} ${subject} quiz! You got ${correctCount} out of ${total} (${pct}%) right, which is a solid foundation to build on.`;
  } else {
    perk = `Nice try finishing your ${grade} ${subject} quiz! Every question you practice helps your brain grow stronger—keep going!`;
  }

  const rightSection =
    rightAnswers.length > 0
      ? `\n\nWHAT YOU GOT RIGHT (${rightAnswers.length}):\n` +
        rightAnswers
          .map((r, i) => `${i + 1}. "${r.question}" — You selected "${r.userAnswer}" (Correct!)`)
          .join('\n')
      : '';

  const improveSection =
    mistakes.length > 0
      ? `\n\nHERE ARE THINGS YOU CAN IMPROVE (${mistakes.length}):\n` +
        mistakes
          .map(
            (m, i) =>
              `${i + 1}. "${m.question}" — You selected "${m.userAnswer}", but the correct answer was "${m.correctAnswer}".`
          )
          .join('\n')
      : '';

  return `PERKS:\n${perk}${rightSection}${improveSection}`;
}
