import React,{ useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const blankRegister = { name: '', email: '', password: '', role: 'donor', bloodGroup: 'O+', city: '', pinCode: '', phone: '', availableToContact: true };
const blankRequest = { patientName: '', bloodGroup: 'O+', units: 1, hospitalName: '', city: '', pinCode: '', neededBy: '', urgency: 'normal' };

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('bc_token') || '');
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('bc_user') || 'null'); } catch { return null; } });
  const [mode, setMode] = useState('login');
  const [tab, setTab] = useState('requests');
  const [form, setForm] = useState(blankRegister);
  const [login, setLogin] = useState({ email: '', password: '' });
  const [requestForm, setRequestForm] = useState(blankRequest);
  const [filters, setFilters] = useState({ bloodGroup: '', city: '', pinCode: '' });
  const [requests, setRequests] = useState([]);
  const [donors, setDonors] = useState([]);
  const [stats, setStats] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const api = useCallback(() => axios.create({ baseURL: API, headers: token ? { Authorization: `Bearer ${token}` } : {} }), [token]);
  const flash = (text, isError = false) => { setMessage(isError ? '' : text); setError(isError ? text : ''); };

  const loadRequests = useCallback(async () => {
    if (!token) return;
    try { const { data } = await api().get('/api/requests'); setRequests(data.requests); }
    catch (e) { flash(e.response?.data?.message || 'Could not load requests.', true); }
  }, [token, api]);

  const loadDonors = useCallback(async () => {
    if (!token) return;
    try { const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v)); const { data } = await api().get('/api/donors', { params }); setDonors(data.donors); }
    catch (e) { flash(e.response?.data?.message || 'Could not load donors.', true); }
  }, [token, api, filters]);

  const loadStats = useCallback(async () => {
    if (!token || user?.role !== 'admin') return;
    try { const { data } = await api().get('/api/admin/stats'); setStats(data); }
    catch (e) { flash(e.response?.data?.message || 'Could not load admin dashboard.', true); }
  }, [token, user, api]);

  useEffect(() => { loadRequests(); loadDonors(); loadStats(); }, [loadRequests, loadDonors, loadStats]);
  useEffect(() => {
    if (!token) return;
    const socket = io(API);
    socket.on('request:created', () => { loadRequests(); loadStats(); flash('A new blood request was posted.'); });
    socket.on('request:updated', () => { loadRequests(); loadStats(); });
    return () => socket.disconnect();
  }, [token, loadRequests, loadStats]);

  const saveSession = data => {
    localStorage.setItem('bc_token', data.token); localStorage.setItem('bc_user', JSON.stringify(data.user));
    setToken(data.token); setUser(data.user); setTab(data.user.role === 'admin' ? 'admin' : 'requests');
  };
  const submitAuth = async e => {
    e.preventDefault(); setBusy(true); flash('');
    try {
      const { data } = await axios.post(`${API}/api/auth/${mode === 'register' ? 'register' : 'login'}`, mode === 'register' ? form : login);
      saveSession(data); flash(`Welcome, ${data.user.name}!`);
    } catch (e) { flash(e.response?.data?.message || 'Could not connect to the server. Check that the backend is running.', true); }
    finally { setBusy(false); }
  };
  const logout = () => { localStorage.removeItem('bc_token'); localStorage.removeItem('bc_user'); setToken(''); setUser(null); setRequests([]); setDonors([]); setStats(null); flash('You have logged out.'); };
  const submitRequest = async e => {
    e.preventDefault(); setBusy(true); flash('');
    try { const { data } = await api().post('/api/requests', { ...requestForm, units: Number(requestForm.units), neededBy: new Date(requestForm.neededBy).toISOString() }); flash(`Request created. ${data.matchingDonorsNotified} matching donor(s) found for email notification (if SMTP is configured).`); setRequestForm(blankRequest); setTab('requests'); await loadRequests(); }
    catch (e) { flash(e.response?.data?.message || 'Could not create request.', true); }
    finally { setBusy(false); }
  };
  const expressInterest = async id => {
    try { const { data } = await api().post(`/api/requests/${id}/interest`); flash(data.message); await loadRequests(); }
    catch (e) { flash(e.response?.data?.message || 'Could not respond.', true); }
  };
  const updateStatus = async (id, status) => {
    try { await api().patch(`/api/requests/${id}/status`, { status }); flash(`Request marked ${status}.`); await loadRequests(); await loadStats(); }
    catch (e) { flash(e.response?.data?.message || 'Could not update request.', true); }
  };
  const verifyRequest = async (id, verificationStatus) => {
    try { await api().patch(`/api/admin/requests/${id}/verify`, { verificationStatus }); flash(`Request ${verificationStatus}.`); await loadRequests(); await loadStats(); }
    catch (e) { flash(e.response?.data?.message || 'Could not verify request.', true); }
  };
  const updateProfile = async e => {
    e.preventDefault();
    try { const { data } = await api().patch('/api/auth/me', { bloodGroup: form.bloodGroup, city: form.city, pinCode: form.pinCode, phone: form.phone, availableToContact: form.availableToContact }); setUser(data.user); localStorage.setItem('bc_user', JSON.stringify(data.user)); flash('Profile updated.'); }
    catch (e) { flash(e.response?.data?.message || 'Could not update profile.', true); }
  };

  if (!token || !user) return <main className="auth-shell"><section className="hero"><div className="brand-mark">✚</div><p className="eyebrow">DONATE HOPE. SAVE LIVES.</p><h1>Every drop can make a difference.</h1><p className="hero-copy">A community platform to help connect people who need blood with willing donors.</p><div className="hero-stats"><span><b>01</b> Register</span><span><b>02</b> Connect</span><span><b>03</b> Help</span></div></section><section className="auth-card"><div className="mobile-brand"><span className="brand-mark small">✚</span><b>BloodConnect</b></div><div className="tabs auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Log in</button><button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Create account</button></div><h2>{mode === 'login' ? 'Welcome back' : 'Join BloodConnect'}</h2><p className="muted">{mode === 'login' ? 'Log in to continue to your dashboard.' : 'Create an account to donate or request blood.'}</p><form onSubmit={submitAuth} className="stack">
    {mode === 'register' && <><label>Full name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your full name" /></label><label>Account type<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="donor">Blood donor</option><option value="requester">Blood requester</option></select></label></>}
    <label>Email address<input type="email" required value={mode === 'register' ? form.email : login.email} onChange={e => mode === 'register' ? setForm({ ...form, email: e.target.value }) : setLogin({ ...login, email: e.target.value })} placeholder="you@example.com" /></label>
    <label>Password<input type="password" minLength="8" required value={mode === 'register' ? form.password : login.password} onChange={e => mode === 'register' ? setForm({ ...form, password: e.target.value }) : setLogin({ ...login, password: e.target.value })} placeholder="At least 8 characters" /></label>
    {mode === 'register' && <>{form.role === 'donor' && <label>Blood group<select value={form.bloodGroup} onChange={e => setForm({ ...form, bloodGroup: e.target.value })}>{groups.map(g => <option key={g}>{g}</option>)}</select></label>}<div className="two-col"><label>City<input required value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="e.g. Bareilly" /></label><label>PIN code<input required pattern="[0-9]{6}" maxLength="6" value={form.pinCode} onChange={e => setForm({ ...form, pinCode: e.target.value })} placeholder="6 digits" /></label></div><label>Phone (optional)<input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Contact number" /></label>{form.role === 'donor' && <label className="check"><input type="checkbox" checked={form.availableToContact} onChange={e => setForm({ ...form, availableToContact: e.target.checked })} /> I agree to be discoverable by logged-in users for matching requests.</label>}</>}
    <button className="primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Log in'} <span>→</span></button>
  </form>{error && <p className="alert error">{error}</p>}{message && <p className="alert success">{message}</p>}<p className="tiny-note">This demo helps people connect. Donor eligibility and blood compatibility must always be confirmed by qualified blood-bank staff.</p></section></main>;

  return <div className="app-shell"><aside className="sidebar"><div className="logo"><span className="brand-mark small">✚</span><span>Blood<span>Connect</span></span></div><p className="nav-caption">WORKSPACE</p><button className={tab === 'requests' ? 'nav-item selected' : 'nav-item'} onClick={() => setTab('requests')}>▤ <span>Blood requests</span></button><button className={tab === 'donors' ? 'nav-item selected' : 'nav-item'} onClick={() => setTab('donors')}>⌕ <span>Find donors</span></button>{['requester', 'admin'].includes(user.role) && <button className={tab === 'new-request' ? 'nav-item selected' : 'nav-item'} onClick={() => setTab('new-request')}>＋ <span>Request blood</span></button>}{user.role === 'admin' && <button className={tab === 'admin' ? 'nav-item selected' : 'nav-item'} onClick={() => { setTab('admin'); loadStats(); }}>▦ <span>Admin dashboard</span></button>}<div className="sidebar-bottom"><div className="user-mini"><div className="avatar">{user.name?.[0]?.toUpperCase()}</div><div><b>{user.name}</b><small>{user.role}</small></div></div><button className="logout" onClick={logout}>↪ Log out</button></div></aside>
    <main className="main-area"><header className="topbar"><div><p className="eyebrow">COMMUNITY CARE NETWORK</p><h1>{tab === 'requests' ? 'Blood requests' : tab === 'donors' ? 'Find a donor' : tab === 'new-request' ? 'Request blood' : 'Admin dashboard'}</h1></div><div className="live-indicator"><span></span> Live updates enabled</div></header>{error && <p className="alert error">{error}</p>}{message && <p className="alert success">{message}</p>}
      {tab === 'requests' && <><section className="welcome-banner"><div><p className="eyebrow light">SMALL ACT. BIG IMPACT.</p><h2>Someone out there could be your match.</h2><p>Explore active requests and see where help may be needed.</p></div><div className="blood-drop">♥</div></section><div className="section-heading"><div><h2>Recent blood requests</h2><p className="muted">Requests from the community</p></div><button className="outline" onClick={loadRequests}>↻ Refresh</button></div><div className="request-grid">{requests.length === 0 ? <div className="empty-state"><div>♡</div><h3>No requests yet</h3><p>New blood requests will appear here.</p></div> : requests.map(r => <article className="request-card" key={r._id}><div className="request-top"><div className="blood-type">{r.bloodGroup}</div><span className={`status ${r.status}`}>{r.status}</span></div><h3>{r.patientName}</h3><p className="hospital">⌖ {r.hospitalName}</p><p className="muted">{r.city} · {r.pinCode}</p><div className="request-meta"><span>◉ {r.units} unit(s)</span><span className={r.urgency === 'urgent' ? 'urgent-text' : ''}>{r.urgency === 'urgent' ? '⚑ Urgent' : 'Standard'}</span></div><p className="tiny-note">Needed by: {new Date(r.neededBy).toLocaleString()}</p><div className="request-actions">{user.role === 'donor' && r.status !== 'fulfilled' && r.status !== 'cancelled' && <button className="primary compact" onClick={() => expressInterest(r._id)}>I can help</button>}{(user.role === 'admin' || r.requester?._id === user.id) && <select aria-label="Update request status" value={r.status} onChange={e => updateStatus(r._id, e.target.value)}><option value="pending">Pending</option><option value="matched">Matched</option><option value="fulfilled">Fulfilled</option><option value="cancelled">Cancelled</option></select>}{user.role === 'admin' && <select aria-label="Verify request" value={r.verificationStatus} onChange={e => verifyRequest(r._id, e.target.value)}><option value="unverified">Unverified</option><option value="verified">Verified</option><option value="rejected">Rejected</option></select>}</div>{r.verificationStatus === 'verified' && <span className="verified">✓ Admin verified</span>}</article>)}</div></>}
      {tab === 'donors' && <><section className="panel"><h2>Search willing donors</h2><p className="muted">Only donors who opted in to be discoverable are listed.</p><div className="filter-row"><label>Blood group<select value={filters.bloodGroup} onChange={e => setFilters({ ...filters, bloodGroup: e.target.value })}><option value="">All groups</option>{groups.map(g => <option key={g}>{g}</option>)}</select></label><label>City<input value={filters.city} onChange={e => setFilters({ ...filters, city: e.target.value })} placeholder="Enter city" /></label><label>PIN code<input maxLength="6" value={filters.pinCode} onChange={e => setFilters({ ...filters, pinCode: e.target.value })} placeholder="6 digits" /></label><button className="primary" onClick={loadDonors}>Search donors</button></div></section><div className="section-heading"><div><h2>Matching donors</h2><p className="muted">{donors.length} donor(s) found</p></div></div><div className="donor-grid">{donors.map(d => <article className="donor-card" key={d.id}><div className="donor-avatar">{d.name?.[0]?.toUpperCase()}</div><div className="donor-info"><h3>{d.name}</h3><p className="muted">⌖ {d.city || 'Location not set'}{d.pinCode ? ` · ${d.pinCode}` : ''}</p></div><span className="blood-type small-type">{d.bloodGroup || '—'}</span></article>)}{donors.length === 0 && <div className="empty-state"><div>⌕</div><h3>No matching donors</h3><p>Try a different city or blood group.</p></div>}</div></>}
      {tab === 'new-request' && <section className="panel form-panel"><h2>Blood request details</h2><p className="muted">Submit accurate information so willing donors can find your request.</p><form className="form-grid" onSubmit={submitRequest}><label>Patient name<input required maxLength="80" value={requestForm.patientName} onChange={e => setRequestForm({ ...requestForm, patientName: e.target.value })} /></label><label>Blood group<select value={requestForm.bloodGroup} onChange={e => setRequestForm({ ...requestForm, bloodGroup: e.target.value })}>{groups.map(g => <option key={g}>{g}</option>)}</select></label><label>Units needed<input type="number" min="1" max="10" required value={requestForm.units} onChange={e => setRequestForm({ ...requestForm, units: e.target.value })} /></label><label>Hospital name<input required value={requestForm.hospitalName} onChange={e => setRequestForm({ ...requestForm, hospitalName: e.target.value })} /></label><label>City<input required value={requestForm.city} onChange={e => setRequestForm({ ...requestForm, city: e.target.value })} /></label><label>PIN code<input required pattern="[0-9]{6}" maxLength="6" value={requestForm.pinCode} onChange={e => setRequestForm({ ...requestForm, pinCode: e.target.value })} /></label><label>Needed by<input type="datetime-local" required value={requestForm.neededBy} onChange={e => setRequestForm({ ...requestForm, neededBy: e.target.value })} /></label><label>Priority<select value={requestForm.urgency} onChange={e => setRequestForm({ ...requestForm, urgency: e.target.value })}><option value="normal">Standard</option><option value="urgent">Urgent</option></select></label><div className="form-actions"><button className="primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit blood request →'}</button></div></form><p className="tiny-note">Requests are not automatically medically verified. Contact a licensed blood bank or hospital for urgent needs.</p></section>}
      {tab === 'admin' && user.role === 'admin' && <><div className="stats-grid">{[['Donors', stats?.stats.donors ?? '—'], ['Requesters', stats?.stats.requesters ?? '—'], ['All requests', stats?.stats.requests ?? '—'], ['Pending', stats?.stats.pending ?? '—'], ['Fulfilled', stats?.stats.fulfilled ?? '—']].map(([label, value]) => <div className="stat-card" key={label}><span>{label}</span><b>{value}</b><small>Current records</small></div>)}</div><section className="panel"><div className="section-heading"><div><h2>Recent requests</h2><p className="muted">Verify requests only after appropriate checks.</p></div><button className="outline" onClick={loadStats}>↻ Refresh</button></div><div className="table-wrap"><table><thead><tr><th>Patient</th><th>Blood</th><th>City</th><th>Status</th><th>Verification</th><th>Action</th></tr></thead><tbody>{(stats?.recentRequests || []).map(r => <tr key={r._id}><td>{r.patientName}</td><td><b className="red-text">{r.bloodGroup}</b></td><td>{r.city}</td><td>{r.status}</td><td>{r.verificationStatus}</td><td><select value={r.verificationStatus} onChange={e => verifyRequest(r._id, e.target.value)}><option value="unverified">Unverified</option><option value="verified">Verified</option><option value="rejected">Rejected</option></select></td></tr>)}</tbody></table>{(!stats?.recentRequests?.length) && <p className="muted">No requests to display.</p>}</div></section><section className="panel"><h2>Recently joined users</h2><div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>City</th></tr></thead><tbody>{(stats?.recentUsers || []).map(u => <tr key={u._id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.city || '—'}</td></tr>)}</tbody></table></div></section></>}
      <footer className="footer">BloodConnect · Built to connect people with willing donors <span>Medical eligibility must be confirmed by professionals.</span></footer>
    </main></div>;
}
export default App;
