import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { adminSearchUsers, adminCreateSpeaker } = vi.hoisted(() => ({
  adminSearchUsers: vi.fn(),
  adminCreateSpeaker: vi.fn(),
}));
vi.mock("@/app/actions/admin", () => ({ adminSearchUsers, adminCreateSpeaker }));

import { AddSpeakerModal } from "@/components/admin/AddSpeakerModal";

beforeEach(() => {
  adminSearchUsers.mockReset();
  adminCreateSpeaker.mockReset();
});

async function goToProfileStep() {
  const user = userEvent.setup();
  adminSearchUsers.mockResolvedValue({
    data: [{ id: "u1", full_name: "Thandi M", email: "t@example.com", role: "CLIENT" }],
    error: null,
  });
  render(<AddSpeakerModal onClose={() => {}} />);
  await user.type(screen.getByLabelText(/search users/i), "thandi");
  await user.click(screen.getByRole("button", { name: /search/i }));
  await user.click(await screen.findByRole("button", { name: /thandi m/i }));
  return user;
}

describe("AddSpeakerModal", () => {
  it("is a labelled modal dialog", () => {
    render(<AddSpeakerModal onClose={() => {}} />);
    const dialog = screen.getByRole("dialog", { name: /add speaker/i });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("closes on Escape and via a labelled close button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AddSpeakerModal onClose={onClose} />);

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("labels every profile input", async () => {
    await goToProfileStep();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/speaking fee/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/level/i)).toBeInTheDocument();
  });

  it("announces a submit error", async () => {
    const user = await goToProfileStep();
    adminCreateSpeaker.mockResolvedValue({ error: "Speaking fee cannot be negative" });
    await user.type(screen.getByLabelText(/title/i), "Coach");
    await user.type(screen.getByLabelText(/speaking fee/i), "100");
    await user.click(screen.getByRole("button", { name: /create speaker/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Speaking fee cannot be negative");
  });
});
