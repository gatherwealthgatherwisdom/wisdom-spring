import { expect, test } from "@playwright/test";
import { clickLabel, clickText, composerBox, expectComposerControls, expectNoVendorModels, visibleText, waitForApp } from "../src/helpers";

test("unsigned users can open the four tabs, tools, and image studio", async ({ page }) => {
  await waitForApp(page);
  await expect(visibleText(page, "工具").first()).toBeVisible();
  await expect(visibleText(page, "熱門智能體")).toBeVisible();
  await expectNoVendorModels(page);

  await clickText(page, "圖像");
  await expect(visibleText(page, "圖像創作")).toBeVisible();
  await expect(visibleText(page, "風格")).toBeVisible();
  await expect(visibleText(page, "水墨")).toBeVisible();
  await expect(visibleText(page, "紙本")).toBeVisible();
  await expect(visibleText(page, "夜色")).toBeVisible();
  await expect(composerBox(page, "描述你想畫嘅圖")).toBeVisible();
  await expectNoVendorModels(page);

  await clickText(page, "發現");
  await expect(visibleText(page, "發現").first()).toBeVisible();
  await expect(visibleText(page, "工具").first()).toBeVisible();
  await expect(visibleText(page, "推薦")).toBeVisible();
  await expectNoVendorModels(page);

  await clickText(page, "我的");
  await expect(visibleText(page, "未登入")).toBeVisible();
  await expect(page.getByText("未登入都可以先睇各頁")).toBeVisible();
  await expect(visibleText(page, "登入")).toBeVisible();
  await expect(visibleText(page, "中盈紫達集團")).toBeVisible();
  await expectNoVendorModels(page);

  await clickText(page, "對話");
  await expect(visibleText(page, "熱門智能體")).toBeVisible();
  await expect(composerBox(page, "問智泉")).toBeVisible();
  await clickLabel(page, "+");
  await expect(page.locator('[aria-label="問"]').filter({ visible: true })).toBeVisible();
  await expect(page.locator('[aria-label="畫圖"]').filter({ visible: true })).toBeVisible();
  await expect(page.locator('[aria-label="睇圖"]').filter({ visible: true })).toBeVisible();
  await expect(page.locator('[aria-label="文件"]').filter({ visible: true })).toBeVisible();
  await clickLabel(page, "畫圖");
  await expect(composerBox(page, "描述你想畫嘅圖")).toBeVisible();
  await clickLabel(page, "睇圖");
  await expect(composerBox(page, "問呢張圖")).toBeVisible();
  await expect(page.locator('[aria-label="相機"]').filter({ visible: true })).toBeVisible();
  await expect(page.locator('[aria-label="相簿"]').filter({ visible: true })).toBeVisible();
  await clickLabel(page, "問");
  await expect(composerBox(page, "問智泉")).toBeVisible();
  await expectComposerControls(page);
  await clickText(page, "改寫");
  await expect(visibleText(page, "開始")).toBeVisible();
  await expect(composerBox(page, "問智泉")).toBeVisible();
});
