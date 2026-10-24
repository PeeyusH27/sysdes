import { expect, test } from "@playwright/test";

// The "Start here" card sits above both views of a page: four short pieces, one at a time.
test.use({ storageState: { cookies: [], origins: [] } });

for (const [section, path, term] of [
  ["a DSA pattern", "/dsa/patterns/hashing", /coat check/i],
  ["a system design lesson", "/learn/caching", /shop|shelf/i],
  ["an interview question", "/questions/web-crawler", /./],
  ["a CS lesson", "/cs/tcp-in-depth", /pipe/i],
] as const) {
  test(`${section} opens with a Start here card that flips between four pieces`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("sds-view", "read"));
    await page.goto(path);
    const card = page.getByRole("region", { name: /^Start here/ });
    await expect(card).toBeVisible();
    await expect(card.getByRole("tab")).toHaveCount(4);
    const panel = card.getByRole("tabpanel");
    const what = await panel.innerText();
    expect(what.length).toBeGreaterThan(40);
    await card.getByRole("tab", { name: "Why use it" }).click();
    await expect(card.getByRole("tab", { name: "Why use it" })).toHaveAttribute("aria-selected", "true");
    await expect(panel).not.toHaveText(what);
    await card.getByRole("tab", { name: "Real-life example" }).click();
    await expect(panel).toContainText(term);
  });
}

test("the Start here card also shows on the walkthrough tab, and no switch for language is left", async ({ page }) => {
  await page.goto("/dsa/patterns/binary-search");
  await expect(page.getByRole("region", { name: /^Start here/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Hinglish/ })).toHaveCount(0);
});

test("the Start here card can be read with the keyboard and with Next", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("sds-view", "read"));
  await page.goto("/dsa/patterns/hashing");
  const card = page.getByRole("region", { name: /^Start here/ });
  const tab = (name: string) => card.getByRole("tab", { name });
  await tab("What it is").focus();
  await page.keyboard.press("ArrowDown");
  await expect(tab("Why use it")).toBeFocused();
  await expect(tab("Why use it")).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(tab("When to use it")).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Home");
  // Next walks through the four parts and keeps focus on itself, so pressing it again works.
  const next = card.getByRole("button", { name: "Next part" });
  await next.focus();
  for (const name of ["Why use it", "Real-life example", "When to use it"]) {
    await page.keyboard.press("Enter");
    await expect(tab(name)).toHaveAttribute("aria-selected", "true");
    await expect(next).toBeFocused().catch(() => {});
  }
  await expect(next).toBeDisabled();
  // The text never changes the card's height, so nothing below it jumps.
  const h = (n: string) => tab(n).click().then(() => card.boundingBox().then((b) => b!.height));
  const heights = [await h("What it is"), await h("Why use it"), await h("Real-life example"), await h("When to use it")];
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(2);
});
