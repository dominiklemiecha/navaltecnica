import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="layout">
      {/* Mobile bottom bar (fissa) */}
      <div className="mobile-bottom-bar">
        <button
          className={`mobile-bb-btn ${sidebarOpen ? 'active' : ''}`}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {sidebarOpen
              ? <path d="M18 6L6 18M6 6l12 12" />
              : <><path d="M3 12h18" /><path d="M3 6h18" /><path d="M3 18h18" /></>
            }
          </svg>
          <span>{sidebarOpen ? 'Chiudi' : 'Menu'}</span>
        </button>
        <img src="/logo.png" alt="Navaltecnica" className="mobile-bb-logo" />
        <div className="mobile-bb-user" title={user?.name}>{user?.name?.[0] || 'A'}</div>
      </div>

      {/* Overlay (bottom-sheet) */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-drag-handle" aria-hidden="true" />
        <div className="sidebar-brand">
          <img src="/logo.png" alt="Navaltecnica" className="sidebar-logo-img" />
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">Preventivi</div>
            <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
              <span>Lista Preventivi</span>
            </NavLink>
            <NavLink to="/new" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
              <span>Nuovo Preventivo</span>
            </NavLink>
          </div>

          <div className="nav-section">
            <div className="nav-section-title">Amministrazione</div>
            <NavLink to="/admin/catalog" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
              <span>Catalogo Ricambi</span>
            </NavLink>
            <NavLink to="/admin/pricing" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
              <span>Tariffe e Margini</span>
            </NavLink>
            <NavLink to="/admin/destinations" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>Destinazioni</span>
            </NavLink>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{user?.name?.[0] || 'A'}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name}</div>
              <button onClick={logout} className="sidebar-logout">Esci</button>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
