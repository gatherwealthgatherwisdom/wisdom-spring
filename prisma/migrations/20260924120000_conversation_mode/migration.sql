-- AlterTable
ALTER TABLE `Conversation`
    ADD COLUMN `mode` VARCHAR(16) NOT NULL DEFAULT 'chat',
    ADD COLUMN `templateId` VARCHAR(32) NULL,
    ADD COLUMN `sourceLang` VARCHAR(16) NULL,
    ADD COLUMN `targetLang` VARCHAR(16) NULL,
    ADD COLUMN `imageStyle` VARCHAR(32) NULL;

-- AlterTable
ALTER TABLE `ModelCatalog` ADD COLUMN `outputModalities` JSON NULL;
