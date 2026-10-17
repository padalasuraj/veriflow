import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api, getHealth } from '../services/api';
import type { Payment } from '../types/domain';
import { Badge, ErrorNotice, Loading, money } from '../components/ui/Common';

export function PaymentHistory() {
  const query = useQuery({ queryKey: ['payments'], queryFn: () => api<Payment[]>('/payments/history') });
  return <><div className="page-heading"><div><p className="eyebrow">PERSISTENT TRANSACTION RECORDS</p><h1>Sandbox payments</h1><p>Only server-verified captures are marked completed. Test money only; no freelancer payouts.</p></div></div><ErrorNotice error={query.error}/>{query.isPending ? <Loading/> : <section className="panel">{query.data?.length ? query.data.map(p => <Link className="list-row" to={`/milestones/${p.milestoneId}`} key={p.id}><div><strong>{p.milestone?.title}</strong><small>Order: {p.paypalOrderId ?? 'Unresolved'} · Capture: {p.paypalCaptureId ?? 'Unverified'}</small></div><Badge value={p.status}/><strong>{money(p.amountMinor, p.currency)}</strong></Link>) : <p>No Sandbox payment attempts yet.</p>}</section>}</>;
}
export function SettingsPage() {
  const { user } = useAuth();
  const query = useQuery({ queryKey: ['health'], queryFn: getHealth });
  return <><div className="page-heading"><div><p className="eyebrow">ACCOUNT & CONFIGURATION</p><h1>Settings</h1></div></div><section className="panel"><h2>Your account</h2><p>{user.name} · {user.email}</p><Badge value={user.role}/><p>Sign out from the navigation to invalidate this session.</p></section><section className="panel"><h2>Integration configuration</h2><ErrorNotice error={query.error}/>{query.data && <dl className="summary">{Object.entries(query.data.integrations).map(([key, value]) => <div key={key}><dt>{key}</dt><dd><Badge value={value}/></dd></div>)}</dl>}<p className="muted">Configure private credentials in backend/.env. No private key is sent to this browser. A configured integration still requires live acceptance testing.</p></section></>;
}
