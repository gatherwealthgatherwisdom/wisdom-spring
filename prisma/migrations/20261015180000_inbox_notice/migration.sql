-- CreateTable
CREATE TABLE `InboxNotice` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(32) NOT NULL,
    `title` VARCHAR(80) NOT NULL,
    `body` VARCHAR(500) NOT NULL,
    `data` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `readAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,

    INDEX `InboxNotice_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `InboxNotice_userId_readAt_idx`(`userId`, `readAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `InboxNotice` ADD CONSTRAINT `InboxNotice_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
