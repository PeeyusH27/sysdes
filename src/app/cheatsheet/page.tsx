import Cheatsheet from "@content/cheatsheet.mdx";
import { PrintButton } from "./print";

export const metadata = { title: "Cheatsheet", description: "Numbers to know, formulas, availability tables and decision tables for system design interviews." };

export default function CheatsheetPage() {
  return (
    <div className="container" style={{ maxWidth: 900 }}>
      <header className="page-head">
        <span className="eyebrow">Reference</span>
        <h1>Cheatsheet</h1>
        <p className="lede">Everything you should be able to say from memory, on one printable page.</p>
        <PrintButton />
      </header>
      <div className="prose">
        <Cheatsheet />
      </div>
    </div>
  );
}
