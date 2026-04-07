# LearnAI

Claude AI를 활용한 한국어 학습 관리 시스템(LMS)입니다.  
선생님은 강의와 학습 자료를 관리하고, AI가 자동으로 퀴즈를 생성합니다.  
학생은 강의를 수강하고 퀴즈를 풀어 학습 이력을 쌓을 수 있습니다.

## 주요 기능

### 선생님
- 강의 개설 및 관리
- 학습 자료 업로드 (PDF, PPT/PPTX, 이미지, 텍스트, 영상) — 드래그 앤 드롭 지원
- Claude AI 기반 객관식 퀴즈 자동 생성 (업로드된 자료 분석 또는 주제 입력)
- 생성한 퀴즈 미리보기 (정답 포함)
- 퀴즈 삭제

### 학생
- 강의 목록 조회 및 수강 신청
- 퀴즈 풀기 (즉각적인 정답·해설 피드백)
- 완강한 강의 수강 이력 삭제

## 기술 스택

| 분류 | 기술 |
|---|---|
| 프레임워크 | Next.js 16 (App Router) |
| 언어 | TypeScript |
| 스타일링 | Tailwind CSS v4 |
| 데이터베이스 | Supabase (PostgreSQL + RLS) |
| 스토리지 | Supabase Storage |
| AI | Anthropic Claude API (claude-opus-4-6) |

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성합니다.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Anthropic Claude API
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### 3. Supabase 테이블 설정

Supabase 대시보드 SQL Editor에서 다음 테이블을 생성합니다.

**profiles** — 사용자 역할 (teacher / student)

**courses** — 강의 정보

**enrollments** — 수강 신청 및 완료 상태

**quizzes** — AI 생성 퀴즈 (questions: JSONB)

**quiz_attempts** — 학생 퀴즈 제출 이력

**course_materials** — 강의 자료 메타데이터

```sql
create table course_materials (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) on delete cascade,
  teacher_id uuid references profiles(id) on delete cascade,
  name text not null,
  file_path text not null,
  file_type text not null,
  file_size bigint not null,
  created_at timestamptz default now()
);

alter table course_materials enable row level security;
create policy "materials: teacher 관리" on course_materials
  using (teacher_id = auth.uid());
```

### 4. Supabase Storage 설정

`course-materials` 버킷을 생성합니다 (비공개, 최대 50MB).

### 5. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인할 수 있습니다.

## 퀴즈 생성 흐름

1. 선생님이 강의에 학습 자료를 업로드
2. 퀴즈 생성 페이지에서 강의 선택 → 자료 선택 (선택 사항) → 주제 입력
3. Claude AI가 자료를 분석하여 JSON 형식의 객관식 문제 생성
   - PDF: base64 document block으로 전달
   - PPTX: 슬라이드 텍스트 추출 후 프롬프트에 포함
   - 이미지: base64 image block으로 전달
   - 텍스트: 프롬프트에 직접 포함
4. 파싱된 문제가 `quizzes` 테이블에 저장
