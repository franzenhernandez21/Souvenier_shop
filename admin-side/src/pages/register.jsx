import React, { useState } from 'react';
import { auth, db } from '../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';


/* Reuse your Icon component if already global */
const Icon = ({ name, size = 18 }) => {
  const paths = {
    user: <><path d="M20 21v-2a4 4 0 0 0-3-3.87"/><circle cx="12" cy="7" r="4"/></>,
    mail: <><path d="M4 4h16v16H4z"/><path d="m4 4 8 8 8-8"/></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
};

export default function AdminRegister() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    try {
      // 🔹 Create user in Firebase Auth
      const userCred = await createUserWithEmailAndPassword(auth, email, password);

      // 🔹 Save admin data in Firestore
      await setDoc(doc(db, "users", userCred.user.uid), {
        name,
        email,
        role: "admin",
        createdAt: new Date()
      });

      setMsg('✅ Admin account created successfully');

      // Reset fields
      setEmail('');
      setPassword('');
      setName('');

    } catch (err) {
      setMsg(`❌ ${err.message}`);
    }

    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleRegister} style={styles.card}>

        <h2 style={styles.title}>Create Admin Account</h2>

        {/* Name */}
        <div style={styles.inputGroup}>
          <Icon name="user" />
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={e => setName(e.target.value)}
            style={styles.input}
            required
          />
        </div>

        {/* Email */}
        <div style={styles.inputGroup}>
          <Icon name="mail" />
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={styles.input}
            required
          />
        </div>

        {/* Password */}
        <div style={styles.inputGroup}>
          <Icon name="lock" />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={styles.input}
            required
          />
        </div>

        {/* Button */}
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Creating...' : 'Register'}
        </button>

        {msg && <p style={styles.message}>{msg}</p>}
      </form>
    </div>
  );
}

/* ─── Styles (MATCH YOUR DASHBOARD DESIGN) ─── */
const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: '#FDF6F0',
    fontFamily: 'Nunito, sans-serif'
  },

  card: {
    width: 360,
    padding: 30,
    borderRadius: 20,
    background: '#fff',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },

  title: {
    textAlign: 'center',
    fontWeight: 900,
    color: '#5C4033'
  },

  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    border: '1px solid #E5E7EB',
    borderRadius: 10,
    padding: '10px 12px',
    background: '#F9FAFB'
  },

  input: {
    border: 'none',
    outline: 'none',
    flex: 1,
    fontSize: 14,
    background: 'transparent'
  },

  button: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    border: 'none',
    fontWeight: 800,
    color: '#fff',
    cursor: 'pointer',
    background: 'linear-gradient(135deg,#5C4033,#8B6355)',
    boxShadow: '0 4px 12px rgba(92,64,51,0.3)'
  },

  message: {
    fontSize: 12,
    textAlign: 'center'
  }
};