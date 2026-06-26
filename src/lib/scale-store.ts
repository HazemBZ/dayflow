export const SCALE_PRESETS = [0.75, 1, 1.25, 1.5, 2] as const;
export type Scale = (typeof SCALE_PRESETS)[number];

type Listener = () => void;

const STORAGE_KEY = "ui-scale";

let _scale: Scale = 1;
const listeners = new Set<Listener>();

function hydrate() {
  if (typeof window === "undefined") return;
  const saved = localStorage.getItem(STORAGE_KEY);
  const parsed = parseFloat(saved ?? "");
  if ((SCALE_PRESETS as readonly number[]).includes(parsed)) {
    _scale = parsed as Scale;
  }
}

function persist() {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, String(_scale));
}

function notify() {
  listeners.forEach((l) => l());
}

hydrate();

// Cross-tab sync
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    const parsed = parseFloat(e.newValue ?? "");
    if ((SCALE_PRESETS as readonly number[]).includes(parsed)) {
      _scale = parsed as Scale;
      notify();
    }
  });
}

const SSR_SCALE: Scale = 1;

export const scaleStore = {
  get scale(): Scale {
    return _scale;
  },

  set(scale: Scale) {
    if (scale === _scale) return;
    _scale = scale;
    persist();
    notify();
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot(): Scale {
    return _scale;
  },

  getServerSnapshot(): Scale {
    return SSR_SCALE;
  },
};
