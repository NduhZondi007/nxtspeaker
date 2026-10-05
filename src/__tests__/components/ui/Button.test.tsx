import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button, buttonClasses } from "@/components/ui/Button";

describe("buttonClasses", () => {
  it("returns the same classes a Button renders, so a Link can look like one", () => {
    render(<Button variant="gold" size="sm">Go</Button>);
    const rendered = screen.getByRole("button").className;
    for (const cls of buttonClasses({ variant: "gold", size: "sm" }).split(" ").filter(Boolean)) {
      expect(rendered).toContain(cls);
    }
  });

  it("appends extra classes", () => {
    expect(buttonClasses({ variant: "outline", className: "w-full" })).toContain("w-full");
  });

  it("uses design tokens rather than hard-coded hover hex values", () => {
    expect(buttonClasses({ variant: "primary" })).not.toMatch(/#[0-9a-f]{6}/i);
    expect(buttonClasses({ variant: "soft" })).not.toMatch(/#[0-9a-f]{6}/i);
  });
});
