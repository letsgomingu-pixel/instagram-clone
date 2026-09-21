import { expect, test } from '@playwright/test';

test.describe('PWA', () => {
  test('web app manifest is installable', async ({ request }) => {
    const res = await request.get('/site.webmanifest');
    expect(res.ok()).toBeTruthy();
    const manifest = await res.json();
    expect(manifest.name).toContain('fishmonger');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.icons.some((icon: { sizes: string }) => icon.sizes === '192x192')).toBeTruthy();
    expect(manifest.icons.some((icon: { sizes: string }) => icon.sizes === '512x512')).toBeTruthy();
    expect(manifest.icons.some((icon: { purpose: string }) => icon.purpose === 'maskable')).toBeTruthy();
  });

  test('service worker and offline page are served from the root', async ({ request }) => {
    const sw = await request.get('/sw.js');
    expect(sw.ok()).toBeTruthy();
    const swBody = await sw.text();
    expect(swBody).toContain('offline.html');
    expect(swBody).toContain("skipWaiting");

    const offline = await request.get('/offline.html');
    expect(offline.ok()).toBeTruthy();
    expect(await offline.text()).toContain('오프라인');
  });

  test('home document has Apple PWA meta tags', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/site.webmanifest');
    await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute(
      'content',
      'yes',
    );
    await expect(page.locator('meta[name="mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', /viewport-fit=cover/);
  });

  test('install banner appears on a phone-sized Android viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      localStorage.removeItem('pwa-install-dismissed');
      localStorage.removeItem('pwa-install-dismissed-v2');
      localStorage.removeItem('pwa-install-dismissed-v3');
      Object.defineProperty(navigator, 'userAgent', {
        configurable: true,
        value:
          'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
      });
      Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 5 });
    });
    await page.goto('/');
    await expect(page.getByTestId('pwa-install-card')).toBeVisible();
    await expect(page.getByText('앱처럼 사용하기').first()).toBeVisible();
  });
});
