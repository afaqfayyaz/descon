import { describe, expect, it } from "vitest";

import {
  createApplicationUserSchema,
  updateApplicationUserSchema,
} from "@/lib/domain/validation/user.schema";

describe("application user schemas", () => {
  it("accepts the two grantable access levels", () => {
    const parsed = updateApplicationUserSchema.parse({
      fullName: "Jane Doe",
      email: "jane@caliber.app",
      systemRoles: ["hr_admin", "executive"],
    });
    expect(parsed.systemRoles).toEqual(["hr_admin", "executive"]);
    expect(parsed.password).toBeUndefined();
  });

  it("can never grant super_admin or staff roles through a request", () => {
    for (const role of ["super_admin", "employee", "line_manager", "system"]) {
      expect(() =>
        updateApplicationUserSchema.parse({
          fullName: "X",
          email: "x@caliber.app",
          systemRoles: [role],
        }),
      ).toThrow();
      expect(() =>
        createApplicationUserSchema.parse({
          fullName: "X",
          email: "x@caliber.app",
          password: "longenough",
          systemRoles: [role],
        }),
      ).toThrow();
    }
  });

  it("requires at least one access level", () => {
    expect(() =>
      updateApplicationUserSchema.parse({
        fullName: "X",
        email: "x@caliber.app",
        systemRoles: [],
      }),
    ).toThrow();
  });

  it("rejects short reset passwords but allows omitting one", () => {
    const base = {
      fullName: "X",
      email: "x@caliber.app",
      systemRoles: ["hr_admin"],
    };
    expect(() =>
      updateApplicationUserSchema.parse({ ...base, password: "short" }),
    ).toThrow();
    expect(
      updateApplicationUserSchema.parse({ ...base, password: "longenough" })
        .password,
    ).toBe("longenough");
  });
});
