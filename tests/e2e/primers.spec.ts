import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("the basics hub lists every primer and each opens", async ({ page }) => {
  await page.goto("/basics");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("in a minute");
  const cards = page.locator(".basics-card");
  expect(await cards.count()).toBeGreaterThanOrEqual(18);
  await page.getByRole("link", { name: /What is a cache\?/ }).click();
  await expect(page).toHaveURL(/\/basics\/cache$/);
  await expect(page.locator(".primer-remember li")).toHaveCount(3);
  await expect(page.getByRole("radio", { name: /Without a cache/ })).toBeVisible();
});

test("on a page with a walkthrough the primer starts closed, opens, and the choice sticks", async ({ page }) => {
  await page.goto("/deep-dives/sharding-strategies");
  const fold = page.locator(".primer-fold");
  await expect(fold).toContainText("What is sharding?");
  await expect(fold.locator(".primer")).toHaveCount(0);
  await fold.getByRole("button", { name: /What is sharding/ }).click();
  await expect(fold.locator(".primer")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".primer-fold .primer")).toHaveCount(1);
  await page.locator(".primer-fold").getByRole("button", { name: /What is sharding/ }).click();
  await page.reload();
  await expect(page.locator(".primer-fold .primer")).toHaveCount(0);
});

test("a glossary term opens a plain-words card and Escape closes it", async ({ page }) => {
  await page.goto("/learn/caching");
  const term = page.locator("button.term:visible").first();
  await expect(term).toBeVisible();
  await term.click();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
});

test("primer pages have no accessibility violations", async ({ page }) => {
  for (const path of ["/basics", "/basics/cache", "/basics/sharding"]) {
    await page.goto(path);
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(r.violations.map((v) => `${path}: ${v.id}`)).toEqual([]);
  }
});
