import { DEFAULT_ADMIN_PHONE, DEV_PHONE_CODE, formatLocalDigits } from "@spring/shared";
import { expect, type Page } from "@playwright/test";
import { clearPhoneRateLimits } from "./rate-limit";

export const ADMIN_LOCAL = DEFAULT_ADMIN_PHONE.replace(/^\+852/, "");
export const TEST_USER_LOCAL = "91118888";
export const TEST_USER_PHONE = `+852${TEST_USER_LOCAL}`;
export const TEST_USER_B_LOCAL = "91119999";
export const TEST_USER_B_PHONE = `+852${TEST_USER_B_LOCAL}`;
export const TEST_LOCKOUT_PHONE = "+85291117777";
export const DEV_CODE = DEV_PHONE_CODE;
export const KIND_BADGE = /智泉 · (text-to-text|text-to-image|image-to-text|file-to-text)/;

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

export function composerBox(page: Page, placeholder: string) {
  return page.getByPlaceholder(placeholder).filter({ visible: true }).last();
}

export function visibleText(page: Page, text: string | RegExp) {
  const locator = typeof text === "string" ? page.getByText(text, { exact: true }) : page.getByText(text);
  return locator.filter({ visible: true });
}

export async function clickLargestLabel(page: Page, label: string): Promise<void> {
  const box = await page.evaluate((needle) => {
    const nodes = Array.from(document.querySelectorAll("body *")).filter((node): node is HTMLElement => {
      if (!(node instanceof HTMLElement)) return false;
      if (node.getAttribute("aria-label") !== needle) return false;
      const rect = node.getBoundingClientRect();
      return rect.width > 80 && rect.height > 80;
    });
    nodes.sort((a, b) => {
      const area = (el: HTMLElement) => {
        const rect = el.getBoundingClientRect();
        return rect.width * rect.height;
      };
      return area(b) - area(a);
    });
    const target = nodes[0];
    if (!target) return null;
    const rect = target.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }, label);
  if (!box) throw new Error(`clickLargestLabel: no node with aria-label ${JSON.stringify(label)}`);
  await page.mouse.click(box.x, box.y);
}

export async function expectLightboxSave(page: Page, openLabel = "放大"): Promise<string> {
  await clickLabel(page, openLabel);
  await expect(page.locator('[aria-label="關閉"]').filter({ visible: true })).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await clickLabel(page, "儲存");
  const download = await downloadPromise;
  const name = download.suggestedFilename();
  expect(name).toMatch(/^智泉-.+/);
  await expect(visibleText(page, "已儲存。").first()).toBeVisible();
  await clickLabel(page, "關閉");
  return name;
}

export async function waitForApp(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByText("智泉").first()).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText("對話", { exact: true }).first()).toBeVisible();
}

export async function loadMobileSession(
  page: Page,
  session: { accessToken: string; refreshToken: string; user: unknown },
): Promise<void> {
  await page.goto("/");
  await page.evaluate((stored) => {
    window.localStorage.setItem(
      "spring.mobile.session",
      JSON.stringify({
        accessToken: stored.accessToken,
        refreshToken: stored.refreshToken,
        user: stored.user,
        appearance: "system",
        locale: "zh-HK",
        speakNotify: true,
        dismissedAnnouncementId: null,
      }),
    );
  }, session);
  await page.reload();
  await waitForApp(page);
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

export const LIVE_SKIP_COPY = [
  "系統繁忙，請稍後再試。",
  "今日對話次數已用完。",
  "試用 5 次已用完。完成註冊後可以繼續用。",
  "暫時未有可用圖像模型。",
  "暫時未有可用睇圖模型。",
] as const;

export async function clickNewChatButton(page: Page): Promise<void> {
  const clicked = await page.evaluate(() => {
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
    const pine = new Set(["rgb(31, 107, 74)", "rgb(61, 155, 110)"]);
    const nodes = Array.from(document.querySelectorAll("body *"));
    for (const node of nodes) {
      if (!(node instanceof HTMLElement) || !shown(node)) continue;
      if (node.innerText.trim() !== "新對話") continue;
      let current: HTMLElement | null = node;
      while (current) {
        if (pine.has(getComputedStyle(current).backgroundColor)) {
          current.click();
          return true;
        }
        current = current.parentElement;
      }
    }
    return false;
  });
  if (!clicked) throw new Error("clickNewChatButton: pine 新對話 not found");
}

export async function openNewChat(page: Page): Promise<void> {
  await clickText(page, "對話");
  await clickLabel(page, "對話列表");
  await clickNewChatButton(page);
  await expect(page.getByPlaceholder("搜尋對話").filter({ visible: true })).toHaveCount(0);
  await expect(composerBox(page, "問智泉")).toBeVisible();
  await expect(page.getByText("寫一封電郵").filter({ visible: true })).toBeVisible();
}

export async function readQuota(page: Page): Promise<{ used: number; limit: number }> {
  await clickText(page, "我的");
  const label = page.getByText(/已用 \d+／\d+/).filter({ visible: true });
  await expect(label).toBeVisible();
  const text = (await label.innerText()).trim();
  const match = text.match(/已用 (\d+)／(\d+)/);
  if (!match) throw new Error(`readQuota: ${JSON.stringify(text)}`);
  return { used: Number(match[1]), limit: Number(match[2]) };
}

export async function leaveChat(page: Page): Promise<void> {
  if (await page.getByPlaceholder("搜尋對話").filter({ visible: true }).isVisible().catch(() => false)) {
    await clickLabel(page, "返回");
  }
  await clickLabel(page, "對話");
}

export async function expectQuotaIncreased(page: Page, before: { used: number }): Promise<void> {
  const token = await sessionAccessToken(page);
  if (!token) throw new Error("expectQuotaIncreased: no session");
  await expect
    .poll(
      async () => {
        const response = await page.request.get("http://127.0.0.1:3000/v1/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok()) return before.used;
        const body = (await response.json()) as {
          user?: { guestUses?: number; registered?: boolean };
          quota?: { dailyUsed?: number };
        };
        if (body.user?.registered === false) return body.user.guestUses ?? before.used;
        return body.quota?.dailyUsed ?? before.used;
      },
      { timeout: 30_000 },
    )
    .toBeGreaterThan(before.used);
}

export async function sessionAccessToken(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const raw = window.localStorage.getItem("spring.mobile.session");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { accessToken?: string | null };
      return parsed.accessToken ?? null;
    } catch {
      return null;
    }
  });
}

export async function fetchCapabilities(page: Page): Promise<{ image: boolean; vision: boolean } | null> {
  const token = await sessionAccessToken(page);
  if (!token) return null;
  const response = await page.request.get("http://127.0.0.1:3000/v1/capabilities", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok()) return null;
  return (await response.json()) as { image: boolean; vision: boolean };
}

export async function attachPhotoFixture(page: Page, filePath: string): Promise<"ok" | string> {
  await clickLabel(page, "+");
  await clickLabel(page, "睇圖");
  await expect(page.locator('[aria-label="相簿"]').filter({ visible: true })).toBeVisible();
  await page.evaluate(() => {
    const body = document.body;
    const orig = body.appendChild.bind(body);
    body.appendChild = ((node: Node) => {
      if (node instanceof HTMLInputElement) {
        node.addEventListener("cancel", (event) => event.stopImmediatePropagation(), true);
      }
      return orig(node);
    }) as typeof body.appendChild;
  });
  await clickLabel(page, "相簿");
  if (await page.getByText("暫時未有可用睇圖模型。").filter({ visible: true }).isVisible().catch(() => false)) {
    return "暫時未有可用睇圖模型。";
  }
  const file = page.locator('[data-testid="file-input"]');
  try {
    await file.waitFor({ state: "attached", timeout: 8_000 });
  } catch {
    return "no file input";
  }
  await file.setInputFiles(filePath);
  try {
    await expect
      .poll(
        async () =>
          page.evaluate(() =>
            Array.from(document.querySelectorAll("img")).some((img) => {
              const rect = img.getBoundingClientRect();
              return rect.width >= 48 && rect.width <= 80 && rect.height >= 48 && rect.height <= 80;
            }),
          ),
        { timeout: 15_000 },
      )
      .toBe(true);
  } catch {
    return "no file input";
  }
  return "ok";
}

export async function waitForLiveTurn(
  page: Page,
  options: { image?: boolean; prompt?: string } = {},
): Promise<"ok" | string> {
  const progress = page.getByText(/思考/).or(page.getByText("▍")).or(page.locator('[aria-label="再生成"]'));
  let seen = progress.filter({ visible: true });
  for (const copy of LIVE_SKIP_COPY) {
    seen = seen.or(page.getByText(copy, { exact: true }).filter({ visible: true }));
  }
  if (options.image) {
    let outcome = "";
    await expect
      .poll(
        async () => {
          for (const copy of LIVE_SKIP_COPY) {
            if (await page.getByText(copy, { exact: true }).filter({ visible: true }).isVisible().catch(() => false)) {
              outcome = copy;
              return true;
            }
          }
          const hasImage = await page.evaluate(() => {
            return Array.from(document.querySelectorAll("img")).some((img) => {
              let current: HTMLElement | null = img;
              while (current) {
                if (current.getAttribute("aria-hidden") === "true") return false;
                const style = getComputedStyle(current);
                if (style.display === "none" || style.visibility === "hidden") return false;
                current = current.parentElement;
              }
              const rect = img.getBoundingClientRect();
              return rect.width >= 180 && rect.height >= 180;
            });
          });
          if (hasImage) {
            outcome = "ok";
            return true;
          }
          return false;
        },
        { timeout: 120_000 },
      )
      .toBe(true);
    return outcome;
  }
  await expect(seen.first()).toBeVisible({ timeout: 120_000 });
  for (const copy of LIVE_SKIP_COPY) {
    if (await page.getByText(copy, { exact: true }).filter({ visible: true }).isVisible().catch(() => false)) {
      return copy;
    }
  }
  const regen = page.locator('[aria-label="再生成"]').filter({ visible: true });
  const prompt = options.prompt;
  if (!prompt) {
    await expect(regen).toBeVisible({ timeout: 120_000 });
    return "ok";
  }
  await expect
    .poll(
      async () => {
        if (await regen.isVisible().catch(() => false)) return true;
        return page.evaluate((needle: string) => {
          const noise = [
            "寫一封電郵",
            "翻譯呢段",
            "畫一幅",
            "繼續上次",
            "共飲智慧之泉",
            "問智泉",
            "描述你想畫嘅圖",
            "問呢張圖",
            "問呢份文件",
            "畫圖",
            "睇圖",
            "試用剩餘",
            "剛剛",
            "分鐘前",
            "用三點解釋",
            "幫我寫一封禮貌",
            "將呢段文言",
            "今日有咩國際新聞",
            "幫我列一個健康",
          ];
          const text = document.body.innerText || "";
          const idx = text.indexOf(needle);
          if (idx < 0) return false;
          let rest = text.slice(idx + needle.length).replace(/智泉 · [^\n]+/g, " ");
          for (const item of noise) rest = rest.split(item).join(" ");
          return /[\u4e00-\u9fffA-Za-z]{1,40}/.test(rest.replace(/\s+/g, ""));
        }, prompt);
      },
      { timeout: 120_000 },
    )
    .toBe(true);
  return "ok";
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
