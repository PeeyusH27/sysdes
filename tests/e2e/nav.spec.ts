import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { patterns } from "../../content/dsa/registry";
import { learnSteps } from "../../content/registry";

const serious = async (page: import("@playwright/test").Page) => {
  const results = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  return results.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.length}`);
};

test.describe("desktop mega menus", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("keyboard: Enter opens, ArrowDown lands on a link, Escape closes and returns focus", async ({ page }) => {
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "System Design", exact: true });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    const panel = page.locator("#nav-panel-sd");
    await expect(panel).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(panel.locator(":focus")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();

    await page.keyboard.press("ArrowDown");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(panel.getByRole("link").first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  });

  test("System Design menu reaches a learn step and a grouped question", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "System Design", exact: true }).click();
    const panel = page.locator("#nav-panel-sd");
    await expect(panel.getByRole("link", { name: /^\d+ / })).toHaveCount(learnSteps.length);
    await expect(panel.getByText("Low-level design")).toBeVisible();
    await panel.getByRole("link", { name: "4 Caching", exact: true }).click();
    await expect(page).toHaveURL(/\/learn\/caching$/);
    await expect(page.getByRole("heading", { level: 1, name: "Caching" })).toBeVisible();
    await expect(page.getByRole("button", { name: "System Design", exact: true })).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("button", { name: "System Design", exact: true })).toHaveAttribute("data-active", "true");
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "HLD path" })).toHaveAttribute("aria-current", "true");

    await page.getByRole("button", { name: "System Design", exact: true }).click();
    await page.locator("#nav-panel-sd").getByRole("link", { name: /^Parking Lot/ }).click();
    await expect(page).toHaveURL(/\/questions\/parking-lot$/);
  });

  test("DSA menu lists every pattern and links work", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "DSA", exact: true }).click();
    const panel = page.locator("#nav-panel-dsa");
    await expect(panel.locator('a[href^="/dsa/patterns/"]')).toHaveCount(patterns.length);
    await panel.getByRole("link", { name: "2 Two pointers", exact: true }).click();
    await expect(page).toHaveURL(/\/dsa\/patterns\/two-pointers$/);
    await page.getByRole("button", { name: "DSA", exact: true }).click();
    await expect(page.locator("#nav-panel-dsa").getByRole("link", { name: "2 Two pointers", exact: true })).toHaveAttribute("aria-current", "page");
  });

  test("hover opens a menu and leaving closes it; a clicked menu waits for an outside click", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "DSA", exact: true }).hover();
    await expect(page.locator("#nav-panel-dsa")).toBeVisible();
    await page.getByRole("button", { name: "System Design", exact: true }).hover();
    await expect(page.locator("#nav-panel-sd")).toBeVisible();
    await expect(page.locator("#nav-panel-dsa")).toBeHidden();
    await page.mouse.move(640, 780);
    await expect(page.locator("#nav-panel-sd")).toBeHidden();

    await page.getByRole("button", { name: "System Design", exact: true }).click();
    await expect(page.locator("#nav-panel-sd")).toBeVisible();
    await page.mouse.move(640, 780);
    await page.waitForTimeout(400);
    await expect(page.locator("#nav-panel-sd")).toBeVisible();
    await page.mouse.click(640, 780);
    await expect(page.locator("#nav-panel-sd")).toBeHidden();
  });

  test("an open menu has no serious accessibility violations", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "System Design", exact: true }).click();
    await expect(page.locator("#nav-panel-sd")).toBeVisible();
    expect(await serious(page)).toEqual([]);
  });
});

test.describe("mobile drawer", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("opens with focus inside, locks scroll, and its links navigate", async ({ page }) => {
    await page.goto("/dsa/patterns");
    const toggle = page.getByRole("button", { name: "Menu" });
    await toggle.click();
    const drawer = page.getByRole("dialog", { name: "Site menu" });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("button", { name: /Search lessons/ })).toBeFocused();
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe("hidden");
    // the current track starts expanded
    await expect(drawer.getByRole("button", { name: /^DSA/ })).toHaveAttribute("aria-expanded", "true");
    await drawer.getByRole("button", { name: /^System Design/ }).click();
    await expect(drawer.getByRole("button", { name: /^DSA/ })).toHaveAttribute("aria-expanded", "false");
    await drawer.getByRole("link", { name: /^Elevator/ }).click();
    await expect(page).toHaveURL(/\/questions\/elevator$/);
    await expect(drawer).toBeHidden();
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe("hidden");
  });

  test("Escape closes the drawer and gives focus back to the menu button", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Menu" });
    await toggle.click();
    await expect(page.getByRole("dialog", { name: "Site menu" })).toBeVisible();
    expect(await serious(page)).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Site menu" })).toBeHidden();
    await expect(toggle).toBeFocused();
  });

  test("search opens from the drawer", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("dialog", { name: "Site menu" }).getByRole("button", { name: /Search lessons/ }).click();
    await expect(page.getByPlaceholder(/Search lessons/)).toBeFocused();
  });
});
