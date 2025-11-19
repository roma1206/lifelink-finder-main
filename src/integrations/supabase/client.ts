// Supabase client wrapper: prefer a real Supabase client when Vite env vars
// VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set. Otherwise fall back
// to the localStorage-based stub (useful for offline/static development).

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

// Will hold either the real supabase client or the local stub
let supabaseClient: any = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    // Log for developer visibility that real Supabase client is active
    // eslint-disable-next-line no-console
    console.info("Supabase client initialized using VITE env vars.");
  } catch (e) {
    // If creation fails for any reason, we'll fall back to local stub below
    // but log to console to aid debugging.
    // eslint-disable-next-line no-console
    console.warn("Failed to create Supabase client, falling back to local stub:", e);
    supabaseClient = null;
  }
}

// If no real client, define the localStorage-backed stub
if (!supabaseClient) {
  // Local stub for Supabase client to support a static/local-only site.
  // Behavior:
  // - signUp / signInWithPassword create a local session stored in localStorage
  // - from('user_roles').insert(...) stores roles in localStorage under 'lifelink_roles'
  // - from('user_roles').select(...).eq('user_id', id) returns stored role for that id
  // - auth.onAuthStateChange allows listeners and notifies them on sign in/up

  type Listener = (event: string, session: any) => void;

  const listeners: Listener[] = [];

  function getStored(table: string) {
    try {
      return JSON.parse(localStorage.getItem(`lifelink_table_${table}`) || "null") || [];
    } catch (e) {
      return [];
    }
  }

  function setStored(table: string, data: any[]) {
    localStorage.setItem(`lifelink_table_${table}`, JSON.stringify(data));
  }

  function getStoredUsers() {
    try {
      return JSON.parse(localStorage.getItem("lifelink_users") || "{}");
    } catch (e) {
      return {};
    }
  }

  function setStoredUsers(users: Record<string, any>) {
    localStorage.setItem("lifelink_users", JSON.stringify(users));
  }

  function notifyListeners(event: string, session: any) {
    listeners.forEach((l) => {
      try {
        l(event, session);
      } catch (e) {
        // ignore
      }
    });
  }

  const auth = {
    onAuthStateChange(cb: Listener) {
      listeners.push(cb);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              const i = listeners.indexOf(cb);
              if (i >= 0) listeners.splice(i, 1);
            },
          },
        },
      };
    },
    async getSession() {
      const session = JSON.parse(localStorage.getItem("lifelink_session") || "null");
      return { data: { session } };
    },
    async getUser() {
      const user = JSON.parse(localStorage.getItem("lifelink_user") || "null");
      return { data: { user } };
    },
    async signUp({ email, password, options }: any) {
      const users = getStoredUsers();
      const id = `local_${Date.now()}`;
      const user = { id, email, password, full_name: options?.data?.full_name ?? "" };
      users[email] = user;
      setStoredUsers(users);

      // Persist session and user
      const session = { user: { id, email } };
      localStorage.setItem("lifelink_session", JSON.stringify(session));
      localStorage.setItem("lifelink_user", JSON.stringify({ id, email }));

      // Optionally store role via user_roles table insert (handled elsewhere by callers)
      notifyListeners("SIGNED_IN", session);
      return { data: { user }, error: null };
    },
    async signInWithPassword({ email, password }: any) {
      const users = getStoredUsers();
      let user = users[email];
      if (!user) {
        const id = `local_${Date.now()}`;
        user = { id, email, password, full_name: "" };
        users[email] = user;
        setStoredUsers(users);
      }

      const session = { user: { id: user.id, email } };
      localStorage.setItem("lifelink_session", JSON.stringify(session));
      localStorage.setItem("lifelink_user", JSON.stringify({ id: user.id, email }));

      notifyListeners("SIGNED_IN", session);
      return { data: { user }, error: null };
    },
    async signOut() {
      localStorage.removeItem("lifelink_session");
      localStorage.removeItem("lifelink_user");
      notifyListeners("SIGNED_OUT", null);
      return { data: null, error: null };
    }
  };

  function applyFilters(rows: any[], filters: Array<{ col: string; val: any }>) {
    return rows.filter((r) => filters.every((f) => {
      // support nested selects like seeker_id etc. For now simple equality
      return r[f.col] === f.val;
    }));
  }

  function from(table: string) {
    const builder: any = {
      _table: table,
      _cols: "*",
      _filters: [] as Array<{ col: string; val: any }>,
      _order: null as any,
      _limit: null as number | null,
      _options: undefined as any,
      select(cols: string, options?: any) {
        this._cols = cols;
        this._options = options;
        return this;
      },
      order(_field: string, _opts?: any) {
        // no-op for local stub
        return this;
      },
      limit(n: number) {
        this._limit = n;
        return this;
      },
      async eq(col: string, val: any) {
        this._filters.push({ col, val });
        const rows = getStored(this._table);
        const filtered = applyFilters(rows, this._filters);

        if (this._options && this._options.head) {
          // return only count information
          return { count: filtered.length, data: [], error: null };
        }

        let result = filtered;
        if (this._limit != null) result = result.slice(0, this._limit);
        return { data: result, error: null };
      },
      async insert(rows: any[] | any) {
        const rowsArr = Array.isArray(rows) ? rows : [rows];
        const existing = getStored(this._table);
        // assign ids if missing
        rowsArr.forEach((r: any) => {
          if (!r.id) r.id = `local_${Date.now()}_${Math.floor(Math.random()*10000)}`;
          existing.unshift(r);
        });
        setStored(this._table, existing);
        return { data: rowsArr, error: null };
      },
      async update(data: any) {
        const rows = getStored(this._table);
        const filtered = applyFilters(rows, this._filters);
        const updated = rows.map((r) => {
          if (filtered.includes(r)) return { ...r, ...data };
          return r;
        });
        setStored(this._table, updated);
        return { data: [], error: null };
      },
      async delete() {
        const rows = getStored(this._table);
        const filtered = applyFilters(rows, this._filters);
        const remaining = rows.filter((r) => !filtered.includes(r));
        setStored(this._table, remaining);
        return { data: [], error: null };
      },
      async single() {
        const rows = getStored(this._table);
        const filtered = applyFilters(rows, this._filters);
        return { data: filtered.length > 0 ? filtered[0] : null, error: null };
      }
    };

    return builder;
  }

  // channel / realtime stubs
  const channels: any[] = [];
  function channel(name: string) {
    const ch = {
      name,
      on(_type: string, _opts: any, cb: any) { return ch; },
      subscribe() { channels.push(ch); return ch; },
    };
    return ch;
  }

  function removeChannel(ch: any) {
    const i = channels.indexOf(ch);
    if (i >= 0) channels.splice(i, 1);
  }

  const localStub = {
    auth,
    from,
    channel,
    removeChannel,
  };

  supabaseClient = localStub;
}

export const supabase = supabaseClient;