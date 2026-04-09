-- 학생이 공개 강의를 가진 선생님의 프로필을 조회할 수 있도록 허용
CREATE POLICY "profiles: student - 선생님 조회" ON profiles
FOR SELECT USING (
  get_my_role() = 'student'::user_role
  AND EXISTS (
    SELECT 1 FROM courses
    WHERE teacher_id = profiles.id
      AND status = 'published'
  )
);
