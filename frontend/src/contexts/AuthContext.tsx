import { createContext, useContext, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, useLocation } from 'react-router-dom';
import { api, ApiError, setCsrfToken } from '../services/api';
import type { Session, User } from '../types/domain';

const AuthContext = createContext<{ user: User; logout: () => Promise<void>; switchDemoRole: () => Promise<void>; error: string } | null>(null);
export const useAuth = () => {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('Authentication context is missing.');
  return auth;
};
export function Protected({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const location = useLocation();
  const [logoutError, setLogoutError] = useState('');
  const [roleError, setRoleError] = useState('');
  const session = useQuery({ queryKey: ['session'], queryFn: async () => {
    const data = await api<Session>('/auth/me');
    setCsrfToken(data.csrfToken);
    return data;
  }, retry: false, staleTime: 30_000 });
  if (session.isPending) return <p className="loading" role="status">Loading your workspace...</p>;
  if (session.isError) {
    if (session.error instanceof ApiError && session.error.status === 401) return <Navigate to="/login" replace state={{ from: location.pathname }}/>;
    return <div className="workspace"><p role="alert">Cannot load your session. Check the API connection.</p><button onClick={() => { void session.refetch(); }}>Retry</button></div>;
  }
  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
      setCsrfToken('');
      client.clear();
      window.location.assign(session.data.user.isDemo ? '/' : '/login');
    } catch (error) { setLogoutError(error instanceof Error ? error.message : 'Logout failed.'); }
  };
  const switchDemoRole = async () => {
    setRoleError('');
    try {
      const role = session.data.user.role === 'CLIENT' ? 'FREELANCER' : 'CLIENT';
      const next = await api<Session>('/auth/demo-role', { method: 'POST', body: { role } });
      setCsrfToken(next.csrfToken);
      client.setQueryData(['session'], next);
      await client.invalidateQueries({ predicate: query => query.queryKey[0] !== 'session' });
    } catch (error) { setRoleError(error instanceof Error ? error.message : 'Could not switch demo role.'); }
  };
  return <AuthContext.Provider value={{ user: session.data.user, logout, switchDemoRole, error: roleError }}>{logoutError && <p role="alert">{logoutError}</p>}{children}</AuthContext.Provider>;
}
