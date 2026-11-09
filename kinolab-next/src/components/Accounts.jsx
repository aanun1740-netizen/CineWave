import { useEffect, useState } from "react";
import { accountStrings } from "../account-translations";
import { client } from "../services/backend";
export default function Accounts({
  route,
  account,
  language,
  setLanguage,
  navigate,
  movies,
}) {
  const [feedback, setFeedback] = useState(""),
    [busy, setBusy] = useState(false);
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
        const { data, error } = await client.auth.signInWithPassword({
          email: values.email.trim(),
          password: values.password,
        });
        if (error) throw error;
        await account.refresh(data.session);
        navigate("profile", true);
      } else if (route === "register") {
        if (values.password !== values.confirm) {
          setFeedback("mismatch");
          return;
        }
        const { data, error } = await client.auth.signUp({
          email: values.email.trim(),
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
          navigate("login", true);
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
    } catch {
      setFeedback("failed");
    } finally {
      form
        .querySelectorAll("input[type=password]")
        .forEach((input) => (input.value = ""));
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
                    minLength: route === "login" ? undefined : 12,
                    autoComplete:
                      route === "login" ? "current-password" : "new-password",
                  },
                )}
              {["register", "recover"].includes(route) &&
                input("repeat", "password", "confirm", {
                  minLength: 12,
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
