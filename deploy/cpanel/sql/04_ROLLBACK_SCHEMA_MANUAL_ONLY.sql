-- TIDAK BOLEH DILAKUKAN OTOMATIS. Stop aplikasi; restore backup terverifikasi adalah prioritas.
-- Jangan kembali ke status enum lama jika terdapat bukti VERIFIED.
SELECT COUNT(*) AS verified_or_metadata FROM tax_documents
 WHERE status='VERIFIED' OR verified_by_id IS NOT NULL OR verified_at IS NOT NULL;
SELECT COUNT(*) AS accepted_invitations FROM user_invitations WHERE accepted_at IS NOT NULL;
-- HANYA JIKA kedua nilai nol, Rio mengizinkan dan aplikasi sudah berhenti:
-- DROP TABLE `user_invitations`;
-- ALTER TABLE `tax_documents` DROP FOREIGN KEY `tax_documents_verified_by_id_fkey`;
-- ALTER TABLE `tax_documents` DROP KEY `tax_documents_verified_by_id_fkey`;
-- ALTER TABLE `tax_documents` DROP COLUMN `verified_at`, DROP COLUMN `verified_by_id`,
-- MODIFY `status` ENUM('UPLOADED','REPLACED','CANCELLED') NOT NULL DEFAULT 'UPLOADED';
-- Jika nilai nonzero: jangan jalankan rollback DDL; konsolidasi data dan restore backup bersama owner.
