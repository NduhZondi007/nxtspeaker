import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActionButton } from "@/components/ui/ActionButton";

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe("ActionButton", () => {
  it("disables itself and reports busy while the action runs", async () => {
    const user = userEvent.setup();
    const d = deferred<{ data: true }>();
    render(<ActionButton action={() => d.promise}>Accept</ActionButton>);

    await user.click(screen.getByRole("button", { name: /accept/i }));
    const button = screen.getByRole("button", { name: /accept/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");

    d.resolve({ data: true });
    await waitFor(() => expect(screen.getByRole("button", { name: /accept/i })).not.toBeDisabled());
  });

  it("shows the action's error in an alert instead of discarding it", async () => {
    const user = userEvent.setup();
    render(
      <ActionButton action={async () => ({ error: "Cannot change a paid booking" })}>Cancel</ActionButton>
    );

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Cannot change a paid booking");
  });

  it("asks for confirmation before running a destructive action", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({ data: true }));
    render(
      <ActionButton action={action} confirm={{ message: "Revoke admin access?", confirmLabel: "Yes, revoke" }}>
        Revoke
      </ActionButton>
    );

    await user.click(screen.getByRole("button", { name: "Revoke" }));
    expect(action).not.toHaveBeenCalled();
    expect(screen.getByText("Revoke admin access?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /keep/i }));
    expect(screen.queryByText("Revoke admin access?")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Revoke" }));
    await user.click(screen.getByRole("button", { name: "Yes, revoke" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
  });

  it("reports a thrown action as a generic error", async () => {
    const user = userEvent.setup();
    render(
      <ActionButton action={async () => { throw new Error("network"); }}>Go</ActionButton>
    );
    await user.click(screen.getByRole("button", { name: /go/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/something went wrong/i);
  });
});
