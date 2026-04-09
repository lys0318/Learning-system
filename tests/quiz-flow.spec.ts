import { test, expect } from "@playwright/test";

const TEACHER_EMAIL = "test-teacher@learnai.dev";
const TEACHER_PW = "password123";
const STUDENT_EMAIL = "test-student@learnai.dev";
const STUDENT_PW = "password123";

async function ensureLogin(page: import("@playwright/test").Page, email: string, pw: string) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(email);
  await page.getByLabel("비밀번호").fill(pw);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForTimeout(2000);
}

test("교사 계정 생성", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("이름").fill("테스트교사");
  await page.getByLabel("이메일").fill(TEACHER_EMAIL);
  await page.getByLabel("비밀번호").fill(TEACHER_PW);
  await page.getByRole("radio", { name: /교사/ }).check();
  await page.screenshot({ path: "tests/screenshots/teacher-signup.png", fullPage: true });
  await page.getByRole("button", { name: "회원가입" }).click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "tests/screenshots/teacher-signup-result.png", fullPage: true });
  console.log("회원가입 결과 URL:", page.url());
  const err = await page.locator(".text-red-400").textContent().catch(() => null);
  if (err) console.log("에러:", err);
});

test.describe("교사 퀴즈 페이지", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLogin(page, TEACHER_EMAIL, TEACHER_PW);
  });

  test("교사 대시보드에 퀴즈 관리 버튼이 있다", async ({ page }) => {
    await expect(page).toHaveURL(/\/teacher/);
    await page.screenshot({ path: "tests/screenshots/teacher-dashboard.png", fullPage: true });
    await expect(page.getByRole("link", { name: "퀴즈 관리" })).toBeVisible();
  });

  test("퀴즈 관리 페이지가 렌더링된다", async ({ page }) => {
    await page.goto("/teacher/quizzes");
    await page.screenshot({ path: "tests/screenshots/teacher-quizzes.png", fullPage: true });
    await expect(page.getByRole("heading", { name: "퀴즈 관리" })).toBeVisible();
  });

  test("퀴즈 생성 페이지가 렌더링된다", async ({ page }) => {
    await page.goto("/teacher/quizzes/new");
    await page.screenshot({ path: "tests/screenshots/teacher-quiz-new.png", fullPage: true });
    await expect(page.getByRole("heading", { name: "AI 퀴즈 자동 생성" })).toBeVisible();
  });
});

test.describe("수강생 퀴즈 페이지", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLogin(page, STUDENT_EMAIL, STUDENT_PW);
  });

  test("수강생 대시보드에 퀴즈 메뉴가 있다", async ({ page }) => {
    await expect(page).toHaveURL(/\/student/);
    await page.screenshot({ path: "tests/screenshots/student-dashboard.png", fullPage: true });
    await expect(page.getByRole("link", { name: "퀴즈" })).toBeVisible();
  });

  test("퀴즈 목록 페이지가 렌더링된다", async ({ page }) => {
    await page.goto("/student/quizzes");
    await page.screenshot({ path: "tests/screenshots/student-quizzes.png", fullPage: true });
    await expect(page.getByRole("heading", { name: /수강 중인 강의 퀴즈/ })).toBeVisible();
  });
});
