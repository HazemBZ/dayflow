"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { updatePageActivation } from "@/lib/page-activation/actions";
import type { PageActivationRoute } from "@/lib/page-activation/registry";
import type { FeedbackHandler } from "@/components/settings/types";

type PageActivationState = {
  readonly route: PageActivationRoute;
  readonly label: string;
  readonly active: boolean;
};

type PageActivationSectionProps = {
  readonly initialStates: readonly PageActivationState[];
  readonly showFeedback: FeedbackHandler;
};

export function PageActivationSection({
  initialStates,
  showFeedback,
}: PageActivationSectionProps) {
  const router = useRouter();
  const [states, setStates] = useState(initialStates);
  const [pendingRoute, setPendingRoute] = useState<PageActivationRoute | null>(null);

  useEffect(() => {
    setStates(initialStates);
  }, [initialStates]);

  async function handleChange(route: PageActivationRoute, active: boolean): Promise<void> {
    setPendingRoute(route);
    try {
      await updatePageActivation({ route, active });
      setStates((currentStates) => currentStates.map((state) => state.route === route ? { ...state, active } : state));
      router.refresh();
    } catch (error) {
      if (error instanceof Error) {
        showFeedback("Failed to update page visibility", false);
        return;
      }
      throw error;
    } finally {
      setPendingRoute(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Page Activation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Choose which planning pages appear in navigation. Dashboard and Settings always remain available.
        </p>
        <div className="divide-y rounded-lg border">
          {states.map((state) => (
            <label key={state.route} className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5">
              <span className="min-w-0">
                <span className="block text-sm font-medium">{state.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{state.route}</span>
              </span>
              <Checkbox checked={state.active} disabled={pendingRoute === state.route} onCheckedChange={(checked) => void handleChange(state.route, checked === true)} aria-label={`Show ${state.label} in navigation`} />
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
