import { test, expect } from "@playwright/test";

test("회원가입 전체 흐름 디버그", async ({ page }) => {
  // 1. 회원가입 페이지 진입
  await page.goto("/signup");
  await page.screenshot({ path: "tests/screenshots/01-signup-page.png", fullPage: true });

  // 2. 폼 입력
  await page.getByLabel("이름").fill("테스트학생");
  await page.getByLabel("이메일").fill("test-student@learnai.dev");
  await page.getByLabel("비밀번호").fill("password123");
  await page.getByRole("radio", { name: /수강생/ }).check();
  await page.screenshot({ path: "tests/screenshots/02-signup-filled.png", fullPage: true });

  // 3. 제출
  await page.getByRole("button", { name: "회원가입" }).click();

  // 4. 결과 대기 (리다이렉트 or 에러 메시지)
  await page.waitForTimeout(4000);
  await page.screenshot({ path: "tests/screenshots/03-signup-result.png", fullPage: true });

  // 현재 URL 및 에러 메시지 출력
  console.log("현재 URL:", page.url());
  const errorMsg = await page.locator(".text-red-400").textContent().catch(() => null);
  if (errorMsg) console.log("에러 메시지:", errorMsg);

  // 5. 로그인 페이지로 이동했으면 로그인 시도
  if (page.url().includes("/login")) {
    console.log("✅ 회원가입 성공 → 로그인 페이지로 이동됨");
    await page.getByLabel("이메일").fill("test-student@learnai.dev");
    await page.getByLabel("비밀번호").fill("password123");
    await page.getByRole("button", { name: "로그인" }).click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: "tests/screenshots/04-login-result.png", fullPage: true });
    console.log("로그인 후 URL:", page.url());
  }
});
