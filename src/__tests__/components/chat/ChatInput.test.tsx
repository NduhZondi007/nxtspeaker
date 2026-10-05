import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatInput, type SendResult } from "@/components/chat/ChatInput";

const mockError = vi.fn();

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ error: mockError }),
}));

/** A promise the test resolves by hand, to hold a send "in flight". */
function deferred() {
  let resolve!: (r: SendResult) => void;
  const promise = new Promise<SendResult>((r) => { resolve = r; });
  return { promise, resolve };
}

describe("ChatInput", () => {
  it("clears the box immediately and keeps it enabled and focused while sending", async () => {
    const user = userEvent.setup();
    const pending = deferred();
    render(<ChatInput onSend={() => pending.promise} />);

    const box = screen.getByRole("textbox");
    await user.type(box, "Hello{Enter}");

    expect(box).toHaveValue("");
    expect(box).toBeEnabled();
    expect(box).toHaveFocus();
    pending.resolve({});
  });

  it("disables the send button while a send is pending", async () => {
    const user = userEvent.setup();
    const pending = deferred();
    render(<ChatInput onSend={() => pending.promise} />);

    const box = screen.getByRole("textbox");
    await user.type(box, "Hello{Enter}");
    await user.type(box, "Second");

    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
    pending.resolve({});
  });

  it("restores the text and shows a toast when the send fails", async () => {
    const user = userEvent.setup();
    render(<ChatInput onSend={async () => ({ error: "Chat is not available" })} />);

    const box = screen.getByRole("textbox");
    await user.type(box, "Hello{Enter}");

    expect(await screen.findByDisplayValue("Hello")).toBe(box);
    expect(mockError).toHaveBeenCalledWith("Message not sent", "Chat is not available");
  });

  it("does not overwrite text typed while a failed send was in flight", async () => {
    const user = userEvent.setup();
    const pending = deferred();
    render(<ChatInput onSend={() => pending.promise} />);

    const box = screen.getByRole("textbox");
    await user.type(box, "First{Enter}");
    await user.type(box, "Second");
    pending.resolve({ error: "Network" });

    await vi.waitFor(() => expect(mockError).toHaveBeenCalledWith("Message not sent", "Network"));
    expect(box).toHaveValue("Second");
  });
});
