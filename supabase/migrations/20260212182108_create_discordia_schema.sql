/*
  # Discordia Chat Application Schema

  This migration creates the complete database schema for a Discord-like chat application.

  ## New Tables

  ### 1. `users`
    - `id` (uuid, primary key) - Unique user identifier
    - `username` (text, unique) - User's display name
    - `avatar` (text, nullable) - URL to user's avatar image
    - `status` (text) - User status: 'online', 'idle', 'dnd', 'offline'
    - `created_at` (timestamptz) - Account creation timestamp

  ### 2. `servers`
    - `id` (uuid, primary key) - Unique server identifier
    - `name` (text) - Server name
    - `icon` (text, nullable) - URL to server icon
    - `password` (text, nullable) - Optional password for private servers
    - `owner_id` (uuid, foreign key) - References users(id)
    - `created_at` (timestamptz) - Server creation timestamp

  ### 3. `channels`
    - `id` (uuid, primary key) - Unique channel identifier
    - `server_id` (uuid, foreign key) - References servers(id)
    - `name` (text) - Channel name
    - `type` (text) - Channel type: 'text' or 'voice'
    - `position` (int) - Display order in channel list
    - `created_at` (timestamptz) - Channel creation timestamp

  ### 4. `messages`
    - `id` (uuid, primary key) - Unique message identifier
    - `channel_id` (uuid, foreign key) - References channels(id)
    - `user_id` (uuid, foreign key) - References users(id)
    - `content` (text) - Message content
    - `is_system` (boolean) - Whether message is a system message
    - `created_at` (timestamptz) - Message timestamp

  ### 5. `server_members`
    - `server_id` (uuid, foreign key) - References servers(id)
    - `user_id` (uuid, foreign key) - References users(id)
    - `roles` (jsonb) - Array of role IDs assigned to user
    - `joined_at` (timestamptz) - When user joined the server
    - PRIMARY KEY (server_id, user_id) - Composite primary key

  ### 6. `roles`
    - `id` (uuid, primary key) - Unique role identifier
    - `server_id` (uuid, foreign key) - References servers(id)
    - `name` (text) - Role name
    - `color` (text) - Role color in hex format
    - `permissions` (jsonb) - Array of permission strings
    - `position` (int) - Role hierarchy position
    - `created_at` (timestamptz) - Role creation timestamp

  ## Security

  - Enable Row Level Security (RLS) on all tables
  - Users can only read/write their own user data
  - Server access requires membership
  - Messages can be read by server members, written by authenticated users
  - Server owners have full control over their servers
  - Realtime is enabled on messages table for instant chat updates

  ## Indexes

  - Index on messages.channel_id for fast message queries
  - Index on channels.server_id for fast channel listings
  - Index on server_members for membership checks

  ## Notes

  1. All tables use UUID for primary keys for better distribution
  2. Timestamps use timestamptz for timezone awareness
  3. RLS policies ensure data isolation between servers
  4. Realtime subscriptions enabled for messages
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  avatar text,
  status text DEFAULT 'online' CHECK (status IN ('online', 'idle', 'dnd', 'offline')),
  created_at timestamptz DEFAULT now()
);

-- Create servers table
CREATE TABLE IF NOT EXISTS servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text,
  password text,
  owner_id uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create channels table
CREATE TABLE IF NOT EXISTS channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid REFERENCES servers(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text DEFAULT 'text' CHECK (type IN ('text', 'voice')),
  position int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create server_members junction table
CREATE TABLE IF NOT EXISTS server_members (
  server_id uuid REFERENCES servers(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  roles jsonb DEFAULT '[]'::jsonb,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (server_id, user_id)
);

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid REFERENCES servers(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#99AAB5',
  permissions jsonb DEFAULT '[]'::jsonb,
  position int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_channels_server_id ON channels(server_id);
CREATE INDEX IF NOT EXISTS idx_server_members_user_id ON server_members(user_id);
CREATE INDEX IF NOT EXISTS idx_server_members_server_id ON server_members(server_id);
CREATE INDEX IF NOT EXISTS idx_roles_server_id ON roles(server_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for servers table
CREATE POLICY "Users can view servers they are members of"
  ON servers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM server_members
      WHERE server_members.server_id = servers.id
      AND server_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create servers"
  ON servers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Server owners can update their servers"
  ON servers FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Server owners can delete their servers"
  ON servers FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- RLS Policies for channels table
CREATE POLICY "Server members can view channels"
  ON channels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM server_members
      WHERE server_members.server_id = channels.server_id
      AND server_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Server owners can create channels"
  ON channels FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM servers
      WHERE servers.id = channels.server_id
      AND servers.owner_id = auth.uid()
    )
  );

CREATE POLICY "Server owners can update channels"
  ON channels FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM servers
      WHERE servers.id = channels.server_id
      AND servers.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM servers
      WHERE servers.id = channels.server_id
      AND servers.owner_id = auth.uid()
    )
  );

CREATE POLICY "Server owners can delete channels"
  ON channels FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM servers
      WHERE servers.id = channels.server_id
      AND servers.owner_id = auth.uid()
    )
  );

-- RLS Policies for messages table
CREATE POLICY "Server members can view messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM channels
      JOIN server_members ON server_members.server_id = channels.server_id
      WHERE channels.id = messages.channel_id
      AND server_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM channels
      JOIN server_members ON server_members.server_id = channels.server_id
      WHERE channels.id = messages.channel_id
      AND server_members.user_id = auth.uid()
    )
  );

-- RLS Policies for server_members table
CREATE POLICY "Users can view server members"
  ON server_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM server_members sm
      WHERE sm.server_id = server_members.server_id
      AND sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join servers"
  ON server_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave servers"
  ON server_members FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for roles table
CREATE POLICY "Server members can view roles"
  ON roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM server_members
      WHERE server_members.server_id = roles.server_id
      AND server_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Server owners can create roles"
  ON roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM servers
      WHERE servers.id = roles.server_id
      AND servers.owner_id = auth.uid()
    )
  );

CREATE POLICY "Server owners can update roles"
  ON roles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM servers
      WHERE servers.id = roles.server_id
      AND servers.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM servers
      WHERE servers.id = roles.server_id
      AND servers.owner_id = auth.uid()
    )
  );

CREATE POLICY "Server owners can delete roles"
  ON roles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM servers
      WHERE servers.id = roles.server_id
      AND servers.owner_id = auth.uid()
    )
  );

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;