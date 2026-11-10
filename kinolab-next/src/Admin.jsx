import { useEffect, useRef, useState } from "react";
import { client, signOut, base } from "./services/backend";
import { adminModel as model } from "./domain";
import { useLanguage } from "./hooks/useLanguage";
import { adminEntries } from "./admin-translations";
import Player from "./components/Player";
import ArchiveImporter from "./components/ArchiveImporter";
import QuickExternalMovie from "./components/QuickExternalMovie";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
const table = new Map(adminEntries.map(([en, ru, hy]) => [en, { en, ru, hy }]));
const empty = () =>
  Object.fromEntries(
    [...model.fields, "genres"]
      .map((key) => [key, ""])
      .concat([
        ["media_type", "movie"],
        ["commercial_streaming_permission", false],
      ]),
  );
export default function Admin() {
  const { language, setLanguage } = useLanguage();
  const t = (text) => table.get(text)?.[language] || text;
  const [embedPreview, setEmbedPreview] = useState(null);
  const [session, setSession] = useState(null),
    [authorized, setAuthorized] = useState(false),
    [rows, setRows] = useState([]),
    [externalRows, setExternalRows] = useState([]),
    [view, setView] = useState("overview"),
    [notice, setNotice] = useState("Sign in to continue."),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState(null),
    [values, setValues] = useState(empty),
    [renditions, setRenditions] = useState([]),
    [dirty, setDirty] = useState(false),
    [preview, setPreview] = useState(null),
    [confirmation, setConfirmation] = useState(null),
    [typed, setTyped] = useState(""),
    [review, setReview] = useState(false),
    [query, setQuery] = useState(""),
    [publication, setPublication] = useState("all"),
    [rights, setRights] = useState("all");
  const state = useRef({}),
    generation = useRef(0),
    accept = useRef(true),
    pendingConfirm = useRef(null),
    confirmDialog = useRef(null),
    previewDialog = useRef(null),
    form = useRef(null);
  state.current = { session, authorized, dirty, busy };
  function lock(message = "Sign in to continue.") {
    setAuthorized(false);
    state.current.authorized = false;
    setRows([]);
    setExternalRows([]);
    setEditing(null);
    setDirty(false);
    setValues(empty());
    setRenditions([]);
    setPreview(null);
    pendingConfirm.current?.(false);
    pendingConfirm.current = null;
    setConfirmation(null);
    setNotice(message);
  }
  function fail(error) {
    if (["42501", "PGRST301", "PGRST302"].includes(error?.code)) {
      ++generation.current;
      lock(
        "Your access is no longer authorized. Sign in again or contact the owner.",
      );
    } else
      setNotice(
        table.has(error?.message)
          ? error.message
          : "Operation failed. Please retry.",
      );
  }
  async function loadMovies(id = generation.current) {
    if (!state.current.authorized) return;
    setNotice("Loading your movie library…");
    const result = [];
    try {
      for (let start = 0; ; start += 100) {
        const { data, error } = await client
          .from("movies")
          .select("*")
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(start, start + 99);
        if (id !== generation.current || !state.current.authorized) return;
        if (error) throw error;
        result.push(...data);
        if (data.length < 100) break;
      }
      // Include external-link movies in dashboard totals while keeping their
      // editing workflow in the separate Quick Add section.
      const external = [];
      for (let start = 0; ; start += 100) {
        const { data, error } = await client
          .from("kinolab_external_catalog")
          .select("id,title_en,is_published,created_at")
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(start, start + 99);
        if (id !== generation.current || !state.current.authorized) return;
        if (error) throw error;
        external.push(...(data || []));
        if (!data || data.length < 100) break;
      }
      setRows(result);
      setExternalRows(external);
      setNotice("");
    } catch (error) {
      if (id === generation.current) fail(error);
    }
  }
  async function authorize(next) {
    if (next && !accept.current) return;
    const keep =
        state.current.authorized &&
        next?.user.id === state.current.session?.user.id,
      id = ++generation.current;
    setSession(next);
    state.current.session = next;
    if (!keep)
      lock(
        next ? "Checking administrator authorization…" : "Sign in to continue.",
      );
    if (!next) return;
    try {
      const { data, error } = await client.rpc("cinewave_is_admin");
      if (id !== generation.current) return;
      if (error)
        throw Error(
          "Administrator setup unavailable. Ask the owner to review and apply the Admin migration.",
        );
      if (data !== true) {
        lock(
          "Access denied. This account is not an authorized KinoLab administrator.",
        );
        return;
      }
      setAuthorized(true);
      state.current.authorized = true;
      if (!keep) setView("overview");
      if (!state.current.dirty) await loadMovies(id);
    } catch (error) {
      if (id === generation.current) lock(error.message);
    }
  }
  useEffect(() => {
    let active = true;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, next) =>
      setTimeout(() => {
        if (active) authorize(next);
      }, 0),
    );
    client.auth
      .getSession()
      .then(({ data, error }) => {
        if (active) {
          if (error) lock("Session unavailable. Sign in again.");
          else authorize(data.session);
        }
      })
      .catch(() => {
        if (active) lock("Session unavailable. Sign in again.");
      });
    function focus() {
      if (state.current.session && !state.current.busy)
        authorize(state.current.session);
    }
    const timer = setInterval(focus, 60000);
    window.addEventListener("focus", focus);
    return () => {
      active = false;
      ++generation.current;
      subscription.unsubscribe();
      clearInterval(timer);
      window.removeEventListener("focus", focus);
    };
  }, []);
  useEffect(() => {
    const before = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);
  useEffect(() => {
    if (confirmation) confirmDialog.current?.showModal();
  }, [confirmation]);
  useEffect(() => {
    if (preview) previewDialog.current?.showModal();
  }, [preview]);
  const confirm = (options) =>
    new Promise((resolve) => {
      pendingConfirm.current = resolve;
      setTyped("");
      setReview(false);
      setConfirmation({ ...options, resolve });
    });
  function resolveConfirm(value) {
    pendingConfirm.current?.(value);
    pendingConfirm.current = null;
    confirmDialog.current?.close();
    setConfirmation(null);
  }
  async function leave(next) {
    if (
      dirty &&
      !(await confirm({
        title: "Discard unsaved edits?",
        text: "Only local edits will be discarded.",
      }))
    )
      return;
    setDirty(false);
    setView(next);
  }
  async function edit(row = null) {
    if (!state.current.authorized) return;
    if (
      dirty &&
      !(await confirm({
        title: "Discard unsaved edits?",
        text: "Only local edits will be discarded.",
      }))
    )
      return;
    setEditing(row ? structuredClone(row) : null);
    setValues({
      ...empty(),
      ...Object.fromEntries(model.fields.map((key) => [key, row?.[key] || ""])),
      media_type: row?.media_type || "movie",
      genres: (row?.genre_names || []).join(", "),
      commercial_streaming_permission: Boolean(
        row?.commercial_streaming_permission,
      ),
    });
    setRenditions(row?.video_renditions || []);
    setDirty(false);
    setView("editor");
    setNotice("");
    window.scrollTo({ top: 0 });
  }
  const change = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setDirty(true);
  };
  function collect() {
    return model.payload(values, renditions);
  }
  async function update(row, patch) {
    if (!state.current.authorized) throw Error("Not authorized.");
    const { data, error } = await client
      .from("movies")
      .update(patch)
      .eq("id", row.id)
      .eq("updated_at", row.updated_at)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data)
      throw Error(
        "This record changed or access was denied. Refresh before editing again.",
      );
    return data;
  }
  async function run(operation) {
    if (!state.current.authorized || state.current.busy) return;
    setBusy(true);
    state.current.busy = true;
    try {
      await operation();
    } catch (error) {
      if (error?.message?.includes("movies_embed_url_safe")) {
        setNotice("This embed link is allowed only as an unpublished draft reference. It cannot be published or played here.");
      } else {
        const details = error?.message || "Unknown error";
        setNotice("Save failed: " + details);
      }
    } finally {
      setBusy(false);
      state.current.busy = false;
    }
  }
  async function save(event) {
    event.preventDefault();
    await run(async () => {
      const id = generation.current,
        payload = collect();
      // External-reference movies appear in the information catalog immediately;
      // their public Watch link is gated by the server-side permission projection.
      if (payload.embed_url && !editing?.is_published) {
        payload.metadata_published = true;
      }
      let saved;
      if (editing) saved = await update(editing, payload);
      else {
        const { data, error } = await client
          .from("movies")
          .insert({ ...payload, is_published: false })
          .select()
          .single();
        if (error) throw error;
        saved = data;
      }
      if (id !== generation.current || !state.current.authorized) return;
      setEditing(saved);
      setDirty(false);
      state.current.dirty = false;
      await loadMovies();
      setNotice(
        "Saved. Media/rights changes require a new verification review.",
      );
    });
  }
  async function action(name, row) {
    if (name === "edit") return edit(row);
    if (!state.current.authorized || busy) return;
    if (name === "metadata") {
      if (dirty) return;
      const turningOn = !row.metadata_published;
      const label = {hy:"Հրապարակել միայն ֆիլմի տեղեկությունները՝ առանց դիտման հղման։",ru:"Опубликовать только информацию о фильме без ссылки на просмотр?",en:"Publish movie information only, without the watch link?"}[language];
      if (!(await confirm({title:turningOn ? label : "Remove informational listing?",text:row.title_en,raw:true}))) return;
      await run(async () => {
        await update(row,{metadata_published:turningOn});
        await loadMovies();
        setNotice(turningOn ? "Information listing published. No watch URL was exposed." : "Information listing removed.");
      });
      return;
    }
    // Standard catalog publishing needs no playback rights. Streaming publication
    // remains subject to the existing verification and database policies.
    if (name === "publish" && !row.is_published && !model.ready(row)) {
      return action("metadata", row);
    }
    const ok = await confirm(
      name === "delete"
        ? {
            title: "Permanently delete this movie?",
            text: "This removes the record from KinoLab. It does not delete shared image assets. Type its exact title to confirm.",
            typed: row.title_en,
          }
        : {
            title: row.is_published
              ? "Unpublish movie?"
              : "Publish verified movie?",
            text: row.title_en,
            raw: true,
          },
    );
    if (!ok) return;
    await run(async () => {
      if (name === "delete") {
        const { data, error } = await client
          .from("movies")
          .delete()
          .eq("id", row.id)
          .eq("updated_at", row.updated_at)
          .select("id");
        if (error) throw error;
        if (!data.length)
          throw Error("Record changed or access denied. Refresh first.");
      } else await update(row, { is_published: !row.is_published });
      await loadMovies();
    });
  }
  async function verify() {
    if (!editing || dirty) return;
    if (
      !(await confirm({
        title: "Verify full-film commercial rights?",
        text: "Review the recorded rights holder, license grant, original film source, license evidence and terms, attribution, and actual media delivery. A URL alone is not evidence.",
        review: true,
      }))
    )
      return;
    await run(async () => {
      const id = generation.current,
        saved = await update(editing, {
          rights_verification_status: "verified",
          playback_checked: true,
        });
      if (id !== generation.current) return;
      setEditing(saved);
      await loadMovies();
      setNotice(
        "Review recorded for this saved snapshot. Publication is a separate action.",
      );
    });
  }
  async function upload(event, name) {
    const input = event.target,
      file = input.files[0];
    if (!file) return;
    await run(async () => {
      const id = generation.current,
        ext = model.asset(file),
        path =
          state.current.session.user.id + "/" + crypto.randomUUID() + "." + ext;
      const { error } = await client.storage
        .from("cinewave-assets")
        .upload(path, file, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false,
        });
      if (error) throw error;
      if (id !== generation.current || !state.current.authorized) return;
      const { data } = client.storage
        .from("cinewave-assets")
        .getPublicUrl(path);
      change(name, data.publicUrl);
      setNotice(
        "Image uploaded. Save the movie to attach it. Existing images were not overwritten.",
      );
    });
    input.value = "";
  }
  async function logout() {
    accept.current = false;
    ++generation.current;
    setSession(null);
    state.current.session = null;
    lock();
    const { failed } = await signOut();
    lock("Signed out on this device.");
    if (failed) location.reload();
  }
  async function login(event) {
    event.preventDefault();
    setBusy(true);
    accept.current = true;
    const form = event.currentTarget,
      values = Object.fromEntries(new FormData(form));
    setNotice("Signing in…");
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: values.email.trim(),
        password: values.password,
      });
      if (error) throw error;
      await authorize(data.session);
    } catch {
      setNotice(
        "Sign-in failed. Check your credentials, connection, and Auth settings.",
      );
    } finally {
      form.reset();
      setBusy(false);
    }
  }
  function safeEmbed(url) {
    try {
      const u = new URL(url);
      if (u.protocol !== "https:" || u.username || u.password) return null;
      let id = null;
      if (["youtube.com","www.youtube.com","m.youtube.com"].includes(u.hostname)) {
        if (u.pathname === "/watch") id = u.searchParams.get("v");
        else if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2];
      } else if (u.hostname === "youtu.be") id = u.pathname.slice(1);
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return "https://www.youtube-nocookie.com/embed/" + id;
      if (u.hostname === "archive.org" || u.hostname === "www.archive.org") {
        const match = u.pathname.match(/^\/(?:details|embed)\/([A-Za-z0-9_][A-Za-z0-9_.-]{0,119})\/?$/);
        if (match && !u.search && !u.hash) return "https://archive.org/embed/" + match[1];
      }
      if (u.hostname === "geo.dailymotion.com") {
        const match = u.pathname.match(/^\/player\/([A-Za-z0-9]+)\.html$/);
        const video = u.searchParams.get("video");
        if (match && video && /^[A-Za-z0-9]+$/.test(video) && u.searchParams.size === 1 && !u.hash)
          return "https://geo.dailymotion.com/player/" + match[1] + ".html?video=" + video;
      }
      if (u.hostname === "api.nextembed.ws" && /^\/embed\/(movie|tv)\/\d+(?:\/\d+\/\d+)?\/?$/.test(u.pathname) && !u.search && !u.hash) return u.href;
      if (["vimeo.com","www.vimeo.com","player.vimeo.com"].includes(u.hostname)) {
        const match = u.pathname.match(/^\/(?:video\/)?([0-9]+)\/?$/);
        if (match) return "https://player.vimeo.com/video/" + match[1];
      }
    } catch {}
    return null;
  }
  const field = (name, label, type = "text", props = {}) => (
    <label key={name}>
      {t(label)}
      {type === "textarea" ? (
        <textarea
          name={name}
          rows={5}
          value={values[name]}
          onChange={(e) => change(name, e.target.value)}
          {...props}
        />
      ) : (
        <input
          name={name}
          type={type}
          value={values[name]}
          onChange={(e) => change(name, e.target.value)}
          {...props}
        />
      )}
    </label>
  );
  const filtered = rows.filter(
    (row) =>
      (!query ||
        [row.title_en, row.title_ru, row.title_hy].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(query.toLowerCase()),
        )) &&
      (publication === "all" ||
        row.is_published === (publication === "published")) &&
      (rights === "all" || row.rights_verification_status === rights),
  );
  return (
    <>
      <select
        id="adminLanguage"
        aria-label="Language / Язык / Լեզու"
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
      >
        <option value="hy">Հայերեն</option>
        <option value="ru">Русский</option>
        <option value="en">English</option>
      </select>
      {!authorized ? (
        <section className="access">
          <a href={base} className="brand">
            <img src={`${base}assets/kinolab-logo.svg?v=20261103`} alt="KinoLab" className="admin-brand-logo" /> <small>STUDIO</small>
          </a>
          <div className="login-card">
            <p className="eyebrow">{t("ADMINISTRATOR ACCESS")}</p>
            <h1>
              {t("Your cinema.")}
              <br />
              {t("Your control room.")}
            </h1>
            <p>
              {t("Sign in with an account explicitly authorized by the owner.")}
            </p>
            {!session && (
              <form onSubmit={login}>
                <label>
                  {t("Email")}
                  <input
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                  />
                </label>
                <label>
                  {t("Password")}
                  <input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    minLength={6}
                  />
                </label>
                <button className="primary" disabled={busy}>
                  {t("Sign in securely")}
                </button>
              </form>
            )}
            <p role="status">{t(notice)}</p>
            {session && (
              <button className="secondary" onClick={logout}>
                {t("Sign out")}
              </button>
            )}
            <a href={base}>{t("← Back to KinoLab")}</a>
          </div>
          <p className="access-note">
            {t("Authorization is enforced by Supabase, not by this page.")}
          </p>
        </section>
      ) : (
        <div className="shell">
          <aside>
            <a className="brand" href={base}>
             <img src={`${base}assets/kinolab-logo.svg?v=20261103`} alt="KinoLab" className="admin-brand-logo" />
            <small>STUDIO</small>
             </a>
            <nav>
              {["overview", "movies", "external", "archive", "analytics"].map((page) => (
                <button
                  key={page}
                  className={view === page ? "active" : ""}
                  onClick={() => leave(page)}
                >
                  {page==="analytics" ? ({hy:"▥ Վիճակագրություն",ru:"▥ Статистика",en:"▥ Analytics"}[language]) : page==="external" ? ({hy:"▶ Արագ ֆիլմ ավելացնել",ru:"▶ Быстро добавить фильм",en:"▶ Quick add movie"}[language]) : page==="archive" ? ({hy:"▤ Վերնագրերի արխիվ",ru:"▤ Архив названий",en:"▤ Title archive"}[language]) : t(page === "overview" ? "◈ Overview" : "▤ Movie library")}
                </button>
              ))}
              <button onClick={() => edit()}>{t("＋ Add movie")}</button>
            </nav>
            <div className="sidebar-bottom">
              <span>{session?.user.email}</span>
              <button className="secondary" onClick={logout}>
                {t("Sign out")}
              </button>
              <a href={base}>{t("Visit public website ↗")}</a>
            </div>
          </aside>
          <main>
            <header>
              <div>
                <p className="eyebrow">{t("KINOLAB ADMIN")}</p>
                <h1>
                  {t(
                    {
                      overview: "Overview",
                      movies: "Movie library",
                      archive: ({hy:"Վերնագրերի արխիվ",ru:"Архив названий",en:"Title archive"}[language]),
                      analytics: ({hy:"Այցելությունների վիճակագրություն",ru:"Статистика посещений",en:"Traffic analytics"}[language]),
                      external: ({hy:"Արագ ֆիլմ ավելացնել",ru:"Быстро добавить фильм",en:"Quick add movie"}[language]),
                      editor: editing ? "Edit movie" : "Add movie",
                    }[view],
                  )}
                </h1>
              </div>
              <div className="header-actions">
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    dirty
                      ? setNotice(
                          "Save or cancel local edits before refreshing.",
                        )
                      : loadMovies()
                  }
                >
                  {t("Refresh")}
                </button>
                <button className="primary" onClick={() => edit()}>
                  {t("＋ Add movie")}
                </button>
              </div>
            </header>
            <div className="notice" role="status">
              {t(notice)}
            </div>
            {view === "overview" && (
              <section>
                <div className="stats">
                  {[
                    ["Total movies", rows.length + externalRows.length],
                    [
                      "Published",
                      rows.filter((row) => row.is_published).length +
                        externalRows.filter((row) => row.is_published).length,
                    ],
                    [
                      "Drafts",
                      rows.filter((row) => !row.is_published).length +
                        externalRows.filter((row) => !row.is_published).length,
                    ],
                    ["Approved playback", rows.filter(model.ready).length],
                  ].map(([label, count]) => (
                    <article key={label}>
                      <span>{t(label)}</span>
                      <strong>{count}</strong>
                    </article>
                  ))}
                </div>
                <div className="panel" role="status">
                  <div className="panel-head">
                    <p>
                      {({
                        hy: `Սովորական ֆիլմեր՝ ${rows.length} · Արտաքին հղումով՝ ${externalRows.length}`,
                        ru: `Обычные фильмы: ${rows.length} · По внешней ссылке: ${externalRows.length}`,
                        en: `Regular movies: ${rows.length} · External-link titles: ${externalRows.length}`,
                      })[language]}
                    </p>
                    <button className="text-button" type="button" onClick={() => setView("external")}>
                      {({hy:"Կառավարել արտաքին ֆիլմերը",ru:"Управлять внешними фильмами",en:"Manage external titles"})[language]}
                    </button>
                  </div>
                </div>
                <div className="panel">
                  <div className="panel-head">
                    <h2>{t("Recently added")}</h2>
                    <p>{t("Real records from your movie library")}</p>
                  </div>
                  {rows.slice(0, 5).map((row) => (
                    <div className="recent-row" key={row.id}>
                      <div>
                        {row.title_en}
                        <small>
                          {row.created_at
                            ? new Date(row.created_at).toLocaleDateString(
                                language,
                              )
                            : t("Date unavailable")}
                        </small>
                      </div>
                      <button className="secondary" onClick={() => edit(row)}>
                        {t("Edit")}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="callout">
                  <h2>{t("Publication is a rights decision.")}</h2>
                  <p>
                    {t(
                      "New films must be saved as drafts, have full-film commercial streaming rights recorded, and have their actual media sources tested before publishing. A public URL is not a license.",
                    )}
                  </p>
                </div>
              </section>
            )}
            {view === "archive" && <ArchiveImporter language={language} />}
            {view === "analytics" && <AnalyticsDashboard language={language} />}
            {view === "external" && <QuickExternalMovie language={language} onChange={() => loadMovies()} />}
            {view === "movies" && (
              <section>
                <div className="toolbar">
                  <label className="grow">
                    {t("Search movies")}
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t("Title in any language…")}
                    />
                  </label>
                  <label>
                    {t("Publication")}
                    <select
                      value={publication}
                      onChange={(e) => setPublication(e.target.value)}
                    >
                      {[
                        ["all", "All records"],
                        ["published", "Published"],
                        ["draft", "Drafts"],
                      ].map(([value, label]) => (
                        <option key={value} value={value}>
                          {t(label)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t("Rights")}
                    <select
                      value={rights}
                      onChange={(e) => setRights(e.target.value)}
                    >
                      {[
                        "all",
                        "unverified",
                        "pending",
                        "verified",
                        "rejected",
                      ].map((value) => (
                        <option key={value} value={value}>
                          {t(value === "all" ? "All records" : value)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <p>
                  {filtered.length} / {rows.length}
                </p>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {[
                          "Movie",
                          "Year / genres",
                          "Publication",
                          "Rights",
                          "Actions",
                        ].map((label) => (
                          <th key={label}>{t(label)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((row) => (
                        <tr key={row.id}>
                          <td className="table-title">
                            {row.title_en}
                            <br />
                            <small>
                              {[row.title_ru, row.title_hy]
                                .filter(Boolean)
                                .join(" · ")}
                            </small>
                          </td>
                          <td>
                            {[
                              row.release_date?.slice(0, 4),
                              (row.genre_names || []).join(", "),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </td>
                          <td>
                            <span
                              className={`tag ${row.is_published ? "published" : ""}`}
                            >
                              {row.is_published ? t("Published") : row.metadata_published ? ({hy:"Տեղեկատվությունը հրապարակված է",ru:"Информация опубликована",en:"Information published"}[language]) : t("Draft")}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`tag ${row.rights_verification_status === "verified" ? "verified" : ""}`}
                            >
                              {t(
                                row.rights_verification_status || "unverified",
                              )}
                            </span>
                          </td>
                          <td className="row-actions">
                            {[
                              ["edit", "Edit"],
                              [
                                "publish",
                                row.is_published
                                  ? "Unpublish"
                                  : row.metadata_published
                                    ? ({hy:"Հեռացնել կատալոգից",ru:"Убрать из каталога",en:"Remove from catalog"}[language])
                                    : model.ready(row)
                                      ? ({hy:"Հրապարակել դիտումով",ru:"Опубликовать с просмотром",en:"Publish with playback"}[language])
                                      : ({hy:"Հրապարակել",ru:"Опубликовать",en:"Publish"}[language]),
                              ],
                              ["delete", "Delete"],
                            ].map(([name, label]) => (
                              <button
                                key={name}
                                disabled={busy}
                                className="secondary"
                                onClick={() => action(name, row)}
                              >
                                {t(label)}
                              </button>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
            {view === "editor" && (
              <section id="editor" className="panel">
                <div className="panel-head">
                  <h2>
                    {editing
                      ? `${t("Edit movie")}: ${editing.title_en}`
                      : t("New movie")}
                  </h2>
                  <button className="secondary" onClick={() => leave("movies")}>
                    {t("Back to library")}
                  </button>
                </div>
                <form id="movieForm" ref={form} onSubmit={save}>
                  <fieldset disabled={busy} className="editor-fields">
                    <div className="language-grid">
                      {[
                        ["en", "English · EN"],
                        ["ru", "Русский · RU"],
                        ["hy", "Հայերեն · HY"],
                      ].map(([code, label]) => (
                        <fieldset key={code}>
                          <legend>{label}</legend>
                          {field("title_" + code, "Title", "text", {
                            required: code === "en",
                            maxLength: 500,
                          })}
                          {field("overview_" + code, "Description", "textarea")}
                        </fieldset>
                      ))}
                    </div>
                    <fieldset>
                      <legend>{t("Catalog details")}</legend>
                      <div className="form-grid">
                        <label>
                          {t("Content type")}
                          <select
                            value={values.media_type}
                            onChange={(e) =>
                              change("media_type", e.target.value)
                            }
                          >
                            <option value="movie">{t("Movie")}</option>
                            <option value="tv">{t("TV Show")}</option>
                          </select>
                        </label>
                        {field("release_date", "Release date", "date")}
                        {field("genres", "Genres (comma-separated)")}
                        {field("trailer_url", "Trailer URL", "url")}
                      </div>
                    </fieldset>
                    <fieldset>
                      <legend>{t("Artwork")}</legend>
                      <p className="hint">
                        {t(
                          "Upload only images you are authorized to use. JPEG, PNG or WebP, up to 8 MB. Existing assets are never overwritten or automatically removed.",
                        )}
                      </p>
                      <div className="form-grid">
                        {[
                          ["poster_path", "Poster URL", "Upload poster"],
                          ["backdrop_path", "Backdrop URL", "Upload backdrop"],
                        ].map(([name, label, uploadLabel]) => (
                          <div key={name}>
                            {field(name, label)}
                            <label>
                              {t(uploadLabel)}
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => upload(e, name)}
                              />
                            </label>
                          </div>
                        ))}
                      </div>
                    </fieldset>
                    <fieldset>
                      <legend>{t("Video sources")}</legend>
                      {field(
                        "watch_url",
                        language === "hy"
                          ? "Հիմնական MP4, WebM կամ HLS URL"
                          : language === "ru"
                            ? "Основной MP4, WebM или HLS URL"
                            : "Primary MP4, WebM or HLS URL",
                        "url",
                      )}
                      <div className="embed-preview-config">
                        <label>
                          {language === "hy" ? "Embed URL (YouTube / Vimeo / Archive / Dailymotion / NextEmbed)" : language === "ru" ? "Внешняя ссылка для просмотра (NextEmbed / YouTube / Vimeo)" : "External watch link (NextEmbed / YouTube / Vimeo)"}
                          <input type="url" value={values.embed_url} onChange={e => change("embed_url", e.target.value)} placeholder="https://api.nextembed.ws/embed/movie/92733" />
                        </label>
                        <p className="hint">{language === "hy" ? "Տեղադրիր արտաքին դիտման հղումը, պահպանիր ֆիլմը և մեկ սեղմումով փորձարկիր։ Հանրային դիտման համար անհրաժեշտ է հաստատված թույլտվություն։" : language === "ru" ? "Вставьте ссылку один раз и сохраните фильм. Кнопка ниже проверяет её в новой вкладке. Публикация просмотра требует подтверждённых прав." : "Paste the external movie link here, save the movie, and test it with one click. Public watching requires verified streaming rights."}</p>
                        <a className="secondary" href={safeEmbed(values.embed_url) || undefined} target="_blank" rel="noopener noreferrer" onClick={e => { if (!safeEmbed(values.embed_url)) { e.preventDefault(); setNotice(language === "hy" ? "Այս հասցեի համար արտաքին դիտումը դեռ չի աջակցվում։" : language === "ru" ? "Эта ссылка пока не поддерживается." : "This URL is not currently supported."); } }}>
                          {language === "hy" ? "Փորձարկել արտաքին հղումը" : language === "ru" ? "Открыть внешнюю ссылку" : "Test external link"}
                        </a>
                      </div>
                      <p className="hint">
                        {t(
                          "HLS Auto uses the manifest's actual variants. One MP4 is one source, not multiple qualities. Add only real, separately tested renditions below.",
                        )}
                      </p>
                      <div className="renditions">
                        {renditions.map((row, i) => (
                          <div className="rendition-row" key={i}>
                            <select
                              aria-label={t("Actual rendition height")}
                              value={row.height}
                              onChange={(e) => {
                                setRenditions((prev) =>
                                  prev.map((r, j) =>
                                    j === i
                                      ? { ...r, height: Number(e.target.value) }
                                      : r,
                                  ),
                                );
                                setDirty(true);
                              }}
                            >
                              {[360, 480, 720, 1080].map((height) => (
                                <option key={height} value={height}>
                                  {height}p
                                </option>
                              ))}
                            </select>
                            <input
                              type="url"
                              aria-label={t("Actual rendition URL")}
                              required
                              value={row.url}
                              onChange={(e) => {
                                setRenditions((prev) =>
                                  prev.map((r, j) =>
                                    j === i ? { ...r, url: e.target.value } : r,
                                  ),
                                );
                                setDirty(true);
                              }}
                            />
                            <button
                              type="button"
                              className="secondary"
                              aria-label={t("Remove rendition")}
                              onClick={() => {
                                setRenditions((prev) =>
                                  prev.filter((_, j) => j !== i),
                                );
                                setDirty(true);
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="secondary"
                        disabled={renditions.length >= 4}
                        onClick={() => {
                          setRenditions((prev) => [
                            ...prev,
                            { height: 360, url: "" },
                          ]);
                          setDirty(true);
                        }}
                      >
                        {t("＋ Add actual rendition")}
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => {
                          try {
                            const data = collect();
                            if (!data.watch_url) throw Error();
                            setPreview({
                              id: "admin-preview:" + (editing?.id || "draft"),
                              video: data.watch_url,
                              renditions: data.video_renditions,
                            });
                          } catch (error) {
                            fail(error);
                          }
                        }}
                      >
                        {t("Preview current sources")}
                      </button>
                    </fieldset>
                    <fieldset>
                      <legend>
                        {t("Content rights & publication evidence")}
                      </legend>
                      <p className="hint">
                        {t(
                          "Published movie fields and proof URLs are public. Keep private contracts, credentials and private signed-document links outside this catalog.",
                        )}
                      </p>
                      <div className="form-grid">
                        {[
                          ["rights_holder", "Content rights holder"],
                          ["license_type", "License type"],
                          [
                            "original_source_url",
                            "Original full-film source URL",
                            "url",
                          ],
                          [
                            "license_evidence_url",
                            "Public license evidence URL",
                            "url",
                          ],
                          ["license_terms_url", "License terms URL", "url"],
                          ["attribution", "Required attribution", "textarea"],
                        ].map(([name, label, type]) =>
                          field(name, label, type),
                        )}
                      </div>
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={values.commercial_streaming_permission}
                          onChange={(e) =>
                            change(
                              "commercial_streaming_permission",
                              e.target.checked,
                            )
                          }
                        />
                        {t(
                          "Recorded license explicitly permits commercial streaming of the complete film, including its soundtrack",
                        )}
                      </label>
                      <p className="hint">
                        {t("Rights")}:{" "}
                        {t(editing?.rights_verification_status || "unverified")}{" "}
                        · {t(editing?.is_published ? "Published" : "Draft")}
                      </p>
                      <p className="hint">
                        {t(
                          "Changing the English title, date, rights or media invalidates verification on the server. Unpublish before changing these fields on a published title.",
                        )}
                      </p>
                    </fieldset>
                    <div className="form-actions">
                      <button type="submit" className="primary">
                        {t(editing ? "Save changes" : "Save draft")}
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        disabled={!editing || dirty}
                        onClick={verify}
                      >
                        {t("Review rights & tested playback")}
                      </button>
                    </div>
                  </fieldset>
                </form>
              </section>
            )}
          </main>
        </div>
      )}
      {confirmation && (
        <dialog
          ref={confirmDialog}
          onCancel={(e) => {
            e.preventDefault();
            resolveConfirm(false);
          }}
        >
          <h2>{t(confirmation.title)}</h2>
          <p>{confirmation.raw ? confirmation.text : t(confirmation.text)}</p>
          {confirmation.typed && (
            <label>
              {t("Type the exact English title")}
              <input value={typed} onChange={(e) => setTyped(e.target.value)} />
            </label>
          )}
          {confirmation.review && (
            <label className="check">
              <input
                type="checkbox"
                checked={review}
                onChange={(e) => setReview(e.target.checked)}
              />
              {t(
                "I reviewed the full-film commercial grant, all included content and attribution, and tested the primary URL and every listed rendition.",
              )}
            </label>
          )}
          <div className="form-actions">
            <button className="secondary" onClick={() => resolveConfirm(false)}>
              {t("Cancel")}
            </button>
            <button
              className="primary"
              disabled={Boolean(
                (confirmation.typed && typed !== confirmation.typed) ||
                (confirmation.review && !review),
              )}
              onClick={() => resolveConfirm(true)}
            >
              {t("Confirm")}
            </button>
          </div>
        </dialog>
      )}
      {embedPreview && (
        <div className="movielab-embed-preview-overlay" role="presentation" onClick={() => setEmbedPreview(null)}>
          <section className="movielab-embed-preview-panel" role="dialog" aria-modal="true" aria-label="Embed preview" onClick={e => e.stopPropagation()}>
            <p>{language === "hy" ? "Նախադիտումը չի հաստատում ցուցադրման իրավունքը։" : language === "ru" ? "Предпросмотр не подтверждает права на показ." : "Preview does not confirm streaming rights."}</p>
            <div className="movielab-embed-preview-actions">
              <a className="secondary" href={embedPreview} target="_blank" rel="noopener noreferrer">
                {language === "hy" ? "Ստուգել սկզբնաղբյուրը" : language === "ru" ? "Открыть источник" : "Open source"}
              </a>
              <button type="button" className="secondary" onClick={() => setEmbedPreview(null)}>{t("Close")}</button>
            </div>
            <p className="hint">{language === "hy" ? "Եթե ներքևի պատուհանը դատարկ է, աղբյուրը կարող է արգելել iframe-ը կամ չաշխատել այս բրաուզերում։ Այս արգելքը KinoLab-ից հեռացնել հնարավոր չէ։" : language === "ru" ? "Если окно пустое, источник может запрещать iframe или не поддерживать этот браузер. KinoLab не может отменить ограничения другого сайта." : "If the frame is blank, the provider may block framing or the browser may reject it. KinoLab cannot override the provider's restrictions."}</p>
            <iframe title="Embed preview" src={embedPreview} sandbox="allow-scripts allow-same-origin allow-presentation allow-forms" referrerPolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
          </section>
        </div>
      )}
      {preview && (
        <dialog
          ref={previewDialog}
          onCancel={(e) => {
            e.preventDefault();
            setPreview(null);
          }}
        >
          <header>
            <h2>{t("Internal media preview")}</h2>
            <button className="secondary" onClick={() => setPreview(null)}>
              {t("Close")}
            </button>
          </header>
          <p>
            {t("Preview is not a licensing grant or publication approval.")}
          </p>
          <Player movie={preview} language={language} />
        </dialog>
      )}
    </>
  );
}
