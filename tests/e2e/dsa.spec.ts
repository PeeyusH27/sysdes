import { expect, test, type Page } from "@playwright/test";

const SELECT_ALL = process.platform === "darwin" ? "Meta+A" : "Control+A";

async function typeCode(page: Page, code: string) {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press(SELECT_ALL);
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(code);
}

test("home offers both tracks", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Data structures and algorithms" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "System design", exact: true })).toBeVisible();
  await page.getByRole("link", { name: /Start the DSA track/ }).click();
  await expect(page).toHaveURL(/\/dsa$/);
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Patterns" })).toBeVisible();
});

test("solution unlocks after a wrong submission, and a correct one marks the problem solved", async ({ page }) => {
  await page.goto("/dsa/problems/move-zeroes");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector(".cm-content");

  await page.getByRole("tab", { name: /Solution/ }).click();
  await expect(page.getByRole("heading", { name: "The solution is locked" })).toBeVisible();

  await page.getByRole("button", { name: /Submit/ }).click();
  await expect(page.locator(".pw-headline")).toContainText("Wrong answer");
  await expect(page.getByText("step-by-step solution is now unlocked")).toBeVisible();
  await page.getByRole("button", { name: "Open the solution" }).click();
  await expect(page.locator(".solution").getByRole("heading", { name: "Step by step" })).toBeVisible();

  await typeCode(page, "function moveZeroes(nums) {\n  let w = 0;\n  for (let r = 0; r < nums.length; r++) if (nums[r] !== 0) { [nums[w], nums[r]] = [nums[r], nums[w]]; w++; }\n}\n");
  await page.getByRole("button", { name: /Submit/ }).click();
  await expect(page.locator(".pw-headline")).toContainText("Accepted");
  await expect(page.getByRole("button", { name: /Solved/ })).toBeVisible();

  await page.goto("/dsa/problems");
  await expect(page.getByRole("link", { name: /Move Zeroes/ }).getByLabel("Solved")).toBeVisible();
});

test("the editor reports runtime errors with a line and stops infinite loops", async ({ page }) => {
  await page.goto("/dsa/problems/move-zeroes");
  await page.waitForSelector(".cm-content");
  await typeCode(page, "function moveZeroes(nums) {\n  return nums.foo.bar;\n}");
  await page.getByRole("button", { name: /Run examples/ }).click();
  await expect(page.locator(".pw-case-detail .pw-error")).toContainText("line 2");
  await typeCode(page, "function moveZeroes(nums) { while (true) {} }");
  await page.getByRole("button", { name: /Run examples/ }).click();
  await expect(page.locator(".pw-headline")).toContainText("Time limit exceeded", { timeout: 10_000 });
});

test("drafts survive a reload", async ({ page }) => {
  await page.goto("/dsa/problems/valid-palindrome");
  await page.waitForSelector(".cm-content");
  await typeCode(page, "// my draft\nfunction isPalindrome(s) { return true; }");
  await page.waitForTimeout(600);
  await page.reload();
  await expect(page.locator(".cm-content")).toContainText("my draft");
});

test("the algorithm player steps with buttons and keys and highlights the code line", async ({ page }) => {
  await page.goto("/dsa/patterns/two-pointers");
  const fig = page.locator("figure.algo").first();
  await fig.getByRole("button", { name: "Next step" }).click();
  await expect(fig.locator(".flow-caption")).toContainText("nums[0] + nums[5]");
  await expect(fig.locator(".line.is-active")).toContainText("const sum");
  await fig.locator(".algo-stage").focus();
  await page.keyboard.press("ArrowRight");
  await expect(fig.locator(".flow-caption")).toContainText("too big");
  await fig.getByRole("radio", { name: "No pair" }).click();
  await expect(fig.locator(".step-count")).toHaveText(/^0 \//);
});

test("runnable snippets print their output", async ({ page }) => {
  await page.goto("/dsa/js#map-set");
  const block = page.locator("#map-set figure.run-code").first();
  await block.getByRole("button", { name: "Run" }).click();
  await expect(block.locator(".console-body")).toContainText("36");
});

test("problem filters are kept in the URL", async ({ page }) => {
  await page.goto("/dsa/problems");
  await page.getByRole("button", { name: "Hard", exact: true }).click();
  await expect(page).toHaveURL(/lv=Hard/);
  await expect(page.getByRole("link", { name: /Trapping Rain Water/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Move Zeroes/ })).toHaveCount(0);
});
