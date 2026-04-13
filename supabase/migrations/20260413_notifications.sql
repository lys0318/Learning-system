-- notifications 테이블
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'announcement' | 'message' | 'enrollment'
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 본인 알림만 조회
CREATE POLICY "users_own_notifications_select" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- 본인 알림만 읽음 처리
CREATE POLICY "users_own_notifications_update" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- 조회 성능용 인덱스
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);

-- =============================================
-- Trigger 1: 공지사항 등록 → 수강생 알림
-- =============================================
CREATE OR REPLACE FUNCTION notify_on_announcement()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, link)
  SELECT
    e.student_id,
    'announcement',
    '새 공지사항: ' || NEW.title,
    LEFT(NEW.content, 100),
    '/student/courses/' || NEW.course_id || '/announcements'
  FROM enrollments e
  WHERE e.course_id = NEW.course_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_announcement ON announcements;
CREATE TRIGGER trg_notify_announcement
  AFTER INSERT ON announcements
  FOR EACH ROW EXECUTE FUNCTION notify_on_announcement();

-- =============================================
-- Trigger 2: 직접 메시지 → 수신자 알림
-- =============================================
CREATE OR REPLACE FUNCTION notify_on_direct_message()
RETURNS TRIGGER AS $$
DECLARE
  v_teacher_id UUID;
BEGIN
  -- 학생이 보낸 경우 → 담당 교사에게 알림
  IF NEW.sender_id = NEW.student_id THEN
    SELECT teacher_id INTO v_teacher_id
    FROM courses WHERE id = NEW.course_id;

    INSERT INTO notifications (user_id, type, title, body, link)
    VALUES (
      v_teacher_id,
      'message',
      '새 학생 질문이 도착했습니다',
      LEFT(NEW.content, 80),
      '/teacher/messages/' || NEW.course_id || '/' || NEW.student_id
    );

  -- 교사가 보낸 경우 → 학생에게 알림
  ELSE
    INSERT INTO notifications (user_id, type, title, body, link)
    VALUES (
      NEW.student_id,
      'message',
      '선생님 답변이 도착했습니다',
      LEFT(NEW.content, 80),
      '/student/messages/' || NEW.course_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_direct_message ON direct_messages;
CREATE TRIGGER trg_notify_direct_message
  AFTER INSERT ON direct_messages
  FOR EACH ROW EXECUTE FUNCTION notify_on_direct_message();

-- =============================================
-- Trigger 3: 수강 등록 → 담당 교사 알림
-- =============================================
CREATE OR REPLACE FUNCTION notify_on_enrollment()
RETURNS TRIGGER AS $$
DECLARE
  v_teacher_id UUID;
  v_student_name TEXT;
  v_course_title TEXT;
BEGIN
  SELECT c.teacher_id, c.title INTO v_teacher_id, v_course_title
  FROM courses c WHERE c.id = NEW.course_id;

  SELECT full_name INTO v_student_name
  FROM profiles WHERE id = NEW.student_id;

  INSERT INTO notifications (user_id, type, title, body, link)
  VALUES (
    v_teacher_id,
    'enrollment',
    '새 수강생이 등록했습니다',
    COALESCE(v_student_name, '수강생') || '님이 ' || COALESCE(v_course_title, '강의') || '에 등록했습니다.',
    '/teacher'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_enrollment ON enrollments;
CREATE TRIGGER trg_notify_enrollment
  AFTER INSERT ON enrollments
  FOR EACH ROW EXECUTE FUNCTION notify_on_enrollment();
