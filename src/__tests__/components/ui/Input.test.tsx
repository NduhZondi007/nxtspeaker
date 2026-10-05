import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Input, Textarea } from "@/components/ui/Input";

describe("Input", () => {
  it("gives two inputs with the same label distinct ids", () => {
    render(
      <>
        <Input label="Email" />
        <Input label="Email" />
      </>
    );
    const [a, b] = screen.getAllByLabelText("Email");
    expect(a.id).toBeTruthy();
    expect(a.id).not.toBe(b.id);
  });

  it("keeps a caller-supplied id", () => {
    render(<Input label="Email" id="custom" />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("id", "custom");
  });

  it("marks the input invalid and describes it by the error", () => {
    render(<Input label="Email" error="Enter a valid email" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Enter a valid email");
  });

  it("describes the input by its hint when there is no error", () => {
    render(<Input label="Fee" hint="In rand" />);
    const input = screen.getByLabelText("Fee");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).toHaveAccessibleDescription("In rand");
  });

  it("preserves a caller aria-describedby alongside the error", () => {
    render(
      <>
        <p id="extra">Extra</p>
        <Input label="Email" error="Bad" aria-describedby="extra" />
      </>
    );
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription("Extra Bad");
  });
});

describe("Textarea", () => {
  it("marks the textarea invalid and describes it by the error", () => {
    render(<Textarea label="Bio" error="Too short" />);
    const t = screen.getByLabelText("Bio");
    expect(t).toHaveAttribute("aria-invalid", "true");
    expect(t).toHaveAccessibleDescription("Too short");
  });
});
