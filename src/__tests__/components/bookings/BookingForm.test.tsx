import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookingForm } from "@/components/bookings/BookingForm";
import { addDaysISO, todayInSAST } from "@/lib/utils/booking";
import type { SpeakerProfile } from "@/lib/types/database";

const speaker = { id: "s1", speaking_fee_zar: 1000, profiles: { full_name: "Thandi" } } as unknown as SpeakerProfile;

function renderForm() {
  return render(
    <BookingForm speaker={speaker} rider={null} clientProfile={null} onSubmit={async () => {}} onCancel={() => {}} />
  );
}

describe("BookingForm", () => {
  it("offers tomorrow in SAST as the earliest event date", () => {
    renderForm();
    expect(screen.getByLabelText(/event date/i)).toHaveAttribute("min", addDaysISO(todayInSAST(), 1));
  });

  it("labels the event format select", () => {
    renderForm();
    expect(screen.getByLabelText(/event format/i).tagName).toBe("SELECT");
  });

  it("announces validation errors", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/fix/i);
  });
});
