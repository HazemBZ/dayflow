import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card size="sm">
        <CardContent className="py-8">
          <p className="text-sm text-muted-foreground">Loading history…</p>
        </CardContent>
      </Card>
    </div>
  );
}
