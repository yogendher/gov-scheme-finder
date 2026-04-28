import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { BrowserRouter, Navigate, NavLink, Route, Routes } from "react-router-dom";

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

function toNumberForm(data) {
  return {
    ...data,
    min_age: Number(data.min_age),
    max_income: Number(data.max_income),
  };
}

function AuthPage({ authMode, setAuthMode, authForm, setAuthForm, submitAuth, authLoading, authError }) {
  return (
    <div className="container">
      <h1>Government Scheme Finder</h1>
      <p className="sub">Login/Register to continue</p>
      <section className="card">
        <div className="actions">
          <button className={authMode === "login" ? "" : "secondary"} onClick={() => setAuthMode("login")}>Login</button>
          <button className={authMode === "register" ? "" : "secondary"} onClick={() => setAuthMode("register")}>Register</button>
        </div>
        <form className="grid" onSubmit={submitAuth}>
          {authMode === "register" && (
            <input placeholder="Name" value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} required />
          )}
          <input type="email" placeholder="Email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} required />
          <input type="password" placeholder="Password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} required />
          <button type="submit" disabled={authLoading}>{authLoading ? "Please wait..." : authMode === "login" ? "Login" : "Create Account"}</button>
        </form>
        {authError && <p className="error-text">{authError}</p>}
        <p className="hint-text">API: {API_URL}</p>
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
          <NavLink to="/applications">Applications</NavLink>
          {user?.role === "admin" && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <button onClick={logout}>Logout</button>
      </aside>
      <main className="main-content">
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/schemes" element={<SchemesPage />} />
          <Route path="/eligibility" element={<EligibilityPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
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
  return (
    <>
      <h1>Dashboard</h1>
      <section className="dashboard-grid">
        <article className="metric-card"><p>Total Schemes</p><h3>{metrics.total}</h3></article>
        <article className="metric-card"><p>Bookmarked</p><h3>{metrics.savedCount}</h3></article>
        <article className="metric-card"><p>Applications</p><h3>{metrics.applications}</h3></article>
      </section>
      <section className="card">
        <h2>Category Distribution</h2>
        <div className="chart-wrap">
          {Object.entries(metrics.byCategory).map(([category, count]) => (
            <div className="bar-row" key={category}>
              <span>{category}</span>
              <div className="bar-bg"><div className="bar-fill" style={{ width: `${(count / metrics.maxCategoryCount) * 100}%` }} /></div>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function SchemesPage() {
  const { filters, setFilters, fetchSchemes, schemes, bookmarkSet, toggleBookmark, createApplication, exportCsv, user, startEdit, onDeleteScheme } = shared;
  return (
    <>
      <h1>Schemes</h1>
      <section className="card">
        <div className="grid filters">
          <input placeholder="Search by name" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
          <input placeholder="Filter by category" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} />
          <input placeholder="Filter by state" value={filters.state} onChange={(e) => setFilters({ ...filters, state: e.target.value })} />
          <button onClick={fetchSchemes} type="button">Apply Filters</button>
          <button onClick={exportCsv} type="button" className="secondary">Export CSV</button>
        </div>
        <div className="list">
          {schemes.map((s) => (
            <article className="scheme" key={s.id}>
              <h3>{s.name}</h3>
              <p><strong>Ministry:</strong> {s.ministry}</p>
              <p><strong>Category:</strong> {s.category}</p>
              <p><strong>State:</strong> {s.state}</p>
              <p><strong>Benefits:</strong> {s.benefits}</p>
              <a href={s.apply_link} target="_blank" rel="noreferrer">Apply Link</a>
              <div className="actions">
                <button onClick={() => toggleBookmark(s.id)}>{bookmarkSet.has(s.id) ? "Bookmarked" : "Bookmark"}</button>
                <button className="secondary" onClick={() => createApplication(s.id)}>Track Apply</button>
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
  const { eligibility, setEligibility, runEligibility, eligibilityResult } = shared;
  return (
    <>
      <h1>Eligibility Checker</h1>
      <section className="card">
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

function ApplicationsPage() {
  const { applications } = shared;
  return (
    <>
      <h1>Applications</h1>
      <section className="card">
        {applications.length === 0 && <p>No tracked applications yet.</p>}
        {applications.map((app) => (
          <div key={app.id} className="scheme">
            <p><strong>Scheme ID:</strong> {app.scheme_id}</p>
            <p><strong>Status:</strong> {app.status}</p>
            <p><strong>Notes:</strong> {app.notes || "-"}</p>
          </div>
        ))}
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
  const [applications, setApplications] = useState([]);
  const [filters, setFilters] = useState({ q: "", category: "", state: "", page: 1, page_size: 10 });
  const [form, setForm] = useState(initialSchemeForm);
  const [editingSchemeId, setEditingSchemeId] = useState(null);
  const [editForm, setEditForm] = useState(initialSchemeForm);
  const [eligibility, setEligibility] = useState(initialEligibility);
  const [eligibilityResult, setEligibilityResult] = useState([]);

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
  const fetchApplications = async () => {
    const res = await api.get("/api/v1/applications", { headers: authHeaders });
    setApplications(res.data);
  };

  useEffect(() => {
    if (!token) return;
    fetchSchemes();
    fetchBookmarks();
    fetchApplications();
  }, [token]);

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
      if (Array.isArray(detail)) {
        setAuthError(detail.map((item) => item.msg).join(", "));
      } else {
        setAuthError(String(detail || error?.message || "Authentication failed"));
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    setToken("");
    setUser(null);
    setSchemes([]);
    setBookmarks([]);
    setApplications([]);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
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
  const createApplication = async (schemeId) => {
    await api.post("/api/v1/applications", { scheme_id: schemeId, status: "interested" }, { headers: authHeaders });
    fetchApplications();
  };
  const runEligibility = async (e) => {
    e.preventDefault();
    const res = await api.post("/api/v1/eligibility", eligibility, { headers: authHeaders });
    setEligibilityResult(res.data);
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
  const metrics = useMemo(() => {
    const byCategory = {};
    schemes.forEach((s) => { byCategory[s.category] = (byCategory[s.category] || 0) + 1; });
    return {
      total: schemes.length,
      savedCount: bookmarks.length,
      applications: applications.length,
      byCategory,
      maxCategoryCount: Math.max(1, ...Object.values(byCategory)),
    };
  }, [schemes, bookmarks, applications]);

  shared = {
    metrics,
    filters,
    setFilters,
    fetchSchemes,
    schemes,
    bookmarkSet,
    toggleBookmark,
    createApplication,
    exportCsv,
    user,
    startEdit,
    onDeleteScheme,
    eligibility,
    setEligibility,
    runEligibility,
    eligibilityResult,
    applications,
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
