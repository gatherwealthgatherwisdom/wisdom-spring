import { test as setup } from "@playwright/test";
import { loginMobile } from "../src/helpers";

setup("store mobile session", async ({ page }) => {
  await loginMobile(page);
  await page.context().storageState({ path: ".auth/mobile.json" });
});
