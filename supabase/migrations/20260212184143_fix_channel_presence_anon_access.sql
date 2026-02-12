/*
  # Allow Anon Access to Channel Presence

  1. Changes
    - Drop authenticated-only policies
    - Add new policies for anon role
    - This allows the app to work with anon key

  Note: This is for demo purposes. In production, implement proper authentication.
*/

DROP POLICY IF EXISTS "Allow authenticated to insert presence" ON channel_presence;
DROP POLICY IF EXISTS "Allow authenticated to update presence" ON channel_presence;
DROP POLICY IF EXISTS "Allow authenticated to view presence" ON channel_presence;
DROP POLICY IF EXISTS "Allow authenticated to delete presence" ON channel_presence;

CREATE POLICY "Allow anon to manage presence"
  ON channel_presence
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated to manage presence"
  ON channel_presence
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);