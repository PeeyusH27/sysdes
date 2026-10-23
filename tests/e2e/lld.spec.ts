import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const SELECT_ALL = process.platform === "darwin" ? "Meta+A" : "Control+A";

async function typeCode(page: Page, code: string) {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press(SELECT_ALL);
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(code);
}

test("the LLD hub lists foundations, classics and exercises", async ({ page }) => {
  await page.goto("/lld");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Design the classes");
  await expect(page.getByRole("heading", { name: "1. Foundations" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "2. The classics, answered in full" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "3. Code it yourself" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Event Bus/ })).toBeVisible();
  await page.getByRole("link", { name: /From Requirements to Classes/ }).click();
  await expect(page).toHaveURL(/\/lld\/foundations\/thinking-in-objects$/);
  await expect(page.getByRole("link", { name: /Code it yourself|tic-tac-toe/i }).first()).toBeVisible();
});

test("a class diagram builds up stage by stage", async ({ page }) => {
  await page.goto("/questions/parking-lot");
  const fig = page.locator("figure.uml").first();
  await expect(fig.getByText("Stage 1 of 5")).toBeVisible();
  const before = await fig.locator(".uml-class").count();
  await fig.getByRole("button", { name: "Next stage" }).click();
  await expect(fig.getByText("Stage 2 of 5")).toBeVisible();
  expect(await fig.locator(".uml-class").count()).toBeGreaterThan(before);
  for (let i = 0; i < 3; i++) await fig.getByRole("button", { name: "Next stage" }).click();
  await expect(fig.getByText("Stage 5 of 5")).toBeVisible();
  await expect(fig.locator(".uml-class")).toHaveCount(12);
  await expect(fig.getByRole("button", { name: "Next stage" })).toBeDisabled();
});

test("an exercise: a wrong submission unlocks the solution, the reference passes and ticks it on the hub", async ({ page }) => {
  await page.goto("/lld/exercises/event-bus");
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem("sds-view", "read"); });
  await page.reload();
  await page.waitForSelector(".cm-content");

  await page.getByRole("button", { name: /Submit/ }).click();
  await expect(page.locator(".pw-headline")).toContainText("Wrong answer");
  await expect(page.getByText("step-by-step solution is now unlocked")).toBeVisible();

  const solution = readFileSync(path.resolve(__dirname, "../../content/lld/exercises/event-bus/solution.js"), "utf8");
  await typeCode(page, solution);
  await page.getByRole("button", { name: /Submit/ }).click();
  await expect(page.locator(".pw-headline")).toContainText("Accepted");

  await page.goto("/lld");
  await expect(page.getByRole("link", { name: /Event Bus/ }).getByLabel("Solved", { exact: true })).toBeVisible();
  // An exercise never marks a DSA problem solved: the stores use separate keys.
  await page.goto("/dsa/problems");
  await expect(page.getByLabel("Solved", { exact: true })).toHaveCount(0);
});
