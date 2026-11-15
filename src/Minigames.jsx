import React, { useState, useEffect, useRef } from 'react';

const CloseIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const GameShell = ({ title, subtitle, onClose, children }) => (
  <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4">
    <div className="w-full max-w-lg bg-slate-800 p-5 rounded-2xl shadow-2xl flex flex-col items-center relative border border-slate-700">
      <button onClick={onClose} aria-label="Close game" className="absolute top-3 right-3 text-white p-2 hover:bg-slate-700 rounded-full transition">
        <CloseIcon size={24} />
      </button>
      <h2 className="text-2xl font-bold text-white mb-1">{title}</h2>
      {subtitle && <p className="text-slate-300 mb-3 text-sm text-center">{subtitle}</p>}
      {children}
    </div>
  </div>
);

const GameOverOverlay = ({ score, t, onRestart, onClose, title }) => (
  <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center p-4 rounded-lg">
    <h3 className="text-3xl font-bold text-white mb-2">{title || t.gameOver}</h3>
    <p className="text-xl text-yellow-400 mb-5">{t.score}: {score}</p>
    <div className="flex gap-3">
      <button onClick={onRestart} className="px-6 py-2 bg-sky-500 text-white rounded-full font-bold hover:bg-sky-400 transition">
        {t.playAgain}
      </button>
      <button onClick={onClose} className="px-6 py-2 bg-slate-600 text-white rounded-full font-bold hover:bg-slate-500 transition">
        {t.backToGames}
      </button>
    </div>
  </div>
);

// 2. Rack Breaker (Breakout)
function RackBreaker({ title, onClose, t }) {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    let paddleX = 160;
    const paddleW = 80;
    const paddleH = 12;
    let ball = { x: 200, y: 240, dx: 3, dy: -3, r: 7 };
    let currScore = 0;
    let isOver = false;

    const colors = ['#f43f5e', '#f59e0b', '#10b981', '#38bdf8', '#a855f7'];
    const bricks = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 7; c++) {
        bricks.push({ x: 18 + c * 53, y: 32 + r * 22, w: 46, h: 14, alive: true, color: colors[r] });
      }
    }

    const movePaddle = (clientX) => {
      const rect = canvas.getBoundingClientRect();
      const scale = canvas.width / rect.width;
      const x = (clientX - rect.left) * scale - paddleW / 2;
      paddleX = Math.max(0, Math.min(canvas.width - paddleW, x));
    };

    const onMouseMove = (e) => movePaddle(e.clientX);
    const onTouchMove = (e) => {
      if (e.touches[0]) movePaddle(e.touches[0].clientX);
    };
    const onKeyDown = (e) => {
      if (e.code === 'ArrowLeft') paddleX = Math.max(0, paddleX - 24);
      if (e.code === 'ArrowRight') paddleX = Math.min(canvas.width - paddleW, paddleX + 24);
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('keydown', onKeyDown);

    const draw = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      bricks.forEach((b) => {
        if (!b.alive) return;
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.w, b.h);
      });

      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(paddleX, canvas.height - 24, paddleW, paddleH);

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();

      ball.x += ball.dx;
      ball.y += ball.dy;

      if (ball.x - ball.r < 0 || ball.x + ball.r > canvas.width) ball.dx *= -1;
      if (ball.y - ball.r < 0) ball.dy *= -1;

      if (
        ball.y + ball.r >= canvas.height - 24 &&
        ball.y + ball.r <= canvas.height - 10 &&
        ball.x >= paddleX &&
        ball.x <= paddleX + paddleW
      ) {
        ball.dy = -Math.abs(ball.dy);
        const hitPos = (ball.x - (paddleX + paddleW / 2)) / (paddleW / 2);
        ball.dx = hitPos * 4.2;
      }

      let remaining = 0;
      bricks.forEach((b) => {
        if (!b.alive) return;
        remaining++;
        if (ball.x > b.x && ball.x < b.x + b.w && ball.y > b.y && ball.y < b.y + b.h) {
          b.alive = false;
          ball.dy *= -1;
          currScore += 10;
          setScore(currScore);
        }
      });

      if (remaining === 0) {
        isOver = true;
        setWon(true);
        setOver(true);
      } else if (ball.y - ball.r > canvas.height) {
        isOver = true;
        setOver(true);
      }

      if (!isOver) raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [key]);

  return (
    <GameShell title={title} subtitle={`${t.score}: ${score}`} onClose={onClose}>
      <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border-4 border-slate-700">
        <canvas ref={canvasRef} width={400} height={300} className="w-full h-full block" />
        {over && (
          <GameOverOverlay
            score={score}
            t={t}
            title={won ? 'You Cleared the Rack!' : t.gameOver}
            onRestart={() => { setOver(false); setWon(false); setScore(0); setKey((k) => k + 1); }}
            onClose={onClose}
          />
        )}
      </div>
    </GameShell>
  );
}

// 3. Snake Rack
function SnakeRack({ title, onClose, t }) {
  const canvasRef = useRef(null);
  const dirRef = useRef({ x: 1, y: 0 });
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const grid = 20;
    const cols = canvas.width / grid;
    const rows = canvas.height / grid;
    let snake = [{ x: 8, y: 7 }, { x: 7, y: 7 }, { x: 6, y: 7 }];
    dirRef.current = { x: 1, y: 0 };
    let food = { x: 14, y: 7 };
    let currScore = 0;

    const onKey = (e) => {
      const d = dirRef.current;
      if (e.code === 'ArrowUp' && d.y !== 1) dirRef.current = { x: 0, y: -1 };
      if (e.code === 'ArrowDown' && d.y !== -1) dirRef.current = { x: 0, y: 1 };
      if (e.code === 'ArrowLeft' && d.x !== 1) dirRef.current = { x: -1, y: 0 };
      if (e.code === 'ArrowRight' && d.x !== -1) dirRef.current = { x: 1, y: 0 };
    };
    window.addEventListener('keydown', onKey);

    const interval = setInterval(() => {
      const head = { x: snake[0].x + dirRef.current.x, y: snake[0].y + dirRef.current.y };
      if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows || snake.some((s) => s.x === head.x && s.y === head.y)) {
        clearInterval(interval);
        setOver(true);
        return;
      }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        currScore += 10;
        setScore(currScore);
        food = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
      } else {
        snake.pop();
      }

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(food.x * grid + grid / 2, food.y * grid + grid / 2, 7, 0, Math.PI * 2);
      ctx.fill();

      snake.forEach((seg, idx) => {
        ctx.fillStyle = idx === 0 ? '#38bdf8' : '#0ea5e9';
        ctx.fillRect(seg.x * grid + 1, seg.y * grid + 1, grid - 2, grid - 2);
      });
    }, 115);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', onKey);
    };
  }, [key]);

  return (
    <GameShell title={title} subtitle={`${t.score}: ${score}`} onClose={onClose}>
      <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border-4 border-slate-700">
        <canvas ref={canvasRef} width={400} height={300} className="w-full h-full block" />
        {over && (
          <GameOverOverlay
            score={score}
            t={t}
            onRestart={() => { setOver(false); setScore(0); setKey((k) => k + 1); }}
            onClose={onClose}
          />
        )}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 w-36">
        <div />
        <button onClick={() => dirRef.current.y !== 1 && (dirRef.current = { x: 0, y: -1 })} className="bg-slate-700 text-white py-1.5 rounded font-bold">↑</button>
        <div />
        <button onClick={() => dirRef.current.x !== 1 && (dirRef.current = { x: -1, y: 0 })} className="bg-slate-700 text-white py-1.5 rounded font-bold">←</button>
        <button onClick={() => dirRef.current.y !== -1 && (dirRef.current = { x: 0, y: 1 })} className="bg-slate-700 text-white py-1.5 rounded font-bold">↓</button>
        <button onClick={() => dirRef.current.x !== -1 && (dirRef.current = { x: 1, y: 0 })} className="bg-slate-700 text-white py-1.5 rounded font-bold">→</button>
      </div>
    </GameShell>
  );
}

// 4. Space Scholar (Space Shooter)
function SpaceScholar({ title, onClose, t }) {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    let frames = 0;
    let shipX = 185;
    const bullets = [];
    const meteors = [];
    let currScore = 0;
    let isOver = false;

    const moveShip = (clientX) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) * canvas.width) / rect.width;
      shipX = Math.max(15, Math.min(canvas.width - 15, x));
    };
    const onMouseMove = (e) => moveShip(e.clientX);
    const onTouchMove = (e) => e.touches[0] && moveShip(e.touches[0].clientX);
    const onKey = (e) => {
      if (e.code === 'ArrowLeft') shipX = Math.max(15, shipX - 20);
      if (e.code === 'ArrowRight') shipX = Math.min(canvas.width - 15, shipX + 20);
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('keydown', onKey);

    const draw = () => {
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (frames % 14 === 0) bullets.push({ x: shipX, y: canvas.height - 34 });
      if (frames % 36 === 0) meteors.push({ x: 20 + Math.random() * (canvas.width - 40), y: -15, r: 12 + Math.random() * 8, sp: 1.8 + Math.random() * 1.4 });

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(shipX, canvas.height - 34);
      ctx.lineTo(shipX - 14, canvas.height - 10);
      ctx.lineTo(shipX + 14, canvas.height - 10);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#facc15';
      for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y -= 6;
        ctx.fillRect(bullets[i].x - 2, bullets[i].y, 4, 10);
        if (bullets[i].y < -10) bullets.splice(i, 1);
      }

      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.y += m.sp;
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();

        for (let j = bullets.length - 1; j >= 0; j--) {
          const b = bullets[j];
          if (Math.hypot(m.x - b.x, m.y - b.y) < m.r + 4) {
            meteors.splice(i, 1);
            bullets.splice(j, 1);
            currScore += 10;
            setScore(currScore);
            break;
          }
        }

        if (m && m.y + m.r > canvas.height - 12) {
          isOver = true;
          setOver(true);
        }
      }

      frames++;
      if (!isOver) raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKey);
    };
  }, [key]);

  return (
    <GameShell title={title} subtitle={`${t.score}: ${score}`} onClose={onClose}>
      <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border-4 border-slate-700">
        <canvas ref={canvasRef} width={400} height={300} className="w-full h-full block" />
        {over && (
          <GameOverOverlay
            score={score}
            t={t}
            onRestart={() => { setOver(false); setScore(0); setKey((k) => k + 1); }}
            onClose={onClose}
          />
        )}
      </div>
    </GameShell>
  );
}

// 5. Memory Match
function MemoryMatch({ title, onClose, t }) {
  const icons = ['📚', '🚀', '🎨', '🔬', '🎵', '🌍', '💻', '🏆'];
  const makeDeck = () =>
    [...icons, ...icons]
      .sort(() => Math.random() - 0.5)
      .map((icon, idx) => ({ id: idx, icon, matched: false }));

  const [deck, setDeck] = useState(makeDeck);
  const [flipped, setFlipped] = useState([]);
  const [moves, setMoves] = useState(0);

  const allMatched = deck.every((c) => c.matched);

  const handleFlip = (idx) => {
    if (flipped.length === 2 || flipped.includes(idx) || deck[idx].matched) return;
    const next = [...flipped, idx];
    setFlipped(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next;
      if (deck[a].icon === deck[b].icon) {
        setDeck((d) => d.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c)));
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 650);
      }
    }
  };

  const reset = () => {
    setDeck(makeDeck());
    setFlipped([]);
    setMoves(0);
  };

  return (
    <GameShell title={title} subtitle={`Moves: ${moves}`} onClose={onClose}>
      <div className="relative w-full max-w-xs grid grid-cols-4 gap-2.5">
        {deck.map((card, idx) => {
          const isUp = card.matched || flipped.includes(idx);
          return (
            <button
              key={card.id}
              onClick={() => handleFlip(idx)}
              className={`aspect-square rounded-xl text-2xl font-bold flex items-center justify-center transition border-2 ${
                isUp ? 'bg-sky-600 border-sky-400 text-white' : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600'
              }`}
            >
              {isUp ? card.icon : '?'}
            </button>
          );
        })}
        {allMatched && (
          <GameOverOverlay
            score={Math.max(10, 120 - moves * 4)}
            t={t}
            title="Matched All!"
            onRestart={reset}
            onClose={onClose}
          />
        )}
      </div>
    </GameShell>
  );
}

// 6. Math Blitz (30s Arcade)
function MathBlitz({ title, onClose, t }) {
  const makeProblem = () => {
    const a = 2 + Math.floor(Math.random() * 14);
    const b = 2 + Math.floor(Math.random() * 14);
    const ans = a + b;
    const opts = new Set([ans]);
    while (opts.size < 4) opts.add(Math.max(1, ans + Math.floor(Math.random() * 9) - 4));
    return { q: `${a} + ${b} = ?`, ans, opts: Array.from(opts).sort(() => Math.random() - 0.5) };
  };

  const [prob, setProb] = useState(makeProblem);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const id = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft]);

  const answer = (val) => {
    if (timeLeft <= 0) return;
    if (val === prob.ans) setScore((s) => s + 10);
    setProb(makeProblem());
  };

  return (
    <GameShell title={title} subtitle={`${t.score}: ${score} • ${timeLeft}s`} onClose={onClose}>
      <div className="relative w-full bg-slate-900 rounded-xl p-6 text-center border border-slate-700">
        <div className="text-4xl font-black text-white mb-6">{prob.q}</div>
        <div className="grid grid-cols-2 gap-3">
          {prob.opts.map((o) => (
            <button
              key={o}
              onClick={() => answer(o)}
              className="py-4 bg-sky-600 hover:bg-sky-500 text-white text-2xl font-bold rounded-xl transition"
            >
              {o}
            </button>
          ))}
        </div>
        {timeLeft <= 0 && (
          <GameOverOverlay
            score={score}
            t={t}
            onRestart={() => { setScore(0); setTimeLeft(30); setProb(makeProblem()); }}
            onClose={onClose}
          />
        )}
      </div>
    </GameShell>
  );
}

// 7. Rack Runner (Endless Jumper)
function RackRunner({ title, onClose, t }) {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    let frames = 0;
    const groundY = 250;
    const player = { x: 55, y: groundY - 30, w: 26, h: 30, vy: 0, grounded: true };
    const obstacles = [];
    let isOver = false;

    const jump = () => {
      if (player.grounded && !isOver) {
        player.vy = -10.5;
        player.grounded = false;
      }
    };
    const onKey = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', onKey);
    canvas.addEventListener('mousedown', jump);
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); jump(); }, { passive: false });

    const draw = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#334155';
      ctx.fillRect(0, groundY, canvas.width, 50);

      player.vy += 0.55;
      player.y += player.vy;
      if (player.y >= groundY - player.h) {
        player.y = groundY - player.h;
        player.vy = 0;
        player.grounded = true;
      }

      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(player.x, player.y, player.w, player.h);

      if (frames % 75 === 0) {
        obstacles.push({ x: canvas.width + 10, w: 18, h: 26 + Math.random() * 18 });
      }

      for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];
        o.x -= 4.2;
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(o.x, groundY - o.h, o.w, o.h);

        if (
          player.x < o.x + o.w &&
          player.x + player.w > o.x &&
          player.y + player.h > groundY - o.h
        ) {
          isOver = true;
          setOver(true);
        }
        if (o.x + o.w < 0) obstacles.splice(i, 1);
      }

      if (frames % 10 === 0) setScore(Math.floor(frames / 10));
      frames++;
      if (!isOver) raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('mousedown', jump);
    };
  }, [key]);

  return (
    <GameShell title={title} subtitle={`${t.flappyHint} • ${t.score}: ${score}`} onClose={onClose}>
      <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border-4 border-slate-700">
        <canvas ref={canvasRef} width={400} height={300} className="w-full h-full block cursor-pointer" />
        {over && (
          <GameOverOverlay
            score={score}
            t={t}
            onRestart={() => { setOver(false); setScore(0); setKey((k) => k + 1); }}
            onClose={onClose}
          />
        )}
      </div>
    </GameShell>
  );
}

// 8. Star Catcher
function StarCatcher({ title, onClose, t }) {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    let frames = 0;
    let basketX = 165;
    const basketW = 70;
    const items = [];
    let currScore = 0;
    let isOver = false;

    const move = (clientX) => {
      const rect = canvas.getBoundingClientRect();
      basketX = Math.max(0, Math.min(canvas.width - basketW, ((clientX - rect.left) * canvas.width) / rect.width - basketW / 2));
    };
    const onMouse = (e) => move(e.clientX);
    const onTouch = (e) => e.touches[0] && move(e.touches[0].clientX);
    const onKey = (e) => {
      if (e.code === 'ArrowLeft') basketX = Math.max(0, basketX - 24);
      if (e.code === 'ArrowRight') basketX = Math.min(canvas.width - basketW, basketX + 24);
    };

    canvas.addEventListener('mousemove', onMouse);
    canvas.addEventListener('touchmove', onTouch, { passive: true });
    window.addEventListener('keydown', onKey);

    const draw = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (frames % 28 === 0) {
        items.push({ x: 16 + Math.random() * (canvas.width - 32), y: -12, bomb: Math.random() < 0.25, sp: 2.3 + Math.random() * 1.5 });
      }

      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(basketX, canvas.height - 26, basketW, 14);

      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        it.y += it.sp;
        ctx.fillStyle = it.bomb ? '#ef4444' : '#facc15';
        ctx.beginPath();
        ctx.arc(it.x, it.y, 9, 0, Math.PI * 2);
        ctx.fill();

        if (it.y + 9 >= canvas.height - 26 && it.x >= basketX && it.x <= basketX + basketW) {
          if (it.bomb) {
            isOver = true;
            setOver(true);
          } else {
            currScore += 10;
            setScore(currScore);
            items.splice(i, 1);
            continue;
          }
        }
        if (it.y > canvas.height + 10) items.splice(i, 1);
      }

      frames++;
      if (!isOver) raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('mousemove', onMouse);
      canvas.removeEventListener('touchmove', onTouch);
      window.removeEventListener('keydown', onKey);
    };
  }, [key]);

  return (
    <GameShell title={title} subtitle={`${t.score}: ${score}`} onClose={onClose}>
      <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border-4 border-slate-700">
        <canvas ref={canvasRef} width={400} height={300} className="w-full h-full block" />
        {over && (
          <GameOverOverlay
            score={score}
            t={t}
            onRestart={() => { setOver(false); setScore(0); setKey((k) => k + 1); }}
            onClose={onClose}
          />
        )}
      </div>
    </GameShell>
  );
}

// 9. Whack-a-Bug
function WhackABug({ title, onClose, t }) {
  const [activeCell, setActiveCell] = useState(4);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const mover = setInterval(() => {
      setActiveCell(Math.floor(Math.random() * 9));
    }, 650);
    return () => clearInterval(mover);
  }, [timeLeft]);

  const hit = (idx) => {
    if (timeLeft <= 0 || idx !== activeCell) return;
    setScore((s) => s + 10);
    setActiveCell(Math.floor(Math.random() * 9));
  };

  return (
    <GameShell title={title} subtitle={`${t.score}: ${score} • ${timeLeft}s`} onClose={onClose}>
      <div className="relative w-full max-w-xs grid grid-cols-3 gap-3">
        {Array.from({ length: 9 }, (_, i) => (
          <button
            key={i}
            onClick={() => hit(i)}
            className={`aspect-square rounded-2xl text-3xl flex items-center justify-center border-2 transition ${
              activeCell === i && timeLeft > 0
                ? 'bg-emerald-600 border-emerald-400 scale-105'
                : 'bg-slate-900 border-slate-700'
            }`}
          >
            {activeCell === i && timeLeft > 0 ? '🐛' : ''}
          </button>
        ))}
        {timeLeft <= 0 && (
          <GameOverOverlay
            score={score}
            t={t}
            onRestart={() => { setScore(0); setTimeLeft(30); }}
            onClose={onClose}
          />
        )}
      </div>
    </GameShell>
  );
}

// 10. 2048 Rack
function Game2048({ title, onClose, t }) {
  const addTile = (grid) => {
    const empty = [];
    grid.forEach((v, i) => v === 0 && empty.push(i));
    if (empty.length === 0) return grid;
    const copy = [...grid];
    copy[empty[Math.floor(Math.random() * empty.length)]] = Math.random() < 0.9 ? 2 : 4;
    return copy;
  };

  const initGrid = () => addTile(addTile(Array(16).fill(0)));
  const [grid, setGrid] = useState(initGrid);
  const [score, setScore] = useState(0);

  const slideRow = (row) => {
    const nums = row.filter((n) => n !== 0);
    let pts = 0;
    for (let i = 0; i < nums.length - 1; i++) {
      if (nums[i] === nums[i + 1]) {
        nums[i] *= 2;
        pts += nums[i];
        nums[i + 1] = 0;
      }
    }
    const merged = nums.filter((n) => n !== 0);
    while (merged.length < 4) merged.push(0);
    return { row: merged, pts };
  };

  const move = (dir) => {
    let totalPts = 0;
    let next = [...grid];

    if (dir === 'left' || dir === 'right') {
      for (let r = 0; r < 4; r++) {
        let row = next.slice(r * 4, r * 4 + 4);
        if (dir === 'right') row.reverse();
        const res = slideRow(row);
        totalPts += res.pts;
        if (dir === 'right') res.row.reverse();
        for (let c = 0; c < 4; c++) next[r * 4 + c] = res.row[c];
      }
    } else {
      for (let c = 0; c < 4; c++) {
        let col = [next[c], next[c + 4], next[c + 8], next[c + 12]];
        if (dir === 'down') col.reverse();
        const res = slideRow(col);
        totalPts += res.pts;
        if (dir === 'down') res.row.reverse();
        for (let r = 0; r < 4; r++) next[r * 4 + c] = res.row[r];
      }
    }

    if (next.some((v, i) => v !== grid[i])) {
      setScore((s) => s + totalPts);
      setGrid(addTile(next));
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'ArrowLeft') { e.preventDefault(); move('left'); }
      if (e.code === 'ArrowRight') { e.preventDefault(); move('right'); }
      if (e.code === 'ArrowUp') { e.preventDefault(); move('up'); }
      if (e.code === 'ArrowDown') { e.preventDefault(); move('down'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const tileColor = (v) => {
    if (!v) return 'bg-slate-800 text-transparent';
    if (v <= 4) return 'bg-slate-600 text-white';
    if (v <= 16) return 'bg-sky-600 text-white';
    if (v <= 64) return 'bg-purple-600 text-white';
    return 'bg-amber-500 text-slate-950';
  };

  return (
    <GameShell title={title} subtitle={`${t.score}: ${score}`} onClose={onClose}>
      <div className="w-full max-w-xs bg-slate-900 p-3 rounded-xl grid grid-cols-4 gap-2 border border-slate-700">
        {grid.map((v, i) => (
          <div key={i} className={`aspect-square rounded-lg font-black text-xl flex items-center justify-center ${tileColor(v)}`}>
            {v || ''}
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={() => move('left')} className="px-3 py-1.5 bg-slate-700 text-white rounded font-bold">←</button>
        <button onClick={() => move('up')} className="px-3 py-1.5 bg-slate-700 text-white rounded font-bold">↑</button>
        <button onClick={() => move('down')} className="px-3 py-1.5 bg-slate-700 text-white rounded font-bold">↓</button>
        <button onClick={() => move('right')} className="px-3 py-1.5 bg-slate-700 text-white rounded font-bold">→</button>
        <button onClick={() => { setGrid(initGrid()); setScore(0); }} className="px-3 py-1.5 bg-sky-600 text-white rounded font-bold ml-2">
          {t.playAgain}
        </button>
      </div>
    </GameShell>
  );
}

export function MinigameRouter({ gameIndex, title, onClose, t }) {
  switch (gameIndex) {
    case 1:
      return <RackBreaker title={title} onClose={onClose} t={t} />;
    case 2:
      return <SnakeRack title={title} onClose={onClose} t={t} />;
    case 3:
      return <SpaceScholar title={title} onClose={onClose} t={t} />;
    case 4:
      return <MemoryMatch title={title} onClose={onClose} t={t} />;
    case 5:
      return <MathBlitz title={title} onClose={onClose} t={t} />;
    case 6:
      return <RackRunner title={title} onClose={onClose} t={t} />;
    case 7:
      return <StarCatcher title={title} onClose={onClose} t={t} />;
    case 8:
      return <WhackABug title={title} onClose={onClose} t={t} />;
    case 9:
      return <Game2048 title={title} onClose={onClose} t={t} />;
    default:
      return null;
  }
}
