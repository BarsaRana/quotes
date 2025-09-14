import { NavLink, Outlet } from "react-router-dom";

export default function AppShell() {
  return (
    <div className="app-page">
      <style>{css}</style>
      <BrandHeader />
      <div className="app-container">
        <Outlet />
      </div>
    </div>
  );
}

function BrandHeader() {
  return (
    <header className="brand">
      {/* Top bar: logo + titles hard-left */}
      <div className="brand-top">
        <div className="brand-top-inner">
          <div className="brand-left">
            <img src="/decon-logo.png" alt="DECON" className="brand-logo" />
            <div className="brand-left-text">
              <div className="brand-portal">DECON Services Portal</div>
              <div className="brand-product">National Rate Card</div>
            </div>
          </div>
        </div>
      </div>

      {/* Hero centered */}
      <div className="brand-hero">
        <div className="brand-hero-inner">
          <h1>National Rate Card</h1>
          <p>Instant, transparent estimates based on your region and selections</p>
        </div>
      </div>

      {/* Tabs centered */}
      <nav className="tabs" aria-label="Primary">
        <div className="tabs-inner">
          <Tab to="/dashboard" label="Dashboard" />
          <Tab to="/quotes" label="Quotes" />
          <Tab to="/calculator" label="Calculator" />
        </div>
      </nav>
    </header>
  );
}

function Tab({ to, label }: { to: string; label: string }) {
  return (
    <NavLink to={to} className={({ isActive }) => `tab ${isActive ? "active" : ""}`}>
      {label}
    </NavLink>
  );
}

const css = `
:root{ --bg:#f6f7fb; --ink:#0f172a; --line:#e6e8ee; }
*{ box-sizing:border-box }
html,body,#root{ height:100% }
body{
  margin:0; background:var(--bg); color:var(--ink);
  font-family:Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
}

.app-page{ min-height:100vh; }

/* main content stays centered with comfy gutters */
.app-container{
  width:min(1720px, 100vw - 48px);
  margin:18px auto 32px;
}

/* -------- Header -------- */
.brand{ width:100%; position:sticky; top:0; z-index:30; }

/* Top bar: make it span full width, logo/title hard-left */
.brand-top{ background:#0e1b2a; color:#eaf1fb; }
.brand-top-inner{
  width:100%;                 /* full width, no centering container */
  max-width:none;             /* override previous min(...) width */
  margin:0;                   /* no auto-centering */
  padding: 20px 40px 20px 40px;   /* no left padding -> flush to edge */
  display:flex; align-items:center; justify-content:flex-start; gap:0;
}
.brand-left{ display:flex; align-items:center; gap:12px; }
.brand-logo{ height:34px; width:auto; display:block; }
.brand-left-text{ line-height:1.1; }
.brand-portal{ font-size:12px; opacity:.8; }
.brand-product{ font-weight:800; font-size:14px; letter-spacing:.2px; }

/* Hero centered on the standard page width */
.brand-hero{ background:#f3f6fb; border-bottom:1px solid var(--line); }
.brand-hero-inner{
  width:min(1720px, 100vw - 48px);
  margin:0 auto; padding:16px 16px 12px; text-align:center;
}
.brand-hero h1{ margin:0; font-size:18px; font-weight:800; }
.brand-hero p{ margin:6px 0 0; font-size:12px; color:#64748b; }

/* Tabs: center the links */
.tabs{ background:#f3f6fb; border-bottom:1px solid var(--line); }
.tabs-inner{
  width:min(1720px, 100vw - 48px);
  margin:0 auto; padding:0 16px;
  display:flex; gap:16px; overflow-x:auto; justify-content:center; /* centered */
}
.tab{
  appearance:none; background:transparent; border:0; text-decoration:none;
  padding:10px 2px; font-weight:700; color:#64748b; cursor:pointer;
  border-bottom:2px solid transparent; white-space:nowrap;
}
.tab:hover{ color:#1f2937; }
.tab.active{ color:#0f172a; border-bottom-color:#0f172a; }

/* Generic card helper if needed elsewhere */
.card{
  background:#fff; border:1px solid var(--line); border-radius:16px;
  padding:16px; box-shadow:0 8px 24px rgba(10,20,60,.06);
}

.page-loading{ padding:24px; }

@media (max-width: 640px){
  .brand-hero-inner, .tabs-inner{ padding-left:12px; padding-right:12px; }
}
`;
