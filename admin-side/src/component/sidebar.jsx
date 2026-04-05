import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/* ─── Google Font ──────────────────────────────────────────────── */
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap';
fontLink.rel = 'stylesheet';
if (!document.head.querySelector('[href*="Nunito"]')) document.head.appendChild(fontLink);

/* ─── SVG Icons ────────────────────────────────────────────────── */
const Icon = ({ name, size = 18, color = 'currentColor', strokeWidth = 1.8 }) => {
  const paths = {
    dashboard:     <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    shoppingBag:   <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></>,
    package:       <><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></>,
    bell:          <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>,
    users:         <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    logOut:        <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></>,
    store:         <><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a3 3 0 0 0-6 0v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2v0a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2v0a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2v0a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2V7"/></>,
    chevronRight:  <polyline points="9 18 15 12 9 6"/>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
};

const menuItems = [
  { path: '/dashboard',     label: 'Dashboard',     iconName: 'dashboard'   },
  { path: '/products',      label: 'Products',      iconName: 'shoppingBag' },
  { path: '/orders',        label: 'Orders',        iconName: 'package'     },
  { path: '/users',         label: 'Users',         iconName: 'users'       },
  { path: '/notifications', label: 'Notifications', iconName: 'bell'        },
];

export default function Sidebar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [hovered, setHovered] = useState(null);

  // ✅ UPDATED: MongoDB logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div style={S.sidebar}>
      <div style={S.logoContainer}>
        <div style={S.logoGradientBox}>
          <Icon name="store" size={20} color="#fff" strokeWidth={1.8} />
        </div>
        <div>
          <p style={S.logoTitle}>SouvenirShop</p>
          <p style={S.logoSubtitle}>Seller Portal</p>
        </div>
      </div>

      <div style={S.divider} />
      <p style={S.menuLabel}>MAIN MENU</p>

      <nav style={S.nav}>
        {menuItems.map((item) => {
          const isActive  = location.pathname === item.path;
          const isHovered = hovered === item.path;
          return (
            <button
              key={item.path}
              style={{
                ...S.menuItem,
                ...(isActive  ? S.menuItemActive  : {}),
                ...(isHovered && !isActive ? S.menuItemHover : {}),
              }}
              onClick={() => navigate(item.path)}
              onMouseEnter={() => setHovered(item.path)}
              onMouseLeave={() => setHovered(null)}
            >
              {isActive && <div style={S.activeBar} />}
              <div style={{
                ...S.iconBox,
                background: isActive
                  ? 'rgba(255,255,255,0.22)'
                  : isHovered
                    ? 'rgba(255,255,255,0.12)'
                    : 'rgba(255,255,255,0.07)',
                boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
              }}>
                <Icon
                  name={item.iconName}
                  size={16}
                  color={isActive ? '#FFFFFF' : isHovered ? '#FFE0C8' : 'rgba(255,255,255,0.55)'}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
              </div>
              <span style={{
                ...S.menuText,
                color:      isActive ? '#FFFFFF' : isHovered ? '#FFE0C8' : 'rgba(255,255,255,0.6)',
                fontWeight: isActive ? '800' : '600',
              }}>
                {item.label}
              </span>
              {isActive && (
                <Icon name="chevronRight" size={13} color="rgba(255,255,255,0.5)" strokeWidth={2.5} />
              )}
            </button>
          );
        })}
      </nav>

      <div style={S.bottomSection}>
        <div style={S.divider} />
        <button
          style={{
            ...S.logoutButton,
            backgroundColor: hovered === 'logout' ? 'rgba(239,68,68,0.15)' : 'transparent',
            borderColor: hovered === 'logout' ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.2)',
          }}
          onClick={handleLogout}
          onMouseEnter={() => setHovered('logout')}
          onMouseLeave={() => setHovered(null)}
        >
          <div style={{
            ...S.iconBox,
            background: hovered === 'logout' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)',
          }}>
            <Icon name="logOut" size={15}
              color={hovered === 'logout' ? '#FF8080' : 'rgba(255,255,255,0.55)'}
              strokeWidth={2} />
          </div>
          <span style={{
            ...S.menuText,
            color:      hovered === 'logout' ? '#FF8080' : 'rgba(255,255,255,0.6)',
            fontWeight: '700',
          }}>
            Sign Out
          </span>
        </button>
      </div>
    </div>
  );
}

const S = {
  sidebar: {
    width: '252px',
    background: 'linear-gradient(180deg, #3D2212 0%, #4A2C1A 40%, #5C3826 100%)',
    display: 'flex',
    flexDirection: 'column',
    padding: '22px 14px',
    boxShadow: '2px 0 24px rgba(30,10,0,0.35)',
    position: 'sticky',
    top: 0,
    height: '100vh',
    flexShrink: 0,
    fontFamily: 'Nunito, sans-serif',
  },
  logoContainer: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '6px 10px', marginBottom: 4,
  },
  logoGradientBox: {
    width: 42, height: 42, borderRadius: 13, flexShrink: 0,
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
  },
  logoTitle: {
    fontSize: 14, fontWeight: 900, color: '#FFFFFF',
    margin: 0, letterSpacing: '-0.3px',
  },
  logoSubtitle: {
    fontSize: 10, color: 'rgba(255,255,255,0.5)', margin: 0, fontWeight: 600, letterSpacing: 0.3,
  },
  divider: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.1)', margin: '12px 4px',
  },
  menuLabel: {
    fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.4, padding: '0 12px', marginBottom: 6, marginTop: 2,
  },
  nav: {
    display: 'flex', flexDirection: 'column', gap: 3, flex: 1,
  },
  menuItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 10px 9px 14px',
    borderRadius: 12, border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer', textAlign: 'left',
    width: '100%', position: 'relative',
    transition: 'all 0.18s ease',
  },
  menuItemActive: { backgroundColor: 'rgba(255,255,255,0.12)' },
  menuItemHover:  { backgroundColor: 'rgba(255,255,255,0.07)' },
  activeBar: {
    position: 'absolute', left: 0, top: '18%', height: '64%',
    width: 3, backgroundColor: '#C4956A', borderRadius: '0 4px 4px 0',
  },
  iconBox: {
    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.18s ease',
  },
  menuText: { flex: 1, fontSize: 13, transition: 'color 0.15s' },
  bottomSection: { marginTop: 'auto' },
  logoutButton: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 10px 9px 14px',
    borderRadius: 12, border: '1px solid',
    cursor: 'pointer', width: '100%',
    transition: 'all 0.18s ease',
  },
};