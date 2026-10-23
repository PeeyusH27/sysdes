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
  // The shortcut works once the nav has hydrated; retry instead of racing it.
  await expect(async () => {
    await page.keyboard.press("Control+k");
    await expect(page.getByPlaceholder(/Search lessons/)).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15000 });
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
  // On desktop the pinned pane shows the visuals of the section being read: read the last section first.
  await page.locator('.sec-card[data-sec="interview-questions"]').evaluate((el) => el.scrollIntoView());
  const quiz = page.locator("section.quiz");
  // One question at a time: answer, then Next.
  await quiz.getByLabel("6 ms").check();
  await quiz.getByRole("button", { name: "Next", exact: true }).click();
  await quiz.getByLabel("Negative caching or a Bloom filter").check();
  await quiz.getByRole("button", { name: "Next", exact: true }).click();
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

test("lesson sections are cards you can tick off and flip through", async ({ page }) => {
  await page.goto("/learn/caching");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const bar = page.locator(".rail");
  const first = page.locator(".sec-card").first();
  await expect(first.getByRole("heading", { level: 2 })).toHaveText("Why it matters");
  await first.getByRole("button", { name: "Got it" }).click();
  await expect(first.getByRole("button", { name: "Got it" })).toHaveAttribute("aria-pressed", "true");
  await expect(bar).toContainText("Where caches live");
  await expect(bar).toContainText("1/12 ticked");

  await bar.getByRole("button", { name: /Cards/ }).click();
  await expect(page.locator(".sec-card:visible")).toHaveCount(1);
  await expect(page.locator(".sec-card[data-active]")).toHaveAttribute("data-sec", "where-caches-live");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".sec-card[data-active]")).toHaveAttribute("data-sec", "what-to-cache-and-how-to-name-it");
  await page.getByRole("navigation", { name: "Section cards" }).getByRole("button", { name: /Failure modes/ }).click();
  await expect(page.locator(".sec-card[data-active]")).toHaveAttribute("data-sec", "failure-modes");

  await page.reload();
  await expect(page.locator(".sec-card:visible")).toHaveCount(1);
  await bar.getByRole("button", { name: /Scroll/ }).click();
  await expect(page.locator(".sec-card:visible")).toHaveCount(12);
});

test("arrow keys inside a diagram still drive the diagram in Cards mode", async ({ page }) => {
  await page.goto("/learn/caching");
  await page.locator(".rail").getByRole("button", { name: /Cards/ }).click();
  const card = page.locator(".sec-card[data-active]");
  await expect(card).toHaveAttribute("data-sec", "why-it-matters");
  await card.locator(".flow-scroll").focus();
  await page.keyboard.press("ArrowRight");
  await expect(card.locator(".step-count").first()).toHaveText(/^1 \//);
  await expect(card).toHaveAttribute("data-sec", "why-it-matters");
});

const auditPaths = ["/", "/shorts", "/system-design", "/learn", "/questions", "/deep-dives", "/lld", "/lld/exercises/event-bus", "/playground", "/playground/sandbox", "/playground/url-shortener", "/playground/url-shortener/guided", "/playground/rate-limiter/guided", "/dsa", "/dsa/patterns", "/dsa/problems", "/dsa/problems/three-sum", ...allPages().map((p) => p.href.split("#")[0])];
for (const path of [...new Set(auditPaths)]) {
  test(`no serious accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
}
