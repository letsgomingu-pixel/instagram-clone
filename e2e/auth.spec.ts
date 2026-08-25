import { expect, test } from '@playwright/test';
import { login, logoutViaStorage, TEST_EMAIL, TEST_PASSWORD, TEST_USERNAME } from './helpers/auth';

test.describe('인증', () => {
  test('로그인 페이지 표시', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: '로그인', exact: true })).toBeVisible();
    await expect(page.getByText('테스트 계정:')).toBeVisible();
  });

  test('시드 계정으로 로그인 후 홈 피드 표시', async ({ page }) => {
    await login(page);
    await expect(page.getByRole('article').first()).toBeVisible();
  });

  test('잘못된 비밀번호 로그인 실패', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('사용자명 또는 이메일').fill(TEST_EMAIL);
    await page.getByLabel('비밀번호').fill('wrong-password');
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await expect(page).toHaveURL('/login');
    await expect(page.getByText('사용자명 또는 비밀번호가 올바르지 않습니다.')).toBeVisible();
  });

  test('회원가입 후 자동 로그인', async ({ page }) => {
    const suffix = `e2e${Date.now().toString().slice(-8)}`;
    await page.goto('/signup');
    await page.getByPlaceholder('이메일').fill(`${suffix}@example.com`);
    await page.getByPlaceholder('사용자 이름').fill(suffix);
    await expect(page.getByText('✓ 사용 가능한 사용자명')).toBeVisible();
    await page.getByPlaceholder('성명').fill('E2E User');
    await page.getByPlaceholder('비밀번호').fill('password123');
    await page.getByRole('button', { name: '가입' }).click();
    await expect(page).toHaveURL('/');
  });

  test('로그아웃 후 보호된 페이지 접근 시 로그인으로 리다이렉트', async ({ page }) => {
    await login(page);
    await logoutViaStorage(page);
    await page.goto('/messages');
    await expect(page).toHaveURL('/login');
  });

  test('로그인 상태에서 /login 접근 시 홈으로 리다이렉트', async ({ page }) => {
    await login(page);
    await page.goto('/login');
    await expect(page).toHaveURL('/');
  });

  test('유저명으로 로그인', async ({ page }) => {
    await login(page, TEST_USERNAME, TEST_PASSWORD);
    await expect(page.getByRole('article').first()).toBeVisible();
  });
});
