-- AlterTable
ALTER TABLE `Conversation` ADD COLUMN `lastImageUrl` VARCHAR(1024) NULL;

-- AlterTable
ALTER TABLE `Message` ADD COLUMN `imageUrl` LONGTEXT NULL;
