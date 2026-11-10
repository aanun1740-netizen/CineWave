import { useEffect, useState } from "react";
import { accountStrings } from "../account-translations";
import { client } from "../services/backend";

function authFeedback(error) {
  if (error?.code === "email_not_confirmed") return "emailNotConfirmed";
  if (["over_email_send_rate_limit", "over_request_rate_limit"].includes(error?.code))
    return "emailRateLimit";
  if (error?.code === "invalid_credentials") return "invalidCredentials";
  if (["otp_expired", "otp_disabled", "bad_code_verifier"].includes(error?.code))
    return "emailLinkExpired";
  return "failed";
}
export default function Accounts({
  route,
  account,
  language,
  setLanguage,
  navigate,
  movies,
}) {
  const [feedback, setFeedback] = useState(""),
    [busy, setBusy] = useState(false),
    [confirmationEmail, setConfirmationEmail] = useState(""),
    [confirmationPending, setConfirmationPending] = useState(false);
  const [name, setName] = useState(""),
    [preferred, setPreferred] = useState(language),
    [dirty, setDirty] = useState(false);
  const text = (key) =>
    accountStrings[language][key] || accountStrings.en[key] || key;
  useEffect(() => {
    if (!dirty) {
      setName(
        account.profile?.display_name ||
          account.session?.user.user_metadata?.display_name ||
          "",
      );
      setPreferred(account.profile?.preferred_language || language);
    }
  }, [account.profile, account.session, language, dirty]);
  useEffect(() => {
    setDirty(false);
  }, [account.session?.user.id]);
  useEffect(() => {
    // Supabase returns single-use or expired email links with an error_code.
    // Surface that error on the login page instead of silently showing Home.
    const query = new URLSearchParams(location.search);
    const fragment = location.hash.startsWith("#error=")
      ? new URLSearchParams(location.hash.slice(1)) : null;
    const errorCode = query.get("error_code") || fragment?.get("error_code");
    if (!errorCode && !fragment) return;
    setFeedback(errorCode === "otp_expired" || errorCode === "otp_disabled"
      ? "emailLinkExpired" : "confirmationFailed");
    const clean = new URL(location.href);
    ["error", "error_code", "error_description"].forEach(key => clean.searchParams.delete(key));
    if (fragment) clean.hash = "#/login";
    history.replaceState(null, "", clean.pathname + clean.search + clean.hash);
  }, []);
  useEffect(() => {
    if (!account.ready) return;
    if (["profile", "recover"].includes(route) && !account.session)
      navigate("login", true);
    if (["login", "register"].includes(route) && account.session)
      navigate("profile", true);
  }, [route, account.ready, account.session]);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setFeedback("working");
    const form = event.currentTarget,
      values = Object.fromEntries(new FormData(form));
    try {
      if (route === "login") {
        const email = values.email.trim();
        const { data, error } = await client.auth.signInWithPassword({
          email,
          password: values.password,
        });
        if (error) {
          if (error.code === "email_not_confirmed") {
            setConfirmationEmail(email);
            setConfirmationPending(true);
          }
          throw error;
        }
        if (!data?.session) throw Error("missing_session");
        setConfirmationPending(false);
        await account.refresh(data.session);
        navigate("profile", true);
      } else if (route === "register") {
        setConfirmationPending(false);
        if (values.password !== values.confirm) {
          setFeedback("mismatch");
          return;
        }
        const email = values.email.trim();
        const { data, error } = await client.auth.signUp({
          email,
          password: values.password,
          options: {
            emailRedirectTo: new URL(".", location.href).href,
            data: { display_name: values.name.trim() },
          },
        });
        if (error) throw error;
        if (data.session) {
          await account.refresh(data.session);
          navigate("profile", true);
        } else {
          // Registration is NOT complete until the email is confirmed.
          // Keep the guidance visible instead of dropping into a login form.
          setConfirmationEmail(email);
          setConfirmationPending(true);
          setFeedback("checkEmail");
        }
      } else if (route === "forgot") {
        const { error } = await client.auth.resetPasswordForEmail(
          values.email.trim(),
          { redirectTo: new URL(".", location.href).href },
        );
        if (error) throw error;
        setFeedback("resetSent");
      } else if (route === "recover") {
        if (!account.session) throw Error();
        if (values.password !== values.confirm) {
          setFeedback("mismatch");
          return;
        }
        if (!account.recovery) {
          const { error } = await client.auth.signInWithPassword({
            email: account.session.user.email,
            password: values.current,
          });
          if (error) throw error;
        }
        const { error } = await client.auth.updateUser({
          password: values.password,
        });
        if (error) throw error;
        setFeedback("passwordSaved");
      } else if (route === "profile") {
        if (!account.session) throw Error();
        const uid = account.session.user.id;
        const profile = {
          display_name: name.trim(),
          preferred_language: preferred,
        };
        const existing = await client
          .from("profiles")
          .select("user_id")
          .eq("user_id", uid)
          .maybeSingle();
        if (existing.error) throw existing.error;
        const { error } = existing.data
          ? await client.from("profiles").update(profile).eq("user_id", uid)
          : await client.from("profiles").insert({ user_id: uid, ...profile });
        if (error) throw error;
        account.refreshProfile(profile);
        setDirty(false);
        setLanguage(preferred);
        setFeedback("saved");
      }
    } catch (error) {
      setFeedback(authFeedback(error));
    } finally {
      form
        .querySelectorAll("input[type=password]")
        .forEach((input) => (input.value = ""));
      setBusy(false);
    }
  }
  async function resendConfirmation() {
    if (busy || !confirmationEmail) return;
    setBusy(true);
    setFeedback("working");
    try {
      const { error } = await client.auth.resend({
        type: "signup",
        email: confirmationEmail,
        options: { emailRedirectTo: new URL(".", location.href).href },
      });
      if (error) throw error;
      setFeedback("confirmationResent");
    } catch (error) {
      setFeedback(authFeedback(error));
    } finally {
      setBusy(false);
    }
  }
  const input = (key, type = "text", id = key, props = {}) => (
    <label>
      <span>{text(key)}</span>
      <input name={id} type={type} required {...props} />
    </label>
  );
  async function importList() {
    setBusy(true);
    try {
      for (const id of account.guestList()) {
        const movie = movies.find((row) => row.id === id);
        if (movie) await account.toggle(movie, true);
      }
      setFeedback("imported");
    } catch {
      setFeedback("listFailed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="account-pages" id="accountPages">
      <div className="account-card">
        <p className="eyebrow">KINOLAB</p>
        <h1>
          {text(
            {
              login: "login",
              register: "register",
              profile: "profile",
              forgot: "forgot",
              recover: "changePassword",
            }[route],
          )}
        </h1>
        <p>
          {text(
            route === "register"
              ? "registerIntro"
              : route === "profile"
                ? "profileIntro"
                : route === "recover"
                  ? "recoverIntro"
                  : "intro",
          )}
        </p>
        <p className="account-feedback" role="status">
          {text(feedback || account.error || "")}
        </p>
        {route === "profile" && (
          <p className="profile-facts">{account.session?.user.email}</p>
        )}
        <form className="account-form" onSubmit={submit}>
          {route === "profile" ? (
            <>
              {input("name", "text", "name", {
                value: name,
                onChange: (e) => {
                  setName(e.target.value);
                  setDirty(true);
                },
                maxLength: 80,
              })}
              <label>
                {text("language")}
                <select
                  value={preferred}
                  onChange={(e) => {
                    setPreferred(e.target.value);
                    setDirty(true);
                  }}
                >
                  <option value="hy">Հայերեն</option>
                  <option value="ru">Русский</option>
                  <option value="en">English</option>
                </select>
              </label>
            </>
          ) : (
            <>
              {route === "register" &&
                input("name", "text", "name", {
                  maxLength: 80,
                  autoComplete: "nickname",
                })}
              {route !== "recover" &&
                input("email", "email", "email", { autoComplete: "username" })}
              {route === "recover" &&
                !account.recovery &&
                input("password", "password", "current", {
                  autoComplete: "current-password",
                })}
              {route !== "forgot" &&
                input(
                  route === "login" ? "password" : "newPassword",
                  "password",
                  "password",
                  {
                    minLength: route === "login" ? undefined : 8,
                    autoComplete:
                      route === "login" ? "current-password" : "new-password",
                  },
                )}
              {["register", "recover"].includes(route) &&
                input("repeat", "password", "confirm", {
                  minLength: 8,
                  autoComplete: "new-password",
                })}
            </>
          )}
          <button className="btn primary" disabled={busy || !account.ready}>
            {text(
              {
                login: "login",
                register: "register",
                forgot: "resetLink",
                recover: "changePassword",
                profile: "save",
              }[route],
            )}
          </button>
        </form>
        {confirmationPending && confirmationEmail && ["login", "register"].includes(route) && (
          <div className="account-confirmation-help">
            <p>{text("confirmationHelp")}</p>
            <button className="btn secondary" type="button" disabled={busy}
              onClick={resendConfirmation}>{text("resendConfirmation")}</button>
            {route === "register" && (
              <button className="btn secondary" type="button"
                onClick={() => navigate("login")}>{text("login")}</button>
            )}
          </div>
        )}
        {route === "profile" && (
          <div className="account-actions">
            {account.guestList().size > 0 && (
              <button
                className="btn secondary"
                disabled={busy || !account.cloudReady}
                onClick={importList}
              >
                {text("importList")}
              </button>
            )}
            <button
              className="btn secondary"
              onClick={() => navigate("my-list")}
            >
              {text("myList")}
            </button>
            <button
              className="btn secondary"
              onClick={() => navigate("recover")}
            >
              {text("changePassword")}
            </button>
            <button
              className="btn secondary"
              onClick={async () => {
                await account.logout();
                navigate("login", true);
              }}
            >
              {text("logout")}
            </button>
          </div>
        )}
        <div className="account-links">
          {["login", "register", "forgot", "home"].map((page) => (
            <button key={page} onClick={() => navigate(page)}>
              {text(page === "home" ? "browse" : page)}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
