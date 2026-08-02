"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { FieldConfigRow } from "@/lib/actions/field-config";

type FieldConfigItemProps = {
  readonly field: FieldConfigRow;
  readonly edit: {
    readonly active: boolean;
    readonly label: string;
    readonly unit: string;
    readonly defaultValue: number;
    readonly saving: boolean;
  };
  readonly onEdit: () => void;
  readonly onCancel: () => void;
  readonly onDelete: () => void;
  readonly onSave: () => void;
  readonly onToggle: (active: boolean) => void;
  readonly onLabelChange: (label: string) => void;
  readonly onUnitChange: (unit: string) => void;
  readonly onDefaultValueChange: (value: number) => void;
};

export function FieldConfigItem({ field, edit, onEdit, onCancel, onDelete, onSave, onToggle, onLabelChange, onUnitChange, onDefaultValueChange }: FieldConfigItemProps) {
  if (edit.active) {
    return (
      <div className="space-y-3 rounded-lg border p-3">
        <div className="grid grid-cols-3 gap-3">
          <FieldInput label="Label" value={edit.label} placeholder="Field label" onChange={onLabelChange} />
          <FieldInput label="Unit" value={edit.unit} placeholder="e.g. hrs" onChange={onUnitChange} />
          <FieldInput label="Default" value={edit.defaultValue.toString()} type="number" onChange={(value) => onDefaultValueChange(Number.parseFloat(value) || 0)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={onSave} disabled={edit.saving}>{edit.saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex min-w-0 items-center gap-3">
        <Checkbox checked={field.active ?? true} onCheckedChange={(checked) => onToggle(checked === true)} aria-label={`Enable ${field.label}`} />
        <div className="min-w-0">
          <span className="text-sm font-medium">{field.label}</span>
          {field.unit && <span className="ml-2 text-xs text-muted-foreground">({field.unit})</span>}
          {field.default_value != null && <span className="ml-2 text-xs text-muted-foreground">default: {field.default_value}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onEdit} aria-label={`Edit ${field.label}`}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label={`Delete ${field.label}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </div>
    </div>
  );
}

type FieldInputProps = {
  readonly label: string;
  readonly value: string;
  readonly placeholder?: string;
  readonly type?: "number";
  readonly onChange: (value: string) => void;
};

function FieldInput({ label, value, placeholder, type, onChange }: FieldInputProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input value={value} placeholder={placeholder} type={type} min={type === "number" ? 0 : undefined} step={type === "number" ? 0.5 : undefined} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
