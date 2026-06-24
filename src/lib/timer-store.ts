export type TimerSnapshot = {
  elapsed: number;
  running: boolean;
  activity: string | null;
};

type Listener = () => void;

const STORAGE_KEY = "app:deepwork";
const MAX_SESSION_MS = 8 * 60 * 60 * 1000; // 8 hours cap

// ─── Module-level state ─────────────────────────────────────────────────
let _startTime: number | null = null;
let _running = false;
let _activity: string | null = null;
let _elapsed = 0;
const listeners = new Set<Listener>();
let intervalId: ReturnType<typeof setInterval> | null = null;
let refCount = 0;

// Cached snapshot for getSnapshot — MUST return stable reference when values unchanged
let _lastSnapshot: TimerSnapshot = { elapsed: 0, running: false, activity: null };

// Stable reference for useSyncExternalStore server snapshot
const SSR_SNAPSHOT: TimerSnapshot = { elapsed: 0, running: false, activity: null };

// ─── Persistence ────────────────────────────────────────────────────────

function hydrate() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved: { startTime: number; activity?: string } = JSON.parse(raw);
    const st = saved.startTime;
    if (typeof st !== "number") return;

    _startTime = st;
    _activity = saved.activity ?? null;
    _running = true;
    _elapsed = Math.min(Date.now() - st, MAX_SESSION_MS);

    // Auto-stop if cap hit
    if (_elapsed >= MAX_SESSION_MS) {
      _running = false;
      _startTime = null;
      _activity = null;
      _elapsed = MAX_SESSION_MS;
    }
  } catch {
    // corrupt data — silently ignore
  }
}

function persist() {
  if (typeof window === "undefined") return;
  if (_running && _startTime !== null) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ startTime: _startTime, activity: _activity }),
    );
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// ─── Interval management ────────────────────────────────────────────────

function tick() {
  if (!_startTime || !_running) return;
  _elapsed = Date.now() - _startTime;

  if (_elapsed >= MAX_SESSION_MS) {
    _elapsed = MAX_SESSION_MS;
    _running = false;
    _startTime = null;
    _activity = null;
    persist();
  }

  notify();
}

function startInterval() {
  if (intervalId !== null) return;
  intervalId = setInterval(tick, 1000);
}

function stopInterval() {
  if (intervalId === null) return;
  clearInterval(intervalId);
  intervalId = null;
}

// ─── Notification ───────────────────────────────────────────────────────

function notify() {
  listeners.forEach((l) => l());
}

// ─── Cross-tab sync ────────────────────────────────────────────────────

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;

    if (e.newValue) {
      try {
        const saved = JSON.parse(e.newValue);
        if (typeof saved.startTime === "number") {
          const st = saved.startTime;
          if (typeof st !== "number") return;
          _startTime = st;
          _activity = saved.activity ?? null;
          _running = true;
          _elapsed = Math.min(Date.now() - st, MAX_SESSION_MS);
          startInterval();
          notify();
        }
      } catch {
        // ignore corrupt cross-tab data
      }
    } else {
      // Key removed — timer stopped/reset in another tab
      _running = false;
      _startTime = null;
      _activity = null;
      _elapsed = 0;
      stopInterval();
      notify();
    }
  });
}

// ─── Init ───────────────────────────────────────────────────────────────

hydrate();

// ─── Public API ─────────────────────────────────────────────────────────

export const timerStore = {
  /** Start a deep work session */
  start(activity: string) {
    _startTime = Date.now();
    _running = true;
    _activity = activity;
    _elapsed = 0;
    startInterval();
    persist();
    notify();
  },

  /**
   * Stop the timer.
   * Returns the session elapsed so the caller can use it (e.g. for save dialog)
   * before the store resets to zero.
   */
  stop(): number {
    const finalElapsed = _elapsed;
    _running = false;
    _startTime = null;
    _activity = null;
    _elapsed = 0;
    stopInterval();
    persist();
    notify();
    return finalElapsed;
  },

  // ── Reactive hooks interface ──────────────────────────────────────────

  /** useSyncExternalStore-compatible subscribe */
  subscribe(listener: Listener) {
    listeners.add(listener);
    refCount++;
    if (_running && intervalId === null) startInterval();
    return () => {
      listeners.delete(listener);
      refCount--;
      if (refCount === 0) stopInterval();
    };
  },

  /** useSyncExternalStore-compatible snapshot — MUST return stable reference when values unchanged */
  getSnapshot(): TimerSnapshot {
    if (
      _lastSnapshot.elapsed !== _elapsed ||
      _lastSnapshot.running !== _running ||
      _lastSnapshot.activity !== _activity
    ) {
      _lastSnapshot = { elapsed: _elapsed, running: _running, activity: _activity };
    }
    return _lastSnapshot;
  },

  /** Server-side snapshot for SSR hydration safety (stable reference) */
  getServerSnapshot(): TimerSnapshot {
    return SSR_SNAPSHOT;
  },
};
