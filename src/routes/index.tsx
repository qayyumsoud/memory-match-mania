import { createFileRoute } from "@tanstack/react-router";
import MemoryGame from "@/components/MemoryGame";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Memory Card Game" },
      { name: "description", content: "A two-level memory card matching game with timer and SFX." },
      { property: "og:title", content: "Memory Card Game" },
      { property: "og:description", content: "Match all the pairs before time runs out." },
    ],
  }),
  component: Index,
});

function Index() {
  return <MemoryGame />;
}
