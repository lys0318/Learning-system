CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- 학생: 자신이 포함된 스레드의 메시지 조회/삽입 가능
CREATE POLICY "student_access" ON direct_messages
  FOR ALL USING (student_id = auth.uid() OR sender_id = auth.uid())
  WITH CHECK (student_id = auth.uid() OR sender_id = auth.uid());

-- 교사: 자신의 강의에 속한 메시지 조회/삽입 가능
CREATE POLICY "teacher_access" ON direct_messages
  FOR ALL USING (
    course_id IN (
      SELECT id FROM courses WHERE teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    course_id IN (
      SELECT id FROM courses WHERE teacher_id = auth.uid()
    )
  );
