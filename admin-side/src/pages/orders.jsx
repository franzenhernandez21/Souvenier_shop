import React, { useEffect, useState, useRef } from 'react';
import api from '../config/api';
import { io } from 'socket.io-client';

/* ─── Google Font ──────────────────────────────────────────────── */
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap';
fontLink.rel = 'stylesheet';
if (!document.head.querySelector('[href*="Nunito"]')) document.head.appendChild(fontLink);

/* ─── SVG Icon ─────────────────────────────────────────────────── */
const Icon = ({ name, size = 18, color = 'currentColor', strokeWidth = 1.8 }) => {
  const paths = {
    eye: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>,
    shoppingBag: <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></>,
    x: <><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
};

const statusOptions = ['pending', 'processing', 'completed'];

const statusConfig = {
  pending:    { bg: '#FFF9E6', color: '#B45309', dot: '#F59E0B', label: 'Pending' },
  processing: { bg: '#FFF7ED', color: '#C2410C', dot: '#F97316', label: 'Processing' },
  completed:  { bg: '#F0FDF4', color: '#15803D', dot: '#22C55E', label: 'Completed' },
};

const parsePrice = (val) => {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  return parseFloat(String(val).replace(/[₱,]/g, '')) || 0;
};

function resolveDateReceived(order) {
  return order.dateReceived || order.completedAt || null;
}

function StatusPill({ status }) {
  const key = statusConfig[status] ? status : 'pending';
  const cfg = statusConfig[key] || {
    bg: '#F1F5F9', color: '#64748B', dot: '#94A3B8', label: status,
  };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      backgroundColor: cfg.bg, color: cfg.color,
      padding: '4px 10px', borderRadius: 100,
      fontSize: 11, fontWeight: 700,
      textTransform: 'capitalize', letterSpacing: 0.3,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

export default function Orders() {
  const [orders, setOrders]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filterStatus, setFilterStatus]   = useState('all');
  const [search, setSearch]               = useState('');
  const [confirming, setConfirming]       = useState(false);

  // ✅ UPDATED: Fetch from MongoDB
  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders');
      setOrders(res.data);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // ✅ FIX: Socket.IO realtime connection
    const socket = io('http://localhost:5000', {
      transports: ['websocket'],
    });

    // ✅ New order from mobile user
    socket.on('new_order', (order) => {
      setOrders((prev) => [order, ...prev]);
    });

    // ✅ Order updated (status change)
    socket.on('order_updated', (updatedOrder) => {
      setOrders((prev) =>
        prev.map((o) =>
          (o._id || o.id) === (updatedOrder._id || updatedOrder.id)
            ? updatedOrder
            : o
        )
      );
      // Update selected order if open
      setSelectedOrder((prev) =>
        prev && (prev._id || prev.id) === (updatedOrder._id || updatedOrder.id)
          ? updatedOrder
          : prev
      );
    });

    // ✅ Order deleted
    socket.on('order_deleted', ({ id }) => {
      setOrders((prev) =>
        prev.filter((o) => (o._id || o.id) !== id)
      );
      setSelectedOrder((prev) =>
        prev && (prev._id || prev.id) === id ? null : prev
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // ✅ UPDATED: Confirm order via API
  const handleConfirmOrder = async (orderId) => {
    try {
      setConfirming(true);
      await api.put(`/orders/${orderId}`, {
        status: 'processing',
        confirmedAt: new Date(),
      });
      await fetchOrders();
      setSelectedOrder(prev =>
        prev ? { ...prev, status: 'processing' } : null
      );
    } catch (err) {
      console.error('Failed to confirm order:', err);
    } finally {
      setConfirming(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
    const searchLower   = search.toLowerCase().trim();
    const matchesSearch = searchLower === '' ||
      (o.userEmail || '').toLowerCase().includes(searchLower) ||
      (o._id || o.id || '').toLowerCase().includes(searchLower.replace('#', ''));
    return matchesStatus && matchesSearch;
  });

  // ✅ UPDATED: Handle both MongoDB dates and regular dates
  const fmtDate = (ts) => {
    if (!ts) return null;
    const date = ts?.toDate ? ts.toDate() : new Date(ts);
    if (isNaN(date)) return null;
    return date.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const getDateReceivedDisplay = (order) => {
    const ts  = resolveDateReceived(order);
    const fmt = fmtDate(ts);
    if (fmt) return { value: fmt, green: true, orange: false };
    if (order.status === 'completed') return { value: 'Not recorded', green: false, orange: true };
    return { value: 'Pending', green: false, orange: false };
  };

  return (
    <div style={S.container}>

      {/* Search */}
      <div style={S.searchWrapper}>
        <span style={{ fontSize: 16 }}>🔍</span>
        <input
          style={S.searchInput}
          placeholder="Search by email or order ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button style={S.clearBtn} onClick={() => setSearch('')}>✕</button>
        )}
      </div>

      {/* Filter */}
      <div style={S.statusFilters}>
        {['all', ...statusOptions].map((status) => (
          <button
            key={status}
            style={{ ...S.statusBtn, ...(filterStatus === status ? S.statusBtnActive : {}) }}
            onClick={() => setFilterStatus(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Table Card */}
      <div style={S.card}>
        {loading ? (
          <div style={S.emptyState}>
            <p style={{ color: '#94A3B8', fontSize: 14 }}>Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={S.emptyState}>
            <span style={{ fontSize: 48 }}>📦</span>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#374151', margin: 0 }}>No orders found</p>
            <p style={{ fontSize: 14, color: '#94A3B8', margin: 0 }}>Try adjusting your search or filters</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr style={{ background: '#FAFAFA' }}>
                  {['Order ID', 'Customer', 'Items', 'Total', 'Payment', 'Date Placed', 'Date Received', 'Status', 'Action'].map((h) => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const orderId = order._id || order.id;
                  const datePlaced = fmtDate(order.createdAt) || '—';
                  const dateReceivedTs  = resolveDateReceived(order);
                  const dateReceivedFmt = fmtDate(dateReceivedTs);
                  const dateReceivedStr = dateReceivedFmt
                    ? dateReceivedFmt
                    : order.status === 'completed' ? 'Not recorded' : '—';
                  const dateReceivedGreen = !!dateReceivedFmt;
                  const customerName = order.userEmail?.split('@')[0] || '—';

                  return (
                    <tr key={orderId} style={S.tr}>
                      <td style={S.td}>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#5C4033', fontWeight: 700, background: '#FDF6F0', padding: '3px 8px', borderRadius: 6 }}>
                          #{orderId?.slice(0, 8)}
                        </span>
                      </td>
                      <td style={S.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: '50%',
                            background: 'linear-gradient(135deg,#5C4033,#A0674A)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0,
                          }}>
                            {customerName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#1A1A2E', margin: 0 }}>{customerName}</p>
                            <p style={{ fontSize: 10, color: '#94A3B8', margin: 0 }}>{order.userEmail || ''}</p>
                          </div>
                        </div>
                      </td>
                      <td style={S.td}>
                        <span style={{ fontSize: 12, color: '#374151', fontWeight: 700 }}>
                          {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td style={S.td}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#5C4033' }}>
                          ₱{(order.grandTotal || 0).toLocaleString()}
                        </span>
                      </td>
                      <td style={S.td}>
                        <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600, background: '#F8FAFC', padding: '3px 8px', borderRadius: 6 }}>
                          {order.paymentMethod === 'cod' ? '💵 COD' : '📱 GCash'}
                        </span>
                      </td>
                      <td style={S.td}>
                        <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>{datePlaced}</span>
                      </td>
                      <td style={S.td}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: dateReceivedGreen ? '#15803D' : '#94A3B8' }}>
                          {dateReceivedStr}
                        </span>
                      </td>
                      <td style={S.td}>
                        <StatusPill status={order.status} />
                      </td>
                      <td style={S.td}>
                        <button onClick={() => setSelectedOrder(order)} style={S.viewBtn}>
                          <Icon name="eye" size={13} color="#fff" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Order Modal ─────────────────────────────────────────── */}
      {selectedOrder && (() => {
        const drDisplay = getDateReceivedDisplay(selectedOrder);
        const orderId = selectedOrder._id || selectedOrder.id;
        return (
          <div style={S.modalOverlay} onClick={() => setSelectedOrder(null)}>
            <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>

              {/* Header */}
              <div style={S.modalHeader}>
                <div>
                  <h2 style={S.modalTitle}>Order Details</h2>
                  <p style={S.modalOrderId}>
                    Order <span style={{ fontFamily: 'monospace', color: '#5C4033', fontWeight: 700 }}>#{orderId}</span>
                  </p>
                </div>
                <button onClick={() => setSelectedOrder(null)} style={S.closeBtn}>
                  <Icon name="x" size={14} color="#64748B" strokeWidth={2.5} />
                </button>
              </div>

              {/* Info Row */}
              <div style={S.modalInfoRow}>
                {[
                  { label: 'Customer', value: selectedOrder.userEmail?.split('@')[0] || '—', sub: selectedOrder.userEmail || '' },
                  { label: 'Date Placed', value: fmtDate(selectedOrder.createdAt) || '—' },
                  { label: 'Date Received', value: drDisplay.value, green: drDisplay.green, orange: drDisplay.orange },
                  { label: 'Payment', value: selectedOrder.paymentMethod === 'cod' ? '💵 Cash on Delivery' : '📱 GCash' },
                ].map((item) => (
                  <div key={item.label} style={S.modalInfoItem}>
                    <span style={S.modalInfoLabel}>{item.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: item.green ? '#15803D' : item.orange ? '#C2410C' : '#1A1A2E' }}>
                      {item.value}
                    </span>
                    {item.sub && <span style={{ fontSize: 10, color: '#94A3B8' }}>{item.sub}</span>}
                  </div>
                ))}
              </div>

              {/* Status */}
              <div style={{ marginBottom: 18 }}>
                <p style={S.modalSectionTitle}>Current Status</p>
                <div style={{ marginTop: 8 }}>
                  <StatusPill status={selectedOrder.status} />
                </div>
              </div>

              {/* Items */}
              <div style={S.modalSection}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Icon name="shoppingBag" size={14} color="#5C4033" />
                  <p style={S.modalSectionTitle}>Items Ordered</p>
                </div>
                {selectedOrder.items?.map((item, i) => (
                  <div key={i} style={S.modalItemRow}>
                    <div style={S.modalItemThumb}>
                      {item.image
                        ? <img src={item.image} alt={item.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
                            onError={(e) => { e.target.style.display = 'none'; }} />
                        : <Icon name="shoppingBag" size={18} color="#C4956A" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={S.modalItemName}>{item.name}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={S.modalItemPrice}>₱{parsePrice(item.price).toLocaleString()}</p>
                      <p style={S.modalItemQty}>×{item.quantity || 1}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div style={S.modalTotals}>
                {[
                  ['Subtotal', `₱${(selectedOrder.totalPrice || 0).toLocaleString()}`],
                  ['Shipping', `₱${selectedOrder.shippingFee || 30}`],
                ].map(([l, v]) => (
                  <div key={l} style={S.modalTotalRow}>
                    <span style={S.modalTotalLabel}>{l}</span>
                    <span style={S.modalTotalValue}>{v}</span>
                  </div>
                ))}
                <div style={{ ...S.modalTotalRow, borderTop: '2px solid #F1F5F9', paddingTop: 12, marginTop: 6 }}>
                  <span style={{ ...S.modalTotalLabel, fontSize: 15, fontWeight: 800, color: '#1A1A2E' }}>Grand Total</span>
                  <span style={{ fontSize: 20, fontWeight: 900, color: '#5C4033' }}>
                    ₱{(selectedOrder.grandTotal || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Confirm Order Button */}
              {selectedOrder.status === 'pending' && (
                <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    onClick={() => handleConfirmOrder(orderId)}
                    disabled={confirming}
                    style={{
                      padding: '8px 18px',
                      background: confirming ? '#CBD5E1' : 'linear-gradient(135deg,#5C4033,#8B6355)',
                      border: 'none', borderRadius: 8,
                      color: '#fff', fontSize: 12, fontWeight: 700,
                      cursor: confirming ? 'not-allowed' : 'pointer',
                      boxShadow: confirming ? 'none' : '0 3px 8px rgba(92,64,51,0.25)',
                      fontFamily: 'Nunito, sans-serif', transition: 'all 0.2s',
                    }}
                  >
                    {confirming ? 'Confirming...' : 'Confirm Order'}
                  </button>
                  <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>
                    Marks order as <strong style={{ color: '#C2410C' }}>Processing</strong>
                  </span>
                </div>
              )}

            </div>
          </div>
        );
      })()}

    </div>
  );
}

const S = {
  container:    { display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: 'Nunito, sans-serif' },
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
  clearBtn:     { background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '14px', padding: '4px' },
  statusFilters:{ display: 'flex', gap: '8px', flexWrap: 'wrap' },
  statusBtn:    {
    padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #E5E7EB',
    backgroundColor: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
    color: '#64748B', fontFamily: 'Nunito, sans-serif',
  },
  statusBtnActive: { backgroundColor: '#5C4033', color: '#fff', border: '1.5px solid #5C4033' },
  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: '20px 22px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #F1F5F9', overflow: 'hidden',
  },
  emptyState:   { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px', gap: '12px' },
  table:        { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#94A3B8',
    textTransform: 'uppercase', letterSpacing: 0.8, padding: '10px 14px',
    borderBottom: '1px solid #F1F5F9', fontFamily: 'Nunito, sans-serif',
  },
  tr:     { borderBottom: '1px solid #F9FAFB', transition: 'background 0.15s' },
  td:     { padding: '12px 14px', verticalAlign: 'middle', fontFamily: 'Nunito, sans-serif' },
  viewBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    background: 'linear-gradient(135deg,#5C4033,#8B6355)',
    border: 'none', borderRadius: 8, padding: '7px 14px',
    fontSize: 11, color: '#fff', fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 3px 8px rgba(92,64,51,0.3)', whiteSpace: 'nowrap',
    fontFamily: 'Nunito, sans-serif',
  },
  modalOverlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  modalBox: {
    backgroundColor: '#fff', borderRadius: 22,
    width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
    boxShadow: '0 24px 64px rgba(0,0,0,0.22)', padding: 28,
    fontFamily: 'Nunito, sans-serif',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 20, paddingBottom: 16, borderBottom: '2px solid #F8FAFC',
  },
  modalTitle:   { fontSize: 18, fontWeight: 900, color: '#1A1A2E', margin: '0 0 4px', letterSpacing: '-0.3px' },
  modalOrderId: { fontSize: 11, color: '#94A3B8', margin: 0, fontWeight: 600 },
  closeBtn: {
    background: '#F1F5F9', border: 'none', borderRadius: 10,
    width: 34, height: 34, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  modalInfoRow: {
    display: 'flex', gap: 20, flexWrap: 'wrap',
    background: 'linear-gradient(135deg,#FDF6F0,#F8F3F0)',
    borderRadius: 14, padding: '16px 18px', marginBottom: 18,
    border: '1px solid #EDD9CC',
  },
  modalInfoItem:    { display: 'flex', flexDirection: 'column', gap: 4 },
  modalInfoLabel:   { fontSize: 9, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8 },
  modalSection:     { marginBottom: 18 },
  modalSectionTitle:{ fontSize: 12, fontWeight: 800, color: '#374151', margin: 0 },
  modalItemRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F9FAFB' },
  modalItemThumb: {
    width: 44, height: 44, borderRadius: 12,
    background: 'linear-gradient(135deg,#FDF6F0,#F3E8E0)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', flexShrink: 0, border: '1px solid #EDD9CC',
  },
  modalItemName:  { fontSize: 13, fontWeight: 700, color: '#1A1A2E', margin: '0 0 2px' },
  modalItemPrice: { fontSize: 14, fontWeight: 800, color: '#5C4033', margin: '0 0 2px' },
  modalItemQty:   { fontSize: 10, color: '#94A3B8', margin: 0, fontWeight: 600 },
  modalTotals:    { borderTop: '2px solid #F1F5F9', paddingTop: 16, marginTop: 4 },
  modalTotalRow:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTotalLabel:{ fontSize: 12, color: '#64748B', fontWeight: 600 },
  modalTotalValue:{ fontSize: 13, fontWeight: 700, color: '#374151' },
};