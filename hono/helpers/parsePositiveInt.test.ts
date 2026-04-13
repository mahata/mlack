import { describe, expect, it } from "vitest";
import { parsePositiveInt } from "./parsePositiveInt.js";

describe("parsePositiveInt", () => {
  it("should parse valid positive integers", () => {
    expect(parsePositiveInt("1")).toBe(1);
    expect(parsePositiveInt("42")).toBe(42);
    expect(parsePositiveInt("100")).toBe(100);
  });

  it("should return null for non-numeric strings", () => {
    expect(parsePositiveInt("abc")).toBeNull();
    expect(parsePositiveInt("")).toBeNull();
    expect(parsePositiveInt(undefined)).toBeNull();
    expect(parsePositiveInt(null)).toBeNull();
  });

  it("should return null for zero and negative numbers", () => {
    expect(parsePositiveInt("0")).toBeNull();
    expect(parsePositiveInt("-1")).toBeNull();
    expect(parsePositiveInt("-100")).toBeNull();
  });

  it("should return null for floating point numbers", () => {
    expect(parsePositiveInt("1.5")).toBeNull();
    expect(parsePositiveInt("3.14")).toBeNull();
  });

  it("should handle numeric inputs directly", () => {
    expect(parsePositiveInt(5)).toBe(5);
    expect(parsePositiveInt(0)).toBeNull();
    expect(parsePositiveInt(-3)).toBeNull();
    expect(parsePositiveInt(1.7)).toBeNull();
  });
});
