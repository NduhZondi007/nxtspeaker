import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PaymentPanel } from "@/components/payments/PaymentPanel";

const BOOKING_ID = "33333333-3333-4333-8333-333333333333";

describe("PaymentPanel", () => {
  it("shows a review notice and no pay button while a payment is under review", () => {
    render(
      <PaymentPanel
        bookingId={BOOKING_ID}
        grossCents={8_500_000}
        paymentStatus="NEEDS_REVIEW"
        isPaid={false}
        onPay={vi.fn()}
      />
    );

    expect(screen.getByText(/being reviewed/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /pay/i })).not.toBeInTheDocument();
  });

  it("shows the pay button for a booking awaiting payment", () => {
    render(
      <PaymentPanel
        bookingId={BOOKING_ID}
        grossCents={8_500_000}
        paymentStatus={null}
        isPaid={false}
        onPay={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /pay/i })).toBeEnabled();
  });

  it("disables the pay button while the action runs and shows its error", async () => {
    let resolve: (value: { error: string }) => void = () => {};
    const onPay = vi.fn(
      () => new Promise<{ error: string }>((r) => {
        resolve = r;
      })
    );

    render(
      <PaymentPanel
        bookingId={BOOKING_ID}
        grossCents={8_500_000}
        paymentStatus={null}
        isPaid={false}
        onPay={onPay}
      />
    );

    const button = screen.getByRole("button", { name: /pay/i });
    await userEvent.click(button);
    expect(button).toBeDisabled();

    resolve({ error: "Payments are temporarily unavailable." });
    expect(await screen.findByRole("alert")).toHaveTextContent(/temporarily unavailable/);
  });
});
