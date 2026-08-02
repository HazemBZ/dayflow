"use client";

import { startTransition, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldConfigItem } from "@/components/settings/field-config-item";
import type { FeedbackHandler } from "@/components/settings/types";
import {
  deleteFieldConfig,
  getFieldConfigs,
  toggleFieldConfig,
  upsertFieldConfig,
} from "@/lib/actions/field-config";
import type { FieldConfigRow } from "@/lib/actions/field-config";

type FieldConfigSectionProps = {
  readonly title: string;
  readonly section: string;
  readonly showFeedback: FeedbackHandler;
};

export function FieldConfigSection({ title, section, showFeedback }: FieldConfigSectionProps) {
  const [configs, setConfigs] = useState<readonly FieldConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editDefaultValue, setEditDefaultValue] = useState(0);
  const [saving, setSaving] = useState(false);

  async function loadConfigs(): Promise<readonly FieldConfigRow[]> {
    const configs = await getFieldConfigs(section);
    startTransition(() => setConfigs(configs));
    return configs;
  }

  useEffect(() => {
    void (async () => {
      try {
        const configs = await getFieldConfigs(section);
        startTransition(() => setConfigs(configs));
      } catch (error) {
        if (error instanceof Error) {
          showFeedback("Failed to load field configs", false);
          return;
        }
        throw error;
      } finally {
        startTransition(() => setLoading(false));
      }
    })();
  }, [section, showFeedback]);

  function startEdit(field: FieldConfigRow): void {
    setEditingId(field.id);
    setEditLabel(field.label ?? "");
    setEditUnit(field.unit ?? "");
    setEditDefaultValue(field.default_value ?? 0);
  }

  async function handleSave(field: FieldConfigRow): Promise<void> {
    setSaving(true);
    try {
      await upsertFieldConfig({ id: field.id, section: field.section, key: field.key, label: editLabel, unit: editUnit || null, default_value: editDefaultValue, max_value: field.max_value, sort_order: field.sort_order ?? 0, active: field.active ?? true });
      showFeedback("Field saved", true);
      setEditingId(null);
      await loadConfigs();
    } catch (error) {
      if (error instanceof Error) {
        showFeedback("Failed to save field", false);
      } else {
        throw error;
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number): Promise<void> {
    try {
      await deleteFieldConfig(id);
      showFeedback("Field deleted", true);
      if (editingId === id) setEditingId(null);
      await loadConfigs();
    } catch (error) {
      if (error instanceof Error) {
        showFeedback("Failed to delete field", false);
      } else {
        throw error;
      }
    }
  }

  async function handleToggle(id: number, active: boolean): Promise<void> {
    try {
      await toggleFieldConfig(id, active);
      await loadConfigs();
    } catch (error) {
      if (error instanceof Error) {
        showFeedback("Failed to toggle field", false);
      } else {
        throw error;
      }
    }
  }

  async function handleAdd(): Promise<void> {
    const key = `new_${Date.now()}`;
    try {
      await upsertFieldConfig({ section, key, label: "", unit: null, default_value: 0, active: true });
      const configs = await loadConfigs();
      const added = configs.find((config) => config.key === key);
      if (added) startEdit(added);
    } catch (error) {
      if (error instanceof Error) {
        showFeedback("Failed to add field", false);
      } else {
        throw error;
      }
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {loading ? <LoadingRows /> : configs.length === 0 ? <p className="text-sm text-muted-foreground">No fields yet. Add one below.</p> : <div className="space-y-3">{configs.map((field) => <FieldConfigItem key={field.id} field={field} edit={{ active: editingId === field.id, label: editLabel, unit: editUnit, defaultValue: editDefaultValue, saving }} onEdit={() => startEdit(field)} onCancel={() => setEditingId(null)} onDelete={() => void handleDelete(field.id)} onSave={() => void handleSave(field)} onToggle={(active) => void handleToggle(field.id, active)} onLabelChange={setEditLabel} onUnitChange={setEditUnit} onDefaultValueChange={setEditDefaultValue} />)}</div>}
        <Button variant="outline" onClick={() => void handleAdd()} className="w-full"><Plus className="mr-1 h-4 w-4" />Add Field</Button>
      </CardContent>
    </Card>
  );
}

function LoadingRows() {
  return <div className="space-y-2">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-12 w-full animate-pulse rounded-lg bg-muted/30" />)}</div>;
}
