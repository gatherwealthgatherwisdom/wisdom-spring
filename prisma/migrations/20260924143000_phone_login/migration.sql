-- AlterTable
ALTER TABLE `User`
    ADD COLUMN `phone` VARCHAR(16) NULL,
    ADD COLUMN `registeredAt` DATETIME(3) NULL,
    ADD COLUMN `guestUses` INTEGER NOT NULL DEFAULT 0,
    ADD UNIQUE INDEX `User_phone_key`(`phone`);

-- Existing email accounts keep the daily allowance.
UPDATE `User`
SET `registeredAt` = `createdAt`
WHERE `registeredAt` IS NULL
  AND (`email` IS NOT NULL OR `passwordHash` IS NOT NULL);

-- CreateTable
CREATE TABLE `PhoneCode` (
    `id` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(16) NOT NULL,
    `codeHash` VARCHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PhoneCode_phone_createdAt_idx`(`phone`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
