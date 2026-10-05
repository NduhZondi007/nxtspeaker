import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CalendarCheck } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";

describe("StatCard", () => {
  it("renders the label above the value", () => {
    render(<StatCard label="Active Bookings" value="3" icon={CalendarCheck} color="#629DAB" />);

    const label = screen.getByText("Active Bookings");
    const value = screen.getByText("3");
    expect(label.compareDocumentPosition(value) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("draws a solid top rule in the stat colour", () => {
    const { container } = render(
      <StatCard label="Events Completed" value="1" icon={CalendarCheck} color="#629DAB" />
    );

    expect(container.firstElementChild).toHaveStyle({ borderTopColor: "#629DAB" });
  });

  it("tints the icon with the stat colour", () => {
    const { container } = render(
      <StatCard label="Events Completed" value="1" icon={CalendarCheck} color="#629DAB" />
    );

    expect(container.querySelector("svg")).toHaveStyle({ color: "#629DAB" });
  });

  it("sets plain counts in Archivo", () => {
    render(<StatCard label="Speakers Available" value="184" icon={CalendarCheck} color="#629DAB" />);

    expect(screen.getByText("184")).toHaveClass("font-archivo");
  });

  // docs/DESIGN.md → Financial surfaces: money values are always Space Mono.
  it("sets money values in Space Mono", () => {
    render(<StatCard label="Total Spent" value="R 64 000" icon={CalendarCheck} color="#031E57" money />);

    const value = screen.getByText("R 64 000");
    expect(value).toHaveClass("font-space-mono");
    expect(value).not.toHaveClass("font-archivo");
  });
});
