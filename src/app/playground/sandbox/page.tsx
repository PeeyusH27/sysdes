import { PlaygroundClient } from "../client";

export const metadata = {
  title: "Playground sandbox",
  description: "A free canvas: drag and drop an HLD diagram, get live design feedback, simulate traffic and share it.",
};

export default function SandboxPage() {
  return <PlaygroundClient />;
}
