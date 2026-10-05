import { DEFAULT_ADMIN_PHONE, DEV_PHONE_CODE, formatLocalDigits } from "@spring/shared";
import { expect, type Page } from "@playwright/test";
import { clearPhoneRateLimits } from "./rate-limit";

export const ADMIN_LOCAL = DEFAULT_ADMIN_PHONE.replace(/^\+852/, "");
export const TEST_USER_LOCAL = "91118888";
export const TEST_USER_PHONE = `+852${TEST_USER_LOCAL}`;
export const DEV_CODE = DEV_PHONE_CODE;

/** RN-web Pressable often misses Playwright hit-testing; click the inner text node. */
export async function clickText(page: Page, label: string, which: "first" | "last" = "last"): Promise<void> {
  const clicked = await page.evaluate(
    ({ needle, pick }) => {
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
      const start = pick === "last" ? nodes.length - 1 : 0;
      const step = pick === "last" ? -1 : 1;
      const end = pick === "last" ? -1 : nodes.length;
      for (let index = start; index !== end; index += step) {
        const node = nodes[index];
        if (!(node instanceof HTMLElement)) continue;
        if (!shown(node)) continue;
        if (node.innerText.trim() !== needle) continue;
        node.click();
        return true;
      }
      return false;
    },
    { needle: label, pick: which },
  );
  if (!clicked) throw new Error(`clickText: no node with text ${JSON.stringify(label)}`);
}

export async function clickLabel(page: Page, label: string): Promise<void> {
  const clicked = await page.evaluate((needle) => {
    const nodes = Array.from(document.querySelectorAll("body *"));
    for (let index = nodes.length - 1; index >= 0; index -= 1) {
      const node = nodes[index];
      if (!(node instanceof HTMLElement)) continue;
      let current: HTMLElement | null = node;
      let hidden = false;
      while (current) {
        if (current.getAttribute("aria-hidden") === "true") {
          hidden = true;
          break;
        }
        const style = getComputedStyle(current);
        if (style.display === "none" || style.visibility === "hidden") {
          hidden = true;
          break;
        }
        current = current.parentElement;
      }
      if (hidden) continue;
      if (node.getAttribute("aria-label") !== needle) continue;
      node.click();
      return true;
    }
    return false;
  }, label);
  if (!clicked) throw new Error(`clickLabel: no node with aria-label ${JSON.stringify(label)}`);
}

export function visibleText(page: Page, text: string | RegExp) {
  const locator = typeof text === "string" ? page.getByText(text, { exact: true }) : page.getByText(text);
  return locator.filter({ visible: true });
}

export async function waitForApp(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByText("智泉").first()).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText("對話", { exact: true }).first()).toBeVisible();
}

export async function expectNoVendorModels(page: Page): Promise<void> {
  await expect(page.getByText(/\bGPT\b|\bClaude\b|\bGemini\b/)).toHaveCount(0);
}

export async function loginMobile(page: Page): Promise<void> {
  await waitForApp(page);
  await clickText(page, "我的");
  if (await page.getByText(TEST_USER_PHONE).first().isVisible().catch(() => false)) return;
  if (await page.getByText("立即同步").first().isVisible().catch(() => false)) return;
  await expect(page.getByText("未登入", { exact: true })).toBeVisible();
  await clickText(page, "登入");
  await expect(page.getByText("取得驗證碼")).toBeVisible();
  await page.getByPlaceholder("9123 4567").fill(formatLocalDigits("852", TEST_USER_LOCAL));
  await clickText(page, "取得驗證碼");
  await expect(page.getByText("驗證碼", { exact: true })).toBeVisible();
  await page.locator("input").last().fill(DEV_CODE);
  const busy = page.getByText("系統繁忙");
  const synced = page.getByText("立即同步");
  await Promise.race([
    synced.waitFor({ state: "visible" }),
    busy.waitFor({ state: "visible" }),
  ]).catch(() => undefined);
  if (await busy.isVisible().catch(() => false)) {
    clearPhoneRateLimits();
    await clickText(page, "登入");
    await expect(synced).toBeVisible();
  }
  await clickText(page, "我的");
  await expect(page.getByText(TEST_USER_PHONE).first()).toBeVisible();
}

export async function submitAdminOtp(page: Page, localDigits: string): Promise<void> {
  await expect(page.getByText("ADMIN · GWGW")).toBeVisible();
  const phone = page.locator('input[type="tel"]');
  await phone.fill(formatLocalDigits("852", localDigits));
  await page.getByRole("button", { name: "發送驗證碼" }).click();
  const code = page.getByRole("textbox", { name: "驗證碼" });
  await expect(code).toBeVisible();
  await code.fill(DEV_CODE);
  const busy = page.getByRole("alert").filter({ hasText: "系統繁忙" });
  if (await busy.isVisible().catch(() => false)) {
    clearPhoneRateLimits();
    await page.getByRole("button", { name: "登入" }).click();
  }
}

export async function loginAdmin(page: Page): Promise<void> {
  await page.goto("/models");
  const heading = page.getByRole("heading", { name: "模型池" });
  if (await heading.isVisible().catch(() => false)) return;
  await submitAdminOtp(page, ADMIN_LOCAL);
  const busy = page.getByRole("alert").filter({ hasText: "系統繁忙" });
  await Promise.race([heading.waitFor({ state: "visible" }), busy.waitFor({ state: "visible" })]).catch(
    () => undefined,
  );
  if (await busy.isVisible().catch(() => false)) {
    clearPhoneRateLimits();
    await page.getByRole("button", { name: "登入" }).click();
  }
  await expect(heading).toBeVisible();
}
