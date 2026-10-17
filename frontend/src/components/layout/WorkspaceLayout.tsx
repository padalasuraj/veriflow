import { NavLink, Outlet, Link } from 'react-router-dom';
import { ShieldCheck, LayoutDashboard, FolderKanban, Wallet, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function WorkspaceLayout() {
  const { user, logout } = useAuth();
  return <div className="app-frame"><aside className="sidebar"><Link to="/" className="brand"><ShieldCheck/> VeriFlow <span>AI</span></Link><p className="sidebar-label">YOUR WORKSPACE</p><nav>{[
    { path: '/dashboard', label: 'Overview', Icon: LayoutDashboard }, { path: '/projects', label: 'Projects', Icon: FolderKanban }, { path: '/payments', label: 'Sandbox payments', Icon: Wallet }, { path: '/settings', label: 'Settings', Icon: Settings },
  ].map(({ path, label, Icon }) => <NavLink key={path} to={path}><Icon size={19}/>{label}</NavLink>)}</nav><div className="sidebar-bottom"><strong>{user.name}</strong><small>{user.role.toLowerCase()}</small><button className="secondary" onClick={() => { void logout(); }}>Sign out</button></div></aside><div className="app-content"><div className="app-topbar"><span>Evidence. Agreement. Confidence.</span><span className="sandbox-pill">Sandbox · Test money only</span></div><main className="workspace"><Outlet/></main><footer className="app-footer">Advisory AI. Human decisions. No escrow or freelancer payouts.</footer></div></div>;
}
