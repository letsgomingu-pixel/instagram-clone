import { expect, test } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('피드 & 게시물', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('홈 피드에 게시물 카드 표시', async ({ page }) => {
    await expect(page.getByRole('article').first()).toBeVisible();
    await expect(page.getByRole('article').first().getByRole('button', { name: '좋아요' })).toBeVisible();
  });

  test('게시물 좋아요 토글', async ({ page }) => {
    const likeButton = page.getByRole('article').first().getByRole('button', { name: /좋아요/ });
    const labelBefore = await likeButton.getAttribute('aria-label');
    await likeButton.click();
    await expect(likeButton).toHaveAttribute(
      'aria-label',
      labelBefore === '좋아요' ? '좋아요 취소' : '좋아요',
    );
  });

  test('탐색 페이지 게시물 그리드', async ({ page }) => {
    await page.goto('/explore');
    await expect(page.locator('img').first()).toBeVisible();
  });

  test('게시물 상세 페이지', async ({ page }) => {
    await page.goto('/p/1');
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('릴스 피드', async ({ page }) => {
    await page.goto('/reels');
    await expect(page.locator('video, img').first()).toBeVisible({ timeout: 20_000 });
  });
});
