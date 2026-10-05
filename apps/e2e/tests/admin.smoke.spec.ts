import { expect, test } from "@playwright/test";

test("signed-in admin lands on the model pool with actions visible", async ({ page }) => {
  await page.goto("/models");
  await expect(page.getByRole("heading", { name: "模型池" })).toBeVisible();
  await expect(page.getByRole("button", { name: "同步目錄" })).toBeVisible();
  await expect(page.getByRole("button", { name: "探測" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "封鎖" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "模型" })).toBeVisible();
});
