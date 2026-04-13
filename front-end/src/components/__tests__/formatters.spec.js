import { describe, expect, it } from "vitest";
import { dayLabels, formatStatus } from "@/utils/formatters";

describe("formatters", () => {
  it("formats underscored statuses for staff presentation", () => {
    expect(formatStatus("no_show")).toBe("no show");
    expect(formatStatus("confirmed")).toBe("confirmed");
  });

  it("keeps the Kaya weekday labels stable", () => {
    expect(dayLabels).toHaveLength(7);
    expect(dayLabels[0]).toBe("Sunday");
    expect(dayLabels[6]).toBe("Saturday");
  });
});
