
CREATE POLICY "auth read employee-documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'employee-documents');

CREATE POLICY "auth insert employee-documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'employee-documents');

CREATE POLICY "auth update employee-documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'employee-documents')
  WITH CHECK (bucket_id = 'employee-documents');

CREATE POLICY "auth delete employee-documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'employee-documents');
