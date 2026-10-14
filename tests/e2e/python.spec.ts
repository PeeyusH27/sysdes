import { expect, test, type BrowserContext, type Page } from "@playwright/test";

// Python runs in the browser through Pyodide, downloaded from jsDelivr (public/dsa-runner-py.js). Tests that need the
// real download skip, with the reason, when this machine can't reach the CDN; the offline test fakes the outage.
const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.28.3/full/pyodide.js";
let cdn: { ok: boolean; why: string } = { ok: false, why: "not checked" };

test.beforeAll(async () => {
  try {
    const res = await fetch(PYODIDE, { method: "HEAD", signal: AbortSignal.timeout(15_000) });
    cdn = { ok: res.ok, why: `HTTP ${res.status}` };
  } catch (err) {
    cdn = { ok: false, why: (err as Error).message };
  }
});

const needsCdn = () => test.skip(!cdn.ok, `Pyodide's CDN (cdn.jsdelivr.net) is unreachable from this machine: ${cdn.why}`);

const SELECT_ALL = process.platform === "darwin" ? "Meta+A" : "Control+A";
// The first run downloads about 5 MB and starts Python.
const FIRST_RUN = { timeout: 90_000 };

async function typeCode(page: Page, code: string) {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press(SELECT_ALL);
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(code);
}

async function openInPython(page: Page, slug: string) {
  await page.goto(`/dsa/problems/${slug}`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector(".cm-content");
  await page.getByRole("radiogroup", { name: "Code language" }).getByRole("radio", { name: "Python" }).click();
  await expect(page.locator(".cm-content")).toContainText("def two_sum(nums: List[int], target: int) -> List[int]:");
}

const CORRECT = `def two_sum(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i
`;

test("Python: the starter is generated, a correct solution is accepted and a wrong one shows expected vs got", async ({ page }) => {
  needsCdn();
  test.setTimeout(150_000);
  await openInPython(page, "two-sum");

  await typeCode(page, `def two_sum(nums, target):\n    print("checking", nums)\n    return [0, 0]\n`);
  await page.getByRole("button", { name: /Run examples/ }).click();
  await expect(page.locator(".pw-headline")).toContainText("Examples fail", FIRST_RUN);
  const detail = page.locator(".pw-case-detail");
  await expect(detail.locator("dd").nth(1)).toContainText("[2,3]");
  await expect(detail.locator("pre[data-pass=false]")).toContainText("[0,0]");
  await page.getByRole("tab", { name: /Console/ }).click();
  await expect(page.locator(".pw-console")).toContainText("checking [4, 9, 1, 6]");

  await page.getByRole("tab", { name: "Tests" }).click();
  await typeCode(page, `def two_sum(nums, target):\n    return nums.foo\n`);
  await page.getByRole("button", { name: /Run examples/ }).click();
  await expect(page.locator(".pw-case-detail .pw-error")).toContainText('File "solution.py", line 2');
  await expect(page.locator(".pw-case-detail .pw-error")).toContainText("AttributeError");

  await typeCode(page, CORRECT);
  await page.getByRole("button", { name: /Submit/ }).click();
  await expect(page.locator(".pw-headline")).toContainText("Accepted");
  await expect(page.getByRole("button", { name: /Solved/ })).toBeVisible();

  // Each language keeps its own draft.
  await page.waitForTimeout(600);
  await page.getByRole("radiogroup", { name: "Code language" }).getByRole("radio", { name: "JavaScript" }).click();
  await expect(page.locator(".cm-content")).toContainText("function twoSum(nums, target)");
  await page.getByRole("radiogroup", { name: "Code language" }).getByRole("radio", { name: "Python" }).click();
  await expect(page.locator(".cm-content")).toContainText("seen[target - x]");
});

test("Python: an infinite loop hits the time limit and the next run recovers", async ({ page }) => {
  needsCdn();
  test.setTimeout(150_000);
  await openInPython(page, "two-sum");
  await typeCode(page, `def two_sum(nums, target):\n    while True:\n        pass\n`);
  await page.getByRole("button", { name: /Run examples/ }).click();
  await expect(page.locator(".pw-headline")).toContainText("Time limit exceeded on test 1", FIRST_RUN);

  await typeCode(page, CORRECT);
  await page.getByRole("button", { name: /Run examples/ }).click();
  await expect(page.locator(".pw-headline")).toContainText("Examples pass", { timeout: 60_000 });
});

test("Python: the first load shows its progress", async ({ page, context }) => {
  needsCdn();
  test.setTimeout(150_000);
  await slowDown(context, "**/pyodide.asm.wasm", 2500);
  await openInPython(page, "two-sum");
  const status = page.locator(".pw-results [role=status]");
  await expect(status).toContainText("Loading Python");
  await expect(status).toContainText("cached after the first time");
  await expect(status.getByRole("progressbar", { name: "Python download" })).toBeVisible();
  await expect(status).toHaveCount(0, FIRST_RUN);
});

test("runnable pattern snippets run in Python", async ({ page }) => {
  needsCdn();
  test.setTimeout(150_000);
  // On a wide screen a section's visuals show while that section is the active one: open the "Try it" section.
  await page.goto("/dsa/patterns/hashing#try-it");
  const block = page.locator("figure.run-code").filter({ has: page.getByRole("radio", { name: "Python" }) }).first();
  await expect(block).toBeVisible();
  await block.getByRole("radio", { name: "Python" }).click();
  await expect(block.locator("figcaption")).toContainText("try_it.py");
  await expect(block).not.toContainText("@hide");
  await block.getByRole("button", { name: "Run" }).click();
  await expect(block.locator(".console-body")).toContainText("7", FIRST_RUN);
  await expect(block.locator(".console-body")).not.toContainText("error");

  await block.getByRole("radio", { name: "Java", exact: true }).click();
  await expect(block).toContainText("Java can't run in the browser here");
  await expect(block.getByRole("button", { name: "Run" })).toHaveCount(0);
});

test("offline: Python explains what happened, nothing counts as a submission, and JavaScript still runs", async ({ page, context }) => {
  await context.route("https://cdn.jsdelivr.net/**", (route) => route.abort("internetdisconnected"));
  await page.goto("/dsa/problems/two-sum");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector(".cm-content");
  await page.getByRole("radiogroup", { name: "Code language" }).getByRole("radio", { name: "Python" }).click();
  await page.getByRole("button", { name: /Submit/ }).click();
  await expect(page.locator(".pw-headline")).toContainText("Python isn't available", { timeout: 30_000 });
  await expect(page.locator(".pw-results")).toContainText("Python couldn't be downloaded");
  await page.getByRole("tab", { name: /Solution/ }).click();
  await expect(page.getByRole("heading", { name: "The solution is locked" })).toBeVisible();

  await page.getByRole("button", { name: "Switch to JavaScript" }).click();
  await expect(page.locator(".cm-content")).toContainText("function twoSum");
  await page.getByRole("button", { name: /Run examples/ }).click();
  await expect(page.locator(".pw-headline")).toContainText("Examples fail");
});

test("with Java chosen site-wide, the editor explains it practises in another language", async ({ page }) => {
  await page.goto("/dsa/problems/two-sum");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("sds-code-lang", JSON.stringify({ state: { lang: "java" }, version: 1 }));
  });
  await page.reload();
  await page.waitForSelector(".cm-content");
  await expect(page.locator(".pw-langnote")).toContainText("Java can't run in the browser here, so you practise in JavaScript");
  await expect(page.getByRole("radiogroup", { name: "Code language" }).getByRole("radio", { name: "JavaScript" })).toHaveAttribute("aria-checked", "true");
});

async function slowDown(context: BrowserContext, url: string, ms: number) {
  await context.route(url, async (route) => {
    await new Promise((r) => setTimeout(r, ms));
    await route.continue();
  });
}
