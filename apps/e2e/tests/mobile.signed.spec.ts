import { expect, test } from "@playwright/test";
import { clickText, expectNoVendorModels, TEST_USER_PHONE, visibleText, waitForApp } from "../src/helpers";

test("signed-in me page shows the test phone, trial quota, and sync", async ({ page }) => {
  await waitForApp(page);
  await clickText(page, "我的");
  await expect(page.getByText(TEST_USER_PHONE).filter({ visible: true }).first()).toBeVisible();
  await expect(visibleText(page, "試用").or(visibleText(page, "免費")).first()).toBeVisible();
  await expect(page.getByText(/已用 \d+／\d+/).filter({ visible: true })).toBeVisible();
  await expect(visibleText(page, "立即同步")).toBeVisible();
  await expect(page.getByText(/本機已保存 \d+ 段對話/).filter({ visible: true })).toBeVisible();
  await clickText(page, "立即同步");
  await expect(page.getByText("已同步。").or(page.getByText(/上次同步/)).filter({ visible: true }).first()).toBeVisible();
  await expectNoVendorModels(page);
});

test("write opens from the home rewrite tool", async ({ page }) => {
  await waitForApp(page);
  await clickText(page, "對話");
  await expect(visibleText(page, "熱門智能體")).toBeVisible();
  await clickText(page, "改寫");
  await expect(visibleText(page, "開始")).toBeVisible();
  await expect(page.getByPlaceholder("問智泉").filter({ visible: true })).toBeVisible();
});

test("translate opens from the all-tools catalog", async ({ page }) => {
  await waitForApp(page);
  await clickText(page, "對話");
  await expect(visibleText(page, "熱門智能體")).toBeVisible();
  await clickText(page, "查看全部", "first");
  await visibleText(page, "翻譯").scrollIntoViewIfNeeded();
  await clickText(page, "翻譯");
  await expect(page.getByText("由一種語言譯去另一種").filter({ visible: true })).toBeVisible();
  await expect(visibleText(page, "開始")).toBeVisible();
});

test("the pool sheet names 智泉 models and has no vendor picker", async ({ page }) => {
  await waitForApp(page);
  await clickText(page, "對話");
  await clickText(page, "智泉");
  await expect(page.getByText("每一句由智泉抽選，唔使揀模型。")).toBeVisible();
  await expect(page.getByText("智泉 · DeepSeek")).toBeVisible();
  await expect(page.getByText("智泉 · Qwen")).toBeVisible();
  await expect(page.getByText("智泉 · Gemma")).toBeVisible();
  await expectNoVendorModels(page);
});
