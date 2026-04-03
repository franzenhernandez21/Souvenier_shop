import React, { useEffect, useState } from 'react';
import { db } from '../config/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

/* ─── Google Font ──────────────────────────────────────────────── */
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap';
fontLink.rel = 'stylesheet';
if (!document.head.querySelector('[href*="Nunito"]')) document.head.appendChild(fontLink);

const ORDER_STATUS_CONFIG = {
  pending:   { bg: '#FFF7ED', color: '#C2410C', dot: '#F97316', icon: '🕐' },
  confirmed: { bg: '#EFF6FF', color: '#1D4ED8', dot: '#3B82F6', icon: '✅' },
  shipped:   { bg: '#F5F3FF', color: '#6D28D9', dot: '#8B5CF6', icon: '🚚' },
  completed: { bg: '#F0FDF4', color: '#15803D', dot: '#22C55E', icon: '🎉' },
  cancelled: { bg: '#FFF1F2', color: '#BE123C', dot: '#F43F5E', icon: '❌' },
};

function StatusPill({ status }) {
  const cfg = ORDER_STATUS_CONFIG[status] || { bg: '#F1F5F9', color: '#64748B', dot: '#94A3B8' };
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

export default function Notifications() {
  const [orderNotifs, setOrderNotifs]   = useState([]);
  const [stockNotifs, setStockNotifs]   = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingStock, setLoadingStock]   = useState(true);

  /* ── Orders real-time listener ── */
  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setOrderNotifs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingOrders(false);
    }, (err) => { console.error(err); setLoadingOrders(false); });
    return () => unsub();
  }, []);

  /* ── Low Stock real-time listener ── */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), (snap) => {
      const low = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((p) => (p.stock ?? 0) <= 5)
        .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));
      setStockNotifs(low);
      setLoadingStock(false);
    }, (err) => { console.error(err); setLoadingStock(false); });
    return () => unsub();
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return null;
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const loading = loadingOrders || loadingStock;
  const total   = orderNotifs.length + stockNotifs.length;

  return (
    <div style={S.container}>

      {/* List */}
      {loading ? (
        <div style={S.emptyBox}>
          <p style={S.emptyText}>Loading notifications...</p>
        </div>
      ) : total === 0 ? (
        <div style={S.emptyBox}>
          <span style={S.emptyIcon}>🔔</span>
          <p style={S.emptyTitle}>No notifications yet</p>
          <p style={S.emptySubtext}>Incoming orders and stock alerts will appear here</p>
        </div>
      ) : (
        <div style={S.list}>

          {/* ── Low Stock alerts always on top ── */}
          {stockNotifs.map((product) => {
            const isOut = (product.stock ?? 0) === 0;
            return (
              <div key={`stock-${product.id}`} style={{
                ...S.card,
                borderLeft: `4px solid ${isOut ? '#F43F5E' : '#F97316'}`,
              }}>
                <div style={{ ...S.iconCircle, backgroundColor: isOut ? '#FFF1F2' : '#FFF7ED' }}>
                  <span style={{ fontSize: 22 }}>{isOut ? '🚫' : '⚠️'}</span>
                </div>
                <div style={S.cardContent}>
                  <div style={S.cardTop}>
                    <div>
                      <p style={S.cardTitle}>{isOut ? 'Out of Stock' : 'Low Stock Alert'}</p>
                      <p style={S.cardSub}>
                        <strong>{product.name || 'Unknown Product'}</strong>
                        {!isOut && ` — only ${product.stock} item${product.stock === 1 ? '' : 's'} left`}
                      </p>
                    </div>
                    <span style={{
                      ...S.stockBadge,
                      backgroundColor: isOut ? '#FFF1F2' : '#FFF7ED',
                      color: isOut ? '#BE123C' : '#C2410C',
                    }}>
                      {isOut ? '0 in stock' : `${product.stock} left`}
                    </span>
                  </div>
                  <p style={S.restockNote}>
                    {isOut
                      ? 'This product is out of stock. Please restock immediately.'
                      : 'Stock is critically low. Consider restocking soon.'}
                  </p>
                </div>
              </div>
            );
          })}

          {/* ── Order notifications ── */}
          {orderNotifs.map((order) => {
            const cfg  = ORDER_STATUS_CONFIG[order.status] || {};
            const date = formatDate(order.createdAt);
            return (
              <div key={`order-${order.id}`} style={S.card}>
                <div style={{ ...S.iconCircle, backgroundColor: cfg.bg || '#F8FAFC' }}>
                  <span style={{ fontSize: 22 }}>{cfg.icon || '🛒'}</span>
                </div>
                <div style={S.cardContent}>
                  <div style={S.cardTop}>
                    <div>
                      <p style={S.cardTitle}>
                        Order from <strong>{order.userEmail || 'Unknown Buyer'}</strong>
                      </p>
                      {date && <p style={S.cardSub}>{date}</p>}
                    </div>
                    <StatusPill status={order.status} />
                  </div>

                  {order.items?.length > 0 && (
                    <div style={S.chips}>
                      {order.items.map((item, i) => (
                        <span key={i} style={S.chip}>
                          🛍️ {item.name} ×{item.quantity}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={S.cardFooter}>
                    <span style={S.orderIdBadge}>#{order.id.slice(0, 8)}</span>
                    <span style={S.paymentText}>
                      {order.paymentMethod === 'cod' ? '💵 COD' : '📱 GCash'}
                    </span>
                    <span style={S.totalText}>
                      ₱{(order.grandTotal || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

        </div>
      )}
    </div>
  );
}

const S = {
  container: {
    display: 'flex', flexDirection: 'column', gap: 20,
    fontFamily: 'Nunito, sans-serif',
  },

  list: { display: 'flex', flexDirection: 'column', gap: 10 },

  card: {
    display: 'flex', gap: 14, alignItems: 'flex-start',
    backgroundColor: '#fff', borderRadius: 14, padding: '16px 18px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #F1F5F9',
  },
  iconCircle: {
    width: 48, height: 48, borderRadius: '50%',
    display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  cardContent: { flex: 1, display: 'flex', flexDirection: 'column', gap: 8 },
  cardTop: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10,
  },
  cardTitle: { fontSize: 13, fontWeight: 700, color: '#1A1A2E', margin: 0 },
  cardSub:   { fontSize: 11, color: '#94A3B8', margin: '2px 0 0 0', fontWeight: 600 },

  chips: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: '#F8FAFC', border: '1px solid #E5E7EB',
    borderRadius: 20, padding: '3px 10px', fontSize: 11, color: '#555', fontWeight: 600,
  },

  cardFooter: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  orderIdBadge: {
    fontFamily: 'monospace', fontSize: 11, color: '#5C4033',
    fontWeight: 700, background: '#FDF6F0', padding: '2px 8px', borderRadius: 6,
  },
  paymentText: { fontSize: 12, color: '#64748B', fontWeight: 600 },
  totalText:   { fontSize: 14, fontWeight: 900, color: '#5C4033', marginLeft: 'auto' },

  stockBadge: {
    fontSize: 11, fontWeight: 700, padding: '4px 10px',
    borderRadius: 100, whiteSpace: 'nowrap', flexShrink: 0,
  },
  restockNote: { fontSize: 12, color: '#94A3B8', margin: 0, fontWeight: 600 },

  emptyBox: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '64px', gap: 10, backgroundColor: '#fff',
    borderRadius: 14, border: '1px dashed #E5E7EB',
  },
  emptyIcon:    { fontSize: 48 },
  emptyTitle:   { fontSize: 15, fontWeight: 700, color: '#374151', margin: 0 },
  emptyText:    { fontSize: 14, color: '#94A3B8', margin: 0 },
  emptySubtext: { fontSize: 13, color: '#94A3B8', margin: 0, textAlign: 'center' },
};