import type { Prisma, PrismaClient } from "@prisma/client";
import {
  ADMIN_OTP_NEED_APP,
  AppError,
  ErrorCode,
  INBOX_FANOUT_BATCH,
  INBOX_OTP_TTL_MS,
  UserStatus,
  createId,
  decodeCursor,
  encodeCursor,
  parseAppLocale,
  presentInboxNotice,
  pushCopy,
  type AdminInboxSendRequest,
  type AdminInboxSendResult,
  type InboxKind,
  type InboxListResponse,
  type InboxNoticeView,
} from "@spring/shared";
import type { PushService } from "./push.service";

export class InboxService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly push: PushService,
  ) {}

  async list(userId: string, query: { cursor?: string; limit: number }): Promise<InboxListResponse> {
    const cursor = query.cursor ? decodeCursor(query.cursor) : null;
    const cursorClause: Prisma.InboxNoticeWhereInput =
      cursor?.createdAt && cursor.id
        ? {
            OR: [
              { createdAt: { lt: new Date(cursor.createdAt) } },
              { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
            ],
          }
        : {};
    const rows = await this.prisma.inboxNotice.findMany({
      where: { userId, ...cursorClause },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
    });
    const unreadCount = await this.prisma.inboxNotice.count({ where: { userId, readAt: null } });
    const page = rows.slice(0, query.limit);
    const last = page[page.length - 1];
    return {
      items: page.map((row) => presentInboxNotice(row)),
      unreadCount,
      nextCursor:
        rows.length > query.limit && last
          ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
          : null,
    };
  }

  async markRead(userId: string, id: string): Promise<InboxNoticeView> {
    const row = await this.prisma.inboxNotice.findFirst({ where: { id, userId } });
    if (!row) throw new AppError(ErrorCode.NOT_FOUND);
    if (row.readAt) return presentInboxNotice(row);
    const updated = await this.prisma.inboxNotice.update({
      where: { id: row.id },
      data: { readAt: new Date() },
    });
    return presentInboxNotice(updated);
  }

  async markOtpRead(userId: string): Promise<void> {
    await this.prisma.inboxNotice.updateMany({
      where: { userId, kind: "otp", readAt: null },
      data: { readAt: new Date() },
    });
  }

  async deliverOtp(userId: string, locale: string, code: string): Promise<void> {
    const devices = await this.push.deviceCount(userId);
    if (devices === 0) {
      throw new AppError(ErrorCode.UPSTREAM_UNAVAILABLE, ADMIN_OTP_NEED_APP);
    }
    const now = new Date();
    await this.prisma.inboxNotice.updateMany({
      where: { userId, kind: "otp", readAt: null },
      data: { readAt: now },
    });
    const copy = pushCopy(locale);
    const notice = await this.prisma.inboxNotice.create({
      data: {
        id: createId(),
        userId,
        kind: "otp" satisfies InboxKind,
        title: copy.otpTitle,
        body: copy.otpBody(code),
        data: { kind: "otp", code },
        expiresAt: new Date(now.getTime() + INBOX_OTP_TTL_MS),
      },
    });
    await this.push.sendToUser(
      userId,
      {
        title: copy.otpTitle,
        body: copy.otpBody(code),
        data: { kind: "otp", noticeId: notice.id, code },
      },
      true,
    );
  }

  async clearUser(userId: string): Promise<void> {
    await this.prisma.inboxNotice.deleteMany({ where: { userId } });
  }

  async audienceCount(): Promise<number> {
    return this.prisma.user.count({ where: { status: UserStatus.ACTIVE } });
  }

  async broadcastAdmin(input: AdminInboxSendRequest): Promise<AdminInboxSendResult> {
    const ids = await this.resolveAudience(input);
    if (ids.length === 0) throw new AppError(ErrorCode.VALIDATION, "沒有可發送的用戶。");
    let delivered = 0;
    let withoutDevice = 0;
    for (let i = 0; i < ids.length; i += INBOX_FANOUT_BATCH) {
      const result = await this.deliverAdminBatch(ids.slice(i, i + INBOX_FANOUT_BATCH), input);
      delivered += result.delivered;
      withoutDevice += result.withoutDevice;
    }
    return { userCount: ids.length, delivered, withoutDevice };
  }

  private async resolveAudience(input: AdminInboxSendRequest): Promise<string[]> {
    if (input.all) {
      const rows = await this.prisma.user.findMany({
        where: { status: UserStatus.ACTIVE },
        select: { id: true },
      });
      return rows.map((row) => row.id);
    }
    const unique = [...new Set(input.userIds ?? [])];
    const rows = await this.prisma.user.findMany({
      where: { id: { in: unique }, status: { not: UserStatus.DELETED } },
      select: { id: true },
    });
    if (rows.length !== unique.length) throw new AppError(ErrorCode.NOT_FOUND, "找不到用戶。");
    return rows.map((row) => row.id);
  }

  private async deliverAdminBatch(
    userIds: string[],
    input: AdminInboxSendRequest,
  ): Promise<{ delivered: number; withoutDevice: number }> {
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, locale: true },
    });
    const tokenCounts = await this.prisma.deviceToken.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds } },
      _count: { _all: true },
    });
    const withDevice = new Set(tokenCounts.filter((row) => row._count._all > 0).map((row) => row.userId));
    const titleEn = input.titleEn?.trim() || input.titleZh;
    const bodyEn = input.bodyEn?.trim() || input.bodyZh;
    const rows = users.map((user) => {
      const english = parseAppLocale(user.locale) === "en";
      const id = createId();
      return {
        id,
        userId: user.id,
        kind: "admin" satisfies InboxKind,
        title: english ? titleEn : input.titleZh,
        body: english ? bodyEn : input.bodyZh,
        data: { kind: "admin", noticeId: id } as Prisma.InputJsonValue,
      };
    });
    await this.prisma.inboxNotice.createMany({ data: rows });
    let delivered = 0;
    let withoutDevice = 0;
    for (const row of rows) {
      if (!withDevice.has(row.userId)) {
        withoutDevice += 1;
        continue;
      }
      delivered += 1;
      try {
        await this.push.sendToUser(
          row.userId,
          {
            title: row.title,
            body: row.body,
            data: { kind: "admin", noticeId: row.id },
          },
          false,
        );
      } catch {
        // Inbox row remains if Expo is down.
      }
    }
    return { delivered, withoutDevice };
  }
}
