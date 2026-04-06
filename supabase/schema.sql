-- ============================================================
-- LearnAI LMS - Supabase Schema
-- Supabase SQL Editor에 전체 붙여넣기 후 실행
-- ============================================================

-- ------------------------------------------------------------
-- 0. 역할(enum) 타입 정의
-- ------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
CREATE TYPE course_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE enrollment_status AS ENUM ('active', 'completed', 'dropped');


-- ============================================================
-- 1. profiles
--    auth.users와 1:1 연결. 역할 및 기본 정보 저장.
-- ============================================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  avatar_url  TEXT,
  role        user_role NOT NULL DEFAULT 'student',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 신규 유저 가입 시 profiles 자동 생성
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- updated_at 자동 갱신 함수
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 2. courses
--    교사가 개설하는 강의 정보
-- ============================================================
CREATE TABLE courses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  thumbnail_url TEXT,
  status       course_status NOT NULL DEFAULT 'draft',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_courses_teacher_id ON courses(teacher_id);
CREATE INDEX idx_courses_status ON courses(status);

CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 3. enrollments
--    수강생 ↔ 강의 수강 관계
-- ============================================================
CREATE TABLE enrollments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status      enrollment_status NOT NULL DEFAULT 'active',
  progress    SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100), -- 완강률 %
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, course_id)
);

CREATE INDEX idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX idx_enrollments_course_id ON enrollments(course_id);

CREATE TRIGGER enrollments_updated_at
  BEFORE UPDATE ON enrollments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 4. quizzes
--    강의에 속한 AI 생성 퀴즈 세트
-- ============================================================
CREATE TABLE quizzes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  -- questions: [{question, options:[...], answer, explanation}, ...]
  questions   JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quizzes_course_id ON quizzes(course_id);

CREATE TRIGGER quizzes_updated_at
  BEFORE UPDATE ON quizzes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 5. quiz_results
--    수강생의 퀴즈 제출 결과
-- ============================================================
CREATE TABLE quiz_results (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id     UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- answers: [{question_index, selected_option, is_correct}, ...]
  answers     JSONB NOT NULL DEFAULT '[]',
  score       SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 100), -- 점수 %
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quiz_results_student_id ON quiz_results(student_id);
CREATE INDEX idx_quiz_results_quiz_id ON quiz_results(quiz_id);


-- ============================================================
-- 6. chat_messages
--    AI 튜터 대화 내역 (student ↔ Claude)
-- ============================================================
CREATE TABLE chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id   UUID REFERENCES courses(id) ON DELETE SET NULL, -- 특정 강의 맥락 (선택)
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_student_id ON chat_messages(student_id);
CREATE INDEX idx_chat_messages_course_id ON chat_messages(course_id);


-- ============================================================
-- RLS 활성화
-- ============================================================
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 역할 헬퍼 함수 (반복 사용)
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_teacher_of_course(p_course_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM courses
    WHERE id = p_course_id AND teacher_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_enrolled(p_course_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM enrollments
    WHERE course_id = p_course_id
      AND student_id = auth.uid()
      AND status = 'active'
  );
$$;


-- ============================================================
-- RLS 정책: profiles
-- ============================================================
-- 자신의 프로필은 누구나 조회 가능
CREATE POLICY "profiles: 본인 조회"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- admin은 전체 조회 가능
CREATE POLICY "profiles: admin 전체 조회"
  ON profiles FOR SELECT
  USING (get_my_role() = 'admin');

-- teacher는 자신의 강의 수강생 프로필 조회 가능
CREATE POLICY "profiles: teacher - 수강생 조회"
  ON profiles FOR SELECT
  USING (
    get_my_role() = 'teacher'
    AND EXISTS (
      SELECT 1 FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE e.student_id = profiles.id
        AND c.teacher_id = auth.uid()
    )
  );

-- 본인 프로필만 수정 가능
CREATE POLICY "profiles: 본인 수정"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- admin은 역할 변경 포함 전체 수정 가능
CREATE POLICY "profiles: admin 수정"
  ON profiles FOR UPDATE
  USING (get_my_role() = 'admin');


-- ============================================================
-- RLS 정책: courses
-- ============================================================
-- 수강생: published 강의만 조회
CREATE POLICY "courses: student - 공개 강의 조회"
  ON courses FOR SELECT
  USING (
    status = 'published'
    AND get_my_role() = 'student'
  );

-- 교사: 자신이 개설한 강의 전체 조회 (draft 포함)
CREATE POLICY "courses: teacher - 본인 강의 조회"
  ON courses FOR SELECT
  USING (
    teacher_id = auth.uid()
    AND get_my_role() = 'teacher'
  );

-- admin: 전체 조회
CREATE POLICY "courses: admin 전체 조회"
  ON courses FOR SELECT
  USING (get_my_role() = 'admin');

-- 교사: 강의 생성 (teacher_id = 본인)
CREATE POLICY "courses: teacher - 강의 생성"
  ON courses FOR INSERT
  WITH CHECK (
    teacher_id = auth.uid()
    AND get_my_role() = 'teacher'
  );

-- 교사: 본인 강의만 수정
CREATE POLICY "courses: teacher - 강의 수정"
  ON courses FOR UPDATE
  USING (
    teacher_id = auth.uid()
    AND get_my_role() = 'teacher'
  );

-- admin: 전체 수정/삭제
CREATE POLICY "courses: admin 수정"
  ON courses FOR UPDATE
  USING (get_my_role() = 'admin');

CREATE POLICY "courses: admin 삭제"
  ON courses FOR DELETE
  USING (get_my_role() = 'admin');


-- ============================================================
-- RLS 정책: enrollments
-- ============================================================
-- 수강생: 본인 수강 정보 조회
CREATE POLICY "enrollments: student - 본인 조회"
  ON enrollments FOR SELECT
  USING (
    student_id = auth.uid()
    AND get_my_role() = 'student'
  );

-- 교사: 본인 강의의 수강 정보 조회
CREATE POLICY "enrollments: teacher - 수강생 조회"
  ON enrollments FOR SELECT
  USING (
    get_my_role() = 'teacher'
    AND is_teacher_of_course(course_id)
  );

-- admin: 전체 조회
CREATE POLICY "enrollments: admin 전체 조회"
  ON enrollments FOR SELECT
  USING (get_my_role() = 'admin');

-- 수강생: 본인 수강 신청
CREATE POLICY "enrollments: student - 수강 신청"
  ON enrollments FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND get_my_role() = 'student'
  );

-- 수강생: 본인 수강 상태 변경 (예: 수강 취소)
CREATE POLICY "enrollments: student - 상태 변경"
  ON enrollments FOR UPDATE
  USING (
    student_id = auth.uid()
    AND get_my_role() = 'student'
  );

-- admin: 전체 수정/삭제
CREATE POLICY "enrollments: admin 전체 수정"
  ON enrollments FOR UPDATE
  USING (get_my_role() = 'admin');

CREATE POLICY "enrollments: admin 전체 삭제"
  ON enrollments FOR DELETE
  USING (get_my_role() = 'admin');


-- ============================================================
-- RLS 정책: quizzes
-- ============================================================
-- 수강생: 수강 중인 강의의 퀴즈만 조회
CREATE POLICY "quizzes: student - 수강 강의 퀴즈 조회"
  ON quizzes FOR SELECT
  USING (
    get_my_role() = 'student'
    AND is_enrolled(course_id)
  );

-- 교사: 본인 강의 퀴즈 조회
CREATE POLICY "quizzes: teacher - 본인 강의 퀴즈 조회"
  ON quizzes FOR SELECT
  USING (
    get_my_role() = 'teacher'
    AND teacher_id = auth.uid()
  );

-- admin: 전체 조회
CREATE POLICY "quizzes: admin 전체 조회"
  ON quizzes FOR SELECT
  USING (get_my_role() = 'admin');

-- 교사: 본인 강의에 퀴즈 생성
CREATE POLICY "quizzes: teacher - 생성"
  ON quizzes FOR INSERT
  WITH CHECK (
    get_my_role() = 'teacher'
    AND teacher_id = auth.uid()
    AND is_teacher_of_course(course_id)
  );

-- 교사: 본인 퀴즈 수정/삭제
CREATE POLICY "quizzes: teacher - 수정"
  ON quizzes FOR UPDATE
  USING (
    get_my_role() = 'teacher'
    AND teacher_id = auth.uid()
  );

CREATE POLICY "quizzes: teacher - 삭제"
  ON quizzes FOR DELETE
  USING (
    get_my_role() = 'teacher'
    AND teacher_id = auth.uid()
  );

-- admin: 전체 수정/삭제
CREATE POLICY "quizzes: admin 수정"
  ON quizzes FOR UPDATE
  USING (get_my_role() = 'admin');

CREATE POLICY "quizzes: admin 삭제"
  ON quizzes FOR DELETE
  USING (get_my_role() = 'admin');


-- ============================================================
-- RLS 정책: quiz_results
-- ============================================================
-- 수강생: 본인 결과만 조회
CREATE POLICY "quiz_results: student - 본인 조회"
  ON quiz_results FOR SELECT
  USING (
    student_id = auth.uid()
    AND get_my_role() = 'student'
  );

-- 교사: 본인 강의 퀴즈의 결과 조회
CREATE POLICY "quiz_results: teacher - 수강생 결과 조회"
  ON quiz_results FOR SELECT
  USING (
    get_my_role() = 'teacher'
    AND EXISTS (
      SELECT 1 FROM quizzes q
      WHERE q.id = quiz_results.quiz_id
        AND q.teacher_id = auth.uid()
    )
  );

-- admin: 전체 조회
CREATE POLICY "quiz_results: admin 전체 조회"
  ON quiz_results FOR SELECT
  USING (get_my_role() = 'admin');

-- 수강생: 본인 답안 제출
CREATE POLICY "quiz_results: student - 제출"
  ON quiz_results FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND get_my_role() = 'student'
  );


-- ============================================================
-- RLS 정책: chat_messages
-- ============================================================
-- 수강생: 본인 대화만 조회
CREATE POLICY "chat_messages: student - 본인 조회"
  ON chat_messages FOR SELECT
  USING (
    student_id = auth.uid()
    AND get_my_role() = 'student'
  );

-- 교사: 본인 강의 관련 대화 조회 (학습 분석 목적)
CREATE POLICY "chat_messages: teacher - 강의 대화 조회"
  ON chat_messages FOR SELECT
  USING (
    get_my_role() = 'teacher'
    AND course_id IS NOT NULL
    AND is_teacher_of_course(course_id)
  );

-- admin: 전체 조회
CREATE POLICY "chat_messages: admin 전체 조회"
  ON chat_messages FOR SELECT
  USING (get_my_role() = 'admin');

-- 수강생: 본인 메시지 삽입
CREATE POLICY "chat_messages: student - 메시지 전송"
  ON chat_messages FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND get_my_role() = 'student'
  );

-- assistant(Claude) 응답 삽입은 서버(service_role key)에서 처리하므로
-- 별도 INSERT 정책 불필요 (service_role은 RLS bypass)
