import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { allPages } from "../../content/registry";

test("home → HLD path → lesson", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Start the HLD path/ }).click();
  await expect(page).toHaveURL(/\/learn$/);
  await page.getByRole("link", { name: /Caching/ }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Caching" })).toBeVisible();
});

test("question filters are kept in the URL", async ({ page }) => {
  await page.goto("/questions");
  await page.getByRole("button", { name: "Frontend", exact: true }).click();
  await expect(page).toHaveURL(/cat=Frontend/);
  await expect(page.getByRole("heading", { name: /Typeahead/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Rate Limiter/ })).toHaveCount(0);
});

test("search palette finds lessons", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+k");
  await page.getByPlaceholder(/Search lessons/).fill("stampede");
  await expect(page.getByRole("option").first()).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/(learn|deep-dives|questions)\//);
});

test("theme toggle switches and persists", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Toggle colour theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("flow diagram steps through a scenario with buttons and keys", async ({ page }) => {
  await page.goto("/learn/caching");
  const figure = page.locator("figure.flow").first();
  await figure.getByRole("radio", { name: "Cache miss" }).click();
  await figure.getByRole("button", { name: "Next step" }).click();
  await expect(figure.locator(".flow-caption")).toContainText("GET /products/42");
  await figure.locator(".flow-scroll").focus();
  await page.keyboard.press("ArrowRight");
  await expect(figure.locator(".flow-caption")).toContainText("asks Redis");
});

test("passing the quiz marks the lesson complete", async ({ page }) => {
  await page.goto("/learn/caching");
  const quiz = page.locator("section.quiz");
  await quiz.getByLabel("6 ms").check();
  await quiz.getByLabel("Negative caching or a Bloom filter").check();
  await quiz.getByLabel("It stops many keys expiring at the same moment").check();
  await quiz.getByRole("button", { name: "Check answers" }).click();
  await expect(quiz.getByText("3 / 3 correct")).toBeVisible();
  await expect(page.getByRole("button", { name: /Completed/ })).toBeVisible();
});

test("reduced motion renders no travelling packets", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/learn/caching");
  const figure = page.locator("figure.flow").first();
  await figure.getByRole("button", { name: /Play/ }).click();
  await page.waitForTimeout(800);
  await expect(page.locator(".packet")).toHaveCount(0);
  await expect(figure.locator(".flow-caption")).not.toHaveText("");
});

const auditPaths = ["/", "/system-design", "/learn", "/questions", "/deep-dives", "/playground/url-shortener", "/dsa", "/dsa/patterns", "/dsa/problems", "/dsa/problems/three-sum", ...allPages().map((p) => p.href.split("#")[0])];
for (const path of [...new Set(auditPaths)]) {
  test(`no serious accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
}
