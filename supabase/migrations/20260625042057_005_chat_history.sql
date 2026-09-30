CREATE TABLE chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_message text NOT NULL,
  bot_response text NOT NULL,
  command_type text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_chats" ON chat_history FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_chats" ON chat_history FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_chats" ON chat_history FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_chats" ON chat_history FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
