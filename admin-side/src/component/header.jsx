import React, { useEffect, useState, useRef } from 'react';
import { auth, db } from '../config/firebase';
import { doc, getDoc, setDoc, } from 'firebase/firestore';
import { updatePassword, verifyBeforeUpdateEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { useLocation } from 'react-router-dom';

/* ─── SVG Icons ────────────────────────────────────────────────── */
const Icon = ({ name, size = 18, color = 'currentColor', strokeWidth = 1.8 }) => {
  const paths = {
    chevronDown:  <polyline points="6 9 12 15 18 9"/>,
    sparkles:     <><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></>,
    lock:         <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    user:         <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    mail:         <><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></>,
    eye:          <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>,
    eyeOff:       <><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></>,
    check:        <polyline points="20 6 9 12 4 10"/>,
    x:            <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
};

/* ─── Page Meta ────────────────────────────────────────────────── */
const pageTitles = {
  '/dashboard':     { title: 'Dashboard',     subtitle: 'Overview of your store performance' },
  '/products':      { title: 'Products',      subtitle: 'Manage your product catalog'        },
  '/orders':        { title: 'Orders',        subtitle: 'Track and manage customer orders'   },
  '/notifications': { title: 'Notifications', subtitle: 'Stay updated with new orders'       },
  '/users':         { title: 'Users',         subtitle: 'Manage your user accounts'          },
};

/* ─── Greeting helper ──────────────────────────────────────────── */
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

/* ─── Modal ────────────────────────────────────────────────────── */
function Modal({ title, onClose, children }) {
  return (
    <div style={M.overlay} onClick={onClose}>
      <div style={M.modal} onClick={e => e.stopPropagation()}>
        <div style={M.modalHeader}>
          <h2 style={M.modalTitle}>{title}</h2>
          <button style={M.closeBtn} onClick={onClose}>
            <Icon name="x" size={16} color="#94A3B8" strokeWidth={2.5} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const M = {
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, backdropFilter: 'blur(4px)',
  },
  modal: {
    background: '#fff', borderRadius: 18, padding: '28px 32px',
    width: 420, boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
    fontFamily: 'Nunito, sans-serif',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22,
  },
  modalTitle: {
    fontSize: 17, fontWeight: 900, color: '#1A1A2E', margin: 0,
  },
  closeBtn: {
    background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 8,
    width: 32, height: 32, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
};

/* ─── Input Field ──────────────────────────────────────────────── */
function Field({ label, icon, type = 'text', value, onChange, placeholder, action }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={F.label}>{label}</label>
      <div style={F.inputWrap}>
        <span style={F.iconLeft}><Icon name={icon} size={14} color="#C4956A" strokeWidth={2} /></span>
        <input
          style={F.input}
          type={isPassword && !show ? 'password' : 'text'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
        {isPassword && (
          <button style={F.toggleBtn} onClick={() => setShow(s => !s)} type="button">
            <Icon name={show ? 'eyeOff' : 'eye'} size={14} color="#94A3B8" strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}
const F = {
  label: { fontSize: 11, fontWeight: 800, color: '#64748B', letterSpacing: 0.4, display: 'block', marginBottom: 6 },
  inputWrap: {
    display: 'flex', alignItems: 'center',
    border: '1.5px solid #EDD9CC', borderRadius: 10,
    background: '#FDF8F5', overflow: 'hidden',
  },
  iconLeft: {
    padding: '0 10px', display: 'flex', alignItems: 'center', flexShrink: 0,
  },
  input: {
    flex: 1, border: 'none', background: 'transparent',
    padding: '10px 0', fontSize: 13, color: '#1A1A2E', fontWeight: 600,
    outline: 'none', fontFamily: 'Nunito, sans-serif',
  },
  toggleBtn: {
    background: 'none', border: 'none', padding: '0 10px',
    cursor: 'pointer', display: 'flex', alignItems: 'center',
  },
};

/* ─── Save Button ──────────────────────────────────────────────── */
function SaveBtn({ label, onClick, loading }) {
  return (
    <button style={SB.btn} onClick={onClick} disabled={loading}
      onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}>
      {loading ? 'Saving…' : <><Icon name="check" size={13} color="#fff" strokeWidth={2.5} />{label}</>}
    </button>
  );
}
const SB = {
  btn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    width: '100%', padding: '11px 0', marginTop: 6,
    background: 'linear-gradient(135deg,#5C4033,#8B6355)',
    border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800,
    color: '#fff', cursor: 'pointer', transition: 'opacity 0.15s',
    boxShadow: '0 4px 14px rgba(92,64,51,0.35)',
    fontFamily: 'Nunito, sans-serif',
  },
};

/* ─── Change Password Modal ────────────────────────────────────── */
function ChangePasswordModal({ onClose }) {
  const [current, setCurrent]   = useState('');
  const [newPwd, setNewPwd]     = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSave = async () => {
    setError('');
    if (newPwd !== confirm) { setError("New passwords don't match."); return; }
    if (newPwd.length < 6)  { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      const user = auth.currentUser;
      const cred = EmailAuthProvider.credential(user.email, current);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPwd);
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to update password.');
    } finally { setLoading(false); }
  };

  return (
    <Modal title="Change Password" onClose={onClose}>
      <Field label="CURRENT PASSWORD"  icon="lock" type="password" value={current}  onChange={e => setCurrent(e.target.value)}  placeholder="Enter current password" />
      <Field label="NEW PASSWORD"      icon="lock" type="password" value={newPwd}   onChange={e => setNewPwd(e.target.value)}   placeholder="Enter new password" />
      <Field label="CONFIRM PASSWORD"  icon="lock" type="password" value={confirm}  onChange={e => setConfirm(e.target.value)}  placeholder="Confirm new password" />
      {error && <p style={{ color: '#E53935', fontSize: 12, fontWeight: 700, marginBottom: 10 }}>{error}</p>}
      <SaveBtn label="Update Password" onClick={handleSave} loading={loading} />
    </Modal>
  );
}

/* ─── Manage Account Modal ─────────────────────────────────────── */
function ManageAccountModal({ onClose, sellerName, setSellerName }) {
  const [name,    setName]    = useState(sellerName || '');
  const [email,   setEmail]   = useState(auth.currentUser?.email || '');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setError('');
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (email !== user.email) {
      const cred = EmailAuthProvider.credential(user.email, pwdConfirm);
      await reauthenticateWithCredential(user, cred);
      await verifyBeforeUpdateEmail(user, email);
      // Don't close modal, show a message instead
      setError(''); 
      alert('A verification link has been sent to ' + email + '. Please verify it to complete the email change.');
      onClose();
      return;
    }
      await setDoc(doc(db, 'users', user.uid), { name }, { merge: true });
      setSellerName(name);
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to update account.');
    } finally { setLoading(false); }
  };

  return (
    <Modal title="Manage Account" onClose={onClose}>
      <Field label="DISPLAY NAME" icon="user"  value={name}  onChange={e => setName(e.target.value)}  placeholder="Your name" />
      <Field label="EMAIL"        icon="mail"  value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
      {email !== auth.currentUser?.email && (
        <Field label="CONFIRM PASSWORD (to change email)" icon="lock" type="password"
          value={pwdConfirm} onChange={e => setPwdConfirm(e.target.value)} placeholder="Current password" />
      )}
      {error && <p style={{ color: '#E53935', fontSize: 12, fontWeight: 700, marginBottom: 10 }}>{error}</p>}
      <SaveBtn label="Save Changes" onClick={handleSave} loading={loading} />
    </Modal>
  );
}

/* ─── Header ───────────────────────────────────────────────────── */
export default function Header() {
  const [sellerName, setSellerName]   = useState('');
  const [dropOpen, setDropOpen]       = useState(false);
  const [modal, setModal]             = useState(null); // 'password' | 'account'
  const dropRef                       = useRef(null);
  const location = useLocation();
  const page = pageTitles[location.pathname] || pageTitles['/dashboard'];

  useEffect(() => {
    const fetchSeller = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const snap = await getDoc(doc(db, 'users', user.uid));
      setSellerName(snap.exists() ? snap.data().name : user.email?.split('@')[0]);
    };
    fetchSeller();

    const handleClickOutside = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initial = sellerName ? sellerName.charAt(0).toUpperCase() : 'S';

  return (
    <>
      <div style={S.header}>

        {/* ── Left: Page Title ────────────────────────────────── */}
        <div style={S.titleSection}>
          <h1 style={S.pageTitle}>{page.title}</h1>
          <p style={S.pageSubtitle}>
            {getGreeting()}, <strong style={{ color: '#FFDCC8' }}>{sellerName || 'Seller'}</strong> — {page.subtitle}
          </p>
        </div>

        {/* ── Right: Profile ──────────────────────────────────── */}
        <div style={{ position: 'relative' }} ref={dropRef}>
          <div
            style={{
              ...S.profileChip,
              background: dropOpen ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.10)',
              borderColor: dropOpen ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.18)',
            }}
            onClick={() => setDropOpen(o => !o)}
          >
            <div style={S.avatar}>{initial}</div>
            <div style={S.profileInfo}>
              <p style={S.profileName}>{sellerName || 'Seller'}</p>
            </div>
            <div style={{ transform: dropOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
              <Icon name="chevronDown" size={13} color="rgba(255,255,255,0.7)" strokeWidth={2.5} />
            </div>
          </div>

          {/* Dropdown */}
          {dropOpen && (
            <div style={S.dropdown}>
              <div style={S.dropHeader}>
                <div style={S.dropAvatar}>{initial}</div>
                <div>
                  <p style={S.dropName}>{sellerName || 'Seller'}</p>
                  <p style={S.dropEmail}>{auth.currentUser?.email}</p>
                </div>
              </div>
              <div style={S.dropDivider} />
              <button style={S.dropItem} onClick={() => { setModal('account'); setDropOpen(false); }}
                onMouseEnter={e => e.currentTarget.style.background = '#FDF6F0'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={S.dropIconWrap}><Icon name="user" size={13} color="#5C4033" strokeWidth={2} /></span>
                Manage Account
              </button>
              <button style={S.dropItem} onClick={() => { setModal('password'); setDropOpen(false); }}
                onMouseEnter={e => e.currentTarget.style.background = '#FDF6F0'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={S.dropIconWrap}><Icon name="lock" size={13} color="#5C4033" strokeWidth={2} /></span>
                Change Password
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modal === 'password' && <ChangePasswordModal onClose={() => setModal(null)} />}
      {modal === 'account'  && (
        <ManageAccountModal
          onClose={() => setModal(null)}
          sellerName={sellerName}
          setSellerName={setSellerName}
        />
      )}
    </>
  );
}

/* ─── Styles ───────────────────────────────────────────────────── */
const S = {
  header: {
    background: 'linear-gradient(180deg, #3D2212 100%)',
    padding: '16px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 20px rgba(44,24,14,0.35)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    fontFamily: 'Nunito, sans-serif',
  },

  titleSection: { display: 'flex', flexDirection: 'column', gap: 2 },
  pageTitle: {
    fontSize: 20, fontWeight: 900, color: '#FFFFFF',
    margin: 0, letterSpacing: '-0.5px',
  },
  pageSubtitle: {
    fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: 0, fontWeight: 600,
  },

  profileChip: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '6px 12px 6px 6px',
    borderRadius: 14, border: '1px solid',
    cursor: 'pointer', transition: 'all 0.18s ease',
  },
  avatar: {
    width: 34, height: 34, borderRadius: 10,
    background: 'linear-gradient(135deg,#C4956A,#E8B88A)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    color: '#3D2212', fontSize: 14, fontWeight: 900,
    boxShadow: '0 3px 8px rgba(0,0,0,0.25)',
    flexShrink: 0,
  },
  profileInfo: { display: 'flex', flexDirection: 'column' },
  profileName: { fontSize: 12, fontWeight: 800, color: '#FFFFFF', margin: 0 },

  /* Dropdown */
  dropdown: {
    position: 'absolute', top: 'calc(100% + 10px)', right: 0,
    background: '#fff', borderRadius: 16,
    boxShadow: '0 16px 48px rgba(44,24,14,0.22)',
    border: '1px solid #EDD9CC',
    minWidth: 230, zIndex: 200,
    fontFamily: 'Nunito, sans-serif',
    overflow: 'hidden',
  },
  dropHeader: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '16px 16px 12px',
  },
  dropAvatar: {
    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
    background: 'linear-gradient(135deg,#5C4033,#8B6355)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    color: '#fff', fontSize: 15, fontWeight: 900,
  },
  dropName: { fontSize: 13, fontWeight: 800, color: '#1A1A2E', margin: 0 },
  dropEmail: { fontSize: 10, color: '#94A3B8', margin: 0, fontWeight: 600 },
  dropDivider: { height: 1, background: '#F1F5F9', margin: '0 10px' },
  dropItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', padding: '11px 16px',
    border: 'none', background: 'transparent',
    fontSize: 12, fontWeight: 700, color: '#3D2212',
    cursor: 'pointer', textAlign: 'left',
    transition: 'background 0.15s',
    fontFamily: 'Nunito, sans-serif',
  },
  dropIconWrap: {
    width: 26, height: 26, borderRadius: 7, flexShrink: 0,
    background: '#FDF6F0', border: '1px solid #EDD9CC',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
};