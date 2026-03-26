import { GamesClient } from "./client";

export const revalidate = 3600;

export default function GamesPage() {
  return <GamesClient />;
}
