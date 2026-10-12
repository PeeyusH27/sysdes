import { expect, test, type Page } from "@playwright/test";

const count = (page: Page) => page.locator(".shorts-count");
const activeTitle = (page: Page) => page.locator(".short[data-active=true] .short-title");

test.describe("shorts on desktop", () => {
  test("arrow keys flip shorts and the URL follows", async ({ page }) => {
    await page.goto("/shorts");
    await expect(count(page)).toContainText(/^1 \/ \d+/);
    await page.keyboard.press("ArrowRight");
    await expect(count(page)).toContainText(/^2 \//);
    await expect(page).toHaveURL(/\?s=[a-z0-9-]+/);
    const id = new URL(page.url()).searchParams.get("s");
    await page.keyboard.press("ArrowLeft");
    await expect(count(page)).toContainText(/^1 \//);
    await page.goto(`/shorts?s=${id}`);
    await expect(count(page)).toContainText(/^2 \//);
  });

  test("Got it moves on, Save fills the Saved filter, and track filters narrow the feed", async ({ page }) => {
    await page.goto("/shorts?s=js-sort-comparator");
    await expect(activeTitle(page)).toContainText("comparator");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("button", { name: "Got it" }).click();
    await expect(activeTitle(page)).not.toContainText("comparator");

    await page.locator(".shorts-filters").getByRole("button", { name: /Saved/ }).click();
    await expect(count(page)).toHaveText("1 / 1");
    await expect(activeTitle(page)).toContainText("comparator");

    await page.locator(".shorts-filters").getByRole("button", { name: "DSA", exact: true }).click();
    await expect(page.locator(".short[data-track]").first()).toHaveAttribute("data-track", "DSA");
    await expect(page.locator('.short[data-track="System design"]')).toHaveCount(0);
  });

  test("a short opened from search jumps there even from a filtered feed", async ({ page }) => {
    await page.goto("/shorts");
    await page.locator(".shorts-filters").getByRole("button", { name: "JavaScript", exact: true }).click();
    await page.keyboard.press("Control+k");
    await page.getByPlaceholder(/Search lessons/).fill("consistent hashing ring");
    await page.getByRole("option", { name: /hash % N/ }).first().click();
    await expect(page).toHaveURL(/s=consistent-hashing-ring/);
    await expect(activeTitle(page)).toContainText("hash % N");
  });
});

test.describe("shorts on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("swipe sideways for the next short, scroll down to read more", async ({ page, context }) => {
    await page.goto("/shorts");
    await expect(count(page)).toContainText(/^1 \//);
    const box = (await page.locator(".shorts-track").boundingBox())!;
    const cdp = await context.newCDPSession(page);
    const y = box.y + box.height / 2;
    await cdp.send("Input.synthesizeScrollGesture", { x: 300, y, xDistance: -300, yDistance: 0, speed: 1500, gestureSourceType: "touch" });
    await expect(count(page)).toContainText(/^2 \//);

    const active = page.locator(".short[data-active=true]");
    await expect(active.locator(".short-more-hint")).toBeVisible();
    await cdp.send("Input.synthesizeScrollGesture", { x: 200, y: y + 100, xDistance: 0, yDistance: -400, speed: 1500, gestureSourceType: "touch" });
    await expect.poll(() => active.evaluate((el) => el.scrollTop)).toBeGreaterThan(100);
    await expect(count(page)).toContainText(/^2 \//);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
});
