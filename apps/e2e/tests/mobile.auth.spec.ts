import { expect, test } from "@playwright/test";
import { clickLabel, clickText, visibleText, waitForApp } from "../src/helpers";

test("avatar opens phone login with Hong Kong, Macao, and China dials", async ({ page }) => {
  await waitForApp(page);
  await clickLabel(page, "登入");
  await expect(page.getByText("取得驗證碼")).toBeVisible();
  await expect(page.getByText("香港、澳門或中國內地手機")).toBeVisible();
  await clickLabel(page, "+852");
  await expect(visibleText(page, "香港")).toBeVisible();
  await expect(visibleText(page, "澳門")).toBeVisible();
  await expect(visibleText(page, "中國")).toBeVisible();
  await clickText(page, "澳門");
  await expect(page.getByPlaceholder("6612 3456")).toBeVisible();
  await clickLabel(page, "+853");
  await clickText(page, "中國");
  await expect(page.getByPlaceholder("138 0013 8000")).toBeVisible();
});

test("an invalid Hong Kong number stays on the phone step", async ({ page }) => {
  await waitForApp(page);
  await clickText(page, "我的");
  await clickText(page, "登入");
  await page.getByPlaceholder("9123 4567").fill("1234 5678");
  await clickText(page, "取得驗證碼");
  await expect(page.getByText("取得驗證碼")).toBeVisible();
  await expect(page.getByText("驗證碼", { exact: true })).toHaveCount(0);
});

test("sending a chat without a session opens sign-in", async ({ page }) => {
  await waitForApp(page);
  await clickLabel(page, "對話列表");
  await clickText(page, "新對話");
  await expect(page.getByPlaceholder("問智泉")).toBeVisible();
  await expect(page.getByText("寫一封電郵")).toBeVisible();
  await expect(page.getByText("翻譯呢段")).toBeVisible();
  await page.getByPlaceholder("問智泉").fill("你好");
  await clickLabel(page, "send");
  await expect(page.getByText("取得驗證碼")).toBeVisible();
});
