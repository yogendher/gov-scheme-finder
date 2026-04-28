import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

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

export default function App() {
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
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

  useEffect(() => {
    if (!token) return;
    fetchSchemes();
    fetchBookmarks();
    fetchApplications();
  }, [token]);

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

  const submitAuth = async (e) => {
    e.preventDefault();
    const path = authMode === "login" ? "/api/v1/auth/login" : "/api/v1/auth/register";
    const payload = authMode === "login"
      ? { email: authForm.email, password: authForm.password }
      : { name: authForm.name, email: authForm.email, password: authForm.password };

    const res = await api.post(path, payload);
    setToken(res.data.access_token);
    setUser(res.data.user);
    localStorage.setItem("token", res.data.access_token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
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
    if (isSaved) {
      await api.delete(`/api/v1/bookmarks/${schemeId}`, { headers: authHeaders });
    } else {
      await api.post("/api/v1/bookmarks", { scheme_id: schemeId }, { headers: authHeaders });
    }
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

  if (!token) {
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
            <button type="submit">{authMode === "login" ? "Login" : "Create Account"}</button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="top-row">
        <div>
          <h1>Government Scheme Finder</h1>
          <p className="sub">Welcome, {user?.name} ({user?.role})</p>
        </div>
        <button onClick={logout}>Logout</button>
      </div>

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

      {user?.role === "admin" && (
        <section className="card">
          <h2>Add Scheme (Admin)</h2>
          <form className="grid" onSubmit={onCreateScheme}>
            {Object.keys(initialSchemeForm).map((key) => (
              <input key={key} type={key.includes("age") || key.includes("income") ? "number" : "text"} placeholder={key.replaceAll("_", " ")} value={form[key]} onChange={(e) => setForm({ ...form, [key]: key.includes("age") || key.includes("income") ? Number(e.target.value) : e.target.value })} required />
            ))}
            <button type="submit">Add Scheme</button>
          </form>
        </section>
      )}

      <section className="card">
        <h2>Find Schemes</h2>
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

      {editingSchemeId && user?.role === "admin" && (
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

      <section className="card">
        <h2>Eligibility Checker</h2>
        <form className="grid" onSubmit={runEligibility}>
          <input type="number" placeholder="Age" value={eligibility.age} onChange={(e) => setEligibility({ ...eligibility, age: Number(e.target.value) })} required />
          <input type="number" placeholder="Annual Income" value={eligibility.annual_income} onChange={(e) => setEligibility({ ...eligibility, annual_income: Number(e.target.value) })} required />
          <input placeholder="Category" value={eligibility.category} onChange={(e) => setEligibility({ ...eligibility, category: e.target.value })} required />
          <input placeholder="State" value={eligibility.state} onChange={(e) => setEligibility({ ...eligibility, state: e.target.value })} required />
          <button type="submit">Check Eligibility</button>
        </form>
        <ul>
          {eligibilityResult.map((row) => (
            <li key={row.scheme.id}>
              {row.scheme.name} - {row.match ? "Eligible" : `Not eligible (${row.reasons.join(", ")})`}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
