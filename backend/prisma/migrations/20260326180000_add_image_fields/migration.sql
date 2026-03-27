-- AlterTable: add photoUrl to students
ALTER TABLE `students` ADD COLUMN `photoUrl` VARCHAR(191) NULL;

-- AlterTable: add image fields to visas
ALTER TABLE `visas` ADD COLUMN `arrivalImageUrl` VARCHAR(191) NULL;
ALTER TABLE `visas` ADD COLUMN `departedImageUrl` VARCHAR(191) NULL;
ALTER TABLE `visas` ADD COLUMN `passportImageUrl` VARCHAR(191) NULL;

-- AlterTable: add image fields to dependents
ALTER TABLE `dependents` ADD COLUMN `arrivalImageUrl` VARCHAR(191) NULL;
ALTER TABLE `dependents` ADD COLUMN `departedImageUrl` VARCHAR(191) NULL;
