import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "@/components/ui/Modal";

function Harness({ title, ariaLabel }: { title?: string; ariaLabel?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>open-modal</button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} ariaLabel={ariaLabel}>
        <button>first-action</button>
        <button>last-action</button>
      </Modal>
    </>
  );
}

describe("Modal", () => {
  it("is a modal dialog labelled by its title", async () => {
    const user = userEvent.setup();
    render(<Harness title="Record an EFT payout" />);
    await user.click(screen.getByText("open-modal"));

    const dialog = screen.getByRole("dialog", { name: "Record an EFT payout" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("uses ariaLabel when there is no visible title", async () => {
    const user = userEvent.setup();
    render(<Harness ariaLabel="Speaker profile" />);
    await user.click(screen.getByText("open-modal"));

    expect(screen.getByRole("dialog", { name: "Speaker profile" })).toBeInTheDocument();
  });

  it("gives the icon-only close button an accessible name", async () => {
    const user = userEvent.setup();
    render(<Harness title="T" />);
    await user.click(screen.getByText("open-modal"));
    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
  });

  it("moves focus into the dialog when it opens", async () => {
    const user = userEvent.setup();
    render(<Harness title="T" />);
    await user.click(screen.getByText("open-modal"));
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);
  });

  it("traps Tab and Shift+Tab inside the dialog", async () => {
    const user = userEvent.setup();
    render(<Harness title="T" />);
    await user.click(screen.getByText("open-modal"));
    const dialog = screen.getByRole("dialog");

    screen.getByText("last-action").focus();
    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /close/i }));

    await user.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByText("last-action"));
  });

  it("closes on Escape and returns focus to the element that opened it", async () => {
    const user = userEvent.setup();
    render(<Harness title="T" />);
    const trigger = screen.getByText("open-modal");
    await user.click(trigger);

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it("leaves Escape alone when a nested layer already handled it", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="T">
        <div
          data-testid="inner"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === "Escape") e.preventDefault();
          }}
        />
      </Modal>
    );
    fireEvent.keyDown(screen.getByTestId("inner"), { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });
});
