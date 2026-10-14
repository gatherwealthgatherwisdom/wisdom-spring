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
  await expect(composerBox(page, "描述你想畫的圖")).toBeVisible();
  await expectNoVendorModels(page);

  await clickText(page, "發現");
  await expect(visibleText(page, "發現").first()).toBeVisible();
  await expect(visibleText(page, "工具").first()).toBeVisible();
  await expect(visibleText(page, "推薦")).toBeVisible();
  await expectNoVendorModels(page);

  await clickText(page, "我的");
  await expect(visibleText(page, "未登入")).toBeVisible();
  await expect(page.getByText("未登入亦可先瀏覽各頁")).toBeVisible();
  await expect(visibleText(page, "登入")).toBeVisible();
  await expect(visibleText(page, "中盈紫達集團")).toBeVisible();
  await expectNoVendorModels(page);

  await clickText(page, "對話");
  await expect(visibleText(page, "熱門智能體")).toBeVisible();
  await expect(composerBox(page, "問智泉")).toBeVisible();
  await clickLabel(page, "+");
  await expect(page.locator('[aria-label="問"]').filter({ visible: true })).toBeVisible();
  await expect(page.locator('[aria-label="畫圖"]').filter({ visible: true })).toBeVisible();
  await expect(page.locator('[aria-label="看圖"]').filter({ visible: true })).toBeVisible();
  await expect(page.locator('[aria-label="文件"]').filter({ visible: true })).toBeVisible();
  await clickLabel(page, "畫圖");
  await expect(composerBox(page, "描述你想畫的圖")).toBeVisible();
  await clickLabel(page, "看圖");
  await expect(composerBox(page, "問這張圖")).toBeVisible();
  await expect(page.locator('[aria-label="相機"]').filter({ visible: true })).toBeVisible();
  await expect(page.locator('[aria-label="相簿"]').filter({ visible: true })).toBeVisible();
  await clickLabel(page, "問");
  await expect(composerBox(page, "問智泉")).toBeVisible();
  await expectComposerControls(page);
  await clickText(page, "改寫");
  await expect(visibleText(page, "開始")).toBeVisible();
  await expect(page.getByPlaceholder("貼上你想改寫的句子").filter({ visible: true })).toBeVisible();
  await expect(visibleText(page, "保留原意，句子更清楚。")).toBeVisible();
  await clickText(page, "開始");
  await expect(visibleText(page, "開始")).toBeVisible();
  await expect(visibleText(page, "共飲智慧之泉")).toHaveCount(0);
  await page.getByPlaceholder("貼上你想改寫的句子").fill("請改寫這句。");
  await clickText(page, "開始");
  await expect(visibleText(page, "登入").first()).toBeVisible();
});

test("all tools groups jobs and shows each blurb", async ({ page }) => {
  await waitForApp(page);
  await clickText(page, "發現");
  await clickText(page, "查看全部");
  await expect(visibleText(page, "工具").first()).toBeVisible();
  await expect(visibleText(page, "即時語音")).toHaveCount(0);
  await expect(visibleText(page, "寫作").first()).toBeVisible();
  await expect(visibleText(page, "文件").first()).toBeVisible();
  await expect(visibleText(page, "保留原意，句子更清楚。")).toBeVisible();
  await visibleText(page, "助手").scrollIntoViewIfNeeded();
  await expect(visibleText(page, "用固定語氣回覆。")).toBeVisible();
  await visibleText(page, "翻譯").last().scrollIntoViewIfNeeded();
  await expect(visibleText(page, "由一種語言譯成另一種。")).toBeVisible();
  await expect(visibleText(page, "口語對譯，自然短句。")).toBeVisible();
});

test("discover tools open an input card without sending the catalog blurb", async ({ page }) => {
  await waitForApp(page);
  await clickText(page, "發現");
  await clickText(page, "解答");
  await expect(visibleText(page, "開始")).toBeVisible();
  await expect(page.getByPlaceholder("寫下你想解答的問題").filter({ visible: true })).toBeVisible();
  await expect(visibleText(page, "把問題拆開，逐步講清楚。")).toBeVisible();
  await clickText(page, "開始");
  await expect(visibleText(page, "開始")).toBeVisible();
  await expect(visibleText(page, "共飲智慧之泉")).toHaveCount(0);
});

test("settings can switch Traditional, Simplified, and English", async ({ page }) => {
  await waitForApp(page);
  await clickText(page, "我的");
  await clickText(page, "简体中文");
  await expect(visibleText(page, "未登录")).toBeVisible();
  await expect(visibleText(page, "登录")).toBeVisible();
  await clickText(page, "发现");
  await expect(visibleText(page, "推荐")).toBeVisible();
  await clickText(page, "图像");
  await expect(visibleText(page, "图像创作")).toBeVisible();
  await clickText(page, "我的");
  await clickText(page, "English");
  await expect(visibleText(page, "Not signed in")).toBeVisible();
  await expect(visibleText(page, "Sign in")).toBeVisible();
  await clickText(page, "Discover");
  await expect(visibleText(page, "Recommended")).toBeVisible();
  await clickText(page, "Image");
  await expect(visibleText(page, "Make an image")).toBeVisible();
  await clickText(page, "Me");
  await clickText(page, "繁體中文");
  await expect(visibleText(page, "未登入")).toBeVisible();
  await clickText(page, "對話");
  await expect(visibleText(page, "熱門智能體")).toBeVisible();
});
