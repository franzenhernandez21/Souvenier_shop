import React, { useEffect, useState } from 'react';
import api from '../config/api';

/* ─── Google Font ──────────────────────────────────────────────── */
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap';
fontLink.rel = 'stylesheet';
if (!document.head.querySelector('[href*="Nunito"]')) document.head.appendChild(fontLink);

const statusConfig = {
  pending:   { bg: '#FFF7ED', color: '#C2410C', dot: '#F97316' },
  confirmed: { bg: '#EFF6FF', color: '#1D4ED8', dot: '#3B82F6' },
  shipped:   { bg: '#F5F3FF', color: '#6D28D9', dot: '#8B5CF6' },
  completed: { bg: '#F0FDF4', color: '#15803D', dot: '#22C55E' },
  cancelled: { bg: '#FFF1F2', color: '#BE123C', dot: '#F43F5E' },
};

function StatusPill({ status }) {
  const cfg = statusConfig[status] || { bg: '#F1F5F9', color: '#64748B', dot: '#94A3B8' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      backgroundColor: cfg.bg, color: cfg.color,
      padding: '4px 10px', borderRadius: 100,
      fontSize: 11, fontWeight: 700,
      textTransform: 'capitalize', letterSpacing: 0.3,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: cfg.dot, flexShrink: 0 }} />
      {status}
    </span>
  );
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userOrders, setUserOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // ✅ UPDATED: Fetch users from MongoDB
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/users');
        setUsers(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // ✅ UPDATED: Fetch orders per user from MongoDB
  const handleViewOrders = async (user) => {
    setSelectedUser(user);
    setLoadingOrders(true);
    try {
      const res = await api.get('/orders');
      const userId = user._id || user.id;
      const filtered = res.data.filter((o) =>
        o.userId === userId || o.userEmail === user.email
      );
      setUserOrders(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // ✅ UPDATED: Delete user via API
  const handleDeleteUser = async (id) => {
    try {
      await api.delete(`/users/${id}`);
      setUsers(prev => prev.filter(u => (u._id || u.id) !== id));
      setDeleteConfirm(null);
      setSelectedUser(null);
    } catch (err) {
      alert('Error deleting user: ' + err.message);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.role !== 'admin' &&
    (
      (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div style={S.container}>

      {/* Search */}
      <div style={S.searchWrapper}>
        <span style={{ fontSize: 16 }}>🔍</span>
        <input
          style={S.searchInput}
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button style={S.clearBtn} onClick={() => setSearch('')}>✕</button>
        )}
      </div>

      {/* Main Content */}
      <div style={S.mainContent}>

        {/* Table */}
        <div style={S.card}>
          {loading ? (
            <div style={S.emptyState}>
              <p style={{ color: '#94A3B8', fontSize: 14 }}>Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={S.emptyState}>
              <span style={{ fontSize: 48 }}>👥</span>
              <p style={{ fontSize: 16, fontWeight: 600, color: '#374151', margin: 0 }}>No users found</p>
              <p style={{ fontSize: 14, color: '#94A3B8', margin: 0 }}>Try a different search term</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={S.table}>
                <thead>
                  <tr style={{ background: '#FAFAFA' }}>
                    {['User ID', 'Username', 'Email', 'Joined', 'Actions'].map((h) => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const userId = user._id || user.id;
                    return (
                      <tr
                        key={userId}
                        style={{
                          ...S.tr,
                          ...(selectedUser?._id === userId || selectedUser?.id === userId ? S.trSelected : {}),
                        }}
                      >
                        <td style={S.td}>
                          <span style={S.idBadge}>#{userId?.slice(0, 8)}</span>
                        </td>
                        <td style={S.td}>
                          <p style={S.userName}>{user.name || 'Unknown'}</p>
                        </td>
                        <td style={S.td}>
                          <span style={S.emailText}>{user.email}</span>
                        </td>
                        <td style={S.td}>
                          <span style={S.dateText}>{formatDate(user.createdAt)}</span>
                        </td>
                        <td style={S.td}>
                          <div style={S.actionBtns}>
                            <button style={S.viewBtn} onClick={() => handleViewOrders(user)}>
                              📦 Order History
                            </button>
                            <button style={S.deleteBtn} onClick={() => setDeleteConfirm(user)}>
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Order History Panel */}
        {selectedUser && (
          <div style={S.detailPanel}>
            <div style={S.detailHeader}>
              <div>
                <h3 style={S.detailTitle}>Order History</h3>
                <p style={S.detailSubtitle}>{selectedUser.name || selectedUser.email}</p>
              </div>
              <button style={S.closePanelBtn} onClick={() => setSelectedUser(null)}>✕</button>
            </div>
            <div style={S.detailContent}>
              {loadingOrders ? (
                <div style={S.emptyState}>
                  <p style={{ color: '#94A3B8', fontSize: 14 }}>Loading orders...</p>
                </div>
              ) : userOrders.length === 0 ? (
                <div style={S.emptyState}>
                  <span style={{ fontSize: 40 }}>📦</span>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#374151', margin: 0 }}>No orders yet</p>
                  <p style={{ fontSize: 13, color: '#94A3B8', margin: 0, textAlign: 'center' }}>
                    This user has not placed any orders
                  </p>
                </div>
              ) : (
                userOrders.map((order) => {
                  const orderId = order._id || order.id;
                  return (
                    <div key={orderId} style={S.orderCard}>
                      <div style={S.orderCardHeader}>
                        <span style={S.orderIdBadge}>#{orderId?.slice(0, 8)}</span>
                        <StatusPill status={order.status} />
                      </div>
                      <div style={S.orderItems}>
                        {order.items?.map((item, index) => (
                          <div key={index} style={S.orderItem}>
                            <div style={S.orderItemThumb}>
                              {item.image
                                ? <img src={item.image} alt={item.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }}
                                    onError={(e) => { e.target.style.display = 'none'; }} />
                                : <span style={{ fontSize: 14 }}>🛍️</span>}
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={S.orderItemName} title={item.name}>{item.name}</p>
                              <p style={S.orderItemQty}>x{item.quantity}</p>
                            </div>
                            <p style={S.orderItemPrice}>
                              ₱{(typeof item.price === 'number' ? item.price : parseFloat(String(item.price || '0').replace(/[₱,]/g, '')) || 0) * (item.quantity || 1)}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div style={S.orderCardFooter}>
                        <span style={S.orderPayment}>
                          {order.paymentMethod === 'cod' ? '💵 COD' : '📱 GCash'}
                        </span>
                        <span style={S.orderTotal}>₱{(order.grandTotal || 0).toLocaleString()}</span>
                      </div>
                      <p style={S.orderDate}>{formatDate(order.createdAt)}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div style={S.modalOverlay}>
          <div style={S.deleteModal}>
            <div style={S.deleteIconWrapper}>
              <span style={{ fontSize: 36 }}>⚠️</span>
            </div>
            <h3 style={S.deleteTitle}>Delete User?</h3>
            <p style={S.deleteMsg}>
              Are you sure you want to delete{' '}
              <strong>{deleteConfirm.name || deleteConfirm.email}</strong>?
              This action cannot be undone.
            </p>
            <div style={S.deleteBtns}>
              <button style={S.cancelBtn} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button style={S.confirmDeleteBtn} onClick={() => handleDeleteUser(deleteConfirm._id || deleteConfirm.id)}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const S = {
  container: { display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: 'Nunito, sans-serif' },
  searchWrapper: {
    display: 'flex', alignItems: 'center', gap: '10px',
    backgroundColor: '#fff', border: '1.5px solid #E5E7EB',
    borderRadius: '10px', padding: '0 16px',
  },
  searchInput: {
    flex: 1, padding: '11px 0', border: 'none', outline: 'none',
    fontSize: '14px', backgroundColor: 'transparent', color: '#1A1A2E',
    fontFamily: 'Nunito, sans-serif',
  },
  clearBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '14px', padding: '4px' },
  mainContent: { display: 'flex', gap: '20px', alignItems: 'flex-start' },
  card: {
    flex: 1, backgroundColor: '#fff', borderRadius: 18,
    padding: '20px 22px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    border: '1px solid #F1F5F9', overflow: 'hidden',
  },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px', gap: '10px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#94A3B8',
    textTransform: 'uppercase', letterSpacing: 0.8, padding: '10px 14px',
    borderBottom: '1px solid #F1F5F9', fontFamily: 'Nunito, sans-serif',
  },
  tr: { borderBottom: '1px solid #F9FAFB', transition: 'background 0.15s' },
  trSelected: { backgroundColor: '#FDF6F0' },
  td: { padding: '12px 14px', verticalAlign: 'middle', fontFamily: 'Nunito, sans-serif' },
  idBadge: { fontFamily: 'monospace', fontSize: 11, color: '#5C4033', fontWeight: 700, background: '#FDF6F0', padding: '3px 8px', borderRadius: 6 },
  userName: { fontSize: 13, fontWeight: 700, color: '#1A1A2E', margin: 0 },
  emailText: { fontSize: 12, color: '#64748B', fontWeight: 500 },
  dateText: { fontSize: 11, color: '#94A3B8', fontWeight: 600 },
  actionBtns: { display: 'flex', gap: '8px', alignItems: 'center' },
  viewBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    background: 'linear-gradient(135deg,#5C4033,#8B6355)',
    border: 'none', borderRadius: 8, padding: '7px 14px',
    fontSize: 11, color: '#fff', fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 3px 8px rgba(92,64,51,0.3)', whiteSpace: 'nowrap',
    fontFamily: 'Nunito, sans-serif',
  },
  deleteBtn: { backgroundColor: '#FFF1F2', color: '#BE123C', border: '1px solid #FECDD3', borderRadius: 8, padding: '6px 10px', fontSize: 14, cursor: 'pointer' },
  detailPanel: { width: '320px', backgroundColor: '#fff', borderRadius: 18, border: '1px solid #F1F5F9', overflow: 'hidden', flexShrink: 0, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
  detailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid #F1F5F9' },
  detailTitle: { fontSize: 15, fontWeight: 800, color: '#1A1A2E', margin: 0, fontFamily: 'Nunito, sans-serif' },
  detailSubtitle: { fontSize: 12, color: '#94A3B8', margin: '2px 0 0 0' },
  closePanelBtn: { width: 28, height: 28, borderRadius: 8, border: 'none', backgroundColor: '#F1F5F9', cursor: 'pointer', fontSize: 12, color: '#64748B' },
  detailContent: { padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '70vh', overflowY: 'auto' },
  orderCard: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, border: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: 10 },
  orderCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  orderIdBadge: { fontSize: 11, fontFamily: 'monospace', color: '#5C4033', fontWeight: 700, backgroundColor: '#FDF6F0', padding: '2px 8px', borderRadius: 6 },
  orderItems: { display: 'flex', flexDirection: 'column', gap: 8 },
  orderItem: { display: 'flex', alignItems: 'center', gap: 8 },
  orderItemThumb: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FDF6F0', border: '1px solid #EDD9CC', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', flexShrink: 0 },
  orderItemName: { fontSize: 12, fontWeight: 700, color: '#1A1A2E', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 },
  orderItemQty: { fontSize: 11, color: '#94A3B8', margin: 0, fontWeight: 600 },
  orderItemPrice: { fontSize: 12, fontWeight: 800, color: '#5C4033', margin: 0 },
  orderCardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #F1F5F9' },
  orderPayment: { fontSize: 11, color: '#64748B', fontWeight: 600 },
  orderTotal: { fontSize: 14, fontWeight: 900, color: '#5C4033' },
  orderDate: { fontSize: 11, color: '#94A3B8', margin: 0 },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  deleteModal: { backgroundColor: '#fff', borderRadius: 20, padding: 36, width: 400, maxWidth: '90%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', fontFamily: 'Nunito, sans-serif' },
  deleteIconWrapper: { width: 72, height: 72, borderRadius: '50%', backgroundColor: '#FFF7ED', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  deleteTitle: { fontSize: 20, fontWeight: 700, color: '#1A1A2E', margin: 0 },
  deleteMsg: { fontSize: 14, color: '#64748B', lineHeight: 1.6, margin: 0 },
  deleteBtns: { display: 'flex', gap: 12, marginTop: 8 },
  cancelBtn: { backgroundColor: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: 10, padding: '11px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  confirmDeleteBtn: { backgroundColor: '#E53E3E', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};