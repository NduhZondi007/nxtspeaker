import { describe, it, expect } from "vitest";
import { useEffect, useRef } from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "@/components/ui/Toast";

function Fire() {
  const t = useToast();
  return <button onClick={() => t.success("Saved", "All good")}>fire</button>;
}

describe("ToastProvider", () => {
  it("renders toasts inside a polite live region", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Fire />
      </ToastProvider>
    );
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    await user.click(screen.getByText("fire"));
    expect(region).toHaveTextContent("Saved");
  });

  it("gives the dismiss button an accessible name and removes the toast", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Fire />
      </ToastProvider>
    );
    await user.click(screen.getByText("fire"));
    await user.click(screen.getByRole("button", { name: /dismiss notification/i }));
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  });

  it("does not re-render consumers when a toast is shown", async () => {
    const seen: ReturnType<typeof useToast>[] = [];
    function Probe() {
      const t = useToast();
      const first = useRef(true);
      useEffect(() => {
        if (first.current) {
          first.current = false;
          t.info("Hello");
        }
      }, [t]);
      seen.push(t);
      return null;
    }
    render(
      <ToastProvider>
        <Probe />
      </ToastProvider>
    );
    await act(async () => {});
    expect(screen.getByText("Hello")).toBeInTheDocument();
    // An unmemoised value object would change identity and re-render Probe.
    expect(seen).toHaveLength(1);
  });
});
