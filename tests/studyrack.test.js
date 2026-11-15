import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLocalQuiz, generateLocalFeedback } from '../src/localQuizEngine.js';
import { getLanguageFromCountry, TRANSLATIONS } from '../src/i18n.js';
import { ALL_COUNTRIES } from '../src/countries.js';

// Mock localStorage for Node environment
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

test('ALL_COUNTRIES pins Canada and USA first, then alphabetical', () => {
  assert.equal(ALL_COUNTRIES[0], 'Canada');
  assert.equal(ALL_COUNTRIES[1], 'USA');
  const rest = ALL_COUNTRIES.slice(2);
  const sorted = [...rest].sort((a, b) => a.localeCompare(b));
  assert.deepEqual(rest, sorted);
});

test('getLanguageFromCountry maps 5 supported languages and defaults to en', () => {
  assert.equal(getLanguageFromCountry('Russia'), 'ru');
  assert.equal(getLanguageFromCountry('France'), 'fr');
  assert.equal(getLanguageFromCountry('Spain'), 'es');
  assert.equal(getLanguageFromCountry('China'), 'zh');
  assert.equal(getLanguageFromCountry('USA'), 'en');
  assert.equal(getLanguageFromCountry('Japan'), 'en');
});

test('gradeLabel translates grades across all 5 languages', () => {
  assert.equal(TRANSLATIONS.en.gradeLabel('Grade 3'), 'Grade 3');
  assert.equal(TRANSLATIONS.ru.gradeLabel('Grade 3'), '3 класс');
  assert.equal(TRANSLATIONS.fr.gradeLabel('Grade 1'), '1re année');
  assert.equal(TRANSLATIONS.es.gradeLabel('Grade 5'), 'Grado 5');
  assert.equal(TRANSLATIONS.zh.gradeLabel('Grade 2'), '2 年级');
});

test('generateLocalQuiz produces unique questions across five 20-question quizzes', () => {
  localStorage.clear();
  const asked = new Set();
  for (let i = 0; i < 5; i++) {
    const qs = generateLocalQuiz('Science', 'Grade 6', 'USA', 20);
    assert.equal(qs.length, 20);
    for (const q of qs) {
      assert.equal(q.options.length, 4);
      assert.ok(q.options.includes(q.correctAnswer));
      assert.ok(!asked.has(q.question), `Duplicate question found: ${q.question}`);
      asked.add(q.question);
    }
  }
  assert.equal(asked.size, 100);
});

test('generateLocalQuiz localizes Math prompts for Russia', () => {
  localStorage.clear();
  const qs = generateLocalQuiz('Math', 'Grade 2', 'Russia', 10);
  assert.equal(qs.length, 10);
  const hasCyrillic = qs.some((q) => /[А-Яа-яЁё]/.test(q.question));
  assert.ok(hasCyrillic, 'Expected Russian Math prompt');
});

test('generateLocalFeedback contrasts selected vs correct answers', () => {
  const text = generateLocalFeedback(
    'Grade 4',
    'Science',
    1,
    2,
    [{ question: 'Red planet?', userAnswer: 'Venus', correctAnswer: 'Mars' }],
    [{ question: 'Water boils at?', userAnswer: '100°C' }]
  );
  assert.match(text, /WHAT YOU GOT RIGHT/);
  assert.match(text, /HERE ARE THINGS YOU CAN IMPROVE/);
  assert.match(text, /Venus/);
  assert.match(text, /Mars/);
});
