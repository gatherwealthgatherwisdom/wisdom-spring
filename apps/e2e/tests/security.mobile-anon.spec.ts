import { expect, test } from "@playwright/test";
import { clickLabel, clickText, composerBox, waitForApp } from "../src/helpers";

test("sending a chat without a session opens sign-in", async ({ page }) => {
  await waitForApp(page);
  await clickLabel(page, "對話列表");
  await clickText(page, "新對話");
  await expect(composerBox(page, "問智泉")).toBeVisible();
  await composerBox(page, "問智泉").fill("你好");
  await clickLabel(page, "send");
  await expect(page.getByText("取得驗證碼")).toBeVisible();
  await expect(page.getByText("驗證碼", { exact: true })).toHaveCount(0);
});
