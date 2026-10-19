import { expect, test, type Page } from "@playwright/test";

// The detail-page layout. From ~1080 px: a sticky outline of the sections on the left, the lesson on the right with each
// section's visuals under its text. Below that the outline becomes the sticky reader bar.

const box = async (page: Page, selector: string) => {
  const b = await page.locator(selector).first().boundingBox();
  if (!b) throw new Error(`no box for ${selector}`);
  return b;
};

test.describe("desktop (1440×900)", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("visuals sit under their text, in one column next to the outline", async ({ page }) => {
    await page.goto("/learn/caching");
    const rail = await box(page, ".rail");
    const body = await box(page, '.sec-card[data-sec="why-it-matters"] .sec-body');
    const stage = await box(page, '.sec-card[data-sec="why-it-matters"] .sec-stage');
    expect(rail.x + rail.width).toBeLessThanOrEqual(body.x);
    expect(stage.y).toBeGreaterThanOrEqual(body.y + body.height);
    await expect(page.locator(".reader-bar")).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
  });

  test("the page list opens in a drawer from the outline", async ({ page }) => {
    await page.goto("/questions/elevator");
    const drawer = page.locator("#page-drawer");
    await expect(drawer).toBeHidden();
    await page.locator(".rail").getByRole("button", { name: /Questions/ }).click();
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link", { name: /Elevator System/ })).toHaveAttribute("aria-current", "page");
    await expect(drawer.getByRole("link", { name: /Parking Lot/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
  });

  test("the outline jumps to a section and follows the scroll", async ({ page }) => {
    await page.goto("/learn/caching");
    await page.locator(".rail-list").getByRole("button", { name: /Failure modes/ }).click();
    await expect(page.locator(".rail-list button[aria-current=step]")).toContainText("Failure modes");
    await expect(page.locator('.sec-card[data-sec="failure-modes"]')).toHaveAttribute("data-current", "");
    await expect(page).toHaveURL(/#failure-modes$/);
    await expect.poll(async () => (await box(page, '.sec-card[data-sec="failure-modes"]')).y).toBeLessThan(200);
  });
});

test.describe("phone (390 px)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("text and visuals stack: the words first, then the visual, nothing hidden", async ({ page }) => {
    await page.goto("/learn/caching");
    await expect(page.locator(".rail")).toBeHidden();
    const stage = await box(page, '.sec-card[data-sec="why-it-matters"] .sec-stage');
    const body = await box(page, '.sec-card[data-sec="why-it-matters"] .sec-body');
    expect(stage.y).toBeGreaterThanOrEqual(body.y + body.height);
    expect(Math.abs(stage.x - body.x)).toBeLessThan(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const states = await page.locator(".sec-stage").evaluateAll((els) => els.map((el) => [(el as HTMLElement).hidden, getComputedStyle(el).position]));
    for (const [hidden, position] of states) {
      expect(hidden).toBe(false);
      expect(position).toBe("static");
    }
  });
});
