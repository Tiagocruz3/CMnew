-- Add DELETE policy for cases table
-- This allows admin users and case managers to delete cases

CREATE POLICY "Admin users and case managers can delete cases"
  ON cases
  FOR DELETE
  TO authenticated
  USING (
    case_manager_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
