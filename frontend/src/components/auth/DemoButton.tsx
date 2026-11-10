import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api, setCsrfToken } from '../../services/api';
import type { Session } from '../../types/domain';
import { ErrorNotice } from '../ui/Common';

export function DemoButton({ className = 'button' }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const navigate = useNavigate();
  const client = useQueryClient();
  return <div className="demo-action">
    <button className={className} disabled={busy} onClick={async () => {
      setBusy(true);
      setError(undefined);
      try {
        const session = await api<Session>('/auth/demo', { method: 'POST' });
        setCsrfToken(session.csrfToken);
        client.clear();
        client.setQueryData(['session'], session);
        navigate('/dashboard');
      } catch (e) {
        setError(e);
      } finally {
        setBusy(false);
      }
    }}>{busy ? 'Preparing your demo...' : 'Try the demo without an account'}</button>
    <ErrorNotice error={error}/>
  </div>;
}
