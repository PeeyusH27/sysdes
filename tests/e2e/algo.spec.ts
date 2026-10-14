import { expect, test } from "@playwright/test";

// "Try your own input" on the algorithm walkthroughs: the trace's module loads in the browser and re-runs.
const pairSum = (page: import("@playwright/test").Page) => page.getByRole("figure", { name: /Opposite ends: find a pair/ });

test("Edit input re-runs a walkthrough on the reader's numbers", async ({ page }) => {
  await page.goto("/dsa/patterns/two-pointers");
  const fig = pairSum(page);
  await fig.getByRole("button", { name: "Edit input" }).click();
  await fig.getByLabel("nums", { exact: true }).fill("9, 2, 7, 4, 1");
  await fig.getByLabel("target", { exact: true }).fill("11");
  await fig.getByRole("button", { name: "Run it" }).click();
  await expect(fig.getByRole("radio", { name: "Your input" })).toHaveAttribute("aria-checked", "true");
  await expect(fig.locator(".algo-note")).toContainText("Sorted nums first");
  await fig.getByRole("button", { name: "Restart" }).click();
  await fig.getByRole("button", { name: "Next step" }).click();
  await expect(fig.locator(".flow-caption")).toContainText("nums[0] + nums[4] = 1 + 9 = 10");
});

test("Edit input explains a bad value next to the field", async ({ page }) => {
  await page.goto("/dsa/patterns/two-pointers");
  const fig = pairSum(page);
  await fig.getByRole("button", { name: "Edit input" }).click();
  await fig.getByLabel("target", { exact: true }).fill("ten");
  await fig.getByRole("button", { name: "Run it" }).click();
  await expect(fig.getByRole("alert")).toContainText("is not a whole number");
  await expect(fig.getByLabel("target", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(fig.getByRole("radio", { name: "Your input" })).toHaveCount(0);
});

test("a walkthrough plays once when it scrolls into view, but not with reduced motion", async ({ browser }) => {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    const page = await browser.newPage({ reducedMotion });
    await page.goto("/dsa/patterns/two-pointers");
    const fig = pairSum(page);
    await fig.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2600);
    const count = await fig.locator(".step-count").textContent();
    if (reducedMotion === "reduce") expect(count).toMatch(/^0 \//);
    else expect(count).not.toMatch(/^0 \//);
    await page.close();
  }
});
