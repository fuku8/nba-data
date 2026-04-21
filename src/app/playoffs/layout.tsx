"use client";

import { useEffect } from "react";

export default function PlayoffsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.body.classList.add("playoff-page");
    return () => document.body.classList.remove("playoff-page");
  }, []);

  return <>{children}</>;
}
