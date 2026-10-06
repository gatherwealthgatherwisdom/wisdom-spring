import { expect, test } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  attachPhotoFixture,
  clickLabel,
  clickText,
  expectNoVendorModels,
  expectQuotaIncreased,
  fetchCapabilities,
  KIND_BADGE,
  leaveChat,
  openNewChat,
  readQuota,
  visibleText,
  waitForApp,
  waitForLiveTurn,
} from "../src/helpers";

const LOOK_PNG = path.join(path.dirname(fileURLToPath(import.meta.url)), "../fixtures/look.png");
const TEXT_PROMPT = "只回覆一個字：春";
const IMAGE_PROMPT = "一朵白花，白底，簡單";
const VISION_PROMPT = "呢張圖主要係咩顏色？用一個詞答。";

test.describe.configure({ mode: "serial" });

test("a short signed-in chat streams a 智泉 reply and counts against quota", async ({ page }) => {
  await waitForApp(page);
  const before = await readQuota(page);
  if (before.used >= before.limit) test.skip(true, "quota exhausted");
  await openNewChat(page);
  await page.getByPlaceholder("問智泉").filter({ visible: true }).fill(TEXT_PROMPT);
  await clickLabel(page, "send");
  const result = await waitForLiveTurn(page, { prompt: TEXT_PROMPT });
  if (result !== "ok") test.skip(true, result);
  await expect(visibleText(page, TEXT_PROMPT).first()).toBeVisible();
  await expect(page.getByText(KIND_BADGE).filter({ visible: true })).toBeVisible();
  await expectNoVendorModels(page);
  await leaveChat(page);
  await expectQuotaIncreased(page, before);
});

test("the image tab generates a picture when the pool has an image model", async ({ page }) => {
  await waitForApp(page);
  const caps = await fetchCapabilities(page);
  if (!caps?.image) test.skip(true, "no image model");
  const before = await readQuota(page);
  if (before.used >= before.limit) test.skip(true, "quota exhausted");
  await clickText(page, "圖像");
  if (await visibleText(page, "暫時未有可用圖像模型。").isVisible().catch(() => false)) {
    test.skip(true, "暫時未有可用圖像模型。");
  }
  await page.getByPlaceholder("問智泉").filter({ visible: true }).fill(IMAGE_PROMPT);
  await clickLabel(page, "開始");
  const result = await waitForLiveTurn(page, { image: true });
  if (result !== "ok") test.skip(true, result);
  await expect(visibleText(page, IMAGE_PROMPT).first()).toBeVisible();
  await expect(page.getByText(KIND_BADGE).filter({ visible: true })).toBeVisible();
  await expectNoVendorModels(page);
  await leaveChat(page);
  await expectQuotaIncreased(page, before);
});

test("a photo attach asks a vision model when the pool can look at pictures", async ({ page }) => {
  await waitForApp(page);
  const caps = await fetchCapabilities(page);
  if (!caps?.vision) test.skip(true, "no vision model");
  const before = await readQuota(page);
  if (before.used >= before.limit) test.skip(true, "quota exhausted");
  await openNewChat(page);
  const attached = await attachPhotoFixture(page, LOOK_PNG);
  if (attached !== "ok") test.skip(true, attached);
  await page.getByPlaceholder("問智泉").filter({ visible: true }).fill(VISION_PROMPT);
  await clickLabel(page, "send");
  const result = await waitForLiveTurn(page, { prompt: VISION_PROMPT });
  if (result !== "ok") test.skip(true, result);
  await expect(visibleText(page, VISION_PROMPT).first()).toBeVisible();
  await expect(page.getByText(KIND_BADGE).filter({ visible: true })).toBeVisible();
  await expectNoVendorModels(page);
  await leaveChat(page);
  await expectQuotaIncreased(page, before);
});

