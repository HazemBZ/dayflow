import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card size="sm" className="max-w-sm w-full text-center">
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <h1 className="font-heading text-base font-medium">Page not found</h1>
          <p className="text-sm text-muted-foreground">
            This page doesn&apos;t exist or has been moved.
          </p>
          <Link
            href="/"
            className="inline-flex h-7 items-center justify-center rounded-lg border border-transparent bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground hover:bg-primary/80 transition-all select-none"
          >
            Go home
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
