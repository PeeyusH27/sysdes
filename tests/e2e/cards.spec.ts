import { expect, test } from "@playwright/test";

// The page opens as one scrolling page. Cards (one section at a time) is a toggle that sticks, with a quick check at the
// foot of each card, a deck-first layout, and swipe on a touch screen. These specs start from a clean browser (the
// config's default state asks for Scroll).
test.use({ storageState: { cookies: [], origins: [] } });

const CARDS = JSON.stringify({ state: { readerMode: "cards" }, version: 2 });

for (const [name, viewport] of [["desktop", { width: 1440, height: 900 }], ["phone", { width: 390, height: 844 }]] as const) {
  test.describe(name, () => {
    test.use({ viewport });

    test("opens as one page, with the 30-second answer folded away", async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem("sds-view", "read"));
      await page.goto("/learn/caching");
      await expect(page.locator(".reader")).toHaveAttribute("data-mode", "scroll");
      expect(await page.locator(".sec-card:visible").count()).toBeGreaterThan(1);
      const more = page.locator(".saycard-more");
      await expect(more).not.toHaveAttribute("open", "");
      await more.locator("summary").click();
      await expect(more).toHaveAttribute("open", "");
      await expect(more.locator(".saycard-answer")).toBeVisible();
    });

    test("a section ends with a quick check that answers on one tap", async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem("sds-view", "read"));
      await page.goto("/learn/caching#failure-modes");
      const card = page.locator('.sec-card[data-sec="failure-modes"]');
      const check = card.locator(".cardcheck");
      await expect(check).toBeVisible();
      await expect(check.locator(".cardcheck-why")).toBeEmpty();
      await check.getByRole("button", { name: "Cache avalanche" }).click();
      await expect(check.getByRole("button", { name: "Cache stampede" })).toHaveAttribute("data-state", "right");
      await expect(check.getByRole("button", { name: "Cache avalanche" })).toHaveAttribute("data-state", "wrong");
      await expect(check.locator(".cardcheck-why")).toContainText("Not quite");
      // Answered: the choices are locked.
      await expect(check.getByRole("button", { name: "Cache penetration" })).toBeDisabled();
    });

    test("Cards is one tap away and sticks", async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem("sds-view", "read"));
      await page.goto("/learn/caching");
      await page.getByRole("button", { name: "Cards" }).first().click();
      await expect(page.locator(".reader")).toHaveAttribute("data-mode", "cards");
      await expect(page.locator(".sec-card:visible")).toHaveCount(1);
      await page.reload();
      await expect(page.locator(".reader")).toHaveAttribute("data-mode", "cards");
    });

    test("in Cards, the first card is on screen and the extras follow the deck", async ({ page }) => {
      await page.addInitScript((progress) => { localStorage.setItem("sds-view", "read"); localStorage.setItem("sds-progress", progress); }, CARDS);
      await page.goto("/learn/caching");
      const top = await page.locator(".sec-card:visible").first().evaluate((el) => el.getBoundingClientRect().top);
      expect(top).toBeLessThan(viewport.height);
      const order = await page.evaluate(() => {
        const y = (sel: string) => document.querySelector(sel)!.getBoundingClientRect().top + scrollY;
        return [y(".doc-cols"), y(".saycard")];
      });
      expect(order[0]).toBeLessThan(order[1]);
      // Page-level blocks after the cards (patterns behind this) wait for the last card instead of sitting under every card.
      await expect(page.locator(".prose > section.bridges")).toBeHidden();
    });

    test("in Cards, a sideways swipe flips the card, but not over a diagram", async ({ page }) => {
      await page.addInitScript((progress) => { localStorage.setItem("sds-view", "read"); localStorage.setItem("sds-progress", progress); }, CARDS);
      await page.goto("/learn/caching");
      const active = () => page.locator(".sec-card[data-active]").getAttribute("data-sec");
      const first = await active();
      const swipe = (selector: string, dx: number) =>
        page.locator(selector).first().evaluate((el, d) => {
          const r = el.getBoundingClientRect();
          const x = r.left + r.width / 2;
          const y = r.top + Math.min(r.height / 2, 40);
          const t = (cx: number) => new Touch({ identifier: 1, target: el, clientX: cx, clientY: y });
          el.dispatchEvent(new TouchEvent("touchstart", { touches: [t(x)], bubbles: true }));
          el.dispatchEvent(new TouchEvent("touchend", { changedTouches: [t(x + d)], bubbles: true }));
        }, dx);
      await swipe(".sec-card[data-active] .sec-head", -150);
      await expect.poll(active).not.toBe(first);
      await swipe(".sec-card[data-active] .sec-head", 150);
      await expect.poll(active).toBe(first);
      const figure = page.locator(".sec-card[data-active] figure").first();
      if (await figure.count()) {
        await swipe(".sec-card[data-active] figure", -150);
        await expect.poll(active).toBe(first);
      }
    });
  });
}
