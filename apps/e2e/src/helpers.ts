import { DEFAULT_ADMIN_PHONE, DEV_PHONE_CODE, formatLocalDigits } from "@spring/shared";
import { expect, type Page } from "@playwright/test";
import { clearPhoneRateLimits } from "./rate-limit";

export const ADMIN_LOCAL = DEFAULT_ADMIN_PHONE.replace(/^\+852/, "");
export const TEST_USER_LOCAL = "91118888";
export const DEV_CODE = DEV_PHONE_CODE;

/** RN-web Pressable often misses Playwright hit-testing; click the inner text node. */
export async function clickText(page: Page, label: string): Promise<void> {
  const clicked = await page.evaluate((needle) => {
    const nodes = Array.from(document.querySelectorAll("body *"));
    for (let index = nodes.length - 1; index >= 0; index -= 1) {
      const node = nodes[index];
      if (!(node instanceof HTMLElement)) continue;
      if (node.innerText.trim() !== needle) continue;
      node.click();
      return true;
    }
    return false;
  }, label);
  if (!clicked) throw new Error(`clickText: no node with text ${JSON.stringify(label)}`);
}

export async function loginAdmin(page: Page): Promise<void> {
  await page.goto("/models");
  const heading = page.getByRole("heading", { name: "模型池" });
  if (await heading.isVisible().catch(() => false)) return;
  await expect(page.getByText("ADMIN · GWGW")).toBeVisible();
  const phone = page.getByRole("textbox", { name: /電話/ });
  if (await phone.isVisible().catch(() => false)) {
    const shown = await phone.inputValue();
    if (!shown.replace(/\D/g, "").includes(ADMIN_LOCAL)) {
      await phone.fill(formatLocalDigits("852", ADMIN_LOCAL));
    }
  }
  await page.getByRole("button", { name: "發送驗證碼" }).click();
  const code = page.getByRole("textbox", { name: "驗證碼" });
  await expect(code).toBeVisible();
  await code.fill(DEV_CODE);
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
