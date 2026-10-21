-- READ ONLY; pilih database GMT Procurement, jangan gunakan database produk lain.
SELECT DATABASE() AS database_aktif, VERSION() AS mariadb_version;
SELECT COUNT(*) AS table_count FROM information_schema.tables
 WHERE table_schema=DATABASE() AND table_type='BASE TABLE';
SELECT column_name, column_type, is_nullable, column_default FROM information_schema.columns
 WHERE table_schema=DATABASE() AND table_name='tax_documents' ORDER BY ordinal_position;
SELECT table_name FROM information_schema.tables
 WHERE table_schema=DATABASE() AND table_name='user_invitations';
SELECT status,COUNT(*) AS rows_count FROM tax_documents GROUP BY status;
SELECT id,name,email,role,active FROM users ORDER BY id;
