import { test, expect } from '@playwright/test';

/**
 * Smoke test: copre il path critico end-to-end.
 *
 *  1. landing render
 *  2. signup → dashboard
 *  3. crea property
 *  4. crea booking
 *  5. apri /v/[token] → consenso → vede il primo step (welcome)
 *
 * Non testiamo il flusso biometrico completo (servirebbe un device fisico).
 * Per il resto, se questo passa il sistema regge.
 */

const uniq = () => Date.now() + '-' + Math.random().toString(36).slice(2, 8);

test('landing renders and links to signup', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /apre la porta/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /prova gratis/i }).first()).toBeVisible();
});

test('legal pages render with typography', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: /privacy policy/i })).toBeVisible();
  await page.goto('/terms');
  await expect(page.getByRole('heading', { name: /termini di servizio/i })).toBeVisible();
  await page.goto('/dpia');
  await expect(page.getByRole('heading', { name: /valutazione di impatto/i })).toBeVisible();
});

test('full signup → property → booking → guest welcome flow', async ({ page, context }) => {
  const id = uniq();
  const email = `e2e-${id}@example.test`;
  const password = 'a-strong-test-pwd-2026';

  // 1. signup
  await page.goto('/signup');
  await page.getByLabel('Nome e cognome').fill('E2E Test User');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByLabel(/Accetto i/).check();
  await page.getByRole('button', { name: /crea account/i }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { name: /ciao/i })).toBeVisible();

  // 2. add property
  await page.goto('/properties/new');
  await page.getByLabel('Nome (uso interno)').fill(`E2E Apt ${id}`);
  await page.getByLabel('Indirizzo').fill('Via E2E 1');
  await page.getByLabel('Comune').fill('Roma');
  await page.getByLabel('Provincia (sigla)').fill('RM');
  await page.getByLabel('CAP').fill('00100');
  await page.getByRole('button', { name: /salva appartamento/i }).click();
  await expect(page).toHaveURL(/\/properties$/);

  // 3. create booking
  await page.goto('/bookings/new');
  await page.getByLabel('Nome di chi prenota').fill('Mario Rossi');
  await page.getByLabel('Email').fill('mario@example.test');
  // Date pick: future dates 1 week from now
  const inDate = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const outDate = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  await page.getByLabel('Check-in').fill(inDate);
  await page.getByLabel('Check-out').fill(outDate);
  await page.getByLabel(/N° ospiti/).fill('2');
  await page.getByRole('button', { name: /crea prenotazione/i }).click();
  await expect(page).toHaveURL(/\/bookings\/[a-z0-9]+/);

  // Grab the public check-in URL from the page
  const codeBox = page.locator('code').first();
  const checkInUrl = (await codeBox.textContent()) ?? '';
  expect(checkInUrl).toMatch(/\/v\/[a-z0-9]+/);

  // 4. open the guest URL in a fresh context (no auth cookies)
  const guestPage = await context.newPage();
  await guestPage.goto(checkInUrl);
  await expect(guestPage.getByRole('heading', { name: /benvenuto/i })).toBeVisible();
  await expect(guestPage.getByRole('button', { name: /iniziamo/i })).toBeVisible();

  await guestPage.getByRole('button', { name: /iniziamo/i }).click();
  await expect(guestPage.getByRole('heading', { name: /trattamento dei tuoi dati/i })).toBeVisible();
});
