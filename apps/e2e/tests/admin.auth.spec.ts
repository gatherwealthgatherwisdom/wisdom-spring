import { expect, test } from "@playwright/test";
import { submitAdminOtp, TEST_USER_LOCAL } from "../src/helpers";

test("an ordinary number cannot open the admin shell", async ({ page }) => {
  await page.goto("/models");
  await submitAdminOtp(page, TEST_USER_LOCAL);
  await expect(page.getByRole("alert").filter({ hasText: "沒有權限" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "模型池" })).toHaveCount(0);
});
