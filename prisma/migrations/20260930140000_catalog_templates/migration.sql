-- AlterTable
ALTER TABLE `CatalogEntry` MODIFY `kind` ENUM('TOOL', 'AIDE', 'WRITE', 'IMAGE', 'TRANSLATE') NOT NULL;
