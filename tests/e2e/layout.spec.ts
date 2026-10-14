import { expect, test, type Page } from "@playwright/test";

// The detail-page layout. From ~1080 px: one pinned pane on the left shows the visuals for the text being read, and
// all the text scrolls on the right. Below that each section's visuals follow its text.

const box = async (page: Page, selector: string) => {
  const b = await page.locator(selector).first().boundingBox();
  if (!b) throw new Error(`no box for ${selector}`);
  return b;
};

/** Scroll so a section's card sits just above the reading line. */
const read = (page: Page, id: string) =>
  page.locator(`.sec-card[data-sec="${id}"]`).evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.25));

const shown = (page: Page) => page.locator(".reader[data-pane] .sec-stage:not([hidden])");

test.describe("desktop pane (1280×800)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("one pane, pinned under the reader bar, fits the viewport while the text scrolls", async ({ page }) => {
    await page.goto("/questions/parking-lot");
    await expect(page.locator(".reader")).toHaveAttribute("data-pane", "");
    await page.evaluate(() => window.scrollTo(0, 700));
    const pane = page.locator(".pane");
    await expect.poll(async () => (await pane.boundingBox())!.y).toBeLessThan(140);
    const a = (await pane.boundingBox())!;
    const bar = await box(page, ".reader-bar");
    expect(a.y).toBeGreaterThanOrEqual(bar.y + bar.height);
    expect(a.y + a.height).toBeLessThanOrEqual(800);

    await page.mouse.move(1000, 400);
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(400);
    const b = (await pane.boundingBox())!;
    expect(Math.abs(b.y - a.y)).toBeLessThan(1);
    expect(Math.abs(b.height - a.height)).toBeLessThan(1);

    // The visual on show sits inside the pane and the viewport; the words are to its right.
    await expect(shown(page)).toHaveCount(1);
    const s = (await shown(page).boundingBox())!;
    expect(s.y + s.height).toBeLessThanOrEqual(800);
    expect(s.x).toBeGreaterThanOrEqual(a.x - 1);
    expect(s.x + s.width).toBeLessThanOrEqual(a.x + a.width + 1);
    const text = await box(page, ".doc-main");
    expect(text.x).toBeGreaterThan(a.x + a.width);
    expect(a.width / (text.x + text.width - a.x)).toBeGreaterThan(0.5);
  });

  test("the pane shows the visual for the text being read", async ({ page }) => {
    await page.goto("/questions/parking-lot");
    await read(page, "class-design");
    await expect(page.locator('.sec-card[data-sec="class-design"] .sec-stage')).toBeVisible();
    await expect(page.locator(".pane-head")).toContainText("Class design");

    await read(page, "watch-it-run");
    await expect(page.locator('.sec-card[data-sec="watch-it-run"] .sec-stage')).toBeVisible();
    await expect(page.locator('.sec-card[data-sec="class-design"] .sec-stage')).toBeHidden();
    await expect(shown(page)).toHaveCount(1);

    // Text without a visual keeps the latest one, and the pane says where it is from.
    await read(page, "how-to-approach-it");
    await expect(page.locator(".pane-head")).toContainText("From");
    await expect(shown(page)).toHaveCount(1);

    // The pane's title takes you back to that text.
    await page.locator(".pane-title").click();
    await expect.poll(async () => (await box(page, '.sec-card[data-sec="park-and-exit-step-by-step"]')).y).toBeLessThan(200);
  });

  test("hidden visuals are hidden and inert, and stay mounted", async ({ page }) => {
    await page.goto("/questions/parking-lot");
    await read(page, "watch-it-run");
    await expect(page.locator('.sec-card[data-sec="watch-it-run"] .sec-stage')).toBeVisible();
    await expect(shown(page)).toHaveCount(1);
    const stages = await page.locator(".sec-stage").evaluateAll((els) => els.map((el) => ({ hidden: (el as HTMLElement).hidden, inert: (el as HTMLElement).inert, kids: el.querySelector(".sec-fit")!.children.length })));
    expect(stages.length).toBeGreaterThan(3);
    for (const s of stages) {
      expect(s.kids).toBeGreaterThan(0);
      if (s.hidden) expect(s.inert).toBe(true);
    }
    expect(stages.filter((s) => !s.hidden)).toHaveLength(1);
  });

  test("keyboard: a focused text block brings its visual, and Tab goes into it", async ({ page }) => {
    await page.goto("/questions/parking-lot");
    await read(page, "class-design");
    await expect(page.locator('.sec-card[data-sec="class-design"] .sec-stage')).toBeVisible();
    await page.locator('.sec-card[data-sec="watch-it-run"] .sec-body').focus();
    await expect(page.locator('.sec-card[data-sec="watch-it-run"] .sec-stage')).toBeVisible();
    await page.keyboard.press("Tab");
    const inStage = await page.evaluate(() => document.activeElement?.closest(".sec-card")?.getAttribute("data-sec") + ":" + !!document.activeElement?.closest(".sec-stage"));
    expect(inStage).toBe("watch-it-run:true");
  });

  test("Cards mode: one section's words on the right, its visual in the pane", async ({ page }) => {
    await page.goto("/questions/parking-lot");
    await page.locator(".reader-bar").getByRole("button", { name: "Cards" }).click();
    await page.locator(".reader-bar .rb-current").click();
    await page.locator(".rb-menu").getByRole("button", { name: /Watch it run/ }).click();
    await expect(page.locator(".sec-card:visible")).toHaveCount(1);
    await expect(page.locator('.sec-card[data-sec="watch-it-run"] .sec-stage')).toBeVisible();
    await expect(shown(page)).toHaveCount(1);
  });
});

test.describe("desktop pane, short laptop screen (1280×560)", () => {
  test.use({ viewport: { width: 1280, height: 560 } });

  test("a scaled visual still takes clicks", async ({ page }) => {
    await page.goto("/questions/parking-lot");
    await read(page, "watch-it-run");
    const stage = page.locator('.sec-card[data-sec="watch-it-run"] .sec-stage');
    await expect(stage).toBeVisible();
    const transform = await stage.locator(".sec-fit").evaluate((el) => (el as HTMLElement).style.transform);
    expect(transform).toMatch(/scale\(0\.\d+\)/);
    const pane = await box(page, ".pane");
    expect(pane.y + pane.height).toBeLessThanOrEqual(560);
    // Any segmented choice in the simulator: clicking it through the scale must select it.
    const name = (await stage.locator('.seg button[aria-pressed="false"]').first().textContent())!.trim();
    const choice = stage.locator(".seg button", { hasText: name }).first();
    await choice.click();
    await expect(choice).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("desktop (1440×900)", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("the page list opens in a drawer from the reader bar", async ({ page }) => {
    await page.goto("/questions/elevator");
    const drawer = page.locator("#page-drawer");
    await expect(drawer).toBeHidden();
    await page.locator(".reader-bar").getByRole("button", { name: /Questions/ }).click();
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link", { name: /Elevator System/ })).toHaveAttribute("aria-current", "page");
    await expect(drawer.getByRole("link", { name: /Parking Lot/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
  });

  test("the section menu jumps to a section and the bar follows", async ({ page }) => {
    await page.goto("/learn/caching");
    const bar = page.locator(".reader-bar");
    await bar.locator(".rb-current").click();
    await page.locator(".rb-menu").getByRole("button", { name: /Failure modes/ }).click();
    await expect(bar.locator(".rb-title")).toHaveText("Failure modes");
    await expect(page.locator('.sec-card[data-sec="failure-modes"]')).toHaveAttribute("data-current", "");
    await expect(page).toHaveURL(/#failure-modes$/);
    await expect.poll(async () => (await box(page, '.sec-card[data-sec="failure-modes"]')).y).toBeLessThan(200);
    await expect(page.locator(".pane-head")).toContainText("Failure modes");
  });
});

test.describe("phone (390 px)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("text and visuals stack: the words first, then the visual, nothing hidden", async ({ page }) => {
    await page.goto("/learn/caching");
    await expect(page.locator(".pane")).toBeHidden();
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
