-- CreateTable
CREATE TABLE `CatalogEntry` (
    `kind` ENUM('TOOL', 'AIDE') NOT NULL,
    `id` VARCHAR(64) NOT NULL,
    `zh` VARCHAR(80) NOT NULL,
    `en` VARCHAR(80) NOT NULL,
    `blurbZh` VARCHAR(500) NOT NULL,
    `blurbEn` VARCHAR(500) NOT NULL,
    `live` BOOLEAN NOT NULL DEFAULT true,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `mode` VARCHAR(16) NULL,
    `templateId` VARCHAR(32) NULL,
    `imageStyle` VARCHAR(32) NULL,
    `instruction` TEXT NULL,
    `icon` VARCHAR(64) NULL,
    `page` INTEGER NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CatalogEntry_kind_live_sort_idx`(`kind`, `live`, `sort`),
    PRIMARY KEY (`kind`, `id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
