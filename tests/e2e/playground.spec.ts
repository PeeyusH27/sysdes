import { expect, test } from "@playwright/test";

test("the playground lists the challenges and a sandbox", async ({ page }) => {
  await page.goto("/playground");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Design it");
  await expect(page.getByRole("link", { name: "Guided mission: URL shortener" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Free challenge: URL shortener" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start the challenge: Notification system" })).toBeVisible();
  await page.getByRole("link", { name: /Sandbox/ }).click();
  await expect(page).toHaveURL(/\/playground\/sandbox$/);
  await expect(page.locator(".react-flow__pane")).toBeVisible();
});

test("challenge answers are not offered as templates", async ({ page }) => {
  await page.goto("/playground/sandbox");
  const options = await page.locator('select[aria-label="Load a template"] option').allTextContents();
  expect(options.some((o) => o.startsWith("Challenge answer"))).toBe(false);
});

test("drag components onto the canvas and connect them", async ({ page }) => {
  await page.goto("/playground/sandbox");
  await page.evaluate(() => localStorage.removeItem("sds-playground"));
  await page.reload();
  const pane = page.locator(".react-flow__pane");
  await page.getByRole("button", { name: "Client", exact: true }).dragTo(pane, { targetPosition: { x: 150, y: 150 } });
  await page.getByRole("button", { name: "Load balancer", exact: true }).dragTo(pane, { targetPosition: { x: 450, y: 150 } });
  await expect(page.locator(".react-flow__node")).toHaveCount(2);
  await page.locator(".react-flow__node").first().locator(".react-flow__handle-right").dragTo(page.locator(".react-flow__node").nth(1).locator(".react-flow__handle-left"));
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
});

test("the reference design scores 100% and survives a share link round trip", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/playground/url-shortener");
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /Show reference answer/ }).click();
  await page.getByRole("button", { name: /Load the reference design/ }).click();
  await expect(page.getByRole("tab", { name: /Grade 100%/ })).toBeVisible();
  await page.getByRole("button", { name: "Share" }).click();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toContain("#d=");
  await page.evaluate(() => localStorage.removeItem("sds-playground"));
  await page.goto(url);
  await expect(page.locator(".react-flow__node")).toHaveCount(11);
});

test("simulation shows load on nodes", async ({ page }) => {
  await page.goto("/playground/rate-limiter");
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /Show reference answer/ }).click();
  await page.getByRole("button", { name: /Load the reference design/ }).click();
  await page.getByRole("button", { name: "Simulate" }).click();
  await expect(page.getByText(/Estimated client latency/)).toBeVisible();
  await expect(page.locator(".hld-node .load").first()).toBeVisible();
});

test("a guided mission: scenarios fail with a reason, the fix is offered after a try, and finishing is remembered", async ({ page }) => {
  await page.goto("/playground/url-shortener/guided");
  await page.evaluate(() => {
    localStorage.removeItem("sds-playground");
    localStorage.removeItem("sds-progress");
  });
  await page.reload();
  page.on("dialog", (d) => d.accept());
  await expect(page.locator(".react-flow__node")).toHaveCount(3);
  await expect(page.getByRole("tab", { name: /Mission 0\/5/ })).toHaveAttribute("aria-selected", "true");

  // The fix is not offered before the learner has tried.
  await expect(page.getByRole("button", { name: /Show me the fix/ })).toBeDisabled();
  await page.getByRole("button", { name: "Run the scenario" }).click();
  await expect(page.locator(".mission-fail")).toContainText("App server is at 200% of capacity");
  await expect(page.getByRole("button", { name: /Show me the fix/ })).toBeEnabled();

  // Play every step the quick way: run, take the fix, run again.
  const total = 5;
  for (let i = 0; i < total; i++) {
    if (i > 0) await page.getByRole("button", { name: "Run the scenario" }).click();
    await expect(page.locator(".mission-fail")).toBeVisible();
    await page.getByRole("button", { name: /Show me the fix/ }).click();
    await page.getByRole("button", { name: "Run the scenario" }).click();
    await expect(page.locator(".mission-pass")).toContainText("It holds.");
    if (i < total - 1) await page.getByRole("button", { name: /Next step/ }).click();
  }
  await expect(page.locator(".mission-done")).toContainText("Mission complete");
  await expect(page.getByRole("tab", { name: /Mission 5\/5/ })).toBeVisible();

  await page.goto("/playground");
  await expect(page.getByText("Mission done")).toBeVisible();

  // The free challenge keeps the design the mission built, so the learner carries on from there.
  await page.goto("/playground/url-shortener");
  await expect(page.locator(".react-flow__node")).not.toHaveCount(0);
  await expect(page.getByRole("tab", { name: /Grade \d+%/ })).toBeVisible();
});

test("breaking one instance of a replicated component is possible in the sandbox", async ({ page }) => {
  await page.goto("/playground/sandbox");
  page.on("dialog", (d) => d.accept());
  await page.selectOption('select[aria-label="Load a template"]', "request-path");
  await page.getByRole("button", { name: "Simulate" }).click();
  const options = await page.locator("select:not([aria-label])").last().locator("option").allTextContents();
  expect(options.some((o) => /^Lose one .* instance$/.test(o))).toBe(true);
});
