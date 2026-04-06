import { test, expect } from "@playwright/test";

// ── 인증 페이지 UI 테스트 ──────────────────────────────────────────
// Supabase 없이 실행 가능한 UI/라우팅 테스트만 포함
// (실제 로그인/가입은 Supabase 연결 필요)

test.describe("로그인 페이지", () => {
  test("로그인 페이지가 렌더링된다", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "로그인" })).toBeVisible();
  });

  test("이메일, 비밀번호 입력 필드가 존재한다", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("이메일")).toBeVisible();
    await expect(page.getByLabel("비밀번호")).toBeVisible();
  });

  test("로그인 버튼이 존재한다", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "로그인" })).toBeVisible();
  });

  test("회원가입 링크를 클릭하면 /signup으로 이동한다", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "회원가입" }).click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test("빈 폼 제출 시 HTML validation이 동작한다", async ({ page }) => {
    await page.goto("/login");
    // 빈 상태로 제출 시 페이지가 이동하지 않아야 함
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("잘못된 이메일 형식 입력 시 validation이 동작한다", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("이메일").fill("notanemail");
    await page.getByLabel("비밀번호").fill("password123");
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("회원가입 페이지", () => {
  test("회원가입 페이지가 렌더링된다", async ({ page }) => {
    await page.goto("/signup");
    await expect(page).toHaveURL(/\/signup/);
    await expect(page.getByRole("heading", { name: "회원가입" })).toBeVisible();
  });

  test("이름, 이메일, 비밀번호 입력 필드가 존재한다", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByLabel("이름")).toBeVisible();
    await expect(page.getByLabel("이메일")).toBeVisible();
    await expect(page.getByLabel("비밀번호")).toBeVisible();
  });

  test("역할 선택 라디오 버튼 3개가 존재한다", async ({ page }) => {
    await page.goto("/signup");
    const radios = page.getByRole("radio");
    await expect(radios).toHaveCount(3);
    // 기본값: 수강생 선택됨
    await expect(page.getByRole("radio", { name: /수강생/ })).toBeChecked();
  });

  test("역할 선택을 교사로 변경할 수 있다", async ({ page }) => {
    await page.goto("/signup");
    await page.getByRole("radio", { name: /교사/ }).check();
    await expect(page.getByRole("radio", { name: /교사/ })).toBeChecked();
    await expect(page.getByRole("radio", { name: /수강생/ })).not.toBeChecked();
  });

  test("로그인 링크를 클릭하면 /login으로 이동한다", async ({ page }) => {
    await page.goto("/signup");
    await page.getByRole("link", { name: "로그인" }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("라우팅 보호", () => {
  test("비로그인 상태에서 /student 접근 시 /login으로 리다이렉트", async ({ page }) => {
    await page.goto("/student");
    await expect(page).toHaveURL(/\/login/);
  });

  test("비로그인 상태에서 /teacher 접근 시 /login으로 리다이렉트", async ({ page }) => {
    await page.goto("/teacher");
    await expect(page).toHaveURL(/\/login/);
  });

  test("비로그인 상태에서 /admin 접근 시 /login으로 리다이렉트", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("루트(/) 접근 시 /login으로 리다이렉트", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });
});
