-- GMT Procurement MariaDB 10.11.19 migration from dump 19 Oct 2026.
-- MANUAL ONCE AFTER COMPLETE DATABASE BACKUP AND MAINTENANCE MODE.
-- Schema-only; no UPDATE/DELETE of preexisting records.
-- IMPORTANT: MariaDB DDL autocommits. If any command fails, STOP and inspect before retry.
-- Database: hype6006_gayuh_gmtproc. This script does not switch/create databases.
ALTER TABLE `tax_documents`
  MODIFY COLUMN `status` ENUM('UPLOADED','VERIFIED','REPLACED','CANCELLED')
    NOT NULL DEFAULT 'UPLOADED',
  ADD COLUMN `verified_by_id` BIGINT(20) UNSIGNED NULL AFTER `uploaded_at`,
  ADD COLUMN `verified_at` DATETIME(3) NULL AFTER `verified_by_id`;

ALTER TABLE `tax_documents`
  ADD KEY `tax_documents_verified_by_id_fkey` (`verified_by_id`),
  ADD CONSTRAINT `tax_documents_verified_by_id_fkey`
    FOREIGN KEY (`verified_by_id`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE `user_invitations` (
  `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(190) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `role` ENUM('SUPER_ADMIN','ADMIN','FINANCE','OPERATIONS','VIEWER')
    NOT NULL DEFAULT 'OPERATIONS',
  `token_hash` CHAR(64) NOT NULL,
  `invited_by_id` BIGINT(20) UNSIGNED NOT NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `accepted_at` DATETIME(3) NULL,
  `revoked_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_invitations_token_hash_key` (`token_hash`),
  KEY `user_invitations_email_expires_at_idx` (`email`,`expires_at`),
  KEY `user_invitations_invited_by_id_fkey` (`invited_by_id`),
  CONSTRAINT `user_invitations_invited_by_id_fkey`
    FOREIGN KEY (`invited_by_id`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- No existing Coretax proof is automatically VERIFIED.
-- Account Pak Supri is created via SUPER_ADMIN invitation after app install.
