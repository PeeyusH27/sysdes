import { HubTabs } from "@/components/content/HubBits";
import { LabClient } from "./client";

export const metadata = {
  title: "Architecture lab",
  description: "Grow an infrastructure from one server to a whole stack, click any component to learn it, then spike the traffic and break things to see what holds.",
  alternates: { canonical: "/architecture" },
};

export default function ArchitecturePage() {
  return (
    <div className="lab-page">
      <header className="container page-head hub-head lab-head" data-track="sd">
        <p className="eyebrow">System design · Architecture lab</p>
        <h1>
          Grow it, click it, <span className="grad">break it</span>
        </h1>
        <p className="lede">One system, from a single server to a full stack. Watch it grow as traffic does, learn each piece, then try to break it.</p>
      </header>
      <HubTabs track="sd" />
      <LabClient />
    </div>
  );
}
