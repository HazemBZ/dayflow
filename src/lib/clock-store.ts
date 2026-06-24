type Listener = () => void;

let _time: Date = new Date();
const listeners = new Set<Listener>();
let intervalId: ReturnType<typeof setInterval> | null = null;
let refCount = 0;

// Stable reference for SSR — never changes, avoids infinite loop from useSyncExternalStore
const SSR_SNAPSHOT: Date = new Date(0);

function tick() {
  _time = new Date();
  listeners.forEach((l) => l());
}

function start() {
  if (intervalId !== null) return;
  intervalId = setInterval(tick, 1000);
}

function stop() {
  if (intervalId === null) return;
  clearInterval(intervalId);
  intervalId = null;
}

export const clockStore = {
  /** Current wall clock time (module-level, survives React lifecycle) */
  get time(): Date {
    return _time;
  },

  /** Subscribe to time updates. Returns unsubscribe. Starts interval on first subscriber. */
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    refCount++;
    start();
    return () => {
      listeners.delete(listener);
      refCount--;
      if (refCount === 0) {
        stop();
      }
    };
  },

  /** Snapshot for useSyncExternalStore. Returns _time reference (stable between ticks). */
  getSnapshot(): Date {
    return _time;
  },

  /** Server snapshot for SSR hydration. Must return stable reference. */
  getServerSnapshot(): Date {
    return SSR_SNAPSHOT;
  },
};
