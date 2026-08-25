import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import { login } from './helpers/auth';
import { TEST_IMAGE_PATH, TEST_VIDEO_PATH } from './helpers/fixtures';

async function openStoryEditor(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: '스토리 추가' }).click();
  const modal = page.getByRole('dialog');
  await modal.locator('input[type="file"]').setInputFiles(TEST_IMAGE_PATH);
  await expect(modal.getByRole('heading', { name: '스토리 편집' })).toBeVisible();
  return modal;
}

async function openOwnStoryViewer(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: '내 스토리 보기' }).click();
  await expect(page.getByRole('button', { name: '닫기' })).toBeVisible();
}

async function goToLastStorySlide(page: import('@playwright/test').Page) {
  const slideCount = await page.getByTestId('story-progress-bar').count();
  for (let i = 1; i < slideCount; i += 1) {
    await page.getByRole('button', { name: '다음 스토리' }).click();
  }
}

test.describe('스토리', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('스토리 바에 스토리 목록 표시', async ({ page }) => {
    await expect(page.getByRole('button', { name: '내 스토리 보기' })).toBeVisible();
    await expect(page.getByRole('button', { name: '스토리 추가' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'alice_kim의 스토리 보기' })).toBeVisible();
  });

  test('스토리 만들기 — 사진/동영상 선택 화면', async ({ page }) => {
    await page.getByRole('button', { name: '스토리 추가' }).click();
    await expect(page.getByRole('heading', { name: '스토리 만들기' })).toBeVisible();
    await expect(page.getByText('사진 또는 동영상을 선택하세요')).toBeVisible();
  });

  test('텍스트·스티커 편집 후 스토리 공유', async ({ page }) => {
    const modal = await openStoryEditor(page);

    await modal.getByRole('button', { name: '텍스트' }).click();
    await modal.getByRole('button', { name: '스티커' }).click();
    await modal.getByRole('button', { name: '스티커 🔥' }).click();

    await modal.getByRole('button', { name: '스토리 공유' }).click();
    await expect(page.getByText('스토리가 공유되었습니다!')).toBeVisible();

    await openOwnStoryViewer(page);
    await goToLastStorySlide(page);
    await expect(page.getByTestId('story-overlay-text')).toBeVisible();
    await expect(page.getByTestId('story-overlay-sticker')).toBeVisible();
    await expect(page.getByText('텍스트')).toBeVisible();
    await expect(page.getByText('🔥')).toBeVisible();
  });

  test('스토리 이미지 업로드 후 슬라이드 추가', async ({ page }) => {
    await openOwnStoryViewer(page);
    const initialCount = await page.getByTestId('story-progress-bar').count();
    await page.getByRole('button', { name: '닫기' }).click();

    const modal = await openStoryEditor(page);
    await modal.getByRole('button', { name: '스토리 공유' }).click();
    await expect(page.getByText('스토리가 공유되었습니다!')).toBeVisible();

    await openOwnStoryViewer(page);
    await expect(page.getByTestId('story-progress-bar')).toHaveCount(initialCount + 1);
  });

  test('동영상 스토리 업로드', async ({ page }) => {
    test.skip(!fs.existsSync(TEST_VIDEO_PATH), 'test-video.mp4 fixture missing (ffmpeg required)');

    await page.getByRole('button', { name: '스토리 추가' }).click();
    const modal = page.getByRole('dialog');
    await modal.locator('input[type="file"]').setInputFiles(TEST_VIDEO_PATH);
    await expect(modal.getByRole('heading', { name: '스토리 편집' })).toBeVisible();
    await expect(modal.locator('video')).toBeVisible();

    await modal.getByRole('button', { name: '텍스트' }).click();
    await modal.getByRole('button', { name: '스토리 공유' }).click();
    await expect(page.getByText('스토리가 공유되었습니다!')).toBeVisible();

    await openOwnStoryViewer(page);
    await goToLastStorySlide(page);
    await expect(page.locator('video[aria-label*="letsgomingu"]')).toBeVisible();
    await expect(page.getByText('텍스트')).toBeVisible();
  });

  test('다른 사용자 스토리 보기 및 닫기', async ({ page }) => {
    await page.getByRole('button', { name: 'alice_kim의 스토리 보기' }).click();
    await expect(page.getByRole('button', { name: '닫기' })).toBeVisible();
    await expect(page.getByAltText('alice_kim의 스토리')).toBeVisible();
    await page.getByRole('button', { name: '닫기' }).click();
    await expect(page.getByRole('button', { name: '닫기' })).not.toBeVisible();
  });

  test('내 스토리 버튼으로 스토리 뷰어 열기', async ({ page }) => {
    await page.getByRole('button', { name: '내 스토리 보기' }).click();
    await expect(page.getByRole('button', { name: '닫기' })).toBeVisible();
    await expect(page.getByAltText(/letsgomingu의 스토리/)).toBeVisible();
  });

  test('스토리 뷰어 키보드 탐색', async ({ page }) => {
    await page.getByRole('button', { name: 'alice_kim의 스토리 보기' }).click();
    await expect(page.getByAltText('alice_kim의 스토리')).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(page.getByAltText('bob_lee의 스토리')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: '닫기' })).not.toBeVisible();
  });
});
