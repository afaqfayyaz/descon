import { describe, it, expect } from "vitest";
import { rollupArea, rollupOverall } from "./rollup";

describe("rollupArea", () => {
  it("averages manager and required levels and derives the gap", () => {
    const area = rollupArea([
      { managerLevel: 4, requiredLevel: 5 },
      { managerLevel: 2, requiredLevel: 4 },
    ]);
    expect(area).not.toBeNull();
    expect(area!.managerLevel).toBe(3);
    expect(area!.requiredLevel).toBe(4.5);
    expect(area!.gap).toBe(1.5);
    expect(area!.trafficLight).toBe("needs_focus");
  });

  it("ignores unscored sub-competencies", () => {
    const area = rollupArea([
      { managerLevel: null, requiredLevel: 5 },
      { managerLevel: 5, requiredLevel: 5 },
    ]);
    expect(area!.managerLevel).toBe(5);
    expect(area!.gap).toBe(0);
    expect(area!.trafficLight).toBe("strong");
  });

  it("returns null with no scorable results", () => {
    expect(rollupArea([{ managerLevel: null, requiredLevel: 3 }])).toBeNull();
  });
});

describe("rollupOverall", () => {
  it("computes a weighted overall capability", () => {
    const overall = rollupOverall([
      { managerLevel: 4, requiredLevel: 5, weight: 1 },
      { managerLevel: 2, requiredLevel: 4, weight: 1 },
    ]);
    expect(overall!.managerLevel).toBe(3);
    expect(overall!.capabilityPercent).toBe(60);
    expect(overall!.gap).toBe(1.5);
  });

  it("respects non-uniform weights", () => {
    const overall = rollupOverall([
      { managerLevel: 5, requiredLevel: 5, weight: 3 },
      { managerLevel: 1, requiredLevel: 5, weight: 1 },
    ]);
    // (5*3 + 1*1) / 4 = 4
    expect(overall!.managerLevel).toBe(4);
  });
});
