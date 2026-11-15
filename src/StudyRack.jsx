import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { generateLocalQuiz, generateLocalFeedback } from './localQuizEngine';
import { getLanguageFromCountry, TRANSLATIONS } from './i18n';
import { MinigameRouter } from './Minigames';
import { ALL_COUNTRIES } from './countries';

// --- Local Icons ---
const XIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const PlayIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const AwardIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="8" r="7"></circle>
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
  </svg>
);

const CheckIcon = ({ size = 24, strokeWidth = 2, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

// --- Firebase Initialization (Safe Fallback) ---
let auth = null;
let db = null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-study-rack';

try {
  const rawConfig = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
  const firebaseConfig = rawConfig ? (typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig) : null;
  if (firebaseConfig && firebaseConfig.apiKey) {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (err) {
  console.warn('Firebase initialization skipped:', err);
}

// --- Gemini API Setup ---
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`;

// --- Rack Logo Component ---
const RackLogo = () => (
  <svg width="56" height="56" viewBox="0 0 100 100" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10 L20 90 M80 10 L80 90" />
    <path d="M20 30 L80 30 M20 60 L80 60" />
    <path d="M30 30 L30 15 M45 30 L45 20 M60 30 L60 10" />
    <path d="M40 60 L40 40 M55 60 L55 45 M70 60 L70 35" />
  </svg>
);

// --- Flappy Minigame Component (Enhanced Graphics + Study Rack Logo Character) ---
const FlappyGame = ({ onClose, t }) => {
  const canvasRef = useRef(null);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [gameKey, setGameKey] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animationFrameId;
    let frames = 0;

    const bird = { x: 68, y: 145, width: 28, height: 28, velocity: 0, gravity: 0.42, jump: -7.2 };
    const pipes = [];
    const clouds = [
      { x: 60, y: 45, r: 18 },
      { x: 210, y: 70, r: 22 },
      { x: 340, y: 38, r: 15 },
    ];
    const pipeWidth = 46;
    const pipeGap = 118;
    let currentScore = 0;
    let isGameOver = false;

    const handleJump = () => {
      if (!isGameOver) bird.velocity = bird.jump;
    };

    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleJump();
      }
    };

    const handleTouchStart = (e) => {
      e.preventDefault();
      handleJump();
    };

    window.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('mousedown', handleJump);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

    const drawRackCharacter = (cx, cy, size, tilt) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(tilt);

      // Glowing dark slate badge behind the white rack logo
      ctx.shadowColor = 'rgba(56, 189, 248, 0.85)';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // White outline Rack Logo scaled into [-size/2, size/2]
      const s = size * 0.42;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      // Vertical posts
      ctx.moveTo(-s * 0.65, -s * 0.85);
      ctx.lineTo(-s * 0.65, s * 0.85);
      ctx.moveTo(s * 0.65, -s * 0.85);
      ctx.lineTo(s * 0.65, s * 0.85);
      // Shelves
      ctx.moveTo(-s * 0.65, -s * 0.35);
      ctx.lineTo(s * 0.65, -s * 0.35);
      ctx.moveTo(-s * 0.65, s * 0.3);
      ctx.lineTo(s * 0.65, s * 0.3);
      // Books on top shelf
      ctx.moveTo(-s * 0.35, -s * 0.35);
      ctx.lineTo(-s * 0.35, -s * 0.72);
      ctx.moveTo(0, -s * 0.35);
      ctx.lineTo(0, -s * 0.62);
      ctx.moveTo(s * 0.35, -s * 0.35);
      ctx.lineTo(s * 0.35, -s * 0.82);
      // Books on bottom shelf
      ctx.moveTo(-s * 0.2, s * 0.3);
      ctx.lineTo(-s * 0.2, -s * 0.12);
      ctx.moveTo(s * 0.15, s * 0.3);
      ctx.lineTo(s * 0.15, -s * 0.02);
      ctx.moveTo(s * 0.45, s * 0.3);
      ctx.lineTo(s * 0.45, -s * 0.2);
      ctx.stroke();

      ctx.restore();
    };

    const drawPipe = (x, y, w, h, isTop) => {
      const grad = ctx.createLinearGradient(x, 0, x + w, 0);
      grad.addColorStop(0, '#15803d');
      grad.addColorStop(0.35, '#4ade80');
      grad.addColorStop(1, '#14532d');

      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);

      ctx.strokeStyle = '#052e16';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      // Pipe lip/rim
      const rimH = 14;
      const rimY = isTop ? y + h - rimH : y;
      ctx.fillStyle = grad;
      ctx.fillRect(x - 4, rimY, w + 8, rimH);
      ctx.strokeRect(x - 4, rimY, w + 8, rimH);
    };

    const draw = () => {
      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      skyGrad.addColorStop(0, '#0284c7');
      skyGrad.addColorStop(0.65, '#38bdf8');
      skyGrad.addColorStop(1, '#bae6fd');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Drifting clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      clouds.forEach((c) => {
        c.x -= 0.4;
        if (c.x < -50) c.x = canvas.width + 50;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.arc(c.x + c.r * 0.8, c.y + 4, c.r * 0.75, 0, Math.PI * 2);
        ctx.arc(c.x - c.r * 0.8, c.y + 5, c.r * 0.7, 0, Math.PI * 2);
        ctx.fill();
      });

      // Distant hills
      ctx.fillStyle = '#0ea5e9';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height - 24);
      ctx.quadraticCurveTo(90, canvas.height - 75, 190, canvas.height - 24);
      ctx.quadraticCurveTo(300, canvas.height - 85, canvas.width, canvas.height - 24);
      ctx.fill();

      bird.velocity += bird.gravity;
      bird.y += bird.velocity;

      if (frames % 92 === 0) {
        const minHeight = 42;
        const maxHeight = canvas.height - pipeGap - minHeight - 24;
        const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1) + minHeight);
        pipes.push({ x: canvas.width + 10, topHeight, passed: false });
      }

      for (let i = pipes.length - 1; i >= 0; i--) {
        const p = pipes[i];
        p.x -= 2.8;

        drawPipe(p.x, 0, pipeWidth, p.topHeight, true);
        drawPipe(p.x, p.topHeight + pipeGap, pipeWidth, canvas.height - p.topHeight - pipeGap - 22, false);

        if (
          bird.x < p.x + pipeWidth &&
          bird.x + bird.width > p.x &&
          (bird.y < p.topHeight || bird.y + bird.height > p.topHeight + pipeGap)
        ) {
          isGameOver = true;
        }

        if (p.x + pipeWidth < bird.x && !p.passed) {
          currentScore++;
          setScore(currentScore);
          p.passed = true;
        }

        if (p.x + pipeWidth < -10) pipes.splice(i, 1);
      }

      if (bird.y + bird.height > canvas.height - 22 || bird.y < 0) {
        isGameOver = true;
      }

      // Draw Study Rack Logo character
      const tilt = Math.max(-0.45, Math.min(0.65, bird.velocity * 0.07));
      drawRackCharacter(bird.x + bird.width / 2, bird.y + bird.height / 2, bird.width, tilt);

      // Scrolling ground + grass strip
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(0, canvas.height - 24, canvas.width, 6);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(0, canvas.height - 18, canvas.width, 18);

      // On-canvas score badge
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.fillRect(10, 10, 84, 28);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`${t.score}: ${currentScore}`, 20, 29);

      frames++;
      if (!isGameOver) {
        animationFrameId = requestAnimationFrame(draw);
      } else {
        setGameOver(true);
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('mousedown', handleJump);
      canvas.removeEventListener('touchstart', handleTouchStart);
    };
  }, [gameKey, t]);

  const handleRestart = () => {
    setGameOver(false);
    setScore(0);
    setGameKey((k) => k + 1);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-800 p-5 rounded-2xl shadow-2xl flex flex-col items-center relative border border-slate-700">
        <button onClick={onClose} aria-label="Close game" className="absolute top-3 right-3 text-white p-2 hover:bg-slate-700 rounded-full transition">
          <XIcon size={24} />
        </button>
        <h2 className="text-2xl font-bold text-white mb-1">Flappy Rack</h2>
        <p className="text-slate-300 mb-3 text-sm">{t.flappyHint} • {t.score}: {Number(score)}</p>
        <div className="relative w-full aspect-[4/3] bg-sky-300 rounded-lg overflow-hidden border-4 border-slate-700">
          <canvas ref={canvasRef} width={400} height={300} className="w-full h-full block cursor-pointer" />
          {gameOver && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-4">
              <h3 className="text-3xl font-bold text-white mb-2">{t.gameOver}</h3>
              <p className="text-xl text-yellow-400 mb-5">{t.score}: {Number(score)}</p>
              <div className="flex gap-3">
                <button onClick={handleRestart} className="px-6 py-2 bg-sky-500 text-white rounded-full font-bold hover:bg-sky-400 transition">
                  {t.playAgain}
                </button>
                <button onClick={onClose} className="px-6 py-2 bg-slate-600 text-white rounded-full font-bold hover:bg-slate-500 transition">
                  {t.backToGames}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const LOCAL_STORAGE_KEY = 'studyrack_profile_v1';

const getUiTier = (grade) => {
  if (!grade) return 'intermediate';
  if (grade === 'JK' || grade === 'SK') return 'junior';
  const num = parseInt(String(grade).replace(/\D/g, ''), 10);
  if (!num || num <= 4) return 'junior';
  if (num <= 8) return 'intermediate';
  return 'senior';
};

const TIER_STYLES = {
  junior: {
    pageBg: 'bg-slate-900',
    shelf: 'bg-sky-950/50 border-4 border-sky-500/40 rounded-3xl p-7 shadow-2xl',
    stepBadge1: 'w-9 h-9 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-base',
    stepBadge2: 'w-9 h-9 rounded-full bg-pink-400 text-slate-950 font-black flex items-center justify-center text-base',
    stepBadge3: 'w-9 h-9 rounded-full bg-emerald-400 text-slate-950 font-black flex items-center justify-center text-base',
    gradeBtnActive: 'bg-amber-400 border-amber-300 text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.6)] scale-105 rounded-2xl',
    gradeBtnIdle: 'bg-slate-800 border-slate-600 text-slate-100 hover:bg-slate-700 rounded-2xl',
    subjectBtnActive: 'bg-pink-500 border-pink-300 text-white shadow-[0_0_20px_rgba(236,72,153,0.6)] scale-105 rounded-2xl',
    subjectBtnIdle: 'bg-slate-800 border-slate-600 text-slate-100 hover:bg-slate-700 rounded-2xl',
    lengthCard: 'bg-sky-950/60 rounded-3xl p-8 border-4 border-sky-500/40 shadow-2xl',
    startBtn: 'px-12 py-6 bg-gradient-to-r from-amber-400 via-pink-500 to-sky-500 text-white font-black text-2xl rounded-3xl hover:scale-105 shadow-xl transition-all',
    quizQuestion: 'text-3xl md:text-4xl font-extrabold text-white mb-8 leading-snug',
    quizOption: 'text-left p-6 rounded-3xl border-4 font-bold text-xl transition-all',
    quizOptionActive: 'bg-amber-400 border-amber-200 text-slate-950 shadow-xl scale-[1.01]',
    quizOptionIdle: 'bg-slate-800 border-slate-600 text-white hover:bg-slate-700',
    feedbackCard: 'max-w-2xl w-full bg-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl text-center flex flex-col items-center border-4 border-sky-500/40',
  },
  intermediate: {
    pageBg: 'bg-slate-900',
    shelf: 'bg-slate-800/60 border-y-4 border-slate-700 rounded-2xl p-6 shadow-xl',
    stepBadge1: 'w-8 h-8 rounded bg-sky-500 text-white font-bold flex items-center justify-center text-sm',
    stepBadge2: 'w-8 h-8 rounded bg-purple-500 text-white font-bold flex items-center justify-center text-sm',
    stepBadge3: 'w-8 h-8 rounded bg-emerald-500 text-white font-bold flex items-center justify-center text-sm',
    gradeBtnActive: 'bg-sky-500 border-sky-400 text-white shadow-[0_0_15px_rgba(14,165,233,0.6)] scale-105 rounded-xl',
    gradeBtnIdle: 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 rounded-xl',
    subjectBtnActive: 'bg-purple-500 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.6)] scale-105 rounded-xl',
    subjectBtnIdle: 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 rounded-xl',
    lengthCard: 'bg-slate-800 rounded-3xl p-8 border-2 border-slate-700 shadow-2xl',
    startBtn: 'px-12 py-6 bg-gradient-to-r from-sky-500 to-purple-500 text-white font-black text-2xl rounded-2xl hover:scale-105 hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all',
    quizQuestion: 'text-2xl md:text-4xl font-bold text-white mb-10 leading-tight',
    quizOption: 'text-left p-6 rounded-2xl border-2 font-medium text-lg transition-all',
    quizOptionActive: 'bg-sky-600 border-sky-400 text-white shadow-lg',
    quizOptionIdle: 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700',
    feedbackCard: 'max-w-2xl w-full bg-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl text-center flex flex-col items-center border border-slate-700',
  },
  senior: {
    pageBg: 'bg-slate-950',
    shelf: 'bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-lg',
    stepBadge1: 'w-7 h-7 rounded-md bg-slate-700 text-slate-100 font-semibold flex items-center justify-center text-xs',
    stepBadge2: 'w-7 h-7 rounded-md bg-slate-700 text-slate-100 font-semibold flex items-center justify-center text-xs',
    stepBadge3: 'w-7 h-7 rounded-md bg-slate-700 text-slate-100 font-semibold flex items-center justify-center text-xs',
    gradeBtnActive: 'bg-slate-100 border-white text-slate-950 rounded-lg shadow-md',
    gradeBtnIdle: 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600 hover:text-white rounded-lg',
    subjectBtnActive: 'bg-emerald-500 border-emerald-400 text-slate-950 rounded-lg shadow-md',
    subjectBtnIdle: 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600 hover:text-white rounded-lg',
    lengthCard: 'bg-slate-900 rounded-xl p-8 border border-slate-800 shadow-xl',
    startBtn: 'px-10 py-4 bg-white text-slate-950 font-bold text-lg tracking-wide rounded-lg hover:bg-slate-200 transition-all',
    quizQuestion: 'text-xl md:text-3xl font-semibold text-slate-100 mb-8 leading-snug tracking-tight',
    quizOption: 'text-left p-5 rounded-lg border font-normal text-base transition-all',
    quizOptionActive: 'bg-slate-100 border-white text-slate-950 font-medium shadow',
    quizOptionIdle: 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-600',
    feedbackCard: 'max-w-2xl w-full bg-slate-900 rounded-xl p-8 md:p-10 shadow-2xl text-center flex flex-col items-center border border-slate-800',
  },
};

const loadLocalProfile = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      points: Number(parsed.points) || 0,
      country: typeof parsed.country === 'string' ? parsed.country : 'USA',
      customSubjects: Array.isArray(parsed.customSubjects) ? parsed.customSubjects.map(String) : [],
      unlockedGames: Array.isArray(parsed.unlockedGames) ? parsed.unlockedGames.map(Number) : []
    };
  } catch {
    return null;
  }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(() => loadLocalProfile() || {
    points: 0,
    country: 'USA',
    customSubjects: [],
    unlockedGames: []
  });
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollYRef = useRef(0);

  const [appState, setAppState] = useState('home');
  const [activeModal, setActiveModal] = useState(null);
  const [modalInput, setModalInput] = useState('');

  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [quizLength, setQuizLength] = useState(10);

  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizError, setQuizError] = useState('');
  const [feedbackData, setFeedbackData] = useState(null);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);

  const lang = getLanguageFromCountry(userData?.country);
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const uiTier = getUiTier(selectedGrade);
  const ui = TIER_STYLES[uiTier];

  // Firebase Auth
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error('Auth Error:', err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Profile Listener (4-segment even path)
  useEffect(() => {
    if (!user || !db) return;
    const userRef = doc(db, 'artifacts', appId, 'users', user.uid);
    const unsub = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData({
          points: Number(data.points) || 0,
          country: typeof data.country === 'string' ? data.country : 'USA',
          customSubjects: Array.isArray(data.customSubjects) ? data.customSubjects.map(String) : [],
          unlockedGames: Array.isArray(data.unlockedGames) ? data.unlockedGames.map(Number) : []
        });
      } else {
        setDoc(userRef, { points: 0, country: 'USA', customSubjects: [], unlockedGames: [] });
      }
    });
    return () => unsub();
  }, [user]);

  // Header Show/Hide on Scroll (ref-based to avoid listener churn)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY <= 10) {
        setShowHeader(true);
      } else if (currentScrollY > 50 && currentScrollY > lastScrollYRef.current) {
        setShowHeader(false);
      } else if (currentScrollY < lastScrollYRef.current) {
        setShowHeader(true);
      }
      lastScrollYRef.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const updateUserProfile = async (updates) => {
    setUserData((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
    if (!user || !db) return;
    try {
      const userRef = doc(db, 'artifacts', appId, 'users', user.uid);
      await setDoc(userRef, updates, { merge: true });
    } catch (err) {
      console.error('Failed to save profile:', err);
    }
  };

  const removeCustomSubject = (subjectToRemove) => {
    const currentCustoms = Array.isArray(userData?.customSubjects) ? userData.customSubjects : [];
    const nextCustoms = currentCustoms.filter((s) => s !== subjectToRemove);
    updateUserProfile({ customSubjects: nextCustoms });
    if (selectedSubject === subjectToRemove) {
      setSelectedSubject('');
    }
  };

  const openModal = (type) => {
    setModalInput('');
    setActiveModal(type);
  };

  const generateQuiz = async () => {
    setIsGeneratingQuiz(true);
    setQuizError('');
    setQuizQuestions([]);
    setAppState('quiz_active');

    if (!GEMINI_API_KEY) {
      const localQuestions = generateLocalQuiz(selectedSubject, selectedGrade, userData.country, quizLength);
      setQuizQuestions(localQuestions);
      setCurrentQuestionIdx(0);
      setUserAnswers({});
      setIsGeneratingQuiz(false);
      return;
    }

    const payload = {
      contents: [{
        parts: [{ text: `Generate a multiple choice quiz about ${selectedSubject} for a ${selectedGrade} student in ${userData.country}. Provide exactly ${quizLength} questions.` }]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              question: { type: "STRING" },
              options: { type: "ARRAY", items: { type: "STRING" }, description: "Provide 4 options" },
              correctAnswer: { type: "STRING" }
            },
            required: ["question", "options", "correctAnswer"]
          }
        }
      }
    };

    try {
      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      const textJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textJson) {
        throw new Error(data?.error?.message || 'No quiz questions returned from Gemini.');
      }
      const cleanText = textJson.replace(/```json/gi, '').replace(/```/g, '').trim();
      const questions = JSON.parse(cleanText);
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('Invalid quiz format received.');
      }
      setQuizQuestions(questions);
      setCurrentQuestionIdx(0);
      setUserAnswers({});
    } catch (err) {
      console.warn('Gemini unavailable, using local standalone quiz:', err);
      const localQuestions = generateLocalQuiz(selectedSubject, selectedGrade, userData.country, quizLength);
      setQuizQuestions(localQuestions);
      setCurrentQuestionIdx(0);
      setUserAnswers({});
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleAnswerSelect = (option) => {
    setUserAnswers((prev) => ({ ...prev, [currentQuestionIdx]: option }));
  };

  const nextQuestion = () => {
    if (currentQuestionIdx < quizQuestions.length - 1) {
      setCurrentQuestionIdx((prev) => prev + 1);
    } else {
      submitQuiz();
    }
  };

  const submitQuiz = async () => {
    setAppState('quiz_feedback');
    setIsGeneratingFeedback(true);

    let correctCount = 0;
    const rightAnswers = [];
    const mistakes = [];

    quizQuestions.forEach((q, idx) => {
      const userAns = userAnswers[idx];
      if (userAns === q.correctAnswer) {
        correctCount++;
        rightAnswers.push({
          question: q.question,
          userAnswer: userAns
        });
      } else {
        mistakes.push({
          question: q.question,
          userAnswer: userAns || "No answer",
          correctAnswer: q.correctAnswer
        });
      }
    });

    const pointsMap = { 10: 5, 20: 10, 30: 15, 40: 20, 60: 25 };
    const potentialPoints = pointsMap[quizLength] || 5;
    const earnedPoints = correctCount > 0 ? potentialPoints : 0;

    if (earnedPoints > 0) {
      updateUserProfile({ points: (Number(userData.points) || 0) + earnedPoints });
    }

    if (correctCount === quizQuestions.length) {
      setFeedbackData({
        perfect: true,
        text: "CONGRATS YOU DID IT!",
        score: correctCount,
        total: quizQuestions.length,
        pointsEarned: earnedPoints,
        rightAnswers,
        mistakes
      });
      setIsGeneratingFeedback(false);
      return;
    }

    if (!GEMINI_API_KEY) {
      const localFeedback = generateLocalFeedback(selectedGrade, selectedSubject, correctCount, quizQuestions.length, mistakes, rightAnswers);
      setFeedbackData({
        perfect: false,
        text: localFeedback,
        score: correctCount,
        total: quizQuestions.length,
        pointsEarned: earnedPoints,
        rightAnswers,
        mistakes
      });
      setIsGeneratingFeedback(false);
      return;
    }

    const payload = {
      contents: [{
        parts: [{ text: `The student took a ${selectedGrade} ${selectedSubject} quiz and scored ${correctCount}/${quizQuestions.length}. Here are the ones they got right: ${JSON.stringify(rightAnswers)}. Here are their mistakes: ${JSON.stringify(mistakes)}. Write a brief, highly encouraging response specifically meant for a ${selectedGrade} student. Explain their 'perks' (what they got right) and 'things to improve' (what they selected vs the correct answer). Format it clearly without markdown.` }]
      }]
    };

    try {
      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      const feedbackText = data?.candidates?.[0]?.content?.parts?.[0]?.text || generateLocalFeedback(selectedGrade, selectedSubject, correctCount, quizQuestions.length, mistakes, rightAnswers);

      setFeedbackData({
        perfect: false,
        text: feedbackText,
        score: correctCount,
        total: quizQuestions.length,
        pointsEarned: earnedPoints,
        rightAnswers,
        mistakes
      });
    } catch (err) {
      console.warn('Gemini feedback unavailable, using local feedback:', err);
      setFeedbackData({
        perfect: false,
        text: generateLocalFeedback(selectedGrade, selectedSubject, correctCount, quizQuestions.length, mistakes, rightAnswers),
        score: correctCount,
        total: quizQuestions.length,
        pointsEarned: earnedPoints,
        rightAnswers,
        mistakes
      });
    } finally {
      setIsGeneratingFeedback(false);
    }
  };

  const gradeLevels = ['JK', 'SK', ...Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`)];

  const getSubjects = () => {
    const base = ['Math', 'Science', 'Language Arts', 'History', 'Geography', 'Art', 'Music', 'P.E.', 'Coding', 'Health'];
    const countryStr = typeof userData?.country === 'string' ? userData.country.trim().toLowerCase() : '';
    if (countryStr === 'canada') base.push('French');
    if (countryStr === 'usa' || countryStr === 'united states') base.push('US History');
    const customs = Array.isArray(userData?.customSubjects) ? userData.customSubjects.map(String) : [];
    return [...new Set([...base, ...customs])];
  };

  const renderHeader = () => (
    <header
      className={`fixed top-0 left-0 w-full z-40 bg-slate-900/95 backdrop-blur border-b border-slate-700 transition-transform duration-300 ${
        showHeader ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 grid grid-cols-3 items-start">
        {/* Top Left: Country Selector */}
        <div className="flex justify-start">
          <button
            onClick={() => openModal('country')}
            className="text-white text-sm font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg transition"
          >
            {t.countryLabel}: {String(typeof userData?.country === 'string' ? userData.country : 'USA')}
          </button>
        </div>

        {/* Top Middle (Logo) & Bottom Middle ("Study rack") */}
        <div
          className="flex flex-col items-center cursor-pointer justify-self-center"
          onClick={() => setAppState('home')}
        >
          <RackLogo />
          <h1 className="text-white font-extrabold text-xl mt-1 tracking-wider">Study rack</h1>
        </div>

        {/* Top Right: Add Custom Subject & Sign In */}
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={() => openModal('customSubject')}
            className="text-white text-xs hover:text-sky-300 transition underline underline-offset-2"
          >
            {t.addCustomSubject}
          </button>
          <button
            onClick={() => setActiveModal('signin')}
            className="bg-white text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-slate-200 transition shadow-lg text-left leading-tight"
          >
            {t.signInTop}
            <br />
            <span className="font-normal opacity-80 text-[10px]">{t.signInSub}</span>
          </button>
        </div>
      </div>
    </header>
  );

  const renderModal = () => {
    if (!activeModal) return null;

    if (activeModal === 'games') {
      const gameCosts = [15, 25, 35, 45, 55, 65, 75, 85, 95, 105];
      const unlocked = Array.isArray(userData?.unlockedGames) ? userData.unlockedGames : [];
      const points = Number(userData?.points) || 0;

      const handleGameClick = (idx, cost) => {
        const isUnlocked = unlocked.includes(idx);
        const targetModal = idx === 0 ? 'flappy' : `game-${idx}`;
        if (isUnlocked) {
          setActiveModal(targetModal);
          return;
        }
        if (points >= cost) {
          updateUserProfile({
            points: points - cost,
            unlockedGames: [...unlocked, idx]
          });
          setActiveModal(targetModal);
        }
      };

      return (
        <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">
          <button onClick={() => setActiveModal(null)} aria-label="Close games" className="absolute top-6 right-6 text-white hover:text-red-400 p-2">
            <XIcon size={32} />
          </button>
          <div className="max-w-4xl w-full mx-auto p-8 flex-1 overflow-y-auto">
            <h2 className="text-4xl font-black text-white mb-2 text-center">{t.gamesRack}</h2>
            <div className="flex justify-center items-center gap-2 mb-10">
              <AwardIcon className="text-yellow-400" />
              <span className="text-2xl font-bold text-yellow-400">{points} {t.points}</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {gameCosts.map((cost, idx) => {
                const isUnlocked = unlocked.includes(idx);
                const canUnlock = points >= cost;
                const gameTitle = (t.gameNames && t.gameNames[idx]) || `Game ${idx + 1}`;

                return (
                  <button
                    key={idx}
                    onClick={() => handleGameClick(idx, cost)}
                    disabled={!isUnlocked && !canUnlock}
                    className={`aspect-square rounded-2xl flex flex-col items-center justify-center p-4 transition border-4 ${
                      isUnlocked
                        ? 'bg-sky-600 hover:bg-sky-500 border-sky-400 cursor-pointer shadow-[0_0_20px_rgba(56,189,248,0.5)]'
                        : canUnlock
                        ? 'bg-slate-700 hover:bg-slate-600 border-yellow-400 cursor-pointer'
                        : 'bg-slate-800 border-slate-700 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <PlayIcon size={36} className={`mb-2 ${isUnlocked || canUnlock ? 'text-white' : 'text-slate-500'}`} />
                    <span className="text-white font-bold text-base text-center">{gameTitle}</span>
                    <span className={`text-xs font-bold mt-1 ${isUnlocked ? 'text-emerald-300' : canUnlock ? 'text-yellow-300' : 'text-slate-500'}`}>
                      {isUnlocked ? t.unlockedPlay : t.unlockCost(cost)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    if (activeModal === 'flappy') {
      return <FlappyGame onClose={() => setActiveModal('games')} t={t} />;
    }

    if (typeof activeModal === 'string' && activeModal.startsWith('game-')) {
      const idx = parseInt(activeModal.replace('game-', ''), 10);
      const gameTitle = (t.gameNames && t.gameNames[idx]) || `Game ${idx + 1}`;
      return (
        <MinigameRouter
          gameIndex={idx}
          title={gameTitle}
          onClose={() => setActiveModal('games')}
          t={t}
        />
      );
    }

    if (activeModal === 'signin') {
      return (
        <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center p-6">
          <button onClick={() => setActiveModal(null)} aria-label="Close sign in" className="absolute top-6 right-6 text-white hover:text-red-400 p-2">
            <XIcon size={36} />
          </button>
          <div className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-3xl p-8 text-center shadow-2xl">
            <h2 className="text-3xl font-black text-white mb-3">{t.proTitle}</h2>
            <p className="text-slate-300 mb-6">{t.proDesc}</p>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-4 bg-white text-slate-900 font-bold text-lg rounded-2xl hover:bg-slate-200 transition"
            >
              {t.startTrial}
            </button>
          </div>
        </div>
      );
    }

    const isCountry = activeModal === 'country';

    if (isCountry) {
      const query = modalInput.trim().toLowerCase();
      const filteredCountries = ALL_COUNTRIES.filter((c) =>
        c.toLowerCase().includes(query)
      );
      const exactMatch = ALL_COUNTRIES.find(
        (c) => c.toLowerCase() === query
      );

      return (
        <div className="fixed inset-0 z-50 bg-sky-950 flex flex-col items-center justify-center p-6">
          <button onClick={() => setActiveModal(null)} aria-label="Close modal" className="absolute top-6 right-6 text-white hover:text-red-400 p-2">
            <XIcon size={40} />
          </button>
          <h2 className="text-4xl font-bold text-white mb-2 text-center">
            {t.typeCountry}
          </h2>
          <p className="text-sky-200 text-sm mb-6 text-center">
            Current: <span className="font-bold text-white">{String(userData?.country || 'USA')}</span>
          </p>
          <form
            key="country"
            onSubmit={(e) => {
              e.preventDefault();
              if (exactMatch) {
                updateUserProfile({ country: exactMatch });
                setActiveModal(null);
              }
            }}
            className="w-full max-w-lg flex flex-col gap-3"
          >
            <input
              autoFocus
              value={modalInput}
              onChange={(e) => setModalInput(e.target.value)}
              className="w-full text-2xl p-5 rounded-2xl bg-white/10 text-white placeholder:text-white/50 border-2 border-white/30 focus:border-white focus:outline-none text-center"
              placeholder={t.countryPlaceholder}
            />
            <div className="w-full max-h-[305px] overflow-y-auto bg-slate-900/90 border-2 border-white/20 rounded-2xl shadow-2xl">
              {filteredCountries.length > 0 ? (
                filteredCountries.map((countryName) => {
                  const isSelected = userData?.country === countryName;
                  return (
                    <button
                      type="button"
                      key={countryName}
                      onClick={() => {
                        updateUserProfile({ country: countryName });
                        setActiveModal(null);
                      }}
                      className={`w-full text-left px-6 py-4 text-lg font-semibold flex items-center justify-between border-b border-slate-800 last:border-b-0 transition ${
                        isSelected
                          ? 'bg-sky-600 text-white'
                          : 'text-slate-100 hover:bg-slate-800'
                      }`}
                    >
                      <span>{countryName}</span>
                      {isSelected && <CheckIcon size={20} />}
                    </button>
                  );
                })
              ) : (
                <div className="px-6 py-4 text-slate-400 text-center text-sm">
                  No exact country match found.
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={!exactMatch}
              className={`w-full p-4 font-bold text-xl rounded-2xl transition shadow-xl ${
                exactMatch
                  ? 'bg-white text-sky-950 hover:bg-sky-100 cursor-pointer'
                  : 'bg-white/20 text-white/40 cursor-not-allowed'
              }`}
            >
              {t.save}
            </button>
          </form>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 bg-sky-950 flex flex-col items-center justify-center p-6">
        <button onClick={() => setActiveModal(null)} aria-label="Close modal" className="absolute top-6 right-6 text-white hover:text-red-400 p-2">
          <XIcon size={40} />
        </button>
        <h2 className="text-4xl font-bold text-white mb-8 text-center">
          {t.addCustomTitle}
        </h2>
        <form
          key={activeModal}
          onSubmit={(e) => {
            e.preventDefault();
            const val = modalInput.trim();
            if (val) {
              const currentCustoms = Array.isArray(userData?.customSubjects) ? userData.customSubjects : [];
              if (!currentCustoms.includes(val)) {
                updateUserProfile({ customSubjects: [...currentCustoms, val] });
              }
            }
            setActiveModal(null);
          }}
          className="w-full max-w-lg flex flex-col gap-4"
        >
          <input
            autoFocus
            value={modalInput}
            onChange={(e) => setModalInput(e.target.value)}
            className="w-full text-3xl p-6 rounded-2xl bg-white/10 text-white placeholder:text-white/50 border-2 border-white/30 focus:border-white focus:outline-none text-center"
            placeholder={t.subjectPlaceholder}
          />
          <button type="submit" className="w-full p-4 bg-white text-sky-950 font-bold text-xl rounded-2xl hover:bg-sky-100 transition shadow-xl">
            {t.save}
          </button>
        </form>

        {Array.isArray(userData?.customSubjects) && userData.customSubjects.length > 0 && (
          <div className="w-full max-w-lg mt-6 bg-slate-900/80 border border-white/20 rounded-2xl p-4 max-h-52 overflow-y-auto">
            <p className="text-sky-200 text-xs font-semibold uppercase tracking-wider mb-3">
              Custom Subjects
            </p>
            <div className="flex flex-wrap gap-2">
              {userData.customSubjects.map((sub) => (
                <div
                  key={sub}
                  className="flex items-center gap-2 bg-slate-800 text-white px-3 py-1.5 rounded-full border border-slate-600 text-sm font-medium"
                >
                  <span>{sub}</span>
                  <button
                    type="button"
                    onClick={() => removeCustomSubject(sub)}
                    aria-label={`Remove ${sub}`}
                    className="text-slate-400 hover:text-rose-400 transition p-0.5"
                  >
                    <XIcon size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderHome = () => (
    <div className="pt-36 pb-24 px-4 max-w-5xl mx-auto flex flex-col gap-10">
      {/* Rack Shelf 1: Grade Level */}
      <section className={`${ui.shelf} transition-all duration-300`}>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <div className={ui.stepBadge1}>1</div>
          {t.selectGrade}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {gradeLevels.map((grade) => (
            <button
              key={grade}
              onClick={() => setSelectedGrade(grade)}
              className={`py-4 px-2 font-bold text-center border-2 transition-all ${
                selectedGrade === grade ? ui.gradeBtnActive : ui.gradeBtnIdle
              }`}
            >
              {t.gradeLabel ? t.gradeLabel(grade) : grade}
            </button>
          ))}
        </div>
      </section>

      {/* Rack Shelf 2: Subject */}
      {selectedGrade && (
        <section className={`${ui.shelf} transition-all duration-300`}>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <div className={ui.stepBadge2}>2</div>
            {t.chooseSubject}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {getSubjects().map((sub) => {
              const isCustom = Array.isArray(userData?.customSubjects) && userData.customSubjects.includes(sub);
              return (
                <div key={sub} className="relative">
                  <button
                    onClick={() => setSelectedSubject(sub)}
                    className={`w-full py-4 px-4 font-bold text-center border-2 transition-all ${
                      selectedSubject === sub ? ui.subjectBtnActive : ui.subjectBtnIdle
                    }`}
                  >
                    {t.subjects[sub] || sub}
                  </button>
                  {isCustom && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCustomSubject(sub);
                      }}
                      aria-label={`Remove ${sub}`}
                      title={`Remove ${sub}`}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 hover:bg-rose-400 text-white rounded-full flex items-center justify-center shadow-md transition"
                    >
                      <XIcon size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Rack Shelf 3: Quiz Length & Launch */}
      {selectedGrade && selectedSubject && (
        <section className={`${ui.lengthCard} flex flex-col md:flex-row items-center justify-between gap-8 transition-all duration-300`}>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <div className={ui.stepBadge3}>3</div>
              {t.quizLength}
            </h2>
            <div className="flex flex-wrap gap-3">
              {[10, 20, 30, 40, 60].map((len) => {
                const pts = { 10: 5, 20: 10, 30: 15, 40: 20, 60: 25 }[len];
                return (
                  <button
                    key={len}
                    onClick={() => setQuizLength(len)}
                    className={`py-3 px-6 rounded-full font-bold border-2 transition-all flex flex-col items-center ${
                      quizLength === len
                        ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.6)]'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{len} {t.qs}</span>
                    <span className="text-[10px] opacity-80 mt-1">{t.earnPts(pts)}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <button
            onClick={generateQuiz}
            className={`w-full md:w-auto ${ui.startBtn}`}
          >
            {t.startQuiz}
          </button>
        </section>
      )}
    </div>
  );

  const renderActiveQuiz = () => {
    if (isGeneratingQuiz) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4 text-center">
          <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <h2 className="text-3xl font-bold text-white">{t.generatingQuiz(t.subjects[selectedSubject] || selectedSubject)}</h2>
        </div>
      );
    }

    if (quizError || quizQuestions.length === 0) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4 text-center">
          <h2 className="text-2xl font-bold text-red-400">{t.unableToLoad}</h2>
          <p className="text-slate-300 max-w-md">{quizError || 'No questions were generated.'}</p>
          <button
            onClick={() => { setAppState('home'); setQuizError(''); }}
            className="px-8 py-3 bg-sky-500 hover:bg-sky-400 text-white rounded-xl font-bold transition"
          >
            {t.backToHome}
          </button>
        </div>
      );
    }

    const q = quizQuestions[currentQuestionIdx];
    if (!q) return null;
    const hasAnswered = userAnswers[currentQuestionIdx] !== undefined;

    return (
      <div className="pt-12 pb-20 px-4 max-w-3xl mx-auto flex flex-col min-h-screen">
        <div className="mb-8 flex items-center justify-between">
          <button onClick={() => setAppState('home')} className="text-slate-400 hover:text-white transition flex items-center gap-1">
            <XIcon size={18} /> {t.quit}
          </button>
          <div className="text-sky-400 font-bold">
            {t.questionOf(currentQuestionIdx + 1, quizQuestions.length)}
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <h2 className={ui.quizQuestion}>{String(q.question || '')}</h2>
          <div className="flex flex-col gap-4">
            {Array.isArray(q.options) &&
              q.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswerSelect(opt)}
                  className={`${ui.quizOption} ${
                    userAnswers[currentQuestionIdx] === opt ? ui.quizOptionActive : ui.quizOptionIdle
                  } ${hasAnswered && userAnswers[currentQuestionIdx] !== opt ? 'opacity-75 hover:opacity-100' : ''}`}
                >
                  {String(opt || '')}
                </button>
              ))}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 flex justify-end">
          <button
            disabled={!hasAnswered}
            onClick={nextQuestion}
            className={`px-8 py-4 rounded-full font-bold text-lg transition-all ${
              hasAnswered ? 'bg-white text-slate-900 shadow-xl hover:scale-105' : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            {currentQuestionIdx === quizQuestions.length - 1 ? t.submitQuiz : t.nextQuestion}
          </button>
        </div>
      </div>
    );
  };

  const renderFeedback = () => {
    if (isGeneratingFeedback) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4 text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <h2 className="text-3xl font-bold text-white">{t.gradingQuiz}</h2>
        </div>
      );
    }
    if (!feedbackData) return null;

    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${ui.pageBg}`}>
        <div className={ui.feedbackCard}>
          {feedbackData.perfect ? (
            <div className="mb-6 flex flex-col items-center">
              <div className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(16,185,129,0.8)]">
                <CheckIcon size={64} strokeWidth={3} />
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-4 animate-pulse">
                {t.congrats}
              </h1>
            </div>
          ) : (
            <div className="mb-6 flex flex-col items-center">
              <div className="text-6xl font-black text-white mb-2">
                {Number(feedbackData.score)} / {Number(feedbackData.total)}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 bg-slate-900 px-6 py-3 rounded-full mb-8 border border-slate-700">
            <AwardIcon className="text-yellow-400" />
            <span className="text-white font-bold text-xl">{t.earnedPoints(Number(feedbackData.pointsEarned) || 0)}</span>
          </div>

          {Array.isArray(feedbackData.rightAnswers) && feedbackData.rightAnswers.length > 0 && (
            <div className="text-left w-full bg-emerald-950/40 p-6 rounded-2xl border border-emerald-700/50 mb-4 max-h-[28vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-emerald-300 mb-3">
                {t.gotRight(feedbackData.rightAnswers.length)}
              </h3>
              <ul className="space-y-3 text-slate-200 text-sm md:text-base">
                {feedbackData.rightAnswers.map((item, idx) => (
                  <li key={idx} className="bg-slate-900/60 p-3 rounded-xl border border-emerald-800/40">
                    <p className="font-semibold text-white">{idx + 1}. {String(item.question)}</p>
                    <p className="text-emerald-300 mt-1">{t.youSelected}: <span className="font-bold">{String(item.userAnswer)}</span></p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(feedbackData.mistakes) && feedbackData.mistakes.length > 0 && (
            <div className="text-left w-full bg-rose-950/30 p-6 rounded-2xl border border-rose-700/50 mb-8 max-h-[34vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-rose-300 mb-3">
                {t.canImprove(feedbackData.mistakes.length)}
              </h3>
              <ul className="space-y-3 text-slate-200 text-sm md:text-base">
                {feedbackData.mistakes.map((item, idx) => (
                  <li key={idx} className="bg-slate-900/60 p-3 rounded-xl border border-rose-800/40">
                    <p className="font-semibold text-white">{idx + 1}. {String(item.question)}</p>
                    <p className="text-rose-300 mt-1">
                      {t.youSelected}: <span className="font-bold">{String(item.userAnswer)}</span>
                    </p>
                    <p className="text-emerald-300">
                      {t.correctAnswer}: <span className="font-bold">{String(item.correctAnswer)}</span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => {
              setAppState('home');
              setFeedbackData(null);
              setShowHeader(true);
            }}
            className="w-full py-4 bg-sky-500 hover:bg-sky-400 text-white rounded-xl font-bold text-xl transition-all shadow-lg"
          >
            {t.backToHome}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${ui.pageBg} font-sans selection:bg-sky-500 selection:text-white transition-colors duration-300`}>
      {appState === 'home' && renderHeader()}

      <main className="min-h-screen">
        {appState === 'home' && renderHome()}
        {appState === 'quiz_active' && renderActiveQuiz()}
        {appState === 'quiz_feedback' && renderFeedback()}
      </main>

      {/* Bottom Left Games Dot (outside transformed header so fixed positioning works) */}
      {appState === 'home' && (
        <button
          onClick={() => setActiveModal('games')}
          className="fixed bottom-5 left-5 w-7 h-7 bg-white rounded-full shadow-[0_0_12px_rgba(255,255,255,0.6)] hover:scale-110 transition flex items-center justify-center z-40"
          title="Play Games!"
          aria-label="Open Games Menu"
        >
          <div className="w-3.5 h-3.5 bg-sky-500 rounded-full animate-pulse" />
        </button>
      )}

      {renderModal()}
    </div>
  );
}
