import { expect, test } from "@playwright/test";
import { DOODLE_NAMES } from "../../src/components/doodle/names";

test("the architecture lab: grow it, click a box, break it, follow a request", async ({ page }) => {
  await page.goto("/architecture");
  await page.waitForSelector(".react-flow__node");
  await expect(page.locator(".react-flow__node")).toHaveCount(3);
  await expect(page.getByText("Stage 1 of 11")).toBeVisible();

  // Grow: each stage adds what the traffic forces, and says what goes wrong first.
  await page.getByRole("button", { name: "Next stage" }).click();
  await expect(page.getByText("Traffic grows: a load balancer and more servers")).toBeVisible();
  await expect(page.getByText(/The old design at this load/)).toContainText("App servers");
  await page.getByRole("button", { name: "Next stage" }).click();
  await page.getByRole("button", { name: "Next stage" }).click();
  await expect(page.locator(".react-flow__node")).toHaveCount(5);
  // The story plays itself: one more stage appears without a click.
  await page.getByRole("button", { name: "Play the story" }).click();
  await expect(page.getByText("Stage 5 of 11")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Pause" }).click();
  for (let i = 0; i < 6; i++) await page.getByRole("button", { name: "Next stage" }).click();
  await expect(page.getByText("Stage 11 of 11")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Survive a region: run a second copy" })).toBeVisible();
  await expect(page.locator(".react-flow__node")).toHaveCount(18);
  await page.getByRole("button", { name: "Previous stage" }).click();
  await expect(page.getByText(/The old design at this load/)).toContainText("%");

  // Click a box.
  await page.locator(".react-flow__node").filter({ hasText: "Redis cache" }).first().click();
  const card = page.getByRole("article", { name: "Redis cache" });
  await expect(card).toContainText("When not to");
  await expect(card).toContainText("Trade-offs");
  await expect(card.getByRole("link").first()).toBeVisible();
  await card.getByRole("button", { name: "Close" }).click();
  await expect(card).toHaveCount(0);

  // Break it: a spike overloads things, and the coach says what to do.
  await page.getByRole("tab", { name: "Break it" }).click();
  await expect(page.getByText("Everything holds")).toBeVisible();
  await page.getByRole("button", { name: /Spike/ }).click();
  await expect(page.locator(".lab-findings li[data-level=bad]").first()).toContainText("capacity");
  await page.getByRole("button", { name: "Reset" }).click();
  await page.getByLabel("Break something").selectOption({ label: "Kill API gateway" });
  await expect(page.locator(".lab-findings li").first()).toContainText("failing");
  await page.getByRole("button", { name: "Reset" }).click();

  // Follow a request.
  await page.getByRole("tab", { name: "Follow a request" }).click();
  await expect(page.getByText("Hop 1 of 7")).toBeVisible();
  await page.getByRole("button", { name: "Next hop" }).click();
  await page.getByRole("button", { name: "Next hop" }).click();
  await expect(page.getByText("Hop 3 of 7")).toBeVisible();
  await expect(page.locator(".hld-node[data-tone=active]").first()).toBeVisible();
  await expect(page.locator(".hld-node[data-tone=dim]").first()).toBeVisible();
});

test("a question page opens on its core, with the 30-second card, and Everything shows the rest", async ({ page }) => {
  await page.goto("/questions/parking-lot");
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem("sds-view", "read"); });
  await page.reload();
  await expect(page.getByRole("region", { name: "Say it in 30 seconds" })).toContainText("SKIP LOCKED");
  const visible = () => page.locator(".sec-card:visible").count();
  const core = await visible();
  expect(core).toBeLessThanOrEqual(7);
  await page.getByRole("button", { name: /Everything/ }).first().click();
  await expect.poll(visible).toBeGreaterThan(core);
  await page.getByRole("button", { name: "Core", exact: true }).first().click();
  await expect.poll(visible).toBe(core);
  // A link into a folded section opens it.
  await page.goto("/questions/parking-lot#implementation");
  await expect(page.locator('.sec-card[data-sec="implementation"]')).toBeVisible();
});

test("explain it back: five steps, a checklist, and a saved score", async ({ page }) => {
  await page.goto("/explain/rate-limiter");
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem("sds-view", "read"); });
  await page.reload();
  await page.getByRole("button", { name: /Start/ }).click();
  for (let i = 0; i < 5; i++) {
    await expect(page.getByText(`Step ${i + 1} of 5`)).toBeVisible();
    await page.getByRole("textbox").fill(`my answer ${i}`);
    await page.getByRole("button", { name: i === 4 ? "Check my answer" : "Next step" }).click();
  }
  await expect(page.getByRole("heading", { name: "Did your answer cover these?" })).toBeVisible();
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("checkbox").nth(1).check();
  await expect(page.getByRole("status")).toContainText("% of the checklist");
  await page.getByRole("button", { name: "Save my result" }).click();
  await expect(page.getByText(/Saved: \d+%/)).toBeVisible();
  // Drafts survive a reload.
  await page.reload();
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.getByRole("textbox")).toHaveValue("my answer 0");
});

test("doodles: the gallery shows every drawing, and the sketch style can be switched on", async ({ page }) => {
  await page.goto("/doodles");
  await expect(page.locator(".doodle-grid figure.doodle")).toHaveCount(DOODLE_NAMES.length);
  await expect(page.locator('.doodle-grid [data-missing]')).toHaveCount(0);
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.getByRole("button", { name: "Sketch style" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-sketch", "on");
  await page.goto("/learn/caching");
  await expect(page.locator("html")).toHaveAttribute("data-sketch", "on");
  await page.getByRole("button", { name: "Sketch style" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-sketch", "on");
});
