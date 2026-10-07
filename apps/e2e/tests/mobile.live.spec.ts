import { expect, test } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  attachPhotoFixture,
  clickLabel,
  clickText,
  composerBox,
  expectComposerControls,
  expectLightboxSave,
  expectNoVendorModels,
  expectQuotaIncreased,
  expectSingleCompletedReply,
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
  await composerBox(page, "問智泉").fill(TEXT_PROMPT);
  await clickLabel(page, "send");
  const result = await waitForLiveTurn(page, { prompt: TEXT_PROMPT });
  if (result !== "ok") test.skip(true, result);
  await expect(visibleText(page, TEXT_PROMPT).first()).toBeVisible();
  await expect(page.getByText(KIND_BADGE)).toHaveCount(0);
  await expectNoVendorModels(page);
  await expectSingleCompletedReply(page);
  await expectComposerControls(page);
  const thinking = visibleText(page, "思考").or(visibleText(page, "思考中"));
  if ((await thinking.count()) > 0) await thinking.first().click();
  await clickLabel(page, "複製");
  await clickLabel(page, "有用");
  await clickLabel(page, "匯出對話");
  await expect(visibleText(page, "已複製整段對話。")).toBeVisible();
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
  await composerBox(page, "描述你想畫嘅圖").fill(IMAGE_PROMPT);
  await clickLabel(page, "send");
  const result = await waitForLiveTurn(page, { image: true });
  if (result !== "ok") test.skip(true, result);
  await expect(visibleText(page, IMAGE_PROMPT).first()).toBeVisible();
  await expect(page.getByText(KIND_BADGE)).toHaveCount(0);
  await expectNoVendorModels(page);
  const name = await expectLightboxSave(page);
  expect(name).toMatch(/^智泉-.+\.(png|jpe?g|webp)$/i);
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
  await composerBox(page, "問呢張圖").fill(VISION_PROMPT);
  await clickLabel(page, "send");
  const result = await waitForLiveTurn(page, { prompt: VISION_PROMPT });
  if (result !== "ok") test.skip(true, result);
  await expect(visibleText(page, VISION_PROMPT).first()).toBeVisible();
  await expect(page.getByText(KIND_BADGE)).toHaveCount(0);
  await expectNoVendorModels(page);
  const name = await expectLightboxSave(page);
  expect(name).toMatch(/^智泉-.+\.(png|jpe?g|webp)$/i);
  await leaveChat(page);
  await expectQuotaIncreased(page, before);
});

test("the same chat can ask then draw without a second 智泉 draft", async ({ page }) => {
  await waitForApp(page);
  const caps = await fetchCapabilities(page);
  if (!caps?.image) test.skip(true, "no image model");
  const before = await readQuota(page);
  if (before.used + 1 >= before.limit) test.skip(true, "quota exhausted");
  await openNewChat(page);
  await composerBox(page, "問智泉").fill(TEXT_PROMPT);
  await clickLabel(page, "send");
  const asked = await waitForLiveTurn(page, { prompt: TEXT_PROMPT });
  if (asked !== "ok") test.skip(true, asked);
  await expectSingleCompletedReply(page);
  await clickLabel(page, "+");
  await clickLabel(page, "畫圖");
  await expect(composerBox(page, "描述你想畫嘅圖")).toBeVisible();
  await composerBox(page, "描述你想畫嘅圖").fill(IMAGE_PROMPT);
  await clickLabel(page, "send");
  const drawn = await waitForLiveTurn(page, { image: true });
  if (drawn !== "ok") test.skip(true, drawn);
  await expect(visibleText(page, TEXT_PROMPT).first()).toBeVisible();
  await expect(visibleText(page, IMAGE_PROMPT).first()).toBeVisible();
  await expect(page.locator('[aria-label="放大"]').filter({ visible: true })).toHaveCount(1);
  await expect(page.locator('[aria-label="再生成"]').filter({ visible: true })).toHaveCount(1);
  await expect(page.getByText("▍").filter({ visible: true })).toHaveCount(0);
  await expect(page.getByText(KIND_BADGE)).toHaveCount(0);
  await leaveChat(page);
  await expectQuotaIncreased(page, before);
});

