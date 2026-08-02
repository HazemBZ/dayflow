"use client";

import { useCallback, useState } from "react";
import { PageScroll } from "@/components/ui/page-scroll";
import { DeepWorkSection } from "@/components/settings/deep-work-section";
import { FieldConfigSection } from "@/components/settings/field-config-section";
import { PageActivationSection } from "@/components/settings/page-activation-section";
import { ScaleSection } from "@/components/settings/scale-section";
import type { PageActivationRoute } from "@/lib/page-activation/registry";

type PageActivationState = {
  readonly route: PageActivationRoute;
  readonly label: string;
  readonly active: boolean;
};

type SettingsClientProps = {
  readonly pageActivationStates: readonly PageActivationState[];
};

type Feedback = {
  readonly message: string;
  readonly success: boolean;
};

export function SettingsClient({ pageActivationStates }: SettingsClientProps) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const showFeedback = useCallback((message: string, success: boolean) => {
    setFeedback({ message, success });
    window.setTimeout(() => setFeedback(null), 3000);
  }, []);

  return (
    <>
      {feedback && <div className={feedback.success ? "fixed right-4 top-4 z-50 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground shadow-lg transition-all" : "fixed right-4 top-4 z-50 rounded-lg bg-destructive px-4 py-2 text-sm text-destructive-foreground shadow-lg transition-all"}>{feedback.message}</div>}
      <PageScroll header={<SettingsHeader />} maxWidth="max-w-3xl" scrollContentClass="space-y-6 pt-6">
        <ScaleSection />
        <PageActivationSection initialStates={pageActivationStates} showFeedback={showFeedback} />
        <DeepWorkSection showFeedback={showFeedback} />
        <FieldConfigSection title="Weekly Targets" section="weekly_target" showFeedback={showFeedback} />
        <FieldConfigSection title="Scorecard Fields" section="scorecard" showFeedback={showFeedback} />
      </PageScroll>
    </>
  );
}

function SettingsHeader() {
  return (
    <div className="rounded-xl border bg-background px-5 py-2 shadow-sm">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Manage pages, deep work activities, weekly targets, and scorecard fields</p>
    </div>
  );
}
