"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { PageScroll } from "@/components/ui/page-scroll";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getDeepWorkActivities,
  addDeepWorkActivity,
  deleteDeepWorkActivity,
  reorderDeepWorkActivities,
} from "@/lib/actions/deep-work";
import {
  getFieldConfigs,
  upsertFieldConfig,
  deleteFieldConfig,
  toggleFieldConfig,
} from "@/lib/actions/field-config";
import type { FieldConfigRow } from "@/lib/actions/field-config";
import { scaleStore, SCALE_PRESETS } from "@/lib/scale-store";

type DeepWorkItem = Awaited<ReturnType<typeof getDeepWorkActivities>>[number];

// ─── Main Page ────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  const showFeedback = useCallback((msg: string, ok: boolean) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3000);
  }, []);

  return (
    <>
      {/* ── Feedback toast ─────────────────────────────────── */}
      {feedback && (
        <div
          className={`fixed right-4 top-4 z-50 rounded-lg px-4 py-2 text-sm shadow-lg transition-all ${
            feedback.ok
              ? "bg-primary text-primary-foreground"
              : "bg-destructive text-destructive-foreground"
          }`}
        >
          {feedback.msg}
        </div>
      )}

      <PageScroll
        header={
          <div className="bg-background px-5 py-2 rounded-xl shadow-sm border">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Settings
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage deep work activities, weekly targets, and scorecard fields
            </p>
          </div>
        }
        maxWidth="max-w-3xl"
        scrollContentClass="space-y-6 pt-6"
      >
        <ScaleSection />
        <DeepWorkSection showFeedback={showFeedback} />
        <FieldConfigSection
          title="Weekly Targets"
          section="weekly_target"
          showFeedback={showFeedback}
        />
        <FieldConfigSection
          title="Scorecard Fields"
          section="scorecard"
          showFeedback={showFeedback}
        />
      </PageScroll>
    </>
  );
}

// ─── Section 0: UI Scale ─────────────────────────────────────────────────
function ScaleSection() {
  const currentScale = useSyncExternalStore(
    scaleStore.subscribe,
    scaleStore.getSnapshot,
    scaleStore.getServerSnapshot,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>UI Scale</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Adjust interface size for your display. Scales all UI elements
          uniformly — useful for high-resolution or larger displays.
        </p>
        <div className="flex gap-2 flex-wrap">
          {(SCALE_PRESETS as readonly number[]).map((s) => {
            const active = currentScale === s;
            const label = s === 1 ? "100%" : `${Math.round(s * 100)}%`;
            return (
              <button
                key={s}
                onClick={() => scaleStore.set(s as typeof currentScale)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Section 1: Deep Work Activities ─────────────────────────────────────
function DeepWorkSection({
  showFeedback,
}: {
  showFeedback: (msg: string, ok: boolean) => void;
}) {
  const [activities, setActivities] = useState<DeepWorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  async function load() {
    try {
      const data = await getDeepWorkActivities();
      setActivities(data);
    } catch {
      showFeedback("Failed to load activities", false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    try {
      await addDeepWorkActivity({ name });
      setNewName("");
      showFeedback("Activity added", true);
      await load();
    } catch {
      showFeedback("Failed to add activity", false);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteDeepWorkActivity(id);
      showFeedback("Activity deleted", true);
      await load();
    } catch {
      showFeedback("Failed to delete activity", false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Deep Work Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            Loading…
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deep Work Activities</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No activities yet. Add one below.
          </p>
        ) : (
          <div className="space-y-2">
            {activities.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <span className="text-sm font-medium">{a.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(a.id)}
                  aria-label={`Delete ${a.name}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="Activity name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
          />
          <Button
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Section 2 & 3: Field Config (shared by Weekly Targets & Scorecard) ──
function FieldConfigSection({
  title,
  section,
  showFeedback,
}: {
  title: string;
  section: string;
  showFeedback: (msg: string, ok: boolean) => void;
}) {
  const [configs, setConfigs] = useState<FieldConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editDefaultValue, setEditDefaultValue] = useState(0);
  const [saving, setSaving] = useState(false);

  async function load(): Promise<FieldConfigRow[]> {
    try {
      const data = await getFieldConfigs(section);
      setConfigs(data);
      return data;
    } catch {
      showFeedback("Failed to load field configs", false);
      return [];
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [section]);

  function startEdit(field: FieldConfigRow) {
    setEditingId(field.id);
    setEditLabel(field.label ?? "");
    setEditUnit(field.unit ?? "");
    setEditDefaultValue(field.default_value ?? 0);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSave(field: FieldConfigRow) {
    setSaving(true);
    try {
      await upsertFieldConfig({
        id: field.id,
        section: field.section,
        key: field.key,
        label: editLabel,
        unit: editUnit || null,
        default_value: editDefaultValue,
        max_value: field.max_value,
        sort_order: field.sort_order ?? 0,
        active: field.active ?? true,
      });
      showFeedback("Field saved", true);
      setEditingId(null);
      await load();
    } catch {
      showFeedback("Failed to save field", false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteFieldConfig(id);
      showFeedback("Field deleted", true);
      if (editingId === id) setEditingId(null);
      await load();
    } catch {
      showFeedback("Failed to delete field", false);
    }
  }

  async function handleToggle(id: number, active: boolean) {
    try {
      await toggleFieldConfig(id, active);
      await load();
    } catch {
      showFeedback("Failed to toggle field", false);
    }
  }

  async function handleAdd() {
    const key = `new_${Date.now()}`;
    try {
      await upsertFieldConfig({
        section,
        key,
        label: "",
        unit: null,
        default_value: 0,
        active: true,
      });
      const data = await load();
      const added = data.find((c) => c.key === key);
      if (added) startEdit(added);
    } catch {
      showFeedback("Failed to add field", false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            Loading…
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {configs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No fields yet. Add one below.
          </p>
        ) : (
          <div className="space-y-3">
            {configs.map((f) => (
              <div key={f.id} className="rounded-lg border p-3">
                {editingId === f.id ? (
                  // ── Edit mode ──
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          Label
                        </label>
                        <Input
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          placeholder="Field label"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          Unit
                        </label>
                        <Input
                          value={editUnit}
                          onChange={(e) => setEditUnit(e.target.value)}
                          placeholder="e.g. hrs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          Default
                        </label>
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          value={editDefaultValue}
                          onChange={(e) =>
                            setEditDefaultValue(parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={cancelEdit}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSave(f)}
                        disabled={saving}
                      >
                        {saving ? "Saving…" : "Save"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  // ── Display mode ──
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={f.active ?? true}
                        onCheckedChange={(v) =>
                          handleToggle(f.id, v === true)
                        }
                      />
                      <div>
                        <span className="text-sm font-medium">{f.label}</span>
                        {f.unit && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({f.unit})
                          </span>
                        )}
                        {f.default_value != null && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            default: {f.default_value}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(f)}
                        aria-label={`Edit ${f.label}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(f.id)}
                        aria-label={`Delete ${f.label}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <Button variant="outline" onClick={handleAdd} className="w-full">
          <Plus className="mr-1 h-4 w-4" />
          Add Field
        </Button>
      </CardContent>
    </Card>
  );
}
