import { expect, test } from '@playwright/test';
import { login } from './helpers/auth';
import { TEST_IMAGE_PATH } from './helpers/fixtures';

test.describe('게시물 작성', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('새 게시물 만들기 모달 열기', async ({ page }) => {
    await page.getByRole('button', { name: '만들기' }).click();
    await expect(page.getByRole('heading', { name: '새 게시물 만들기' })).toBeVisible();
    await expect(page.getByText('사진과 동영상을 여기에 끌어다 놓으세요')).toBeVisible();
  });

  test('이미지 업로드 후 피드에 게시물 공유', async ({ page }) => {
    const caption = `E2E post ${Date.now()}`;

    await page.getByRole('button', { name: '만들기' }).click();
    const modal = page.getByRole('dialog');
    await modal.locator('input[type="file"]').setInputFiles(TEST_IMAGE_PATH);
    await expect(modal.getByAltText('미리보기')).toBeVisible();

    await modal.getByPlaceholder('문구 입력...').fill(caption);
    await modal.getByPlaceholder('위치 추가').fill('Seoul');
    await modal.getByRole('button', { name: '게시물 공유' }).click();

    await expect(page.getByText('게시물이 공유되었습니다!')).toBeVisible();
    await expect(page.getByText(caption)).toBeVisible();
  });

  test('게시물 모달에서 댓글 작성', async ({ page }) => {
    await page
      .getByRole('article')
      .first()
      .getByRole('button', { name: '댓글', exact: true })
      .click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    const comment = `E2E comment ${Date.now()}`;
    await modal.getByPlaceholder('댓글 달기...').fill(comment);
    await modal.getByRole('button', { name: '게시' }).click();
    await expect(modal.getByText(comment)).toBeVisible();
  });
});
