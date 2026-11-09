import { useEffect, useRef, useState } from "react";
import { client, signOut } from "../services/backend";
import { readStored, writeStored } from "../domain";
const guestList = () => {
  const values = readStored("cinewave:my-list", []);
  return new Set(
    Array.isArray(values) ? values.filter((id) => typeof id === "string") : [],
  );
};
export default function useAccount() {
  const [account, setAccount] = useState({
    ready: false,
    session: null,
    profile: null,
    list: guestList(),
    cloudReady: false,
    admin: false,
    recovery: false,
    error: "",
  });
  const current = useRef(account),
    epoch = useRef(0),
    pending = useRef(new Set()),
    accept = useRef(true),
    listRevision = useRef(0);
  current.current = account;
  const patch = (values) => setAccount((prev) => ({ ...prev, ...values }));
  async function changed(session, event) {
    if (session && !accept.current) return;
    const generation = ++epoch.current;
    const same = current.current.session?.user.id === session?.user.id;
    const revision = listRevision.current;
    patch({
      session,
      ready: true,
      ...(same
        ? {}
        : {
            list: session ? new Set() : guestList(),
            profile: null,
            cloudReady: false,
            admin: false,
            recovery: false,
          }),
      ...(event === "PASSWORD_RECOVERY" ? { recovery: true } : {}),
    });
    if (!session) return;
    try {
      const [
        { data: profile, error: profileError },
        { data: list, error: listError },
        role,
      ] = await Promise.all([
        client
          .from("profiles")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle(),
        client
          .from("user_watchlist")
          .select("movie_id")
          .eq("user_id", session.user.id),
        client.rpc("cinewave_is_admin"),
      ]);
      if (generation !== epoch.current) return;
      if (profileError || listError) {
        patch({
          cloudReady: false,
          admin: !role.error && role.data === true,
          error: "setup",
        });
        return;
      }
      patch({
        profile,
        ...(revision === listRevision.current
          ? { list: new Set(list.map((row) => "catalog:" + row.movie_id)) }
          : {}),
        cloudReady: true,
        admin: !role.error && role.data === true,
        error: "",
      });
    } catch {
      if (generation === epoch.current)
        patch({ cloudReady: false, error: "setup" });
    }
  }
  useEffect(() => {
    let active = true;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      setTimeout(() => {
        if (active) changed(session, event);
      }, 0);
    });
    client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) patch({ ready: true, error: "failed" });
        else changed(data.session);
      })
      .catch(() => {
        if (active) patch({ ready: true, error: "failed" });
      });
    return () => {
      active = false;
      ++epoch.current;
      subscription.unsubscribe();
    };
  }, []);
  async function toggle(movie, forceAdd = false) {
    const state = current.current;
    if (!state.ready || pending.current.has(movie.id))
      throw new Error("working");
    const has = state.list.has(movie.id);
    if (forceAdd && has) return;
    pending.current.add(movie.id);
    ++listRevision.current;
    const generation = epoch.current;
    try {
      if (state.session) {
        if (!state.cloudReady) throw new Error("listFailed");
        const movieId = movie.id.replace(/^catalog:/, ""),
          uid = state.session.user.id;
        const { error } = has
          ? await client
              .from("user_watchlist")
              .delete()
              .eq("user_id", uid)
              .eq("movie_id", movieId)
          : await client
              .from("user_watchlist")
              .insert({ user_id: uid, movie_id: movieId });
        if (error) throw new Error("listFailed");
      }
      if (generation !== epoch.current) return;
      const next = new Set(current.current.list);
      if (has) next.delete(movie.id);
      else next.add(movie.id);
      if (!state.session) writeStored("cinewave:my-list", [...next]);
      current.current = { ...current.current, list: next };
      patch({ list: next });
    } finally {
      pending.current.delete(movie.id);
    }
  }
  async function logout() {
    accept.current = false;
    ++epoch.current;
    const result = await signOut();
    await changed(null);
    if (result.failed) location.reload();
  }
  return {
    ...account,
    toggle,
    logout,
    refresh: (session) => {
      accept.current = true;
      return changed(session);
    },
    refreshProfile: (profile) => patch({ profile }),
    guestList,
  };
}
