import { Page } from '@playwright/test';

export async function signIn(page: Page) {
  // With global setup and storageState, authentication is already handled
  // Tests can directly navigate to pages they need
  // This function is kept for backwards compatibility but does nothing
}
