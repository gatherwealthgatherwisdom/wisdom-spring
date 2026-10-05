import { expect, test } from "@playwright/test";

test("phone width uses a drawer instead of stacking the sidebar", async ({ page }) => {
  await page.goto("/models");
  await expect(page.getByRole("heading", { name: "模型池" })).toBeVisible();
  await expect(page.getByRole("button", { name: "開啟選單" })).toBeVisible();
  const aside = page.locator("aside");
  await expect(aside).not.toBeInViewport();
  await page.getByRole("button", { name: "開啟選單" }).click();
  await expect(aside).toBeInViewport();
  await expect(aside.getByRole("link", { name: "用戶" })).toBeVisible();
  await aside.getByRole("button", { name: "關閉選單" }).click();
  await expect(aside).not.toBeInViewport();
});
