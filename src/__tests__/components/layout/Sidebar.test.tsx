import { describe, it, expect, vi } from "vitest";
import { useEffect } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({ usePathname: () => "/speaker/bookings/123" }));
vi.mock("@/app/actions/auth", () => ({ logoutUser: vi.fn() }));

import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { SidebarProvider, useSidebar } from "@/components/layout/SidebarContext";

function Shell() {
  return (
    <SidebarProvider>
      <TopBar title="Bookings" />
      <Sidebar role="SPEAKER" userName="Thandi" />
    </SidebarProvider>
  );
}

function drawer(): HTMLElement {
  return screen.getByRole("navigation", { name: /main/i, hidden: true }).closest("aside") as HTMLElement;
}

describe("Sidebar", () => {
  it("marks the active route with aria-current=page", () => {
    render(<Shell />);
    const active = screen.getByRole("link", { name: /my bookings/i, hidden: true });
    expect(active).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /my profile/i, hidden: true })).not.toHaveAttribute("aria-current");
  });

  it("hides the closed mobile drawer from focus and assistive tech", () => {
    render(<Shell />);
    expect(drawer().className).toContain("max-md:invisible");
  });

  it("focuses the first nav link on open and closes on Escape, returning focus", async () => {
    const user = userEvent.setup();
    render(<Shell />);
    const menu = screen.getByRole("button", { name: /open menu/i });
    await user.click(menu);

    expect(drawer().className).not.toContain("max-md:invisible");
    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(drawer().className).toContain("max-md:invisible");
    expect(menu).toHaveFocus();
  });

  it("has no inert notification bell in the top bar", () => {
    render(<Shell />);
    const buttons = screen.getAllByRole("button");
    for (const b of buttons) expect(b).toHaveAccessibleName();
  });
});

describe("SidebarProvider", () => {
  it("keeps open/close identities stable across state changes", async () => {
    const user = userEvent.setup();
    const opens = new Set<unknown>();
    function Probe({ record }: { record: (fn: unknown) => void }) {
      const { isOpen, open, close } = useSidebar();
      useEffect(() => {
        record(open);
      });
      return (
        <>
          <span>{isOpen ? "is-open" : "is-closed"}</span>
          <button onClick={open}>do-open</button>
          <button onClick={close}>do-close</button>
        </>
      );
    }
    render(
      <SidebarProvider>
        <Probe record={(fn) => opens.add(fn)} />
      </SidebarProvider>
    );
    await user.click(screen.getByText("do-open"));
    expect(screen.getByText("is-open")).toBeInTheDocument();
    await user.click(screen.getByText("do-close"));
    expect(screen.getByText("is-closed")).toBeInTheDocument();
    expect(opens.size).toBe(1);
  });
});
