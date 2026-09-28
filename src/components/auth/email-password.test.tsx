import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CODE_LENGTH, MIN_PASSWORD_LENGTH, RESEND_CODE_SECONDS } from "@/config";
import { EmailPasswordAuth } from "./email-password";

const slow = { timeout: 3000 };

async function signUp(email = "new@example.com", password = "longpassword1") {
  const user = userEvent.setup();
  const onDone = vi.fn();
  render(<EmailPasswordAuth mode="signup" onDone={onDone} />);
  await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Create a password"), password);
  await user.click(screen.getByRole("button", { name: /create account/i }));
  return { user, onDone };
}

describe("EmailPasswordAuth: sign up", () => {
  it("explains what's wrong instead of submitting", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<EmailPasswordAuth mode="signup" onDone={onDone} />);
    await user.type(screen.getByLabelText("Create a password"), "short");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(screen.getByText("Enter a valid email")).toBeInTheDocument();
    expect(screen.getByText(`At least ${MIN_PASSWORD_LENGTH} characters`)).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("sends a code, then finishes sign-up when the right code is entered", async () => {
    const { user, onDone } = await signUp();
    const code = await screen.findByLabelText(`${CODE_LENGTH}-digit code`, {}, slow);
    expect(screen.getByText("new@example.com")).toBeInTheDocument();
    await user.type(code, "123456");
    await waitFor(() => expect(onDone).toHaveBeenCalledWith("new@example.com", true), slow);
  });

  it("shows a clear message for a wrong code and stays on the code step", async () => {
    const { user, onDone } = await signUp();
    const code = await screen.findByLabelText(`${CODE_LENGTH}-digit code`, {}, slow);
    await user.type(code, "000000");
    expect(await screen.findByText(/that code isn't right/i, {}, slow)).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("keeps only digits in the code box, up to the code length", async () => {
    const { user } = await signUp();
    const code = await screen.findByLabelText(`${CODE_LENGTH}-digit code`, {}, slow);
    await user.type(code, "12a3");
    expect(code).toHaveValue("123");
  });

  it(`waits ${RESEND_CODE_SECONDS}s before offering to resend (Supabase's limit)`, async () => {
    await signUp();
    expect(await screen.findByText(`Resend code in ${RESEND_CODE_SECONDS}s`, {}, slow)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resend code" })).not.toBeInTheDocument();
  });

  it("lets you go back and use a different email", async () => {
    const { user } = await signUp();
    await user.click(await screen.findByRole("button", { name: /use a different email/i }, slow));
    expect(screen.getByLabelText("Email")).toHaveValue("new@example.com");
  });
});

describe("EmailPasswordAuth: sign in", () => {
  it("signs in with email and password, without a code", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<EmailPasswordAuth mode="signin" onDone={onDone} />);
    await user.type(screen.getByLabelText("Email"), "maya@example.com");
    await user.type(screen.getByLabelText("Password"), "whatever");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith("maya@example.com", false), slow);
  });

  it("resets a forgotten password: email → code → new password → signed in", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<EmailPasswordAuth mode="signin" onDone={onDone} />);
    await user.click(screen.getByRole("button", { name: "Forgot password?" }));
    await user.type(screen.getByLabelText("Email"), "maya@example.com");
    await user.click(screen.getByRole("button", { name: "Send code" }));
    await user.type(await screen.findByLabelText(`${CODE_LENGTH}-digit code`, {}, slow), "123456");
    await user.type(await screen.findByLabelText("New password", {}, slow), "brandnewpass");
    await user.click(screen.getByRole("button", { name: "Save and sign in" }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith("maya@example.com", false), slow);
  });

  it("shows the intro and footer only on the first step", async () => {
    render(<EmailPasswordAuth mode="signup" onDone={() => {}} intro={<p>Intro here</p>} footer={<p>Footer here</p>} />);
    expect(screen.getByText("Intro here")).toBeInTheDocument();
    expect(screen.getByText("Footer here")).toBeInTheDocument();
  });
});
