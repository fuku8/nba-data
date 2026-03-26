import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center py-16">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-4">
          <h2 className="text-xl font-semibold">ページが見つかりません</h2>
          <p className="text-muted-foreground text-sm">
            お探しのページは存在しないか、移動した可能性があります。
          </p>
          <Link
            href="/"
            className="inline-block px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90"
          >
            ホームに戻る
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
