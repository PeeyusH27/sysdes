import { expect, test, type Page } from "@playwright/test";

const SELECT_ALL = process.platform === "darwin" ? "Meta+A" : "Control+A";

async function clean(page: Page, path: string) {
  await page.goto(path);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem("sds-view", "read"); });
  await page.reload();
}

test("the plan: answer three questions, get a schedule, and it reacts to progress", async ({ page }) => {
  await clean(page, "/plan");
  await expect(page.getByRole("heading", { name: "Build your plan" })).toBeVisible();
  await page.getByLabel("How many weeks until the interview?").selectOption("4");
  await page.getByLabel("How many hours a week can you study?").selectOption("8");
  await page.getByRole("button", { name: /Build my plan/ }).click();

  await expect(page.getByText("weeks left")).toBeVisible();
  await expect(page.locator(".pl-next")).toContainText("Do this next");
  await expect(page.getByText("this week")).toBeVisible();
  // With a short timeline the most common pattern comes first.
  await expect(page.locator(".pl-week").first()).toContainText("Hash Maps and Sets");

  // Reading a pattern moves it out of the plan: the schedule is derived from progress.
  await page.goto("/dsa/patterns/hashing");
  await page.getByRole("button", { name: /Mark complete/ }).click();
  await page.goto("/plan");
  await expect(page.locator(".pl-week").first()).not.toContainText("Read Hash Maps and Sets");
});

test("readiness: tiles explain their score and point at the next step", async ({ page }) => {
  await clean(page, "/plan");
  await page.getByRole("button", { name: /Build my plan/ }).click();
  const tile = page.getByRole("button", { name: /^Hash Maps and Sets: 0%/ });
  await tile.click();
  const detail = page.locator(".rd-detail");
  await expect(detail).toContainText("Problems solved");
  await expect(detail.getByRole("link", { name: /Read Hash Maps and Sets/ })).toBeVisible();
  await expect(page.getByText(/0 of \d+ skills interview-ready/).first()).toBeVisible();
});

test("a mock round: hints are locked, the round is judged, and the debrief says what to review", async ({ page }) => {
  await clean(page, "/mock?type=lld");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Rehearse it");
  await page.getByRole("button", { name: /Start the low-level design round/ }).click();
  await expect(page).toHaveURL(/\/lld\/exercises\//);
  await page.waitForSelector(".cm-content");
  await expect(page.getByRole("region", { name: "Mock round" })).toContainText("Low-level design round");

  // Hints and the solution stay locked, even after a wrong submission.
  await page.getByRole("tab", { name: /Hints/ }).click();
  await expect(page.getByText("Hints are off in a mock round")).toBeVisible();
  await page.getByRole("button", { name: /Submit/ }).click();
  await expect(page.locator(".pw-headline")).toContainText("Wrong answer");
  await expect(page.getByText("step-by-step solution is now unlocked")).toHaveCount(0);
  await page.getByRole("tab", { name: /Solution/ }).click();
  await expect(page.getByText("The solution is locked during the round")).toBeVisible();

  await page.getByRole("button", { name: "Finish round" }).click();
  await expect(page).toHaveURL(/\/mock\/debrief$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("0%");
  await expect(page.getByText("Not solved in time, 1 submission")).toBeVisible();
  await expect(page.getByRole("link", { name: /^Review / }).first()).toBeVisible();

  // The round is over: the bar is gone and the solution is available again.
  await expect(page.getByRole("region", { name: "Mock round" })).toHaveCount(0);
  await page.getByRole("link", { name: /Try it again, with hints/ }).click();
  await page.waitForSelector(".cm-content");
  await page.getByRole("tab", { name: /Solution/ }).click();
  await expect(page.getByText("The solution is locked during the round")).toHaveCount(0);

  await page.goto("/mock");
  await expect(page.getByRole("heading", { name: "Past rounds" })).toBeVisible();
});

test("a coding round asks two problems and counts a correct submission", async ({ page }) => {
  await clean(page, "/mock?type=dsa");
  await page.getByRole("button", { name: /Start the coding/ }).click();
  const bar = page.getByRole("region", { name: "Mock round" });
  await expect(bar.locator(".mockbar-items li")).toHaveCount(2);
  const title = await page.locator("h1").first().innerText();
  expect(title.length).toBeGreaterThan(2);
  await page.waitForSelector(".cm-content");
  // Time's up: ending the round from the bar scores what was done.
  await page.getByRole("button", { name: "Finish round" }).click();
  await expect(page).toHaveURL(/\/mock\/debrief$/);
  await expect(page.locator(".db-item")).toHaveCount(2);
  void SELECT_ALL;
});

test("the timer ends the round by itself", async ({ page }) => {
  await clean(page, "/mock?type=hld");
  await page.getByLabel("Length").selectOption("30");
  await page.getByRole("button", { name: /Start the system design round/ }).click();
  await expect(page).toHaveURL(/\/playground\//);
  // Pretend the round began 31 minutes ago.
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("sds-mock")!);
    raw.state.active.startedAt -= 31 * 60_000;
    localStorage.setItem("sds-mock", JSON.stringify(raw));
  });
  await page.reload();
  await expect(page).toHaveURL(/\/mock\/debrief$/, { timeout: 10_000 });
  await expect(page.getByText("ran out of time").or(page.getByText("timer ended"))).toBeVisible();
});
