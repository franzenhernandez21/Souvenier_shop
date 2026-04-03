import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../config/firebase';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

/* ─── Google Font ──────────────────────────────────────────────── */
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap';
fontLink.rel = 'stylesheet';
if (!document.head.querySelector('[href*="Nunito"]')) document.head.appendChild(fontLink);

/* ─── SVG Icon Library ─────────────────────────────────────────── */
const Icon = ({ name, size = 18, color = 'currentColor', strokeWidth = 1.8 }) => {
  const paths = {
    package:    <><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></>,
    users:      <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    dollarSign: <><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
    shoppingBag:<><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></>,
    trendingUp: <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>,
    clock:      <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    alertTriangle:<><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>,
    mapPin:     <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></>,
    x:          <><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>,
    eye:        <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>,
    chevronUp:  <polyline points="18 15 12 9 6 15"/>,
    chevronDown:<polyline points="6 9 12 15 18 9"/>,
    star:       <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
    barChart:   <><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></>,
    check:      <polyline points="20 6 9 17 4 12"/>,
    arrowRight: <><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
};

/* ─── Status Config ────────────────────────────────────────────── */
const statusConfig = {
  pending:    { bg: '#FFF9E6', color: '#B45309', dot: '#F59E0B', label: 'Pending' },
  processing: { bg: '#FFF7ED', color: '#C2410C', dot: '#F97316', label: 'Processing' },
  completed:  { bg: '#F0FDF4', color: '#15803D', dot: '#22C55E', label: 'Completed' },
  cancelled:  { bg: '#FFF1F2', color: '#BE123C', dot: '#F43F5E', label: 'Cancelled' },
};

/* ─── Status Pill ──────────────────────────────────────────────── */
function StatusPill({ status }) {
  const cfg = statusConfig[status] || { bg: '#F1F5F9', color: '#64748B', dot: '#94A3B8', label: status };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      backgroundColor: cfg.bg, color: cfg.color,
      padding: '4px 10px', borderRadius: 100,
      fontSize: 11, fontWeight: 700, textTransform: 'capitalize', letterSpacing: 0.3,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

/* ─── Gradient Stat Card ───────────────────────────────────────── */
function StatCard({ label, value, subLabel, subValue, gradient, iconName, light }) {
  return (
    <div style={{
      background: gradient, borderRadius: 22, padding: '28px 20px 22px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 14, textAlign: 'center',
      boxShadow: '0 10px 28px rgba(92,64,51,0.2)',
      position: 'relative', overflow: 'hidden', fontFamily: 'Nunito, sans-serif',
    }}>
      <div style={{ position:'absolute', top:-28, right:-28, width:110, height:110, borderRadius:'50%', background:'rgba(255,255,255,0.10)' }} />
      <div style={{ position:'absolute', bottom:-36, left:-18, width:90, height:90, borderRadius:'50%', background:'rgba(255,255,255,0.07)' }} />
      <div style={{
        width: 62, height: 62, borderRadius: 20,
        background: 'rgba(255,255,255,0.24)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(6px)', boxShadow: `0 6px 18px rgba(0,0,0,0.12)`,
        position: 'relative', zIndex: 1,
      }}>
        <Icon name={iconName} size={28} color={light ? '#5C4033' : '#fff'} strokeWidth={1.8} />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <p style={{ fontSize: 38, fontWeight: 900, color: light ? '#3D2212' : '#fff', margin: 0, letterSpacing: '-2px', lineHeight: 1 }}>
          {value}
        </p>
        <p style={{ fontSize: 12, color: light ? 'rgba(92,64,51,0.7)' : 'rgba(255,255,255,0.8)', margin: '6px 0 0', fontWeight: 700, letterSpacing: 0.2 }}>
          {label}
        </p>
      </div>
      {subLabel && (
        <div style={{
          borderTop: `1px solid ${light ? 'rgba(92,64,51,0.15)' : 'rgba(255,255,255,0.22)'}`,
          paddingTop: 10, width: '100%',
          fontSize: 11, fontWeight: 700,
          color: light ? 'rgba(92,64,51,0.7)' : 'rgba(255,255,255,0.88)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          position: 'relative', zIndex: 1,
        }}>
          <Icon name={subLabel === '⚠️' ? 'alertTriangle' : 'clock'} size={13} color={light ? '#A16207' : 'rgba(255,255,255,0.9)'} />
          {subValue}
        </div>
      )}
    </div>
  );
}

/* ─── Area Revenue Chart ───────────────────────────────────────── */
function RevenueChart({ orders }) {
  const [view, setView] = useState('weekly');
  const W = 480, H = 150, PAD = { top: 20, right: 10, bottom: 30, left: 40 };

  const bars = useMemo(() => {
    const now = new Date();
    if (view === 'daily') {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now); d.setDate(now.getDate() - (6 - i));
        const label = d.toLocaleDateString('en-PH', { weekday: 'short' });
        const revenue = orders.reduce((sum, o) => {
          const od = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
          const same = od.getDate()===d.getDate() && od.getMonth()===d.getMonth() && od.getFullYear()===d.getFullYear();
          return same && o.status==='completed' ? sum+(o.grandTotal||0) : sum;
        }, 0);
        return { label, revenue, isLatest: i===6 };
      });
    } else {
      return Array.from({ length: 6 }, (_, i) => {
        const ws = new Date(now); ws.setDate(now.getDate()-now.getDay()-(5-i)*7); ws.setHours(0,0,0,0);
        const we = new Date(ws); we.setDate(ws.getDate()+6); we.setHours(23,59,59,999);
        const label = ws.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
        const revenue = orders.reduce((sum, o) => {
          const od = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
          return od>=ws && od<=we && o.status==='completed' ? sum+(o.grandTotal||0) : sum;
        }, 0);
        return { label, revenue, isLatest: i===5 };
      });
    }
  }, [orders, view]);

  const maxR = Math.max(...bars.map(b => b.revenue), 1);
  const last = bars[bars.length-1]?.revenue||0;
  const prev = bars[bars.length-2]?.revenue||0;
  const trendUp = last >= prev;
  const trendPct = prev===0 ? 100 : Math.abs(((last-prev)/prev)*100).toFixed(1);
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const points = bars.map((b, i) => ({
    x: PAD.left + (i / (bars.length - 1)) * chartW,
    y: PAD.top + chartH - (b.revenue / maxR) * chartH,
    ...b,
  }));
  const linePath = points.map((p, i) => `${i===0?'M':'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${points[points.length-1].x},${PAD.top+chartH} L${points[0].x},${PAD.top+chartH} Z`;

  return (
    <div style={{ fontFamily: 'Nunito, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={S.toggleGroup}>
            {['daily', 'weekly'].map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{ ...S.toggleBtn, ...(view===v ? S.toggleBtnActive : {}) }}>
                {v.charAt(0).toUpperCase()+v.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: trendUp?'#F0FDF4':'#FFF1F2', padding: '4px 10px', borderRadius: 100 }}>
          <Icon name={trendUp?'chevronUp':'chevronDown'} size={12} color={trendUp?'#16A34A':'#DC2626'} strokeWidth={3} />
          <span style={{ fontSize: 11, fontWeight: 800, color: trendUp?'#16A34A':'#DC2626' }}>{trendPct}%</span>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>vs last {view==='daily'?'day':'week'}</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5C4033" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#5C4033" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {[0,0.25,0.5,0.75,1].map(t => (
          <line key={t} x1={PAD.left} x2={W-PAD.right}
            y1={PAD.top + chartH*(1-t)} y2={PAD.top + chartH*(1-t)}
            stroke="#F1F5F9" strokeWidth={1} />
        ))}
        <path d={areaPath} fill="url(#areaGrad)" />
        <path d={linePath} fill="none" stroke="#5C4033" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            {p.isLatest && <circle cx={p.x} cy={p.y} r={8} fill="#5C4033" fillOpacity={0.15} />}
            <circle cx={p.x} cy={p.y} r={p.isLatest?5:3.5} fill={p.isLatest?'#5C4033':'#D4B8A8'} stroke="#fff" strokeWidth={2} />
            {p.revenue > 0 && (
              <text x={p.x} y={p.y-10} textAnchor="middle" fontSize={9} fill="#5C4033" fontWeight="800" fontFamily="Nunito, sans-serif">
                ₱{p.revenue>=1000?`${(p.revenue/1000).toFixed(1)}k`:p.revenue}
              </text>
            )}
          </g>
        ))}
        {points.map((p, i) => (
          <text key={i} x={p.x} y={H-4} textAnchor="middle"
            fontSize={10} fill={p.isLatest?'#5C4033':'#94A3B8'}
            fontWeight={p.isLatest?'800':'600'} fontFamily="Nunito, sans-serif">
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

/* ─── Top Selling Products ─────────────────────────────────────── */
function TopSellingProducts({ orders }) {
  const topProducts = useMemo(() => {
    const now = new Date();
    const ws = new Date(now); ws.setDate(now.getDate()-now.getDay()); ws.setHours(0,0,0,0);
    const map = {};
    orders.forEach(o => {
      const od = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
      if (od < ws) return;
      o.items?.forEach(item => {
        const key = item.name;
        if (!map[key]) map[key] = { name: item.name, image: item.image, qty: 0, revenue: 0 };
        map[key].qty += item.quantity || 1;
        const p = typeof item.price==='number' ? item.price : parseFloat(String(item.price||'0').replace(/[₱,]/g,''))||0;
        map[key].revenue += p * (item.quantity||1);
      });
    });
    return Object.values(map).sort((a,b)=>b.qty-a.qty).slice(0,5);
  }, [orders]);

  const maxQty = Math.max(...topProducts.map(p=>p.qty), 1);
  const medals = ['#F59E0B','#94A3B8','#CD7C2F'];

  if (topProducts.length === 0) return (
    <div style={{ textAlign:'center', padding:'28px 0', color:'#94A3B8', fontSize:13, fontFamily:'Nunito, sans-serif' }}>
      <Icon name="barChart" size={32} color="#E2E8F0" />
      <p style={{ marginTop:8 }}>No sales recorded this week yet</p>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12, fontFamily:'Nunito, sans-serif' }}>
      {topProducts.map((p, i) => (
        <div key={p.name}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
            <div style={{
              width:24, height:24, borderRadius:'50%', flexShrink:0,
              background: i<3 ? medals[i] : '#E2E8F0',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:10, fontWeight:800, color: i<3?'#fff':'#64748B',
              boxShadow: i<3 ? `0 2px 6px ${medals[i]}55` : 'none',
            }}>
              {i===0 ? <Icon name="star" size={10} color="#fff" strokeWidth={2.5}/> : i+1}
            </div>
            <div style={{
              width:36, height:36, borderRadius:10,
              background:'linear-gradient(135deg,#FDF6F0,#F3E8E0)',
              display:'flex', justifyContent:'center', alignItems:'center',
              overflow:'hidden', flexShrink:0, border:'1px solid #EDD9CC',
            }}>
              {p.image
                ? <img src={p.image} alt={p.name} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:10}} onError={e=>{e.target.style.display='none'}} />
                : <Icon name="shoppingBag" size={16} color="#C4956A" />}
            </div>
            <div style={{flex:1, minWidth:0}}>
              <p style={{fontSize:12,fontWeight:700,color:'#1A1A2E',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</p>
              <p style={{fontSize:10,color:'#94A3B8',margin:0,fontWeight:600}}>₱{p.revenue.toLocaleString()} revenue</p>
            </div>
            <span style={{ fontSize:11, fontWeight:800, color:'#5C4033', flexShrink:0, background:'#FDF6F0', padding:'3px 8px', borderRadius:8 }}>
              {p.qty} sold
            </span>
          </div>
          <div style={{height:4,backgroundColor:'#F1F5F9',borderRadius:4,marginLeft:34}}>
            <div style={{height:'100%',width:`${(p.qty/maxQty)*100}%`,background:i===0?'linear-gradient(90deg,#5C4033,#A0674A)':'linear-gradient(90deg,#D4B8A8,#C4A090)',borderRadius:4,transition:'width 0.5s ease'}} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Order Detail Modal ───────────────────────────────────────── */
function OrderModal({ order, users=[], onClose, onConfirm }) {
  const [confirming, setConfirming] = useState(false);

  if (!order) return null;

  const fmt = (ts) => ts?.toDate
    ? ts.toDate().toLocaleDateString('en-PH',{month:'long',day:'numeric',year:'numeric'})
    : '—';
  const parsePrice = v => v==null?0:typeof v==='number'?v:parseFloat(String(v).replace(/[₱,]/g,''))||0;
  const parseQty   = v => parseInt(v,10)||1;
  const subtotal   = order.items?.reduce((s,i)=>s+parsePrice(i.price)*parseQty(i.quantity),0)||0;
  const grand      = parsePrice(order.grandTotal);
  const shipping   = Math.max(grand-subtotal,0);

  const resolveUser = () => {
    const u = users.find(u=>u.id===order.userId||u.uid===order.userId||u.email===order.userEmail);
    return u?.displayName||u?.name||u?.fullName||u?.username||order.userEmail?.split('@')[0]||'—';
  };

  const dateReceivedTs = order.dateReceived || order.completedAt || null;
  const dateReceivedValue = dateReceivedTs?.toDate
    ? fmt(dateReceivedTs)
    : order.status === 'completed' ? 'Not recorded' : 'Pending';
  const dateReceivedGreen = !!dateReceivedTs?.toDate;

  const handleConfirm = async () => {
    try {
      setConfirming(true);
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'processing',
        confirmedAt: serverTimestamp(),
      });
      if (onConfirm) onConfirm(order.id);
    } catch (err) {
      console.error('Failed to confirm order:', err);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modalBox} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={S.modalHeader}>
          <div>
            <h2 style={S.modalTitle}>Order Details</h2>
            <p style={S.modalOrderId}>Order <span style={{fontFamily:'monospace',color:'#5C4033',fontWeight:700}}>#{order.id}</span></p>
          </div>
          <button onClick={onClose} style={S.closeBtn}>
            <Icon name="x" size={14} color="#64748B" strokeWidth={2.5} />
          </button>
        </div>

        {/* Info Row */}
        <div style={S.modalInfoRow}>
          {[
            { label:'Customer', value: resolveUser(), sub: order.userEmail||'' },
            { label:'Date Placed', value: fmt(order.createdAt) },
            { label:'Date Received', value: dateReceivedValue, green: dateReceivedGreen },
            { label:'Payment', value: order.paymentMethod === 'cod' ? '💵 Cash on Delivery' : '📱 GCash' },
          ].map(item => (
            <div key={item.label} style={S.modalInfoItem}>
              <span style={S.modalInfoLabel}>{item.label}</span>
              <span style={{ fontSize:13, fontWeight:700, color: item.green?'#15803D':'#1A1A2E', margin:0 }}>{item.value}</span>
              {item.sub && <span style={{fontSize:10,color:'#94A3B8'}}>{item.sub}</span>}
            </div>
          ))}
        </div>

        {/* Status */}
        <div style={{ marginBottom: 18 }}>
          <p style={S.modalSectionTitle}>Current Status</p>
          <div style={{ marginTop: 8 }}>
            <StatusPill status={order.status} />
          </div>
        </div>

        {/* Address */}
        {order.address && (
          <div style={S.modalSection}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
              <Icon name="mapPin" size={14} color="#5C4033" />
              <p style={S.modalSectionTitle}>Shipping Address</p>
            </div>
            <p style={S.modalAddressText}>
              {[order.address.street,order.address.barangay,order.address.city,order.address.province,order.address.zip].filter(Boolean).join(', ')}
            </p>
          </div>
        )}

        {/* Items */}
        <div style={S.modalSection}>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10}}>
            <Icon name="shoppingBag" size={14} color="#5C4033" />
            <p style={S.modalSectionTitle}>Items Ordered</p>
          </div>
          {order.items?.map((item,i) => (
            <div key={i} style={S.modalItemRow}>
              <div style={S.modalItemThumb}>
                {item.image
                  ? <img src={item.image} alt={item.name} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:8}} onError={e=>{e.target.style.display='none'}} />
                  : <Icon name="shoppingBag" size={18} color="#C4956A" />}
              </div>
              <div style={{flex:1}}>
                <p style={S.modalItemName}>{item.name}</p>
                {item.variant && <p style={S.modalItemVariant}>Variant: {item.variant}</p>}
              </div>
              <div style={{textAlign:'right'}}>
                <p style={S.modalItemPrice}>₱{parsePrice(item.price).toLocaleString()}</p>
                <p style={S.modalItemQty}>×{parseQty(item.quantity)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div style={S.modalTotals}>
          {[['Subtotal', `₱${subtotal.toLocaleString()}`], ...(shipping>0?[['Shipping',`₱${shipping.toLocaleString()}`]]:[])].map(([l,v])=>(
            <div key={l} style={S.modalTotalRow}>
              <span style={S.modalTotalLabel}>{l}</span>
              <span style={S.modalTotalValue}>{v}</span>
            </div>
          ))}
          <div style={{...S.modalTotalRow,borderTop:'2px solid #F1F5F9',paddingTop:12,marginTop:6}}>
            <span style={{...S.modalTotalLabel,fontSize:15,fontWeight:800,color:'#1A1A2E'}}>Grand Total</span>
            <span style={{fontSize:20,fontWeight:900,color:'#5C4033'}}>₱{grand.toLocaleString()}</span>
          </div>
        </div>

        {/* ✅ Confirm Order Button — pending only, bottom-left, small */}
        {order.status === 'pending' && (
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={handleConfirm}
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
}

/* ─── Main Dashboard ───────────────────────────────────────────── */
export default function Dashboard({ onNavigate }) {
  const [products,setProducts]           = useState([]);
  const [orders,setOrders]               = useState([]);
  const [users,setUsers]                 = useState([]);
  const [loadingP,setLoadingP]           = useState(true);
  const [loadingO,setLoadingO]           = useState(true);
  const [loadingU,setLoadingU]           = useState(true);
  const [selectedOrder,setSelectedOrder] = useState(null);

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db,'products'),orderBy('name')), s=>{setProducts(s.docs.map(d=>({id:d.id,...d.data()})));setLoadingP(false);},e=>{console.error(e);setLoadingP(false);});
    const u2 = onSnapshot(query(collection(db,'orders'),orderBy('createdAt','desc')), s=>{
      const data = s.docs.map(d=>({id:d.id,...d.data()}));
      setOrders(data);
      // Keep modal in sync when order status changes
      setSelectedOrder(prev => prev ? data.find(o=>o.id===prev.id)||null : null);
      setLoadingO(false);
    },e=>{console.error(e);setLoadingO(false);});
    const u3 = onSnapshot(collection(db,'users'), s=>{setUsers(s.docs.map(d=>({id:d.id,...d.data()})));setLoadingU(false);},e=>{console.error(e);setLoadingU(false);});
    return () => { u1(); u2(); u3(); };
  }, []);

  const loading      = loadingP||loadingO||loadingU;
  const totalRevenue = orders.filter(o=>o.status==='completed').reduce((s,o)=>s+(o.grandTotal||0),0);
  const pendingCount = orders.filter(o=>o.status==='pending').length;
  const lowStock     = products.filter(p=>p.stock>0&&p.stock<=5);
  const recentOrders = orders.slice(0, 5);

  if (loading) return (
    <div style={{display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',height:400,gap:14,fontFamily:'Nunito, sans-serif'}}>
      <div style={{width:44,height:44,borderRadius:'50%',border:'3px solid #F1F5F9',borderTopColor:'#5C4033',animation:'spin 0.8s linear infinite'}} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <p style={{fontSize:13,color:'#94A3B8',fontWeight:600}}>Loading dashboard…</p>
    </div>
  );

  return (
    <div style={{...S.container, fontFamily:'Nunito, sans-serif'}}>

      {/* ── Stat Cards ─────────────────────────────────────────── */}
      <div style={S.statsGrid}>
        <StatCard label="Total Products" value={products.length}
          subLabel="⚠️" subValue={`${lowStock.length} low stock`}
          iconName="shoppingBag"
          gradient="linear-gradient(135deg,#5C4033 0%,#8B6355 60%,#A0674A 100%)" />
        <StatCard label="Total Orders" value={orders.length}
          subLabel="clock" subValue={`${pendingCount} pending`}
          iconName="package"
          gradient="linear-gradient(135deg,#7C5C4A 0%,#A07060 60%,#B88070 100%)" />
        <StatCard label="Total Users" value={users.length}
          iconName="users"
          gradient="linear-gradient(135deg,#FDF6F0 0%,#F3E8E0 100%)" light />
        <StatCard label="Total Revenue" value={`₱${totalRevenue.toLocaleString()}`}
          iconName="dollarSign"
          gradient="linear-gradient(135deg,#92400E 0%,#B45309 60%,#D97706 100%)" />
      </div>

      {/* ── Middle Row ─────────────────────────────────────────── */}
      <div style={S.midGrid}>
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div>
              <h3 style={S.cardTitle}>Revenue Overview</h3>
              <p style={S.cardSub}>All-time · ₱{totalRevenue.toLocaleString()}</p>
            </div>
            <div style={{
              display:'flex', alignItems:'center', gap:6,
              background:'linear-gradient(135deg,#5C4033,#8B6355)',
              color:'#fff', padding:'6px 12px', borderRadius:10,
              fontSize:11, fontWeight:700, boxShadow:'0 4px 12px rgba(92,64,51,0.3)',
            }}>
              <Icon name="trendingUp" size={13} color="#fff" />
              Analytics
            </div>
          </div>
          <RevenueChart orders={orders} />
        </div>

        <div style={S.card}>
          <div style={S.cardHeader}>
            <div>
              <h3 style={S.cardTitle}>Top Selling This Week</h3>
              <p style={S.cardSub}>Ranked by units sold</p>
            </div>
            <div style={{ width:34, height:34, borderRadius:10, background:'#FDF6F0', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid #EDD9CC' }}>
              <Icon name="barChart" size={16} color="#5C4033" />
            </div>
          </div>
          <TopSellingProducts orders={orders} />
        </div>
      </div>

      {/* ── Recent Orders ──────────────────────────────────────── */}
      <div style={S.card}>
        <div style={{...S.cardHeader, marginBottom:0}}>
          <div>
            <h3 style={S.cardTitle}>Recent Orders</h3>
          </div>
        </div>

        {orders.length === 0 ? (
          <div style={{textAlign:'center',padding:48,color:'#94A3B8'}}>
            <Icon name="package" size={40} color="#E2E8F0" />
            <p style={{margin:'12px 0 0',fontSize:14,fontWeight:600}}>No orders yet</p>
          </div>
        ) : (
          <div style={{overflowX:'auto',marginTop:20}}>
            <table style={S.table}>
              <thead>
                <tr style={{background:'#FAFAFA'}}>
                  {['Order ID','Customer','Items','Total','Payment','Date','Status','Action'].map(h=>(
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(order => {
                  const date = order.createdAt?.toDate
                    ? order.createdAt.toDate().toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})
                    : '—';
                  const u = users.find(u=>u.id===order.userId||u.uid===order.userId||u.email===order.userEmail);
                  const name = u?.displayName||u?.name||u?.fullName||u?.username||order.userEmail?.split('@')[0]||'—';
                  return (
                    <tr key={order.id} style={S.tr}>
                      <td style={S.td}>
                        <span style={{fontFamily:'monospace',fontSize:11,color:'#5C4033',fontWeight:700,background:'#FDF6F0',padding:'3px 8px',borderRadius:6}}>
                          #{order.id.slice(0,8)}
                        </span>
                      </td>
                      <td style={S.td}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{
                            width:30,height:30,borderRadius:'50%',
                            background:'linear-gradient(135deg,#5C4033,#A0674A)',
                            display:'flex',alignItems:'center',justifyContent:'center',
                            fontSize:11,fontWeight:800,color:'#fff',flexShrink:0,
                          }}>
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p style={{fontSize:12,fontWeight:700,color:'#1A1A2E',margin:0}}>{name}</p>
                            <p style={{fontSize:10,color:'#94A3B8',margin:0}}>{order.userEmail||''}</p>
                          </div>
                        </div>
                      </td>
                      <td style={S.td}>
                        <span style={{fontSize:12,color:'#374151',fontWeight:700}}>
                          {order.items?.length||0} item{order.items?.length!==1?'s':''}
                        </span>
                      </td>
                      <td style={S.td}>
                        <span style={{fontSize:13,fontWeight:800,color:'#5C4033'}}>
                          ₱{(order.grandTotal||0).toLocaleString()}
                        </span>
                      </td>
                      <td style={S.td}>
                        <span style={{fontSize:11,color:'#64748B',fontWeight:600,background:'#F8FAFC',padding:'3px 8px',borderRadius:6}}>
                          {order.paymentMethod==='cod'?'💵 COD':'📱 GCash'}
                        </span>
                      </td>
                      <td style={S.td}>
                        <span style={{fontSize:11,color:'#94A3B8',fontWeight:600}}>{date}</span>
                      </td>
                      <td style={S.td}>
                        <StatusPill status={order.status} />
                      </td>
                      <td style={S.td}>
                        <button onClick={()=>setSelectedOrder(order)} style={S.viewBtn}>
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

      <OrderModal
        order={selectedOrder}
        users={users}
        onClose={() => setSelectedOrder(null)}
        onConfirm={() => {/* onSnapshot will auto-update selectedOrder */}}
      />
    </div>
  );
}

/* ─── Style Object ─────────────────────────────────────────────── */
const S = {
  container: { display:'flex', flexDirection:'column', gap:22, padding:'4px 0' },
  statsGrid: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 },
  midGrid:   { display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:20 },
  card: { backgroundColor:'#fff', borderRadius:18, padding:'20px 22px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', border:'1px solid #F1F5F9' },
  cardHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 },
  cardTitle:  { fontSize:15, fontWeight:800, color:'#1A1A2E', margin:0, letterSpacing:'-0.2px' },
  cardSub:    { fontSize:11, color:'#94A3B8', margin:'3px 0 0', fontWeight:600 },
  toggleGroup:    { display:'flex', backgroundColor:'#F1F5F9', borderRadius:10, padding:3, gap:3 },
  toggleBtn:      { padding:'5px 14px', borderRadius:8, border:'none', fontSize:11, fontWeight:700, cursor:'pointer', backgroundColor:'transparent', color:'#94A3B8' },
  toggleBtnActive:{ backgroundColor:'#5C4033', color:'#fff', boxShadow:'0 2px 6px rgba(92,64,51,0.35)' },
  table:{ width:'100%', borderCollapse:'collapse' },
  th:{ textAlign:'left', fontSize:10, fontWeight:800, color:'#94A3B8', textTransform:'uppercase', letterSpacing:0.8, padding:'10px 14px', borderBottom:'1px solid #F1F5F9' },
  tr:{ borderBottom:'1px solid #F9FAFB', transition:'background 0.15s' },
  td:{ padding:'12px 14px', verticalAlign:'middle' },
  viewBtn:{
    display:'inline-flex', alignItems:'center', gap:5,
    background:'linear-gradient(135deg,#5C4033,#8B6355)',
    border:'none', borderRadius:8, padding:'7px 14px',
    fontSize:11, color:'#fff', fontWeight:700, cursor:'pointer',
    boxShadow:'0 3px 8px rgba(92,64,51,0.3)', transition:'opacity 0.15s', whiteSpace:'nowrap',
  },
  modalOverlay:{ position:'fixed', inset:0, zIndex:1000, backgroundColor:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 },
  modalBox:{ backgroundColor:'#fff', borderRadius:22, width:'100%', maxWidth:560, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 64px rgba(0,0,0,0.22)', padding:28, fontFamily:'Nunito, sans-serif' },
  modalHeader:{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, paddingBottom:16, borderBottom:'2px solid #F8FAFC' },
  modalTitle:{ fontSize:18, fontWeight:900, color:'#1A1A2E', margin:'0 0 4px', letterSpacing:'-0.3px' },
  modalOrderId:{ fontSize:11, color:'#94A3B8', margin:0, fontWeight:600 },
  closeBtn:{ background:'#F1F5F9', border:'none', borderRadius:10, width:34, height:34, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  modalInfoRow:{ display:'flex', gap:20, flexWrap:'wrap', background:'linear-gradient(135deg,#FDF6F0,#F8F3F0)', borderRadius:14, padding:'16px 18px', marginBottom:18, border:'1px solid #EDD9CC' },
  modalInfoItem:{ display:'flex', flexDirection:'column', gap:4 },
  modalInfoLabel:{ fontSize:9, fontWeight:800, color:'#94A3B8', textTransform:'uppercase', letterSpacing:0.8 },
  modalSection:{ marginBottom:18 },
  modalSectionTitle:{ fontSize:12, fontWeight:800, color:'#374151', margin:0 },
  modalAddressText:{ fontSize:12, color:'#64748B', margin:0, lineHeight:1.6, background:'#F8FAFC', padding:'10px 12px', borderRadius:10 },
  modalItemRow:{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid #F9FAFB' },
  modalItemThumb:{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#FDF6F0,#F3E8E0)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0, border:'1px solid #EDD9CC' },
  modalItemName:{ fontSize:13, fontWeight:700, color:'#1A1A2E', margin:'0 0 2px' },
  modalItemVariant:{ fontSize:10, color:'#94A3B8', margin:0 },
  modalItemPrice:{ fontSize:14, fontWeight:800, color:'#5C4033', margin:'0 0 2px' },
  modalItemQty:{ fontSize:10, color:'#94A3B8', margin:0, fontWeight:600 },
  modalTotals:{ borderTop:'2px solid #F1F5F9', paddingTop:16, marginTop:4 },
  modalTotalRow:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 },
  modalTotalLabel:{ fontSize:12, color:'#64748B', fontWeight:600 },
  modalTotalValue:{ fontSize:13, fontWeight:700, color:'#374151' },
};