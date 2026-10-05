import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/app/actions/auth", () => ({ logoutUser: vi.fn() }));

import { ErrorState } from "@/components/layout/ErrorState";

describe("ErrorState", () => {
  it("announces the failure and offers a retry that calls reset", async () => {
    const reset = vi.fn();
    render(<ErrorState error={Object.assign(new Error("x"), { digest: "abc123" })} reset={reset} homeHref="/client/dashboard" />);

    expect(screen.getByRole("alert")).toHaveTextContent(/something went wrong/i);
    await userEvent.setup().click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it("shows the error reference so support can find the server log", () => {
    render(<ErrorState error={Object.assign(new Error("x"), { digest: "abc123" })} reset={vi.fn()} homeHref="/" />);
    expect(screen.getByText(/abc123/)).toBeInTheDocument();
  });

  it("offers a way home and a way to sign out", () => {
    render(<ErrorState error={new Error("x")} reset={vi.fn()} homeHref="/speaker/dashboard" />);
    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute("href", "/speaker/dashboard");
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  it("does not render the raw error message, which can carry server internals", () => {
    render(<ErrorState error={new Error('relation "profiles" does not exist')} reset={vi.fn()} homeHref="/" />);
    expect(screen.queryByText(/relation "profiles"/)).not.toBeInTheDocument();
  });
});
