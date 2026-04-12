import { describe, expect, test } from "bun:test";

import {
  comparisonColumnSchema,
  loglassNormalizedRowArraySchema,
  loglassRawRowArraySchema,
} from "./schema";
import {
  loglassLargeFixture,
  loglassLargeRawFixture,
} from "../fixtures/loglass-large";
import {
  loglassSmallFixture,
  loglassSmallRawFixture,
} from "../fixtures/loglass-small";

describe("loglass schema contract", () => {
  test("small fixtures satisfy raw and normalized schemas", () => {
    expect(loglassRawRowArraySchema.parse(loglassSmallRawFixture)).toHaveLength(
      loglassSmallRawFixture.length,
    );
    expect(loglassNormalizedRowArraySchema.parse(loglassSmallFixture)).toHaveLength(
      loglassSmallFixture.length,
    );
  });

  test("large fixtures stay deterministic and representative", () => {
    expect(loglassLargeRawFixture.length).toBeGreaterThan(5_000);
    expect(loglassLargeFixture.length).toBe(loglassLargeRawFixture.length);

    expect(loglassRawRowArraySchema.parse(loglassLargeRawFixture)).toHaveLength(
      loglassLargeRawFixture.length,
    );
    expect(loglassNormalizedRowArraySchema.parse(loglassLargeFixture)).toHaveLength(
      loglassLargeFixture.length,
    );
  });

  test("normalized row keys are unique inside each fixture", () => {
    const smallKeys = new Set(loglassSmallFixture.map((row) => row.rowKey));
    const largeKeys = new Set(loglassLargeFixture.map((row) => row.rowKey));

    expect(smallKeys.size).toBe(loglassSmallFixture.length);
    expect(largeKeys.size).toBe(loglassLargeFixture.length);
  });

  test("comparison grammar remains explicit", () => {
    expect(
      comparisonColumnSchema.array().parse(["A", "B", "B-A", "C", "B-C"]),
    ).toEqual(["A", "B", "B-A", "C", "B-C"]);
  });
});
