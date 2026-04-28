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

function Toast({ toast }) {
  if (!toast) return null;
  return <div className={`toast ${toast.type === "error" ? "error" : "success"}`}>{toast.message}</div>;
}

function AuthPage({ authMode, setAuthMode, authForm, setAuthForm, submitAuth, authLoading, authError }) {
  return (
    <div className="auth-shell">
      <section className="auth-card auth-two-col">
        <div className="auth-info">
          <h1>Government Scheme Finder</h1>
          <p className="sub">Discover central and state schemes quickly.</p>
          <ul className="auth-points">
            <li>Save profile once for faster eligibility checks</li>
            <li>Bookmark schemes and revisit from dashboard</li>
            <li>Direct links to official portals</li>
          </ul>
        </div>
        <div>
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
            <label className="field field-full">
              <span>Email</span>
              <input type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} required />
            </label>
            <label className="field field-full">
              <span>Password</span>
              <input type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} required />
            </label>
            <button type="submit" disabled={authLoading}>{authLoading ? "Please wait..." : authMode === "login" ? "Login" : "Create Account"}</button>
          </form>
          {authError && <p className="error-text">{authError}</p>}
        </div>
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
  const { metrics, schemes, schemesLoading } = shared;
  const navigate = useNavigate();
  const recent = schemes.slice(0, 5);
  return (
    <>
      <h1>Dashboard</h1>
      <section className="dashboard-grid">
        <article className="metric-card"><p>Total Schemes</p><h3>{metrics.total}</h3><small>Across central and state programs</small></article>
        <article className="metric-card clickable" onClick={() => navigate("/schemes?bookmarked=1")}><p>Bookmarked</p><h3>{metrics.savedCount}</h3><small>Click to open saved schemes</small></article>
        <article className="metric-card"><p>States Covered</p><h3>{metrics.statesCount}</h3><small>Coverage footprint</small></article>
      </section>
      <section className="card">
        <h2>Recently Added Schemes</h2>
        {schemesLoading && (
          <div className="stack-list">
            <div className="list-row skeleton-row" />
            <div className="list-row skeleton-row" />
            <div className="list-row skeleton-row" />
          </div>
        )}
        {!schemesLoading && recent.length === 0 && <p className="hint-text">No schemes yet. Use Admin panel to bootstrap.</p>}
        <div className="stack-list">
          {recent.map((s) => (
            <div key={s.id} className="list-row">
              <div>
                <strong>{s.name}</strong>
                <p className="hint-text">{s.ministry}</p>
              </div>
              <span className="chip alt">{s.state}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function SchemesPage() {
  const { filters, setFilters, schemesLoading, schemes, bookmarkSet, toggleBookmark, exportCsv, user, startEdit, onDeleteScheme, checkSingleSchemeEligibility, schemeEligibilityStatus } = shared;
  const navigate = useNavigate();
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
        <div className="quick-filters">
          {["All India", "Student", "Farmer", "Women", "Health"].map((tag) => (
            <button
              key={tag}
              type="button"
              className="secondary"
              onClick={() => setFilters({ ...filters, category: tag === "All India" ? "" : tag, state: tag === "All India" ? "All India" : filters.state, page: 1 })}
            >
              {tag}
            </button>
          ))}
        </div>
        <div className="pagination-row">
          <button type="button" className="secondary" disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Prev</button>
          <span>Page {filters.page}</span>
          <button type="button" className="secondary" onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Next</button>
        </div>
        <div className="list">
          {schemesLoading && [1, 2, 3, 4].map((x) => <article key={x} className="scheme skeleton-card" />)}
          {visibleSchemes.map((s) => (
            <article className="scheme" key={s.id}>
              <h3>{s.name}</h3>
              <div className="badge-row">
                <span className="chip">{s.category}</span>
                <span className="chip alt">{s.state}</span>
              </div>
              <p><strong>Ministry:</strong> {s.ministry}</p>
              <p><strong>Benefits:</strong> {s.benefits}</p>
              <a className="link-btn" href={s.apply_link} target="_blank" rel="noreferrer">Open Official Portal</a>
              <div className="actions">
                <button onClick={() => toggleBookmark(s.id)}>{bookmarkSet.has(s.id) ? "Bookmarked" : "Bookmark"}</button>
                <button className="secondary" onClick={() => checkSingleSchemeEligibility(s.id)}>Eligibility Check</button>
                {user?.role === "admin" && <button className="secondary" onClick={() => { startEdit(s); navigate("/admin"); }}>Edit</button>}
                {user?.role === "admin" && <button className="danger" onClick={() => onDeleteScheme(s.id)}>Delete</button>}
              </div>
              {schemeEligibilityStatus[s.id] && (
                <p className={schemeEligibilityStatus[s.id].match ? "success-text" : "error-text"}>
                  {schemeEligibilityStatus[s.id].match
                    ? "Eligible based on current profile/check input"
                    : `Not eligible: ${schemeEligibilityStatus[s.id].reasons.join(", ")}`}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function EligibilityPage() {
  const { eligibility, setEligibility, runEligibility, runEligibilityFromProfile, eligibilityResult, profile } = shared;
  const eligible = eligibilityResult.filter((row) => row.match);
  const notEligible = eligibilityResult.filter((row) => !row.match);
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
      </section>
      <section className="eligibility-grid">
        <article className="card">
          <h2>Eligible Schemes ({eligible.length})</h2>
          {eligible.length === 0 && <p className="hint-text">No eligible schemes for current details.</p>}
          {eligible.map((row) => (
            <div key={row.scheme.id} className="scheme">
              <h3>{row.scheme.name}</h3>
              <p className="success-text">Eligible</p>
              <p className="hint-text">{row.scheme.state} • {row.scheme.category}</p>
            </div>
          ))}
        </article>
        <article className="card">
          <h2>Not Eligible ({notEligible.length})</h2>
          {notEligible.length === 0 && <p className="hint-text">All listed schemes are currently eligible.</p>}
          {notEligible.map((row) => (
            <div key={row.scheme.id} className="scheme">
              <h3>{row.scheme.name}</h3>
              <p className="error-text">Not eligible</p>
              <p className="hint-text">{row.reasons.join(", ")}</p>
            </div>
          ))}
        </article>
      </section>
    </>
  );
}

function ProfilePage() {
  const { profile, setProfile, saveProfile, profileSaving, profileMessage, profileError } = shared;
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
          <button type="submit" disabled={profileSaving}>{profileSaving ? "Saving..." : "Save Profile"}</button>
        </form>
        {profileMessage && <p className="success-text">{profileMessage}</p>}
        {profileError && <p className="error-text">{profileError}</p>}
      </section>
    </>
  );
}

function AdminPage() {
  const { schemes, form, setForm, onCreateScheme, editingSchemeId, editForm, setEditForm, onSaveEdit, startEdit, cancelEdit, bootstrapSchemes, bootstrapMessage, onDeleteScheme } = shared;
  return (
    <>
      <h1>Admin Panel</h1>
      <section className="card">
        <div className="actions">
          <button type="button" className="secondary" onClick={bootstrapSchemes}>Add Recommended Schemes</button>
        </div>
        {bootstrapMessage && <p className="success-text">{bootstrapMessage}</p>}
        <h2>Add Scheme</h2>
        <form className="grid" onSubmit={onCreateScheme}>
          {Object.keys(initialSchemeForm).map((key) => (
            <input key={key} type={key.includes("age") || key.includes("income") ? "number" : "text"} placeholder={key.replaceAll("_", " ")} value={form[key]} onChange={(e) => setForm({ ...form, [key]: key.includes("age") || key.includes("income") ? Number(e.target.value) : e.target.value })} required />
          ))}
          <button type="submit">Add Scheme</button>
        </form>
      </section>
      <section className="card">
        <h2>Manage Schemes</h2>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>State</th>
                <th>Income Limit</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schemes.map((s) => (
                <tr key={s.id}>
                  <td>{editingSchemeId === s.id ? <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /> : s.name}</td>
                  <td>{editingSchemeId === s.id ? <input value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} /> : s.category}</td>
                  <td>{editingSchemeId === s.id ? <input value={editForm.state} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} /> : s.state}</td>
                  <td>{editingSchemeId === s.id ? <input type="number" value={editForm.max_income} onChange={(e) => setEditForm({ ...editForm, max_income: Number(e.target.value) })} /> : s.max_income}</td>
                  <td>
                    <div className="actions">
                      {editingSchemeId === s.id ? (
                        <>
                          <button type="button" onClick={onSaveEdit}>Save</button>
                          <button type="button" className="secondary" onClick={cancelEdit}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button type="button" className="secondary" onClick={() => startEdit(s)}>Edit</button>
                          <button type="button" className="danger" onClick={() => onDeleteScheme(s.id)}>Delete</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
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
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [bootstrapMessage, setBootstrapMessage] = useState("");
  const [schemeEligibilityStatus, setSchemeEligibilityStatus] = useState({});
  const [schemesLoading, setSchemesLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const api = useMemo(() => axios.create({ baseURL: API_URL }), []);
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchSchemes = async () => {
    setSchemesLoading(true);
    try {
      const res = await api.get("/api/v1/schemes", { params: filters, headers: authHeaders });
      setSchemes(res.data);
    } finally {
      setSchemesLoading(false);
    }
  };
  const fetchBookmarks = async () => {
    const res = await api.get("/api/v1/bookmarks", { headers: authHeaders });
    setBookmarks(res.data);
  };
  const fetchProfile = async () => {
    try {
      const res = await api.get("/api/v1/profile", { headers: authHeaders });
      setProfile(res.data);
      setEligibility({ age: res.data.age, annual_income: res.data.annual_income, category: res.data.category, state: res.data.state });
    } catch {
      setProfile(initialProfile);
    }
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
      setToast({ type: "success", message: authMode === "login" ? "Logged in successfully." : "Account created successfully." });
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
    setProfileSaving(true);
    setProfileMessage("");
    setProfileError("");
    try {
      const res = await api.put("/api/v1/profile", profile, { headers: authHeaders });
      setProfile(res.data);
      setEligibility({ age: res.data.age, annual_income: res.data.annual_income, category: res.data.category, state: res.data.state });
      setProfileMessage("Profile saved successfully.");
      setToast({ type: "success", message: "Profile saved." });
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setProfileError(Array.isArray(detail) ? detail.map((item) => item.msg).join(", ") : String(detail || "Unable to save profile"));
      setToast({ type: "error", message: "Failed to save profile." });
    } finally {
      setProfileSaving(false);
    }
  };

  const onCreateScheme = async (e) => {
    e.preventDefault();
    await api.post("/api/v1/schemes", toNumberForm(form), { headers: authHeaders });
    setForm(initialSchemeForm);
    fetchSchemes();
    setToast({ type: "success", message: "Scheme added." });
  };

  const bootstrapSchemes = async () => {
    const res = await api.post("/api/v1/admin/bootstrap-schemes", {}, { headers: authHeaders });
    setBootstrapMessage(`${res.data.created} schemes added.`);
    fetchSchemes();
    setToast({ type: "success", message: `${res.data.created} schemes added.` });
  };

  const onDeleteScheme = async (id) => {
    await api.delete(`/api/v1/schemes/${id}`, { headers: authHeaders });
    fetchSchemes();
    setToast({ type: "success", message: "Scheme deleted." });
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
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    await api.put(`/api/v1/schemes/${editingSchemeId}`, toNumberForm(editForm), { headers: authHeaders });
    cancelEdit();
    fetchSchemes();
    setToast({ type: "success", message: "Scheme updated." });
  };

  const toggleBookmark = async (schemeId) => {
    const isSaved = bookmarks.some((b) => b.id === schemeId);
    if (isSaved) await api.delete(`/api/v1/bookmarks/${schemeId}`, { headers: authHeaders });
    else await api.post("/api/v1/bookmarks", { scheme_id: schemeId }, { headers: authHeaders });
    fetchBookmarks();
    setToast({ type: "success", message: isSaved ? "Bookmark removed." : "Bookmarked." });
  };

  const runEligibility = async (e) => {
    e.preventDefault();
    const res = await api.post("/api/v1/eligibility", eligibility, { headers: authHeaders });
    setEligibilityResult(res.data);
    setToast({ type: "success", message: "Eligibility check completed." });
  };

  const runEligibilityFromProfile = async () => {
    const res = await api.get("/api/v1/eligibility/from-profile", { headers: authHeaders });
    setEligibilityResult(res.data.results);
    setToast({ type: "success", message: "Used profile details for eligibility." });
  };

  const checkSingleSchemeEligibility = async (schemeId) => {
    const res = await api.post("/api/v1/eligibility", eligibility, { headers: authHeaders });
    const row = res.data.find((item) => item.scheme.id === schemeId);
    if (!row) return;
    setSchemeEligibilityStatus((prev) => ({
      ...prev,
      [schemeId]: { match: row.match, reasons: row.reasons || [] },
    }));
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
  const metrics = useMemo(() => ({ total: schemes.length, savedCount: bookmarks.length, statesCount: new Set(schemes.map((s) => s.state)).size }), [schemes, bookmarks]);

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
    profileSaving,
    profileMessage,
    profileError,
    bootstrapSchemes,
    bootstrapMessage,
    checkSingleSchemeEligibility,
    schemeEligibilityStatus,
    schemesLoading,
    form,
    setForm,
    onCreateScheme,
    editingSchemeId,
    editForm,
    setEditForm,
    onSaveEdit,
    cancelEdit,
  };

  useEffect(() => {
    if (!toast) return;
    const timeoutId = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timeoutId);
  }, [toast]);

  return (
    <BrowserRouter>
      <Toast toast={toast} />
      {!token ? (
        <AuthPage authMode={authMode} setAuthMode={setAuthMode} authForm={authForm} setAuthForm={setAuthForm} submitAuth={submitAuth} authLoading={authLoading} authError={authError} />
      ) : (
        <Layout user={user} logout={logout} />
      )}
    </BrowserRouter>
  );
}
