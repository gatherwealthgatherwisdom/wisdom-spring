import { test as setup } from "@playwright/test";
import { loginAdmin } from "../src/helpers";

setup("store admin session", async ({ page }) => {
  await loginAdmin(page);
  await page.context().storageState({ path: ".auth/admin.json" });
});
