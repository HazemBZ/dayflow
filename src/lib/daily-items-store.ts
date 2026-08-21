import {
  getDailyItems,
  createDailyItem,
  updateDailyItem,
  deleteDailyItem,
} from "@/lib/actions/daily";
import type { DailyItemKind } from "@/lib/db/schema";

export interface DailyItem {
  id: number;
  date: string;
  kind: DailyItemKind;
  text: string;
  completed: boolean | number;
  sortOrder: number | null;
}

type Listener = () => void;

// Stable references — return same array refs to avoid infinite loops
const _emptySnapshot: readonly DailyItem[] = Object.freeze([]);

// Cache keyed by `${date}:${kind}` so chores/extras survive tab unmount/remount
const _itemsByKey = new Map<string, DailyItem[]>();
const _snapshots = new Map<string, readonly DailyItem[]>();
const _loadedKeys = new Set<string>();
const _pendingLoads = new Map<string, Promise<void>>();
const listeners = new Set<Listener>();

function keyOf(date: string, kind: DailyItemKind): string {
  return `${date}:${kind}`;
}

function notify() {
  listeners.forEach((l) => l());
}

function setKeyItems(keyStr: string, rows: DailyItem[]) {
  _itemsByKey.set(keyStr, rows);
  _snapshots.set(keyStr, Object.freeze([...rows]));
}

/** Always fetches (bypasses the loaded guard) and updates the cache. */
function fetchKey(date: string, kind: DailyItemKind): Promise<void> {
  const keyStr = keyOf(date, kind);
  const inFlight = _pendingLoads.get(keyStr);
  if (inFlight) return inFlight;
  const promise = (async () => {
    try {
      const rows = await getDailyItems(date, kind);
      setKeyItems(keyStr, rows as DailyItem[]);
      _loadedKeys.add(keyStr);
      notify();
    } finally {
      _pendingLoads.delete(keyStr);
    }
  })();
  _pendingLoads.set(keyStr, promise);
  return promise;
}

function patchItem(id: number, patch: Partial<DailyItem>) {
  for (const [keyStr, rows] of _itemsByKey) {
    if (rows.some((r) => r.id === id)) {
      setKeyItems(
        keyStr,
        rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      );
      break;
    }
  }
  notify();
}

export const dailyItemsStore = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Fetch once per date+kind. No-op when already loaded or in flight — safe to call on hover. */
  load(date: string, kind: DailyItemKind): Promise<void> {
    const keyStr = keyOf(date, kind);
    if (_loadedKeys.has(keyStr)) return Promise.resolve();
    const inFlight = _pendingLoads.get(keyStr);
    if (inFlight) return inFlight;
    return fetchKey(date, kind);
  },

  isLoaded(date: string, kind: DailyItemKind): boolean {
    return _loadedKeys.has(keyOf(date, kind));
  },

  getItems(date: string, kind: DailyItemKind): readonly DailyItem[] {
    return _snapshots.get(keyOf(date, kind)) ?? _emptySnapshot;
  },

  async add(date: string, kind: DailyItemKind, text: string): Promise<void> {
    await createDailyItem({ date, kind, text });
    // Server returns only { success }, so refetch the list
    await fetchKey(date, kind);
  },

  async toggle(id: number, completed: boolean): Promise<void> {
    await updateDailyItem(id, { completed });
    patchItem(id, { completed });
  },

  async setText(id: number, text: string): Promise<void> {
    await updateDailyItem(id, { text });
    patchItem(id, { text });
  },

  async remove(id: number): Promise<void> {
    await deleteDailyItem(id);
    for (const [keyStr, rows] of _itemsByKey) {
      if (rows.some((r) => r.id === id)) {
        setKeyItems(
          keyStr,
          rows.filter((r) => r.id !== id),
        );
        break;
      }
    }
    notify();
  },
};
