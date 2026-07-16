import { describe, it, expect } from "vitest";
import { calculateDifference, getCalibrationFlag } from "./calibration";

describe("calculateDifference", () => {
  it("is positive when the employee over-rates themselves", () => {
    expect(calculateDifference(4, 2)).toBe(2);
  });
  it("is negative when the employee under-rates themselves", () => {
    expect(calculateDifference(2, 4)).toBe(-2);
  });
});

describe("getCalibrationFlag", () => {
  it.each([
    [0, "none"],
    [1, "none"],
    [-1, "none"],
    [1.5, "minor_outlier"],
    [2, "minor_outlier"],
    [-2, "minor_outlier"],
    [2.5, "major_outlier"],
    [-3, "major_outlier"],
  ])("difference %s → %s", (diff, expected) => {
    expect(getCalibrationFlag(diff as number)).toBe(expected);
  });
});
