import { expect, test } from "@playwright/test";
import { loginAdmin } from "../src/helpers";

test("admin signs in with phone OTP and sees the model pool", async ({ page }) => {
  await loginAdmin(page);
  await expect(page.getByRole("heading", { name: "模型池" })).toBeVisible();
  await expect(page.getByRole("button", { name: "同步目錄" })).toBeVisible();
  await expect(page.getByRole("link", { name: "模型" })).toBeVisible();
});
