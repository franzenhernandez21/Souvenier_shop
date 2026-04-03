import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid email or password. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.overlay} />

      {/* Centered landscape card */}
      <div style={styles.cardWrapper}>
        <div style={styles.card}>

          {/* LEFT: Logo + Branding */}
          <div style={styles.leftSide}>
            <img
              src="/assets/logo.png"
              alt="Souvenir Shop Logo"
              style={styles.logo}
            />
            <h1 style={styles.shopName}>Souvenir Shop</h1>
            <p style={styles.shopTagline}>Seller Management Portal</p>

            <div style={styles.featureList}>
              {[
                { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>, text: 'Real-time Updates' },
                { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>, text: 'Order Tracking' },
                { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>, text: 'Instant Alerts' },
              ].map((f, i) => (
                <div key={i} style={styles.featureItem}>
                  <span style={styles.featureIcon}>{f.icon}</span>
                  <span style={styles.featureText}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Vertical divider */}
          <div style={styles.verticalDivider} />

          {/* RIGHT: Form */}
          <div style={styles.rightSide}>
            <h2 style={styles.title}>Welcome back</h2>
            <p style={styles.subtitle}>Sign in to your seller account</p>

            {error && (
              <div style={styles.errorBox}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span style={styles.errorText}>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} style={styles.form}>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Email Address</label>
                <div style={{ ...styles.inputBox, ...(emailFocused ? styles.inputFocused : {}) }}>
                  <svg style={styles.fieldIcon} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={emailFocused ? '#7D5A4F' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <input
                    style={styles.input}
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                  />
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Password</label>
                <div style={{ ...styles.inputBox, ...(passwordFocused ? styles.inputFocused : {}) }}>
                  <svg style={styles.fieldIcon} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={passwordFocused ? '#7D5A4F' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input
                    style={styles.input}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                  />
                  <button type="button" style={styles.eyeBtn} onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                    {showPassword ? (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{ ...styles.submitBtn, ...(loading ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>

            </form>

            <p style={styles.footerNote}>For sellers only · Contact admin for access</p>
          </div>

        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    position: 'relative',
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',       // centered sa screen
    fontFamily: "'Segoe UI', 'Inter', sans-serif",
    backgroundImage: 'url(/assets/login.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundColor: '#F3EDE8',
    overflow: 'hidden',
  },

  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.32)',
    zIndex: 1,
  },

  cardWrapper: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
  },

  /* Landscape card — wide & short, two columns */
  card: {
    width: '100%',
    maxWidth: 860,
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: '48px 52px',
    boxShadow: '0 24px 80px rgba(0,0,0,0.25), 0 4px 20px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },

  /* LEFT column */
  leftSide: {
    flex: '0 0 300px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 40,
    textAlign: 'center',
  },

  logo: {
    width: 150,
    height: 150,
    objectFit: 'contain',
    marginBottom: 14,
  },

  shopName: {
    fontSize: 26,
    fontWeight: 900,
    color: '#3D2314',
    margin: '0 0 4px 0',
    letterSpacing: '-0.5px',
  },

  shopTagline: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: 500,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    margin: '0 0 28px 0',
  },

  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    alignItems: 'flex-start',
    width: '100%',
  },

  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FDF6EF',
    border: '1px solid #F0E2D4',
    borderRadius: 10,
    padding: '9px 14px',
    width: '100%',
  },

  featureIcon: {
    color: '#7D5A4F',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },

  featureText: {
    fontSize: 13,
    fontWeight: 600,
    color: '#4B3228',
  },

  /* Vertical divider */
  verticalDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: '#F0E8E2',
    margin: '0 0',
    flexShrink: 0,
  },

  /* RIGHT column */
  rightSide: {
    flex: 1,
    paddingLeft: 48,
    display: 'flex',
    flexDirection: 'column',
  },

  title: {
    fontSize: 26,
    fontWeight: 800,
    color: '#1A0A04',
    margin: '0 0 6px 0',
    letterSpacing: '-0.4px',
  },

  subtitle: {
    fontSize: 13.5,
    color: '#9CA3AF',
    margin: '0 0 24px 0',
    lineHeight: 1.5,
  },

  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF5F5',
    border: '1px solid #FECACA',
    borderRadius: 10,
    padding: '10px 13px',
    marginBottom: 16,
  },

  errorText: {
    fontSize: 13,
    color: '#DC2626',
  },

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },

  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },

  label: {
    fontSize: 11,
    fontWeight: 700,
    color: '#4B3228',
    letterSpacing: '0.7px',
    textTransform: 'uppercase',
  },

  inputBox: {
    display: 'flex',
    alignItems: 'center',
    border: '1.5px solid #E5DDD8',
    borderRadius: 12,
    backgroundColor: '#FAFAF9',
    transition: 'border-color 0.2s, box-shadow 0.2s, background-color 0.2s',
    overflow: 'hidden',
    height: 50,
  },

  inputFocused: {
    borderColor: '#7D5A4F',
    backgroundColor: '#fff',
    boxShadow: '0 0 0 4px rgba(125,90,79,0.1)',
  },

  fieldIcon: {
    marginLeft: 13,
    flexShrink: 0,
  },

  input: {
    flex: 1,
    padding: '0 13px',
    border: 'none',
    outline: 'none',
    fontSize: 14,
    color: '#1A0A04',
    backgroundColor: 'transparent',
    fontFamily: 'inherit',
    height: '100%',
  },

  eyeBtn: {
    padding: '0 13px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
  },

  submitBtn: {
    background: 'linear-gradient(135deg, #3D2314 0%, #7D5A4F 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '15px',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 4,
    letterSpacing: '0.3px',
    boxShadow: '0 6px 24px rgba(61,35,20,0.35)',
    fontFamily: 'inherit',
    transition: 'opacity 0.2s',
    width: '100%',
  },

  footerNote: {
    textAlign: 'center',
    fontSize: 12,
    color: '#B0A09A',
    marginTop: 20,
    letterSpacing: 0.2,
  },
};