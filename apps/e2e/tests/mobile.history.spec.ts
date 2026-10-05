import { expect, test } from "@playwright/test";
import { clickLabel, clickText, visibleText, waitForApp } from "../src/helpers";

test("the conversation drawer searches, filters, and opens recently deleted", async ({ page }) => {
  await waitForApp(page);
  await clickText(page, "對話");
  await clickLabel(page, "對話列表");
  await expect(visibleText(page, "新對話")).toBeVisible();
  await expect(page.getByPlaceholder("搜尋對話").filter({ visible: true })).toBeVisible();
  await expect(visibleText(page, "全部")).toBeVisible();
  await expect(visibleText(page, "寫作")).toBeVisible();
  await expect(visibleText(page, "翻譯")).toBeVisible();
  await clickText(page, "寫作");
  await clickText(page, "翻譯");
  await clickText(page, "全部");
  await clickText(page, "最近刪除");
  await expect(visibleText(page, "完成")).toBeVisible();
});
