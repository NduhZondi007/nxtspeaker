import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Pagination, pageRange, parsePage } from "@/components/bookings/Pagination";

describe("parsePage", () => {
  it("defaults to page 1 for missing or junk input", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("-3")).toBe(1);
    expect(parsePage("2.5")).toBe(1);
  });

  it("parses a positive integer", () => {
    expect(parsePage("3")).toBe(3);
  });
});

describe("pageRange", () => {
  it("returns the inclusive row range for .range()", () => {
    expect(pageRange(1, 20)).toEqual([0, 19]);
    expect(pageRange(3, 20)).toEqual([40, 59]);
  });
});

describe("Pagination", () => {
  it("renders nothing when everything fits on one page", () => {
    const { container } = render(<Pagination page={1} pageSize={20} total={5} hrefFor={(p) => `/x?page=${p}`} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("links to the neighbouring pages and marks the current one", () => {
    render(<Pagination page={2} pageSize={20} total={55} hrefFor={(p) => `/x?page=${p}`} />);
    expect(screen.getByRole("link", { name: /previous/i })).toHaveAttribute("href", "/x?page=1");
    expect(screen.getByRole("link", { name: /next/i })).toHaveAttribute("href", "/x?page=3");
    expect(screen.getByText(/page 2 of 3/i)).toHaveAttribute("aria-current", "page");
  });

  it("omits next on the last page", () => {
    render(<Pagination page={3} pageSize={20} total={55} hrefFor={(p) => `/x?page=${p}`} />);
    expect(screen.queryByRole("link", { name: /next/i })).not.toBeInTheDocument();
  });
});
