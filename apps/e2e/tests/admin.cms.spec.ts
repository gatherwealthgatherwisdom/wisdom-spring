import { expect, test, type Page } from "@playwright/test";

async function heading(page: Page, title: string) {
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
}

test("every CMS page loads from the sidebar", async ({ page }) => {
  await page.goto("/models");
  const pages: Array<{ link: string; title: string }> = [
    { link: "用戶", title: "用戶" },
    { link: "用量", title: "用量" },
    { link: "公告", title: "公告" },
    { link: "審計", title: "審計" },
    { link: "工具", title: "工具" },
    { link: "模板", title: "模板" },
    { link: "發現", title: "發現" },
    { link: "文案", title: "文案" },
    { link: "模型", title: "模型池" },
    { link: "旗標", title: "旗標" },
    { link: "配額", title: "配額" },
  ];
  for (const item of pages) {
    await page.getByRole("link", { name: item.link, exact: true }).click();
    await heading(page, item.title);
  }
});

test("users search opens the admin phone's detail page", async ({ page }) => {
  await page.goto("/users");
  await heading(page, "用戶");
  await page.getByPlaceholder("電話或名稱").fill("92578982");
  await expect(page.getByText("+852 9257 8982")).toBeVisible();
  await page.getByRole("link", { name: "詳情" }).first().click();
  await heading(page, "用戶詳情");
  await expect(page.getByText("+852 9257 8982")).toBeVisible();
  await expect(page.getByText("額外每日次數", { exact: true })).toBeVisible();
});

test("tools, templates, and discover switch catalog tabs", async ({ page }) => {
  await page.goto("/tools");
  await heading(page, "工具");
  await page.getByRole("tab", { name: "助手" }).click();
  await expect(page.getByRole("tab", { name: "助手" })).toHaveAttribute("data-state", "active");

  await page.goto("/templates");
  await heading(page, "模板");
  await page.getByRole("tab", { name: "圖像" }).click();
  await expect(page.getByRole("tab", { name: "圖像" })).toHaveAttribute("data-state", "active");
  await page.getByRole("tab", { name: "翻譯" }).click();
  await expect(page.getByRole("tab", { name: "翻譯" })).toHaveAttribute("data-state", "active");

  await page.goto("/discover");
  await heading(page, "發現");
  await page.getByRole("tab", { name: "全部" }).click();
  await expect(page.getByRole("tab", { name: "全部" })).toHaveAttribute("data-state", "active");
});

test("copy and quotas show live settings", async ({ page }) => {
  await page.goto("/copy");
  await heading(page, "文案");
  await expect(page.getByRole("textbox", { name: "系統提示" })).not.toHaveValue("");
  await expect(page.getByRole("button", { name: "儲存" })).toBeVisible();

  await page.goto("/quotas");
  await heading(page, "配額");
  await expect(page.getByRole("spinbutton", { name: "試用次數" })).toHaveValue("5");
  await expect(page.getByRole("spinbutton", { name: "每日次數" }).first()).toHaveValue("20");
  await expect(page.getByRole("button", { name: "儲存" })).toBeVisible();
});

test("usage and audit render their lists", async ({ page }) => {
  await page.goto("/usage");
  await heading(page, "用量");
  await expect(page.getByText("按模型")).toBeVisible();
  await expect(page.getByLabel("香港月份")).toBeVisible();

  await page.goto("/audit");
  await heading(page, "審計");
  await expect(page.getByLabel("動作")).toBeVisible();
});

test("voice flag can be toggled and restored", async ({ page }) => {
  await page.goto("/flags");
  await heading(page, "旗標");
  const row = page.locator("div").filter({ hasText: "語音介面" }).filter({ has: page.getByRole("switch") }).last();
  const sw = row.getByRole("switch");
  await expect(sw).toBeVisible();
  const before = await sw.getAttribute("aria-checked");
  await sw.click();
  await expect(page.getByText("已更新旗標")).toBeVisible();
  await expect(sw).toHaveAttribute("aria-checked", before === "true" ? "false" : "true");
  await sw.click();
  await expect(sw).toHaveAttribute("aria-checked", before ?? "false");
});

test("announcement can be published and deleted", async ({ page }) => {
  const marker = `e2e 公告 ${Date.now()}`;
  await page.goto("/announcements");
  await heading(page, "公告");
  await page.getByRole("textbox", { name: "繁體中文" }).fill(marker);
  await page.getByRole("textbox", { name: "English" }).fill(marker);
  await page.getByRole("button", { name: "發佈" }).click();
  await expect(page.getByText("已發佈公告")).toBeVisible();
  const article = page.locator("article").filter({ hasText: marker });
  await expect(article).toBeVisible();
  await article.getByRole("button", { name: "刪除" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "刪除" }).click();
  await expect(page.getByText("已刪除公告")).toBeVisible();
  await expect(page.locator("article").filter({ hasText: marker })).toHaveCount(0);
});
