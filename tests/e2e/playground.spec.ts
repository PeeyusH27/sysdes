import { expect, test } from "@playwright/test";

test("drag components onto the canvas and connect them", async ({ page }) => {
  await page.goto("/playground");
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
  await page.selectOption('select[aria-label="Load a template"]', "ref-url-shortener");
  await expect(page.getByRole("tab", { name: /Grade 100%/ })).toBeVisible();
  await page.getByRole("button", { name: "Share" }).click();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toContain("#d=");
  await page.evaluate(() => localStorage.removeItem("sds-playground"));
  await page.goto(url);
  await expect(page.locator(".react-flow__node")).toHaveCount(11);
});

test("simulation shows load on nodes", async ({ page }) => {
  await page.goto("/playground");
  page.on("dialog", (d) => d.accept());
  await page.selectOption('select[aria-label="Load a template"]', "ref-rate-limiter");
  await page.getByRole("button", { name: "Simulate" }).click();
  await expect(page.getByText(/Estimated client latency/)).toBeVisible();
  await expect(page.locator(".hld-node .load").first()).toBeVisible();
});
