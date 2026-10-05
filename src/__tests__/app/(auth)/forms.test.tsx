import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const loginUser = vi.fn();
const registerUser = vi.fn();
vi.mock("@/app/actions/auth", () => ({
  loginUser: (fd: FormData) => loginUser(fd),
  registerUser: (fd: FormData) => registerUser(fd),
}));

import { LoginForm } from "@/app/(auth)/login/LoginForm";
import { RegisterForm } from "@/app/(auth)/register/RegisterForm";

describe("LoginForm", () => {
  it("announces a sign-in error as an alert", async () => {
    loginUser.mockResolvedValueOnce({ error: "Invalid email or password" });
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText(/email address/i), "a@b.co");
    await user.type(screen.getByLabelText(/password/i), "secret123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
  });

  it("does not render a fake, non-functional 'Forgot password?' control", () => {
    render(<LoginForm />);
    expect(screen.queryByText(/forgot password/i)).not.toBeInTheDocument();
  });
});

describe("RegisterForm", () => {
  it("announces a registration error as an alert", async () => {
    registerUser.mockResolvedValueOnce({ error: "Could not create account" });
    const user = userEvent.setup();
    render(<RegisterForm />);
    await user.click(screen.getByRole("button", { name: /event coordinator/i }));
    await user.type(screen.getByLabelText(/full name/i), "Thandi M");
    await user.type(screen.getByLabelText(/email address/i), "t@b.co");
    await user.type(screen.getByLabelText(/^password/i), "longenough1");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not create account");
  });
});
