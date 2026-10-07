import { expect, test } from "@playwright/test";

test("opening page shows 智泉 before the tabs", async ({ page }) => {
  const loading = page.getByTestId("loading-screen");
  await page.goto("/", { waitUntil: "commit" });
  await expect(loading).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText("共飲智慧之泉")).toBeVisible();
  await expect(page.getByText("智泉").first()).toBeVisible();
  await expect(page.getByText("對話", { exact: true }).first()).toBeVisible();
  await expect(loading).toHaveCount(0);
});

test("phone web shows 智泉 and the four tabs before sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("智泉").first()).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText("對話", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("圖像", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("發現", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("我的", { exact: true }).first()).toBeVisible();
});
