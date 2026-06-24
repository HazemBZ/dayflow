type ViewMode = "simple" | "full";
type Listener = () => void;

const STORAGE_KEY = "sidebar-view-mode";

let _mode: ViewMode = "full";
const listeners = new Set<Listener>();

function hydrate() {
  if (typeof window === "undefined") return;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "simple" || saved === "full") {
    _mode = saved;
  }
}

function persist() {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, _mode);
}

function notify() {
  listeners.forEach((l) => l());
}

hydrate();

// Cross-tab sync
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    if (e.newValue === "simple" || e.newValue === "full") {
      _mode = e.newValue;
      notify();
    }
  });
}

const SSR_MODE: ViewMode = "full";

export const viewModeStore = {
  get mode(): ViewMode {
    return _mode;
  },

  set(mode: ViewMode) {
    if (mode === _mode) return;
    _mode = mode;
    persist();
    notify();
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot(): ViewMode {
    return _mode;
  },

  getServerSnapshot(): ViewMode {
    return SSR_MODE;
  },
};
