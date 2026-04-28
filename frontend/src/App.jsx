import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "";

const initialSchemeForm = {
  name: "",
  ministry: "",
  category: "",
  state: "",
  min_age: 18,
  max_income: 500000,
  eligibility_text: "",
  benefits: "",
  apply_link: "",
};

const initialEligibility = {
  age: 21,
  annual_income: 300000,
  category: "Student",
  state: "Tamil Nadu",
};

const initialProfile = {
  age: 21,
  annual_income: 300000,
  category: "Student",
  state: "All India",
  occupation: "Student",
};

function toNumberForm(data) {
  return { ...data, min_age: Number(data.min_age), max_income: Number(data.max_income) };
}

function AuthPage({ authMode, setAuthMode, authForm, setAuthForm, submitAuth, authLoading, authError }) {
  return (
    <div className="auth-shell">
      <section className="auth-card">
        <h1>Government Scheme Finder</h1>
        <p className="sub">Login or create account to continue</p>
        <div className="auth-tabs">
          <button className={authMode === "login" ? "" : "secondary"} onClick={() => setAuthMode("login")}>Login</button>
          <button className={authMode === "register" ? "" : "secondary"} onClick={() => setAuthMode("register")}>Register</button>
        </div>
        <form className="auth-grid" onSubmit={submitAuth}>
          {authMode === "register" && (
            <label className="field field-full">
              <span>Name</span>
              <input value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} required />
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} required />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} required />
          </label>
          <button type="submit" disabled={authLoading}>{authLoading ? "Please wait..." : authMode === "login" ? "Login" : "Create Account"}</button>
        </form>
        {authError && <p className="error-text">{authError}</p>}
      </section>
    </div>
  );
}

function Layout({ user, logout }) {
  return (
    <div className="top-shell">
      <aside className="sidebar">
        <h2>Scheme Finder</h2>
        <p className="muted">{user?.name} ({user?.role})</p>
        <nav className="menu">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/schemes">Schemes</NavLink>
          <NavLink to="/eligibility">Eligibility</NavLink>
          <NavLink to="/profile">Profile</NavLink>
          {user?.role === "admin" && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <button onClick={logout}>Logout</button>
      </aside>
      <main className="main-content">
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/schemes" element={<SchemesPage />} />
          <Route path="/eligibility" element={<EligibilityPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          {user?.role === "admin" && <Route path="/admin" element={<AdminPage />} />}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

let shared = {};
function DashboardPage() {
  const { metrics } = shared;
  const navigate = useNavigate();
  return (
    <>
      <h1>Dashboard</h1>
      <section className="dashboard-grid">
        <article className="metric-card"><p>Total Schemes</p><h3>{metrics.total}</h3></article>
        <article className="metric-card clickable" onClick={() => navigate("/schemes?bookmarked=1")}><p>Bookmarked</p><h3>{metrics.savedCount}</h3></article>
      </section>
    </>
  );
}

function SchemesPage() {
  const { filters, setFilters, fetchSchemes, schemes, bookmarkSet, toggleBookmark, exportCsv, user, startEdit, onDeleteScheme } = shared;
  const location = useLocation();
  const bookmarkedOnly = new URLSearchParams(location.search).get("bookmarked") === "1";
  const visibleSchemes = bookmarkedOnly ? schemes.filter((s) => bookmarkSet.has(s.id)) : schemes;

  return (
    <>
      <h1>Schemes</h1>
      <section className="card">
        {bookmarkedOnly && <p className="hint-text">Showing bookmarked schemes only.</p>}
        <div className="grid filters">
          <input placeholder="Search by name" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value, page: 1 })} />
          <input placeholder="Filter by category" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value, page: 1 })} />
          <input placeholder="Filter by state" value={filters.state} onChange={(e) => setFilters({ ...filters, state: e.target.value, page: 1 })} />
          <button onClick={exportCsv} type="button" className="secondary">Export CSV</button>
        </div>
        <div className="pagination-row">
          <button type="button" className="secondary" disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Prev</button>
          <span>Page {filters.page}</span>
          <button type="button" className="secondary" onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Next</button>
        </div>
        <div className="list">
          {visibleSchemes.map((s) => (
            <article className="scheme" key={s.id}>
              <h3>{s.name}</h3>
              <p><strong>Ministry:</strong> {s.ministry}</p>
              <p><strong>Category:</strong> {s.category}</p>
              <p><strong>State:</strong> {s.state}</p>
              <p><strong>Benefits:</strong> {s.benefits}</p>
              <a href={s.apply_link} target="_blank" rel="noreferrer">Open Scheme Link</a>
              <div className="actions">
                <button onClick={() => toggleBookmark(s.id)}>{bookmarkSet.has(s.id) ? "Bookmarked" : "Bookmark"}</button>
                {user?.role === "admin" && <button className="secondary" onClick={() => startEdit(s)}>Edit</button>}
                {user?.role === "admin" && <button className="danger" onClick={() => onDeleteScheme(s.id)}>Delete</button>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function EligibilityPage() {
  const { eligibility, setEligibility, runEligibility, runEligibilityFromProfile, eligibilityResult, profile } = shared;
  return (
    <>
      <h1>Eligibility Checker</h1>
      <section className="card">
        <div className="actions">
          <button type="button" className="secondary" onClick={runEligibilityFromProfile}>Use Profile Details</button>
        </div>
        {profile && <p className="hint-text">Profile: Age {profile.age}, Income {profile.annual_income}, Category {profile.category}, State {profile.state}</p>}
        <form className="grid" onSubmit={runEligibility}>
          <input type="number" placeholder="Age" value={eligibility.age} onChange={(e) => setEligibility({ ...eligibility, age: Number(e.target.value) })} required />
          <input type="number" placeholder="Annual Income" value={eligibility.annual_income} onChange={(e) => setEligibility({ ...eligibility, annual_income: Number(e.target.value) })} required />
          <input placeholder="Category" value={eligibility.category} onChange={(e) => setEligibility({ ...eligibility, category: e.target.value })} required />
          <input placeholder="State" value={eligibility.state} onChange={(e) => setEligibility({ ...eligibility, state: e.target.value })} required />
          <button type="submit">Check Eligibility</button>
        </form>
        <ul>
          {eligibilityResult.map((row) => (
            <li key={row.scheme.id}>{row.scheme.name} - {row.match ? "Eligible" : `Not eligible (${row.reasons.join(", ")})`}</li>
          ))}
        </ul>
      </section>
    </>
  );
}

function ProfilePage() {
  const { profile, setProfile, saveProfile } = shared;
  return (
    <>
      <h1>User Profile</h1>
      <section className="card">
        <h2>Personal Details</h2>
        <p className="hint-text">Eligibility recommendations use these details.</p>
        <form className="profile-grid" onSubmit={saveProfile}>
          <label className="field">
            <span>Age</span>
            <input type="number" value={profile.age} onChange={(e) => setProfile({ ...profile, age: Number(e.target.value) })} required />
          </label>
          <label className="field">
            <span>Annual Income</span>
            <input type="number" value={profile.annual_income} onChange={(e) => setProfile({ ...profile, annual_income: Number(e.target.value) })} required />
          </label>
          <label className="field">
            <span>Category</span>
            <input value={profile.category} onChange={(e) => setProfile({ ...profile, category: e.target.value })} required />
          </label>
          <label className="field">
            <span>State</span>
            <input value={profile.state} onChange={(e) => setProfile({ ...profile, state: e.target.value })} required />
          </label>
          <label className="field field-full">
            <span>Occupation</span>
            <input value={profile.occupation} onChange={(e) => setProfile({ ...profile, occupation: e.target.value })} required />
          </label>
          <button type="submit">Save Profile</button>
        </form>
      </section>
    </>
  );
}

function AdminPage() {
  const { form, setForm, onCreateScheme, editingSchemeId, editForm, setEditForm, onSaveEdit, cancelEdit } = shared;
  return (
    <>
      <h1>Admin Panel</h1>
      <section className="card">
        <h2>Add Scheme</h2>
        <form className="grid" onSubmit={onCreateScheme}>
          {Object.keys(initialSchemeForm).map((key) => (
            <input key={key} type={key.includes("age") || key.includes("income") ? "number" : "text"} placeholder={key.replaceAll("_", " ")} value={form[key]} onChange={(e) => setForm({ ...form, [key]: key.includes("age") || key.includes("income") ? Number(e.target.value) : e.target.value })} required />
          ))}
          <button type="submit">Add Scheme</button>
        </form>
      </section>
      {editingSchemeId && (
        <section className="card highlight">
          <h2>Edit Scheme #{editingSchemeId}</h2>
          <form className="grid" onSubmit={onSaveEdit}>
            {Object.keys(initialSchemeForm).map((key) => (
              <input key={key} type={key.includes("age") || key.includes("income") ? "number" : "text"} placeholder={key.replaceAll("_", " ")} value={editForm[key]} onChange={(e) => setEditForm({ ...editForm, [key]: key.includes("age") || key.includes("income") ? Number(e.target.value) : e.target.value })} required />
            ))}
            <button type="submit">Save Changes</button>
            <button type="button" className="secondary" onClick={cancelEdit}>Cancel</button>
          </form>
        </section>
      )}
    </>
  );
}

export default function App() {
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });
  const [schemes, setSchemes] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [filters, setFilters] = useState({ q: "", category: "", state: "", page: 1, page_size: 10 });
  const [form, setForm] = useState(initialSchemeForm);
  const [editingSchemeId, setEditingSchemeId] = useState(null);
  const [editForm, setEditForm] = useState(initialSchemeForm);
  const [eligibility, setEligibility] = useState(initialEligibility);
  const [eligibilityResult, setEligibilityResult] = useState([]);
  const [profile, setProfile] = useState(initialProfile);

  const api = useMemo(() => axios.create({ baseURL: API_URL }), []);
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchSchemes = async () => {
    const res = await api.get("/api/v1/schemes", { params: filters, headers: authHeaders });
    setSchemes(res.data);
  };
  const fetchBookmarks = async () => {
    const res = await api.get("/api/v1/bookmarks", { headers: authHeaders });
    setBookmarks(res.data);
  };
  const fetchProfile = async () => {
    const res = await api.get("/api/v1/profile", { headers: authHeaders });
    setProfile(res.data);
    setEligibility({ age: res.data.age, annual_income: res.data.annual_income, category: res.data.category, state: res.data.state });
  };

  useEffect(() => {
    if (!token) return;
    fetchBookmarks();
    fetchProfile();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchSchemes();
  }, [token, filters.q, filters.category, filters.state, filters.page, filters.page_size]);

  const submitAuth = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    const path = authMode === "login" ? "/api/v1/auth/login" : "/api/v1/auth/register";
    const payload = authMode === "login" ? { email: authForm.email, password: authForm.password } : { name: authForm.name, email: authForm.email, password: authForm.password };
    try {
      const res = await api.post(path, payload);
      setToken(res.data.access_token);
      setUser(res.data.user);
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setAuthError(Array.isArray(detail) ? detail.map((item) => item.msg).join(", ") : String(detail || error?.message || "Authentication failed"));
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    setToken("");
    setUser(null);
    setSchemes([]);
    setBookmarks([]);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    const res = await api.put("/api/v1/profile", profile, { headers: authHeaders });
    setProfile(res.data);
  };

  const onCreateScheme = async (e) => {
    e.preventDefault();
    await api.post("/api/v1/schemes", toNumberForm(form), { headers: authHeaders });
    setForm(initialSchemeForm);
    fetchSchemes();
  };

  const onDeleteScheme = async (id) => {
    await api.delete(`/api/v1/schemes/${id}`, { headers: authHeaders });
    fetchSchemes();
  };
  const startEdit = (scheme) => {
    setEditingSchemeId(scheme.id);
    setEditForm({ ...scheme });
  };
  const cancelEdit = () => {
    setEditingSchemeId(null);
    setEditForm(initialSchemeForm);
  };
  const onSaveEdit = async (e) => {
    e.preventDefault();
    await api.put(`/api/v1/schemes/${editingSchemeId}`, toNumberForm(editForm), { headers: authHeaders });
    cancelEdit();
    fetchSchemes();
  };

  const toggleBookmark = async (schemeId) => {
    const isSaved = bookmarks.some((b) => b.id === schemeId);
    if (isSaved) await api.delete(`/api/v1/bookmarks/${schemeId}`, { headers: authHeaders });
    else await api.post("/api/v1/bookmarks", { scheme_id: schemeId }, { headers: authHeaders });
    fetchBookmarks();
  };

  const runEligibility = async (e) => {
    e.preventDefault();
    const res = await api.post("/api/v1/eligibility", eligibility, { headers: authHeaders });
    setEligibilityResult(res.data);
  };

  const runEligibilityFromProfile = async () => {
    const res = await api.get("/api/v1/eligibility/from-profile", { headers: authHeaders });
    setEligibilityResult(res.data.results);
  };

  const exportCsv = () => {
    if (schemes.length === 0) return;
    const headers = ["id", "name", "ministry", "category", "state", "min_age", "max_income", "eligibility_text", "benefits", "apply_link"];
    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = schemes.map((scheme) => headers.map((h) => escapeCsv(scheme[h])).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "government-schemes.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const bookmarkSet = useMemo(() => new Set(bookmarks.map((b) => b.id)), [bookmarks]);
  const metrics = useMemo(() => ({ total: schemes.length, savedCount: bookmarks.length }), [schemes, bookmarks]);

  shared = {
    metrics,
    filters,
    setFilters,
    fetchSchemes,
    schemes,
    bookmarkSet,
    toggleBookmark,
    exportCsv,
    user,
    startEdit,
    onDeleteScheme,
    eligibility,
    setEligibility,
    runEligibility,
    runEligibilityFromProfile,
    eligibilityResult,
    profile,
    setProfile,
    saveProfile,
    form,
    setForm,
    onCreateScheme,
    editingSchemeId,
    editForm,
    setEditForm,
    onSaveEdit,
    cancelEdit,
  };

  return (
    <BrowserRouter>
      {!token ? (
        <AuthPage authMode={authMode} setAuthMode={setAuthMode} authForm={authForm} setAuthForm={setAuthForm} submitAuth={submitAuth} authLoading={authLoading} authError={authError} />
      ) : (
        <Layout user={user} logout={logout} />
      )}
    </BrowserRouter>
  );
}
