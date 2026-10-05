import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PayoutDetailsForm } from "@/components/payments/PayoutDetailsForm";

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

describe("PayoutDetailsForm", () => {
  it("labels the bank and account type selects", () => {
    render(<PayoutDetailsForm existing={null} onSave={vi.fn()} />);

    expect(screen.getByLabelText("Bank").tagName).toBe("SELECT");
    expect(screen.getByLabelText("Account type").tagName).toBe("SELECT");
  });

  it("disables saving while the action runs and shows its error", async () => {
    let resolve: (value: { error: string }) => void = () => {};
    const onSave = vi.fn(
      () => new Promise<{ error: string }>((r) => {
        resolve = r;
      })
    );

    render(<PayoutDetailsForm existing={null} onSave={onSave} />);

    await userEvent.type(screen.getByLabelText("Account holder"), "T Speaker");
    await userEvent.selectOptions(screen.getByLabelText("Bank"), "FNB");
    await userEvent.type(screen.getByLabelText("Account number"), "62000000001");
    await userEvent.type(screen.getByLabelText("Branch code"), "250655");

    const save = screen.getByRole("button", { name: /save payout details/i });
    await userEvent.click(save);
    expect(save).toBeDisabled();

    resolve({ error: "Could not save your payout details. Please try again." });
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not save/i);
  });
});
