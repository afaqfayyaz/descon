import { describe, expect, it, vi } from "vitest";

// permissions.ts pulls in requireSession (→ next-auth → mongodb) for its
// server guard; the pure hasPermission under test doesn't need any of it.
vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));

import { hasPermission } from "@/lib/auth/permissions";

describe("hasPermission", () => {
  it("grants hr_admin its mapped permissions", () => {
    expect(hasPermission(["hr_admin"], "user.manage")).toBe(true);
    expect(hasPermission(["hr_admin"], "campaign.launch")).toBe(true);
    expect(hasPermission(["hr_admin"], "framework.area.create")).toBe(true);
  });

  it("denies employees admin permissions but allows the '*' ones", () => {
    expect(hasPermission(["employee"], "user.manage")).toBe(false);
    expect(hasPermission(["employee"], "settings.manage")).toBe(false);
    expect(hasPermission(["employee"], "assessment.self.submit")).toBe(true);
    expect(hasPermission(["employee"], "assessment.view.own")).toBe(true);
  });

  it("resolves wildcard groups (framework.subCompetency.*)", () => {
    expect(hasPermission(["hr_admin"], "framework.subCompetency.create")).toBe(
      true,
    );
    expect(hasPermission(["employee"], "framework.subCompetency.create")).toBe(
      false,
    );
  });

  it("denies unknown permissions to normal roles", () => {
    expect(hasPermission(["hr_admin"], "does.not.exist")).toBe(false);
  });

  it("super_admin bypasses the map entirely — including future permissions", () => {
    expect(hasPermission(["super_admin"], "user.manage")).toBe(true);
    expect(hasPermission(["super_admin"], "settings.manage")).toBe(true);
    // The break-glass property: a permission added later can never lock it out.
    expect(hasPermission(["super_admin"], "some.future.permission")).toBe(true);
  });

  it("empty role set gets nothing except nothing", () => {
    expect(hasPermission([], "user.manage")).toBe(false);
    expect(hasPermission([], "assessment.view.own")).toBe(true); // "*" = any signed-in user
  });
});
