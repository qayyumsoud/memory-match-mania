import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Level = 1 | 2;
type Status = "menu" | "playing" | "won" | "lost";

interface Card {
  id: number;
  pic: number;
  flipped: boolean;
  matched: boolean;
}

const LEVEL_CONFIG: Record<Level, { pairs: number; time: number }> = {
  1: { pairs: 5, time: 30 },
  2: { pairs: 10, time: 50 },
};

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const buildDeck = (level: Level): Card[] => {
  const { pairs } = LEVEL_CONFIG[level];
  const pics = Array.from({ length: pairs }, (_, i) => i + 1);
  const doubled = [...pics, ...pics];
  return shuffle(doubled).map((pic, id) => ({
    id,
    pic,
    flipped: false,
    matched: false,
  }));
};

export default function MemoryGame() {
  const [status, setStatus] = useState<Status>("menu");
  const [level, setLevel] = useState<Level>(1);
  const [cards, setCards] = useState<Card[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [sfxOn, setSfxOn] = useState(true);
  const lockRef = useRef(false);

  // Audio refs
  const bgAudio = useRef<HTMLAudioElement | null>(null);
  const flipAudio = useRef<HTMLAudioElement | null>(null);
  const correctAudio = useRef<HTMLAudioElement | null>(null);
  const wrongAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    bgAudio.current = new Audio("/audio/bg.mp3");
    bgAudio.current.loop = true;
    bgAudio.current.volume = 0.4;
    flipAudio.current = new Audio("/audio/flip.mp3");
    correctAudio.current = new Audio("/audio/correct.mp3");
    wrongAudio.current = new Audio("/audio/wrong.mp3");
    return () => {
      bgAudio.current?.pause();
    };
  }, []);

  const play = useCallback(
    (a: HTMLAudioElement | null) => {
      if (!sfxOn || !a) return;
      try {
        a.currentTime = 0;
        void a.play();
      } catch {
        /* noop */
      }
    },
    [sfxOn],
  );

  // Manage background music with SFX toggle and status
  useEffect(() => {
    const bg = bgAudio.current;
    if (!bg) return;
    if (sfxOn && status === "playing") {
      void bg.play().catch(() => {});
    } else {
      bg.pause();
    }
  }, [sfxOn, status]);

  // Timer
  useEffect(() => {
    if (status !== "playing") return;
    if (timeLeft <= 0) {
      setStatus("lost");
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [status, timeLeft]);

  // Win check
  useEffect(() => {
    if (status === "playing" && cards.length > 0 && cards.every((c) => c.matched)) {
      setStatus("won");
    }
  }, [cards, status]);

  const startLevel = (lvl: Level) => {
    setLevel(lvl);
    setCards(buildDeck(lvl));
    setSelected([]);
    setMoves(0);
    setTimeLeft(LEVEL_CONFIG[lvl].time);
    setStatus("playing");
    lockRef.current = false;
  };

  const handleFlip = (id: number) => {
    if (lockRef.current || status !== "playing") return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.flipped || card.matched) return;

    play(flipAudio.current);

    const newCards = cards.map((c) => (c.id === id ? { ...c, flipped: true } : c));
    const newSelected = [...selected, id];
    setCards(newCards);
    setSelected(newSelected);

    if (newSelected.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = newSelected;
      const ca = newCards.find((c) => c.id === a)!;
      const cb = newCards.find((c) => c.id === b)!;
      if (ca.pic === cb.pic) {
        setTimeout(() => {
          play(correctAudio.current);
          setCards((prev) =>
            prev.map((c) => (c.id === a || c.id === b ? { ...c, matched: true } : c)),
          );
          setSelected([]);
        }, 400);
      } else {
        lockRef.current = true;
        setTimeout(() => {
          play(wrongAudio.current);
          setCards((prev) =>
            prev.map((c) => (c.id === a || c.id === b ? { ...c, flipped: false } : c)),
          );
          setSelected([]);
          lockRef.current = false;
        }, 800);
      }
    }
  };

  const gridCols = useMemo(() => (level === 1 ? "grid-cols-5" : "grid-cols-5"), [level]);
  const gridRows = level === 1 ? 2 : 4;

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url(/bg.jpg)" }}
    >
      <div className="min-h-screen w-full bg-black/40 backdrop-blur-sm">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl flex-col px-4 py-6">
          {/* Top bar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/10 px-4 py-3 text-white shadow-lg backdrop-blur">
            <h1 className="text-2xl font-bold tracking-wide">Memory Game</h1>
            <div className="flex items-center gap-4 text-sm">
              {status === "playing" && (
                <>
                  <span>Level: <b>{level}</b></span>
                  <span>Moves: <b>{moves}</b></span>
                  <span>Time: <b>{timeLeft}s</b></span>
                </>
              )}
              <button
                onClick={() => setSfxOn((s) => !s)}
                className="rounded-md bg-white/20 px-3 py-1 font-medium transition hover:bg-white/30"
              >
                SFX: {sfxOn ? "On" : "Off"}
              </button>
              {status !== "menu" && (
                <button
                  onClick={() => setStatus("menu")}
                  className="rounded-md bg-white/20 px-3 py-1 font-medium transition hover:bg-white/30"
                >
                  Menu
                </button>
              )}
            </div>
          </div>

          {/* Menu */}
          {status === "menu" && (
            <div className="mx-auto mt-20 max-w-md rounded-2xl bg-white/15 p-8 text-center text-white shadow-xl backdrop-blur">
              <h2 className="mb-2 text-3xl font-bold">Choose a level</h2>
              <p className="mb-6 text-white/80">Flip the cards, match the pairs before time runs out.</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => startLevel(1)}
                  className="rounded-xl bg-emerald-500 px-6 py-3 text-lg font-semibold shadow transition hover:bg-emerald-600"
                >
                  Level 1 · 10 cards · 30s
                </button>
                <button
                  onClick={() => startLevel(2)}
                  className="rounded-xl bg-indigo-500 px-6 py-3 text-lg font-semibold shadow transition hover:bg-indigo-600"
                >
                  Level 2 · 20 cards · 50s
                </button>
              </div>
            </div>
          )}

          {/* Board */}
          {(status === "playing" || status === "won" || status === "lost") && (
            <div className="flex-1 min-h-0">
              <div
                className={`grid h-full ${gridCols} gap-3 sm:gap-4`}
                style={{ gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))` }}
              >
              {cards.map((card) => {
                const showFace = card.flipped || card.matched;
                return (
                  <button
                    key={card.id}
                    onClick={() => handleFlip(card.id)}
                    className="group relative h-full w-full min-h-0 [perspective:1000px]"
                    aria-label={`Card ${card.id + 1}`}
                  >
                    <div
                      className={`relative h-full w-full rounded-xl shadow-lg transition-transform duration-500 [transform-style:preserve-3d] ${
                        showFace ? "[transform:rotateY(180deg)]" : ""
                      }`}
                    >
                      {/* Back */}
                      <div className="absolute inset-0 overflow-hidden rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 [backface-visibility:hidden]">
                        <img
                          src={`/back-card-${level}.png`}
                          alt="Card back"
                          className="h-full w-full object-contain p-2"
                        />
                      </div>
                      {/* Front */}
                      <div
                        className={`absolute inset-0 overflow-hidden rounded-xl bg-white [transform:rotateY(180deg)] [backface-visibility:hidden] ${
                          card.matched ? "ring-4 ring-emerald-400" : ""
                        }`}
                      >
                        <img
                          src={`/cards/${card.pic}.png`}
                          alt={`Picture ${card.pic}`}
                          className="h-full w-full object-contain p-2"
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
              </div>
            </div>
          )}

          {/* Result overlay */}
          {(status === "won" || status === "lost") && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
              <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl">
                <h2
                  className={`mb-2 text-3xl font-bold ${
                    status === "won" ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {status === "won" ? "You Won!" : "Time's Up!"}
                </h2>
                <p className="mb-6 text-slate-600">
                  Level {level} · {moves} moves
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => startLevel(level)}
                    className="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-white transition hover:bg-emerald-600"
                  >
                    Play again
                  </button>
                  {status === "won" && level === 1 && (
                    <button
                      onClick={() => startLevel(2)}
                      className="rounded-xl bg-indigo-500 px-4 py-2 font-semibold text-white transition hover:bg-indigo-600"
                    >
                      Next level
                    </button>
                  )}
                  <button
                    onClick={() => setStatus("menu")}
                    className="rounded-xl bg-slate-200 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-300"
                  >
                    Main menu
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
