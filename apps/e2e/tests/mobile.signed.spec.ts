import { expect, test } from "@playwright/test";
import {
  clickLargestLabel,
  clickText,
  expectLightboxSave,
  expectNoVendorModels,
  TEST_USER_PHONE,
  visibleText,
  waitForApp,
} from "../src/helpers";

test("notice switches persist after leaving 我的", async ({ page }) => {
  await waitForApp(page);
  await clickText(page, "我的");
  await expect(visibleText(page, "通知")).toBeVisible();
  await expect(visibleText(page, "生成完成")).toBeVisible();
  await expect(visibleText(page, "額度將盡")).toBeVisible();
  await expect(visibleText(page, "朗讀完成提示")).toBeVisible();
  const generation = page.getByRole("switch", { name: "生成完成" });
  const quota = page.getByRole("switch", { name: "額度將盡" });
  await expect(generation).toBeVisible();
  await expect(quota).toBeVisible();
  const before = await generation.isChecked();
  await generation.click();
  await expect(generation).toBeChecked({ checked: !before });
  await clickText(page, "對話");
  await clickText(page, "我的");
  await expect(page.getByRole("switch", { name: "生成完成" })).toBeChecked({ checked: !before });
  await page.getByRole("switch", { name: "生成完成" }).click();
  await expect(page.getByRole("switch", { name: "生成完成" })).toBeChecked({ checked: before });
});

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
  await expect(page.getByPlaceholder("貼你想改寫嘅句子").filter({ visible: true })).toBeVisible();
  await expect(visibleText(page, "保留原意，句子更清楚。")).toBeVisible();
  await clickText(page, "開始");
  await expect(visibleText(page, "開始")).toBeVisible();
  await expect(visibleText(page, "共飲智慧之泉")).toHaveCount(0);
});

test("aides open from the all-tools catalog", async ({ page }) => {
  await waitForApp(page);
  await clickText(page, "對話");
  await clickText(page, "查看全部", "first");
  await visibleText(page, "助手").scrollIntoViewIfNeeded();
  await clickText(page, "助手");
  await expect(visibleText(page, "商務助手")).toBeVisible();
  await expect(visibleText(page, "家庭行程")).toBeVisible();
  await expect(visibleText(page, "寫作導師")).toBeVisible();
});

test("口譯 opens the translator", async ({ page }) => {
  await waitForApp(page);
  await clickText(page, "對話");
  await clickText(page, "查看全部", "first");
  await visibleText(page, "口譯").scrollIntoViewIfNeeded();
  await clickText(page, "口譯");
  await expect(page.getByPlaceholder("原文")).toBeVisible();
  await expect(visibleText(page, "開始")).toBeVisible();
});

test("translate opens from the all-tools catalog", async ({ page }) => {
  await waitForApp(page);
  await clickText(page, "對話");
  await expect(visibleText(page, "熱門智能體")).toBeVisible();
  await clickText(page, "查看全部", "first");
  await expect(visibleText(page, "即時語音")).toHaveCount(0);
  await visibleText(page, "翻譯").last().scrollIntoViewIfNeeded();
  await clickText(page, "翻譯");
  await expect(visibleText(page, "翻譯").first()).toBeVisible();
  await expect(visibleText(page, "由")).toBeVisible();
  await expect(visibleText(page, "到")).toBeVisible();
  await expect(page.getByPlaceholder("原文")).toBeVisible();
  await expect(visibleText(page, "開始")).toBeVisible();
});

test("a saved image chat opens full-screen and downloads", async ({ page }) => {
  await waitForApp(page);
  await clickText(page, "我的");
  await clickText(page, "立即同步");
  await expect(page.getByText("已同步。").or(page.getByText(/上次同步/)).filter({ visible: true }).first()).toBeVisible();
  await clickText(page, "圖像");
  await visibleText(page, "最近圖像").scrollIntoViewIfNeeded();
  const recent = page.locator('[aria-label^="最近圖像 "]').filter({ visible: true });
  if ((await recent.count()) === 0) test.skip(true, "no saved image chat");
  await clickLargestLabel(page, (await recent.first().getAttribute("aria-label")) ?? "最近圖像 圖像");
  await expect(page.locator('[aria-label="儲存"]').filter({ visible: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[aria-label="放大"]').filter({ visible: true })).toBeVisible();
  const name = await expectLightboxSave(page);
  expect(name).toMatch(/^智泉-.+\.(png|jpe?g|webp)$/i);
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
