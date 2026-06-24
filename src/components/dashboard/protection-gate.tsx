"use client";

import { useState, useCallback } from "react";
import { Shield, ShieldCheck } from "lucide-react";
import { SectionTooltip } from "@/components/ui/section-tooltip";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";

const PROTECTION_ACTIONS = [
  { value: "declined", label: "Declined" },
  { value: "delegated", label: "Delegated" },
  { value: "deferred", label: "Deferred" },
  { value: "documented", label: "Documented" },
] as const;

interface ProtectionGateProps {
  onLog: (requestDescription: string, actionTaken: string) => Promise<void>;
}

export function ProtectionGate({ onLog }: ProtectionGateProps) {
  const [open, setOpen] = useState(false);
  const [requestDescription, setRequestDescription] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [saving, setSaving] = useState(false);

  const handleActionChange = (value: string | null) => {
    setActionTaken(value ?? "");
  };

  const handleSave = useCallback(() => {
    if (!requestDescription.trim() || !actionTaken) return;
    setSaving(true);
    onLog(requestDescription.trim(), actionTaken)
      .then(() => {
        setRequestDescription("");
        setActionTaken("");
        setOpen(false);
      })
      .catch(console.error)
      .finally(() => setSaving(false));
  }, [requestDescription, actionTaken, onLog]);

  return (
    <section>
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Protection Gate
        </span>
      </div>
      <SectionTooltip>
        <p>
          <strong>Protection Gate</strong> tracks distractions you successfully
          deflected.
        </p>
        <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs">
          <li>Every time you say &ldquo;no&rdquo; to an interrupt, log it</li>
          <li>Choose how you handled it: declined, delegated, deferred, or documented</li>
          <li>Over time, this builds awareness of your focus patterns</li>
        </ul>
      </SectionTooltip>
      <Card size="sm">
      <CardContent className="flex items-center justify-between py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span>Distraction deflected?</span>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button size="xs" variant="outline" className="gap-1.5" onClick={() => setOpen(true)}>
            <ShieldCheck className="h-3 w-3" />
            Log
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Protection Gate</DialogTitle>
              <DialogDescription>
                Log a distraction you deflected today.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  What was the request?
                </label>
                <Textarea
                  placeholder="e.g. 'Can you review this PR?'"
                  value={requestDescription}
                  onChange={(e) => setRequestDescription(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  What did you do?
                </label>
                <Select value={actionTaken} onValueChange={handleActionChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select action..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PROTECTION_ACTIONS.map((action) => (
                      <SelectItem key={action.value} value={action.value}>
                        {action.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleSave}
                disabled={!requestDescription.trim() || !actionTaken || saving}
              >
                {saving ? "Saving..." : "Log Protection"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
    </section>
  );
}
