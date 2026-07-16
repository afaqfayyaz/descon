import { test, expect } from "@playwright/test";

/**
 * Round-trip for the new Assessments hub: send a one-on-one assessment from
 * the hub UI and see it appear in the one-on-one list.
 */
test("HR sends a one-on-one assessment from the Assessments hub", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("hr@caliber.app");
  await page.getByLabel("Password").fill("Caliber@123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard", { timeout: 30_000 });

  await page.goto("/assessment");
  await expect(
    page.getByRole("heading", { name: "Assessments", exact: true }),
  ).toBeVisible();

  // Open the send modal and pick the first employee.
  await page.getByRole("button", { name: "Send one-on-one" }).click();
  const employeeSelect = page.locator("select").last();
  await expect
    .poll(async () => (await employeeSelect.locator("option").count()) > 1, {
      timeout: 15_000,
    })
    .toBe(true);
  await employeeSelect.selectOption({ index: 1 });
  const chosen = await employeeSelect
    .locator("option:checked")
    .textContent();

  await page.getByRole("button", { name: "Send assessment" }).click();

  // The modal closes and the new assignment appears in the one-on-one table.
  await expect(
    page.getByRole("heading", { name: "Send one-on-one assessment" }),
  ).toHaveCount(0, { timeout: 20_000 });
  const firstName = (chosen ?? "").split("—")[0]!.trim();
  await expect(
    page
      .locator("section", {
        has: page.getByRole("heading", { name: /One-on-one assessments/ }),
      })
      .getByRole("link", { name: new RegExp(firstName) })
      .first(),
  ).toBeVisible({ timeout: 20_000 });
});
