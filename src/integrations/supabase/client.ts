// Local stub for Supabase client to support a static/local-only site.
// This replaces the real Supabase connection so the app does not talk to a DB.
// Behavior:
// - signUp / signInWithPassword create a local session stored in localStorage
// - from('user_roles').insert(...) stores roles in localStorage under 'lifelink_roles'
// - from('user_roles').select(...).eq('user_id', id) returns stored role for that id
// - auth.onAuthStateChange allows listeners and notifies them on sign in/up

type Listener = (event: string, session: any) => void;

const listeners: Listener[] = [];

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

function getStoredRoles() {
  try {
    return JSON.parse(localStorage.getItem("lifelink_roles") || "{}");
  } catch (e) {
    return {};
  }
}

function setStoredRoles(roles: Record<string, string>) {
  localStorage.setItem("lifelink_roles", JSON.stringify(roles));
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

    // Store role if provided via insert to user_roles (caller may also insert separately)
    if (options?.data?.role) {
      const roles = getStoredRoles();
      roles[id] = options.data.role;
      setStoredRoles(roles);
    }

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

function from(table: string) {
  const builder: any = {
    _table: table,
    _select(cols: string) {
      this._cols = cols;
      return this;
    },
    select(cols: string) { return this._select(cols); },
    async eq(col: string, val: any) {
      // Only user_roles is queried currently by app
      if (table === "user_roles" && col === "user_id") {
        const roles = getStoredRoles();
        const role = roles[val];
        return { data: role ? [{ role }] : [], error: null };
      }
      return { data: [], error: null };
    },
    async insert(rows: any[]) {
      if (table === "user_roles") {
        const roles = getStoredRoles();
        rows.forEach((r) => {
          if (r.user_id && r.role) {
            roles[r.user_id] = r.role;
          }
        });
        setStoredRoles(roles);
        return { data: rows, error: null };
      }
      return { data: rows, error: null };
    },
    async update(_data: any) {
      return { data: [], error: null };
    },
    async delete() {
      return { data: [], error: null };
    }
  };

  return builder;
}

export const supabase = {
  auth,
  from,
};