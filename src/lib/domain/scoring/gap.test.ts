import { describe, it, expect } from "vitest";
import { calculateGap, getTrafficLight } from "./gap";

describe("calculateGap", () => {
  it("is positive when below the required level", () => {
    expect(calculateGap(4, 2.5)).toBe(1.5);
  });

  it("is negative when exceeding the required level", () => {
    expect(calculateGap(3, 4)).toBe(-1);
  });
});

describe("getTrafficLight", () => {
  it.each([
    [-1, "strong"],
    [0, "strong"],
    [0.5, "developing"],
    [1, "developing"],
    [1.5, "needs_focus"],
    [2, "needs_focus"],
    [2.5, "critical"],
    [4, "critical"],
  ])("gap %s → %s", (gap, expected) => {
    expect(getTrafficLight(gap as number)).toBe(expected);
  });
});
