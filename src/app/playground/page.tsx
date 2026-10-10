import { PlaygroundClient } from "./client";

export const metadata = {
  title: "Playground",
  description: "Drag and drop an HLD diagram, get live design feedback, simulate traffic and share it.",
};

export default function PlaygroundPage() {
  return <PlaygroundClient />;
}
