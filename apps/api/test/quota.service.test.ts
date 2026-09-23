import { AppError, ErrorCode, PlanTier } from "@spring/shared";
import { describe, expect, it } from "vitest";
import { MemoryDailyCounter, QuotaService } from "../src/modules/billing/application/quota.service";

const morning = new Date("2026-09-23T04:00:00.000Z");

describe("QuotaService", () => {
  it("blocks the 21st FREE message on the same Hong Kong day", async () => {
    const quota = new QuotaService(new MemoryDailyCounter(), async () => 0n);
    for (let index = 0; index < 20; index += 1) {
      await quota.assertCanSend({ userId: "user", planTier: PlanTier.FREE, now: morning });
      await quota.consumeDaily("user", PlanTier.FREE, morning);
    }
    await expect(quota.assertCanSend({ userId: "user", planTier: PlanTier.FREE, now: morning })).rejects.toMatchObject({
      code: ErrorCode.QUOTA_DAILY_MESSAGE,
    });
    await expect(quota.assertCanSend({ userId: "user", planTier: PlanTier.FREE, now: morning })).rejects.toBeInstanceOf(AppError);
  });

  it("resets the daily count after Hong Kong midnight", async () => {
    const quota = new QuotaService(new MemoryDailyCounter(), async () => 0n);
    for (let index = 0; index < 20; index += 1) {
      await quota.consumeDaily("user", PlanTier.FREE, morning);
    }
    const nextDay = new Date("2026-09-23T16:00:00.000Z");
    await expect(quota.assertCanSend({ userId: "user", planTier: PlanTier.FREE, now: nextDay })).resolves.toBeUndefined();
  });

  it("blocks when monthly spend reaches the cap", async () => {
    const quota = new QuotaService(new MemoryDailyCounter(), async () => 500_000n);
    await expect(quota.assertCanSend({ userId: "user", planTier: PlanTier.FREE, now: morning })).rejects.toMatchObject({
      code: ErrorCode.QUOTA_MONTHLY_COST,
    });
  });
});
