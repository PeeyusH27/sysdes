import { expect, test } from "@playwright/test";

test("the CS hub lists the three areas and opens a lesson", async ({ page }) => {
  await page.goto("/cs");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("underneath");
  await expect(page.getByRole("heading", { name: "1. Operating systems and concurrency" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "2. Networking" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "3. Databases internals" })).toBeVisible();
  await page.getByRole("link", { name: /Processes, Threads and Context Switches/ }).click();
  await expect(page).toHaveURL(/\/cs\/processes-threads$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Processes, Threads");
});

test("a CS lesson ends with follow-up questions and a quiz, and is reachable from the System Design menu", async ({ page }) => {
  await page.goto("/cs/synchronization");
  await expect(page.locator('.sec-card[data-sec="follow-up-questions"]')).toHaveCount(1);
  await expect(page.locator("section.quiz")).toHaveCount(1);
  await page.goto("/system-design");
  await expect(page.getByRole("link", { name: /CS fundamentals/ }).first()).toBeVisible();
});

test("the CS lessons are searchable and appear in readiness", async ({ page }) => {
  await page.goto("/plan");
  await expect(page.getByRole("heading", { name: "CS fundamentals" })).toBeVisible();
  const res = await page.request.get("/search-index.json");
  const docs = (await res.json()) as { id: string }[];
  expect(docs.some((d) => d.id === "/cs/tcp-in-depth")).toBe(true);
});
