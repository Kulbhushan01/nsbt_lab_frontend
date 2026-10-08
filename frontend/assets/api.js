// Shared API client + auth helpers for the NSBT Library Management System.
// Loaded by every page in /student and /admin. Talks to the Express
// backend at /api (same origin, since the backend also serves this
// frontend as static files).

const API_BASE = "/api";

const Auth = {
  getToken() {
    return localStorage.getItem("nsbt_token");
  },
  getUser() {
    try {
      return JSON.parse(localStorage.getItem("nsbt_user"));
    } catch (e) {
      return null;
    }
  },
  setSession(token, user) {
    localStorage.setItem("nsbt_token", token);
    localStorage.setItem("nsbt_user", JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem("nsbt_token");
    localStorage.removeItem("nsbt_user");
  },
  logout() {
    this.clear();
    window.location.href = "/login.html";
  },
  // Call at the top of every protected page. Redirects to login if there's
  // no session, or if the page requires a role the user doesn't have.
  requireRole(role) {
    return this.requireAnyRole(role ? [role] : null);
  },
  // Same idea, but accepts a list of roles (e.g. the student portal is
  // shared by both "student" and "faculty" accounts).
  requireAnyRole(roles) {
    const user = this.getUser();
    const token = this.getToken();
    if (!token || !user || (roles && !roles.includes(user.role))) {
      window.location.href = "/login.html";
      return null;
    }
    return user;
  },
};

async function api(path, options = {}) {
  const token = Auth.getToken();
  const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
  if (token) headers.Authorization = "Bearer " + token;

  let res;
  try {
    res = await fetch(API_BASE + path, Object.assign({}, options, { headers }));
  } catch (networkErr) {
    throw new Error("Can't reach the server. Is the backend running?");
  }

  if (res.status === 401) {
    Auth.clear();
    window.location.href = "/login.html";
    throw new Error("Session expired. Please log in again.");
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      /* non-JSON response, leave data null */
    }
  }

  if (!res.ok) {
    throw new Error((data && data.error) || "Request failed (" + res.status + ").");
  }
  return data;
}

// Small helper for the recurring "show a message under a form" pattern.
function flashMsg(elId, text, isError) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = text;
  el.classList.add("show");
  el.classList.toggle("error", !!isError);
}

function formatDate(iso) {
  if (!iso) return "Not set";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function isOverdue(dueDate, status) {
  if (status !== "issued") return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
