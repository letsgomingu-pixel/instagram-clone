import { expect, test } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('소셜 기능', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('프로필 페이지 조회', async ({ page }) => {
    await page.goto('/profile/alice_kim');
    await expect(page.getByRole('heading', { name: 'alice_kim' })).toBeVisible();
    await expect(page.locator('img').first()).toBeVisible();
  });

  test('사용자 검색', async ({ page }) => {
    await page.goto('/search');
    await page.getByPlaceholder('검색').fill('alice');
    await expect(page.getByText('alice_kim')).toBeVisible();
  });

  test('알림 페이지 — 회원님 탭', async ({ page }) => {
    await page.goto('/notifications');
    await expect(page).toHaveURL('/notifications');
    await expect(page.getByRole('heading', { name: '알림', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: '회원님' })).toBeVisible();
    await expect(page.locator('section').first()).toBeVisible();
  });

  test('알림 페이지 — 팔로잉 탭 전환', async ({ page }) => {
    await page.goto('/notifications');
    await page.getByRole('button', { name: '팔로잉' }).click();
    await expect(page.locator('section').first()).toBeVisible();
  });

  test('메시지 목록 및 대화', async ({ page }) => {
    await page.goto('/messages');
    await expect(page).toHaveURL('/messages');
    await expect(page.getByRole('heading', { name: 'letsgomingu' })).toBeVisible();

    await page.goto('/messages/alice_kim');
    await expect(page).toHaveURL('/messages/alice_kim');
    await expect(page.getByPlaceholder('메시지 입력...')).toBeVisible();
  });

  test('메시지 전송', async ({ page }) => {
    const content = `E2E test ${Date.now()}`;
    await page.goto('/messages/alice_kim');
    await page.getByPlaceholder('메시지 입력...').fill(content);
    await page.getByRole('button', { name: '보내기' }).click();
    await expect(page.getByText(content, { exact: true })).toBeVisible();
  });

  test('프로필 팔로우 버튼', async ({ page }) => {
    await page.goto('/profile/bob_lee');
    const followButton = page.getByRole('button', { name: /팔로우|팔로잉/ }).first();
    await expect(followButton).toBeVisible();
    const textBefore = await followButton.textContent();
    await followButton.click();
    await expect(followButton).not.toHaveText(textBefore ?? '');
  });
});
