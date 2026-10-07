import { expect, test } from "@playwright/test";
import { clickLabel, clickText, visibleText, waitForApp } from "../src/helpers";

test("the conversation drawer searches, filters, and opens recently deleted", async ({ page }) => {
  await waitForApp(page);
  await clickText(page, "對話");
  await clickLabel(page, "對話列表");
  await expect(visibleText(page, "新對話").first()).toBeVisible();
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

test("tidy can delete a chat and restore it from recently deleted", async ({ page }) => {
  await waitForApp(page);
  await clickText(page, "對話");
  await clickLabel(page, "對話列表");
  await expect(page.getByPlaceholder("搜尋對話").filter({ visible: true })).toBeVisible();
  const tidy = visibleText(page, "整理");
  try {
    await expect(tidy).toBeVisible({ timeout: 15_000 });
  } catch {
    test.skip(true, "no chats to tidy");
  }
  await clickText(page, "整理");
  const marker = `e2e刪${Date.now().toString().slice(-6)}`;
  const titled = await page.evaluate(() => {
    const shown = (node: HTMLElement) => {
      let current: HTMLElement | null = node;
      while (current) {
        if (current.getAttribute("aria-hidden") === "true") return false;
        const style = getComputedStyle(current);
        if (style.display === "none" || style.visibility === "hidden") return false;
        current = current.parentElement;
      }
      return true;
    };
    const nodes = Array.from(document.querySelectorAll("body *"));
    for (const node of nodes) {
      if (!(node instanceof HTMLElement) || !shown(node)) continue;
      const rect = node.getBoundingClientRect();
      if (rect.width < 20 || rect.width > 24 || rect.height < 20 || rect.height > 24) continue;
      if (rect.x > 64 || rect.y < 120) continue;
      const row = node.parentElement;
      if (!(row instanceof HTMLElement)) continue;
      row.click();
      const title = row.innerText.trim().split("\n")[0] ?? "";
      return title;
    }
    return "";
  });
  if (!titled) test.skip(true, "no history row");
  await expect(visibleText(page, "已選 1")).toBeVisible();
  await clickText(page, "重新命名");
  const titleBox = page.getByPlaceholder("對話標題").filter({ visible: true });
  await expect(titleBox).toBeVisible();
  await titleBox.fill(marker);
  await clickText(page, "儲存");
  await clickText(page, "刪除");
  await expect(page.getByText("對話會移到最近刪除，30 日內可以復原。")).toBeVisible();
  await clickText(page, "刪除");
  await clickText(page, "最近刪除");
  await expect(visibleText(page, marker).first()).toBeVisible();
  await clickText(page, "整理");
  await clickText(page, marker);
  await clickText(page, "復原");
  await expect(visibleText(page, "未有已刪對話")).toBeVisible();
  await clickLabel(page, "返回");
  await clickLabel(page, "對話列表");
  await expect(page.getByPlaceholder("搜尋對話").filter({ visible: true })).toBeVisible();
  await page.getByPlaceholder("搜尋對話").filter({ visible: true }).fill(marker);
  await expect(visibleText(page, marker).first()).toBeVisible();
});
