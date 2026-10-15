import type { Prisma, PrismaClient } from "@prisma/client";
import {
  ADMIN_OTP_NEED_APP,
  AppError,
  ErrorCode,
  INBOX_OTP_TTL_MS,
  createId,
  decodeCursor,
  encodeCursor,
  presentInboxNotice,
  pushCopy,
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
}
