// @vitest-environment jsdom
// Java and Python versions of the LLD answers (parking lot, elevator, vending machine), and the
// JavaScript | Java | Python switch in <CodeTabs> that shows them.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createElement, type ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { act, cleanup, fireEvent, render, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { CodeBlock, CodeTabs } from "@/components/content/CodeBlock";
import { useCodeLangStore } from "@/lib/code-lang";

const root = path.resolve(__dirname, "..");

// ---------------------------------------------------------------- the Java and Python test suites

// JAVA_HOME wins; otherwise whatever is on PATH. macOS ships /usr/bin/java stubs that exit 1
// when no JDK is installed, so probe by running them, not by checking the file exists.
const bin = (tool: string) => (process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, "bin", tool) : tool);
const runs = (cmd: string, args: string[]) => {
  try {
    return spawnSync(cmd, args, { encoding: "utf8", timeout: 20_000 }).status === 0;
  } catch {
    return false;
  }
};
const hasJava = runs(bin("javac"), ["-version"]) && runs(bin("java"), ["-version"]);
const hasPython = runs("python3", ["--version"]);

const LLD = [
  { slug: "parking-lot", javaMain: "ParkingLotTest" },
  { slug: "elevator", javaMain: "ElevatorTest" },
  { slug: "vending-machine", javaMain: "VendingMachineTest" },
];

/** How many tests the JavaScript suite has: the other languages must cover at least as many. */
const jsTestCount = (snippets: string) =>
  readdirSync(snippets)
    .filter((f) => f.endsWith(".test.js"))
    .reduce((n, f) => n + (readFileSync(path.join(snippets, f), "utf8").match(/^test\(/gm)?.length ?? 0), 0);

describe.each(LLD)("$slug in Java and Python", ({ slug, javaMain }) => {
  const snippets = path.join(root, "content/questions", slug, "snippets");

  it.skipIf(!hasJava)("Java compiles (javac -Xlint) and its tests pass", () => {
    const javaDir = path.join(snippets, "java");
    const out = mkdtempSync(path.join(os.tmpdir(), `lld-${slug}-`));
    try {
      const sources = readdirSync(javaDir).filter((f) => f.endsWith(".java")).map((f) => path.join(javaDir, f));
      // auxiliaryclass: the snippets deliberately keep small package-private types together in one file.
      const compile = spawnSync(bin("javac"), ["-encoding", "UTF-8", "-Xlint:all,-auxiliaryclass", "-Werror", "-d", out, ...sources], { encoding: "utf8" });
      expect(compile.status, compile.stderr).toBe(0);
      const run = spawnSync(bin("java"), ["-cp", out, javaMain], { encoding: "utf8", timeout: 60_000 });
      expect(run.status, run.stdout + run.stderr).toBe(0);
      expect(run.stdout).toContain("All tests passed.");
      expect(run.stdout.match(/^PASS /gm)?.length ?? 0).toBeGreaterThanOrEqual(jsTestCount(snippets));
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  }, 120_000);

  it.skipIf(!hasPython)("Python unittest passes", () => {
    // -B: no __pycache__ in the content folder.
    const run = spawnSync("python3", ["-B", "-m", "unittest", "discover", "-s", path.join(snippets, "python"), "-p", "test_*.py"], {
      encoding: "utf8",
      timeout: 60_000,
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
    });
    expect(run.status, run.stdout + run.stderr).toBe(0);
    const ran = Number(/Ran (\d+) tests?/.exec(run.stderr)?.[1] ?? 0);
    expect(ran).toBeGreaterThanOrEqual(jsTestCount(snippets));
    expect(run.stderr).toMatch(/\nOK\b/);
  }, 60_000);
});

// ---------------------------------------------------------------- the language switch

const PARKING = {
  base: "questions/parking-lot",
  files: ["snippets/models.js", "snippets/parking-lot.js", "snippets/allocate.sql"],
  java: ["snippets/java/Models.java", "snippets/java/ParkingLot.java", "snippets/allocate.sql"],
  python: ["snippets/python/models.py", "snippets/python/parking_lot.py", "snippets/allocate.sql"],
};
const raw = (file: string) => readFileSync(path.join(root, "content", PARKING.base, file), "utf8").trim();
const tabsEl = (props: Partial<typeof PARKING> = {}) => CodeTabs({ ...PARKING, ...props }) as Promise<ReactElement>;
const radio = (c: HTMLElement, name: string) => within(c).getByRole("radio", { name });

// The first highlight loads shiki's grammars, which takes a few seconds.
beforeAll(() => tabsEl(), 60_000);
beforeEach(() => {
  useCodeLangStore.setState({ lang: "js" });
  localStorage.clear();
});
afterEach(cleanup);

describe("<CodeTabs java python>", () => {
  it("the server renders JavaScript with a three-way radio group above the file tabs", async () => {
    useCodeLangStore.setState({ lang: "python" });                    // a stored choice must not reach the server HTML
    const html = renderToString(await tabsEl());
    const doc = new DOMParser().parseFromString(html, "text/html");
    const radios = [...doc.querySelectorAll('[role="radiogroup"] [role="radio"]')];
    expect(radios.map((r) => r.textContent)).toEqual(["JavaScript", "Java", "Python"]);
    expect(radios.map((r) => r.getAttribute("aria-checked"))).toEqual(["true", "false", "false"]);
    expect(doc.querySelector('[role="radiogroup"]')?.getAttribute("aria-label")).toBe("Code language");
    expect([...doc.querySelectorAll('[role="tab"]')].map((t) => t.textContent)).toEqual(["models.js", "parking-lot.js", "allocate.sql"]);
    expect(doc.querySelector('[role="tabpanel"]')?.textContent).toContain("export const VehicleType");
    expect(html).not.toContain("enum VehicleType");                   // other languages stay out of the HTML
  });

  it("highlights Java and Python with real token colours", async () => {
    const el = await tabsEl();
    const sets = (el.props as { sets: { lang: string; tabs: { html: string }[] }[] }).sets;
    for (const lang of ["java", "python"]) {
      const html = sets.find((s) => s.lang === lang)!.tabs[1].html;
      const colours = new Set(html.match(/--shiki-light:#[0-9a-f]{6}/gi));
      expect(colours.size, `${lang} token colours`).toBeGreaterThanOrEqual(4);
    }
  });

  it("switching language swaps the file tabs, is remembered, and every block follows", async () => {
    const [a, b] = await Promise.all([tabsEl(), tabsEl()]);
    const { container } = render(createElement("div", null, createElement("section", { key: "a" }, a), createElement("section", { key: "b" }, b)));
    const [first, second] = [...container.querySelectorAll("section")];
    act(() => fireEvent.click(radio(first, "Java")));
    for (const block of [first, second]) {
      expect(radio(block, "Java").getAttribute("aria-checked")).toBe("true");
      expect(within(block).getAllByRole("tab").map((t) => t.textContent)).toEqual(["Models.java", "ParkingLot.java", "allocate.sql"]);
      expect(within(block).getByRole("tabpanel").textContent).toContain("enum VehicleType");
    }
    expect(JSON.parse(localStorage.getItem("sds-code-lang")!).state.lang).toBe("java");
  });

  it("each language keeps its own file tab, and copy copies the visible file", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const { container } = render(await tabsEl());
    act(() => fireEvent.click(radio(container, "Python")));
    act(() => fireEvent.click(within(container).getByRole("tab", { name: "parking_lot.py" })));
    const panel = within(container).getByRole("tabpanel");
    expect(panel.getAttribute("aria-labelledby")).toBe(within(container).getByRole("tab", { name: "parking_lot.py" }).id);
    await act(async () => fireEvent.click(within(container).getByRole("button", { name: "Copy parking_lot.py" })));
    expect(writeText).toHaveBeenLastCalledWith(raw("snippets/python/parking_lot.py"));
    act(() => fireEvent.click(radio(container, "JavaScript")));
    expect(within(container).getByRole("tab", { selected: true }).textContent).toBe("models.js");
    act(() => fireEvent.click(radio(container, "Python")));
    expect(within(container).getByRole("tab", { selected: true }).textContent).toBe("parking_lot.py");
  });

  it("arrow keys move the language and the file with roving focus", async () => {
    const { container } = render(await tabsEl());
    act(() => radio(container, "JavaScript").focus());
    act(() => fireEvent.keyDown(radio(container, "JavaScript"), { key: "ArrowRight" }));
    expect(radio(container, "Java").getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(radio(container, "Java"));
    act(() => fireEvent.keyDown(radio(container, "Java"), { key: "ArrowLeft" }));
    act(() => fireEvent.keyDown(radio(container, "JavaScript"), { key: "End" }));
    expect(useCodeLangStore.getState().lang).toBe("python");
    const tabs = within(container).getAllByRole("tab");
    expect(tabs.map((t) => t.tabIndex)).toEqual([0, -1, -1]);
    act(() => fireEvent.keyDown(tabs[0], { key: "ArrowLeft" }));      // wraps to the last file
    expect(document.activeElement?.textContent).toBe("allocate.sql");
    expect(within(container).getByRole("tabpanel").tabIndex).toBe(0); // the scrolling panel takes focus
  });

  it("hydrates the server's JavaScript cleanly, then shows the stored language", async () => {
    const el = await tabsEl();
    const html = renderToString(el);
    useCodeLangStore.setState({ lang: "java" });                     // what localStorage says on this visit
    const host = document.createElement("div");
    host.innerHTML = html;
    document.body.append(host);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const recoverable = vi.fn();
    await act(async () => {
      hydrateRoot(host, el, { onRecoverableError: recoverable });
    });
    expect(recoverable).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
    expect(radio(host, "Java").getAttribute("aria-checked")).toBe("true");
    expect(within(host).getByRole("tabpanel").textContent).toContain("enum VehicleType");
    host.remove();
  });

  it("a block without the chosen language shows its own; a single-language block has no switch", async () => {
    useCodeLangStore.setState({ lang: "python" });
    const { container } = render(await tabsEl({ python: undefined }));
    expect(radio(container, "JavaScript").getAttribute("aria-checked")).toBe("true");
    expect(within(container).queryByRole("radio", { name: "Python" })).toBeNull();
    cleanup();
    const single = render(await CodeTabs({ base: PARKING.base, files: PARKING.files }));
    expect(single.container.querySelector('[role="radiogroup"]')).toBeNull();
    expect(single.container.querySelector(".code-tabs--langs")).toBeNull();
    expect(within(single.container).getAllByRole("tab")).toHaveLength(3);
  });

  it("ignores a stale stored language", async () => {
    localStorage.setItem("sds-code-lang", JSON.stringify({ state: { lang: "rust" }, version: 1 }));
    await useCodeLangStore.persist.rehydrate();
    expect(useCodeLangStore.getState().lang).toBe("js");
  });

  it("drops lines ending in // @hide or # @hide", async () => {
    const code = ["import fake from './fake.js' // @hide", "from fakes import clock  # @hide", "keep_me()", "a = b // c"].join("\n");
    const { container } = render(await CodeBlock({ code, lang: "python" }));
    const text = container.querySelector("pre")?.textContent ?? "";
    expect(text).toContain("keep_me()");
    expect(text).toContain("a = b // c");
    expect(text).not.toContain("fake");
  });
});
