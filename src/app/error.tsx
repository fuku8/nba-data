"use client";

import { Card, CardContent } from "@/components/ui/card";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center py-16">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-4">
          <h2 className="text-xl font-semibold">エラーが発生しました</h2>
          <p className="text-muted-foreground text-sm">{error.message}</p>
          <button
            onClick={reset}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90"
          >
            再試行
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
