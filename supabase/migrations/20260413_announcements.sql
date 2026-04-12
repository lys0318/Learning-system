CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- 교사: 자신의 강의에 공지 작성/수정/삭제 가능
CREATE POLICY "teacher_manage_announcements" ON announcements
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

-- 학생: 수강 중인 강의의 공지 조회 가능
CREATE POLICY "student_view_announcements" ON announcements
  FOR SELECT USING (
    course_id IN (
      SELECT course_id FROM enrollments WHERE student_id = auth.uid()
    )
  );
