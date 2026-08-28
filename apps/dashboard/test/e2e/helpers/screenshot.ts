import { test, type Page } from '@playwright/test';

/** Attach a full-page screenshot to the Playwright HTML report. */
export async function snap(page: Page, name: string) {
  await test.info().attach(name, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
}
