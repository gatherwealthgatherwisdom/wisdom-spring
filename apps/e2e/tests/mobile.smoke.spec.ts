import { expect, test } from "@playwright/test";

test("phone web shows 智泉 and the four tabs before sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("智泉").first()).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText("對話", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("圖像", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("發現", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("我的", { exact: true }).first()).toBeVisible();
});
