import { expect, test } from '@playwright/test';

test.describe('SEO', () => {
  test('robots.txt allows public pages and blocks private ones', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body).toContain('User-agent: *');
    expect(body).toContain('Allow: /');
    expect(body).toContain('Disallow: /messages');
    expect(body).toContain('Disallow: /settings');
    expect(body).toContain('Disallow: /admin');
    expect(body).toContain('Disallow: /api/');
    expect(body).toContain('Sitemap: https://www.iamnotafishmonger.com/sitemap.xml');
  });

  test('sitemap.xml lists public pages and the content sitemap', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body).toContain('<sitemapindex');
    expect(body).toContain('/sitemap-static.xml');
    expect(body).toContain('/api/v1/sitemap.xml');
  });

  test('home page has seafood meta tags', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/수산물/);
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', /수산물/);
    const keywords = page.locator('meta[name="keywords"]');
    await expect(keywords).toHaveAttribute('content', /오징어/);
    await expect(keywords).toHaveAttribute('content', /꽃게/);
    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveAttribute('content', /index, follow/);
  });

  test('info page updates title dynamically', async ({ page }) => {
    await page.goto('/info/wholesale');
    await expect(page).toHaveTitle(/도매/);
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute('href', /\/info\/wholesale$/);
  });

  test('account recovery pages are noindex', async ({ page }) => {
    await page.goto('/find-account');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });
});
