# LearnAI

Claude AI를 활용한 한국어 학습 관리 시스템(LMS)입니다.  
선생님은 강의·자료·과제를 관리하고, AI가 자동으로 퀴즈를 생성합니다.  
학생은 강의를 수강하고 퀴즈와 코딩 과제를 풀며 학습 이력을 쌓을 수 있습니다.

## 🚀 서비스 바로가기

**배포 URL:** [https://learnai-woad.vercel.app](https://learnai-woad.vercel.app)

## 주요 기능

### 선생님
- 강의 개설·수정·삭제 및 카테고리 관리
- 주차별 학습 자료 업로드 (PDF, PPT/PPTX, 이미지, 텍스트, 영상) — 드래그 앤 드롭 지원
- Claude AI 기반 객관식 퀴즈 자동 생성 (업로드된 자료 분석 또는 주제 입력)
- 주차별 코딩 과제 출제 (Python / C / Java) 및 마감일 설정
- 수강생 진도율·퀴즈 평균·과제 제출 현황 모니터링
- 학생 질문 메시지 관리

### 학생
- 강의 목록 조회 및 수강 신청후 강의보기
- 주차별 학습 자료·퀴즈·코딩 과제 통합 학습 뷰
- 브라우저 내 코드 에디터로 과제 제출 및 실행 결과 확인
- 퀴즈 풀기 (즉각적인 정답·해설 피드백)
- AI 튜터 채팅 (강의 맥락 기반 질문·답변)
- 선생님과 메시지 주고받기

### 교육운영자(Admin)
- 전체 수강생·강의·강사 현황 모니터링
- 학습 분석 통계

## 기술 스택

| 분류 | 기술 |
|---|---|
| 프레임워크 | Next.js 16 (App Router) |
| 언어 | TypeScript |
| 스타일링 | Tailwind CSS v4 |
| 데이터베이스 | Supabase (PostgreSQL + RLS) |
| 스토리지 | Supabase Storage |
| AI | Anthropic Claude API (claude-opus-4-6) |
| 코드 실행 | Wandbox API (Python / C / Java) |
| 배포 | Vercel |

## 시작하기

### 방법 1 — 배포된 서비스 이용

별도 설치 없이 바로 사용할 수 있습니다.

👉 [https://learnai-woad.vercel.app](https://learnai-woad.vercel.app)

### 방법 2 — 로컬 개발 환경 설정

#### 1. 저장소 클론 및 의존성 설치

```bash
git clone https://github.com/lys0318/Learning-system.git
cd Learning-system/learnai
npm install
```

#### 2. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성합니다.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Anthropic Claude API
ANTHROPIC_API_KEY=your_anthropic_api_key
```

#### 3. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인할 수 있습니다.

## 역할별 계정

| 역할 | 설명 |
|---|---|
| 수강생 | 강의 수강, 퀴즈·과제 풀기, AI 튜터 이용 |
| 선생님 | 강의·자료·퀴즈·과제 관리, 수강생 모니터링 |
| 교육운영자 | 전체 시스템 현황 관리 |

회원가입 시 역할을 선택하여 계정을 생성한 후 선생계정에서 강의를 생성하고 학생계정에서 강의 둘러보기에서 강의를 수강신청을 한 후 시작 강의를 수강합니다.
