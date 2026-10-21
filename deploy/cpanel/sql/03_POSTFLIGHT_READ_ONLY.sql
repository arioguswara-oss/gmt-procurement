SELECT DATABASE() AS database_aktif;
SELECT column_name,column_type,is_nullable,column_default
 FROM information_schema.columns WHERE table_schema=DATABASE()
 AND table_name='tax_documents'
 AND column_name IN ('status','verified_by_id','verified_at')
 ORDER BY ordinal_position;
SELECT table_name,column_name,column_type FROM information_schema.columns
 WHERE table_schema=DATABASE() AND table_name='user_invitations'
 ORDER BY ordinal_position;
SELECT constraint_name,table_name,column_name,referenced_table_name
 FROM information_schema.key_column_usage
 WHERE table_schema=DATABASE() AND
 ((table_name='tax_documents' AND column_name='verified_by_id')
  OR table_name='user_invitations' AND referenced_table_name IS NOT NULL);
SELECT COUNT(*) AS invalid_verified FROM tax_documents
 WHERE (status='VERIFIED' AND (verified_by_id IS NULL OR verified_at IS NULL))
    OR (status<>'VERIFIED' AND (verified_by_id IS NOT NULL OR verified_at IS NOT NULL));
SELECT COUNT(*) AS active_invitations FROM user_invitations
 WHERE accepted_at IS NULL AND revoked_at IS NULL AND expires_at>CURRENT_TIMESTAMP(3);
