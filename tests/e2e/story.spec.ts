import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGE = "/deep-dives/sharding-strategies";

// A first-time visitor: nothing stored, so pages open on the walkthrough.
test.use({ storageState: { cookies: [], origins: [] } });

test("a page opens on its walkthrough, one picture and one line at a time", async ({ page }) => {
  await page.goto(PAGE);
  const story = page.locator(".story");
  await expect(story).toBeVisible();
  await expect(story.getByText(/Step 1 of/)).toBeVisible();
  await expect(page.locator(".doc .prose")).toBeHidden();
  await expect(story.locator(".story-head")).not.toBeEmpty();
  const first = await story.locator(".story-head").textContent();
  await story.getByRole("button", { name: "Next", exact: true }).click();
  await expect(story.getByText(/Step 2 of/)).toBeVisible();
  expect(await story.locator(".story-head").textContent()).not.toBe(first);
  await story.getByRole("button", { name: "Back" }).click();
  await expect(story.getByText(/Step 1 of/)).toBeVisible();
});

test("arrow keys move through the steps", async ({ page }) => {
  await page.goto(PAGE);
  const story = page.locator(".story");
  await story.getByRole("button", { name: "Next", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(story.getByText(/Step 2 of/)).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(story.getByText(/Step 1 of/)).toBeVisible();
});

test("a question blurs the picture until you guess, then explains", async ({ page }) => {
  await page.goto(PAGE);
  const story = page.locator(".story");
  await story.getByRole("button", { name: "Step 3" }).click();
  await expect(story.locator(".story-stage")).toHaveAttribute("data-locked", "true");
  await story.getByRole("button", { name: /No, try cheaper fixes first/ }).click();
  await expect(story.locator(".story-stage")).not.toHaveAttribute("data-locked", "true");
  await expect(story.getByRole("status").filter({ hasText: "Yes." })).toBeVisible();
});

test("the slider changes the verdict", async ({ page }) => {
  await page.goto(PAGE);
  const story = page.locator(".story");
  await story.getByRole("button", { name: "Step 3" }).click();
  await story.getByRole("button", { name: "Just show me" }).click();
  const slider = story.getByRole("slider");
  await slider.fill("1000");
  await expect(story.locator(".st-verdict")).toContainText("Yes");
  await slider.fill("0");
  await expect(story.locator(".st-verdict")).toContainText("No");
});

test("the last step is the 30-second answer, and 'Full lesson' shows the written page", async ({ page }) => {
  await page.goto(PAGE);
  const story = page.locator(".story");
  const dots = await story.locator(".story-dots button").count();
  await story.getByRole("button", { name: `Step ${dots}` }).click();
  await expect(story.getByText("Say it in 30 seconds")).toBeVisible();
  await story.getByRole("button", { name: /Read the full lesson/ }).click();
  await expect(page.locator(".doc .prose")).toBeVisible();
  await expect(page.locator(".story-panel")).toBeHidden();
  await page.reload();
  await expect(page.locator(".doc .prose")).toBeVisible(); // the choice sticks
  await page.getByRole("button", { name: /Walkthrough/ }).click();
  await expect(page.locator(".story")).toBeVisible();
});

test("switching to the lesson and back keeps your place and your answers", async ({ page }) => {
  await page.goto(PAGE);
  const story = page.locator(".story");
  await story.getByRole("button", { name: "Step 3" }).click();
  await story.getByRole("button", { name: /No, try cheaper fixes first/ }).click();
  await page.getByRole("button", { name: /Full lesson/ }).click();
  await expect(page.locator(".doc .prose")).toBeVisible();
  await page.getByRole("button", { name: /Walkthrough/ }).click();
  await expect(page.locator(".story").getByText(/Step 3 of/)).toBeVisible();
  await expect(page.locator(".story-stage")).not.toHaveAttribute("data-locked", "true");
});

test("a link to a section opens the written lesson", async ({ page }) => {
  await page.goto(`${PAGE}#choosing-the-shard-key`);
  await expect(page.locator(".doc .prose")).toBeVisible();
  await expect(page.locator("#choosing-the-shard-key")).toBeVisible();
});

test("the walkthrough has no accessibility violations, in either view", async ({ page }) => {
  await page.goto(PAGE);
  // Contrast is checked on the player alone, once its steps have finished fading in.
  for (const step of [1, 3, 5, 6]) {
    if (step > 1) await page.locator(".story").getByRole("button", { name: `Step ${step}` }).click();
    if (step === 3 || step === 5) await page.getByRole("button", { name: "Just show me" }).click(); // these two steps ask first
    await page.waitForTimeout(2500);
    const r = await new AxeBuilder({ page }).include(".story").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(r.violations.map((v) => `step ${step}: ${v.id} ${v.nodes.map((n) => n.html.slice(0, 90)).join(" | ")}`)).toEqual([]);
  }
});

test("on a phone the picture comes first and Next fills the row", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PAGE);
  const stage = page.locator(".story-stage").first();
  const words = page.locator(".story-words").first();
  const a = await stage.boundingBox();
  const b = await words.boundingBox();
  expect(a!.y).toBeLessThan(b!.y);
  const next = await page.locator(".story").getByRole("button", { name: "Next", exact: true }).boundingBox();
  expect(next!.width).toBeGreaterThan(200);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
