import { expect, type Page } from '@playwright/test';

export const TEST_EMAIL = 'letsgomingu@gmail.com';
export const TEST_PASSWORD = '12345';
export const TEST_USERNAME = 'letsgomingu';

export async function login(
  page: Page,
  username = TEST_EMAIL,
  password = TEST_PASSWORD,
) {
  await page.goto('/login');
  await page.getByLabel('사용자명 또는 이메일').fill(username);
  await page.getByLabel('비밀번호').fill(password);
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page).toHaveURL('/');
}

export async function logoutViaStorage(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
  });
  await page.goto('/login');
  await expect(page).toHaveURL('/login');
}
