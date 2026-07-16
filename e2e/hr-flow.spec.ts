import { test, expect, type Page } from "@playwright/test";

/**
 * End-to-end coverage of the HR journey against seeded demo data:
 *   login → dashboards → campaign list filtering → per-campaign dashboard &
 *   employee ratings → employee history → building a scoped campaign with a
 *   hand-picked recipient.
 *
 * Prerequisites: docker Mongo running + `npm run seed && npm run seed:demo`.
 */

const HR_EMAIL = "hr@caliber.app";
const HR_PASSWORD = "Caliber@123";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(HR_EMAIL);
  await page.getByLabel("Password").fill(HR_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard", { timeout: 30_000 });
}

test.describe("HR competency platform", () => {
  test("logs in and shows the HR control center", async ({ page }) => {
    await login(page);
    await expect(
      page.getByRole("heading", { name: "HR Control Center" }),
    ).toBeVisible();
  });

  test("executive overview renders org-wide widgets", async ({ page }) => {
    await login(page);
    await page.goto("/executive");
    await expect(
      page.getByRole("heading", { name: "Executive overview" }),
    ).toBeVisible();
    await expect(page.getByText("Workforce Distribution")).toBeVisible();
    await expect(page.getByText("Organisation Competency Radar")).toBeVisible();
    await expect(page.getByText("By Designation")).toBeVisible();
  });

  test("campaign list filters by month and status", async ({ page }) => {
    await login(page);
    await page.goto("/campaigns");
    await expect(
      page.getByRole("link", { name: "Current Competency Assessment" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Q1 Baseline Assessment" }),
    ).toBeVisible();

    // Filter to locked campaigns only.
    await page.locator('select[name="status"]').selectOption("locked");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(
      page.getByRole("link", { name: "Q1 Baseline Assessment" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Current Competency Assessment" }),
    ).toHaveCount(0);
  });

  test("campaign dashboard shows charts and employee ratings", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/campaigns");
    await page
      .getByRole("link", { name: "Current Competency Assessment" })
      .click();
    await page.waitForURL("**/campaigns/**");
    await expect(
      page.getByRole("heading", { name: "Performance dashboard" }),
    ).toBeVisible();
    await expect(page.getByText("Employee ratings")).toBeVisible();
    await expect(page.getByText("Competency radar")).toBeVisible();
    // At least one seeded employee is listed with a rating.
    await expect(page.getByText("Ahmed Raza").first()).toBeVisible();
  });

  test("employee dashboard shows assessment history over time", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/employees");
    await page.getByPlaceholder(/search/i).first().fill("Ahmed");
    // Open the first employee's dashboard.
    await page.locator('a[aria-label="View dashboard"]').first().click();
    await page.waitForURL("**/employees/**");
    await expect(page.getByText("Assessment history")).toBeVisible();
    // The seeded employee has 3 campaigns → capability % values present.
    await expect(page.getByText("Level trend over time")).toBeVisible();
  });

  test("HR builds a scoped campaign with a hand-picked recipient", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/campaigns/new");

    const name = `E2E Scoped ${Date.now()}`;
    await page.getByPlaceholder("e.g. Annual Review 2026").fill(name);

    // Wait for the recipient list to load, then pick the first employee.
    const firstEmployee = page
      .locator('input[type="checkbox"]')
      .first();
    await firstEmployee.waitFor({ state: "visible", timeout: 20_000 });
    await firstEmployee.check();

    // Switch to a custom scope and pick a random subset of questions.
    await page.getByText("Custom selection").click();
    await page.getByRole("button", { name: "Random questions" }).click();

    await page.getByRole("button", { name: /Create draft campaign/ }).click();
    await page.waitForURL("**/campaigns/**", { timeout: 30_000 });
    await expect(page.getByRole("heading", { name })).toBeVisible();
  });
});
