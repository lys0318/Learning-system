CREATE TABLE IF NOT EXISTS admin_teacher_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_teacher_messages ENABLE ROW LEVEL SECURITY;

-- 강사: 본인에게 온 메시지 조회 + 읽음 처리
CREATE POLICY "teacher_read_own_admin_messages" ON admin_teacher_messages
  FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY "teacher_update_own_admin_messages" ON admin_teacher_messages
  FOR UPDATE USING (teacher_id = auth.uid());

-- 관리자(admin): 모든 메시지 삽입/조회
CREATE POLICY "admin_manage_admin_teacher_messages" ON admin_teacher_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_admin_teacher_messages_teacher
  ON admin_teacher_messages(teacher_id, created_at DESC);
