/*
  # Add Channel Presence System

  1. New Tables
    - `channel_presence`
      - `id` (uuid, primary key)
      - `channel_id` (uuid, foreign key to channels)
      - `user_id` (uuid, foreign key to users)
      - `joined_at` (timestamptz)
      - `last_seen_at` (timestamptz)
      - Unique constraint on (channel_id, user_id)

  2. Security
    - Enable RLS on `channel_presence` table
    - Add policies for authenticated users to:
      - Insert their own presence
      - Update their own presence
      - Select all presence in channels they have access to
      - Delete their own presence

  3. Changes
    - Add realtime publication for channel_presence table
*/

CREATE TABLE IF NOT EXISTS channel_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

ALTER TABLE channel_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own presence"
  ON channel_presence
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presence"
  ON channel_presence
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view channel presence"
  ON channel_presence
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM server_members sm
      JOIN channels c ON c.server_id = sm.server_id
      WHERE c.id = channel_presence.channel_id
      AND sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own presence"
  ON channel_presence
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE channel_presence;