import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { cancelBooking } = vi.hoisted(() => ({ cancelBooking: vi.fn() }));
vi.mock("@/app/actions/bookings", () => ({ cancelBooking }));

import { CancelBookingButton } from "@/components/bookings/CancelBookingButton";

beforeEach(() => cancelBooking.mockReset());

describe("CancelBookingButton", () => {
  it("only cancels after an explicit confirmation, passing the reason", async () => {
    const user = userEvent.setup();
    cancelBooking.mockResolvedValue({ data: {} });
    render(<CancelBookingButton bookingId="b1" />);

    await user.click(screen.getByRole("button", { name: /cancel request/i }));
    expect(cancelBooking).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/reason/i), "Venue fell through");
    await user.click(screen.getByRole("button", { name: /yes, cancel/i }));

    await waitFor(() => expect(cancelBooking).toHaveBeenCalledWith("b1", "Venue fell through"));
  });

  it("shows the server's error", async () => {
    const user = userEvent.setup();
    cancelBooking.mockResolvedValue({ error: "A paid booking cannot be cancelled" });
    render(<CancelBookingButton bookingId="b1" />);

    await user.click(screen.getByRole("button", { name: /cancel request/i }));
    await user.click(screen.getByRole("button", { name: /yes, cancel/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("A paid booking cannot be cancelled");
  });
});
