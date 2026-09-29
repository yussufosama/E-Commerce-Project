import React, { useState } from "react";
import { api } from "../api.js";
import { Modal, Field, Feedback } from "./Shared.jsx";

export function Account({
  user,
  initialMode = "login",
  recovery,
  close,
  onUser,
}) {
  const [mode, setMode] = useState(recovery?.mode || initialMode);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  function switchMode(next) {
    setMode(next);
    setError("");
    setMessage("");
  }
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const body = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (mode === "login") {
        onUser((await api("/users/login", { method: "POST", body })).user);
        close();
      } else if (mode === "register") {
        await api("/users/register", { method: "POST", body });
        setMode("verify");
        setMessage(
          "Account request received. Request a verification link to finish setting up your account.",
        );
      } else if (mode === "forgot" || mode === "verify") {
        const result = await api(
          `/users/${mode === "forgot" ? "forgot-password" : "request-verification"}`,
          { method: "POST", body },
        );
        setMessage(result.message);
      } else if (mode === "reset" || mode === "verify-complete") {
        await api(
          `/users/${mode === "reset" ? "reset-password" : "verify-email"}`,
          {
            method: "POST",
            body: { token: recovery.token, newPassword: body.newPassword },
          },
        );
        onUser(null);
        setMode("login");
        setMessage("Password saved. You can now sign in.");
      } else if (mode === "change") {
        await api("/users/change-password", { method: "POST", body });
        onUser(null);
        setMode("login");
        setMessage("Password changed. Sign in again.");
      }
    } catch (error) {
      setError(
        error.status === 503
          ? "Account email service is not ready yet. Please try again once the store opens."
          : error.message,
      );
    } finally {
      setBusy(false);
    }
  }
  async function logout(all = false) {
    setBusy(true);
    setError("");
    try {
      await api(`/users/${all ? "logout-all" : "logout"}`, {
        method: "POST",
        body: {},
      });
      onUser(null);
      close();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  const titles = {
    login: "WELCOME BACK.",
    register: "JOIN THE ROLL.",
    forgot: "FORGOT YOUR PASSWORD?",
    verify: "VERIFY YOUR EMAIL.",
    reset: "A FRESH START.",
    "verify-complete": "MAKE IT YOURS.",
    change: "CHANGE PASSWORD.",
  };
  return (
    <Modal title="ACCOUNT" close={close}>
      <h2>{user && mode === "login" ? `HEY, ${user.name}.` : titles[mode]}</h2>
      {user && mode === "login" ? (
        <>
          <p>{user.email}</p>
          <div className="stack">
            <button onClick={() => switchMode("change")}>
              Change password
            </button>
            <button disabled={busy} onClick={() => logout()}>
              Sign out
            </button>
            <button disabled={busy} onClick={() => logout(true)}>
              Sign out everywhere
            </button>
          </div>
        </>
      ) : (
        <form className="stack" onSubmit={submit}>
          {mode === "register" && (
            <Field
              name="name"
              label="Your name"
              maxLength={100}
              autoComplete="name"
            />
          )}
          {["login", "register", "forgot", "verify"].includes(mode) && (
            <Field
              name="email"
              label="Email address"
              type="email"
              autoComplete="email"
            />
          )}
          {["login", "register"].includes(mode) && (
            <Field
              name="password"
              label="Password"
              type="password"
              minLength={mode === "register" ? 15 : 1}
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
            />
          )}
          {mode === "change" && (
            <Field
              name="currentPassword"
              label="Current password"
              type="password"
              autoComplete="current-password"
            />
          )}
          {["change", "reset", "verify-complete"].includes(mode) && (
            <Field
              name="newPassword"
              label="New password · at least 15 characters"
              type="password"
              minLength={15}
              autoComplete="new-password"
            />
          )}
          {mode === "register" && (
            <p className="muted">
              Use a passphrase of at least 15 characters. Email verification is
              required before you can sign in.
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy
              ? "PLEASE WAIT…"
              : mode === "login"
                ? "SIGN IN ↗"
                : mode === "register"
                  ? "CREATE ACCOUNT ↗"
                  : ["forgot", "verify"].includes(mode)
                    ? "SEND LINK ↗"
                    : "SAVE PASSWORD ↗"}
          </button>
        </form>
      )}
      {error && <Feedback error={error} />}{" "}
      {message && <Feedback>{message}</Feedback>}
      {!user && (
        <div className="account-switch">
          <button
            onClick={() =>
              switchMode(mode === "register" ? "login" : "register")
            }
          >
            {mode === "register"
              ? "Already a member? Sign in"
              : "New here? Create an account"}
          </button>
          <button onClick={() => switchMode("forgot")}>Forgot password?</button>
          <button onClick={() => switchMode("verify")}>
            Resend verification
          </button>
        </div>
      )}
    </Modal>
  );
}
