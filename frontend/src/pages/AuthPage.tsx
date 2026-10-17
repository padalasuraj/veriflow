import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, setCsrfToken } from '../services/api';
import type { Session } from '../types/domain';
import { ErrorNotice, Field } from '../components/ui/Common';

const schema = z.object({ name: z.string().optional(), email: z.email(), password: z.string().min(10, 'Use at least 10 characters.').max(72), role: z.enum(['CLIENT', 'FREELANCER']) });
export function AuthPage({ registerMode = false }: { registerMode?: boolean }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { role: 'CLIENT' } });
  const [error, setError] = useState<unknown>();
  const navigate = useNavigate();
  const client = useQueryClient();
  const submit = handleSubmit(async data => {
    setError(undefined);
    try {
      const session = await api<Session>(`/auth/${registerMode ? 'register' : 'login'}`, { method: 'POST', body: data });
      client.clear(); setCsrfToken(session.csrfToken); client.setQueryData(['session'], session);
      navigate('/dashboard');
    } catch (e) { setError(e); }
  });
  return <main className="auth-page"><Link className="brand" to="/">VeriFlow <span>AI</span></Link><section className="panel auth-card"><p className="eyebrow">TRUST STARTS WITH CLARITY</p><h1>{registerMode ? 'Create your account' : 'Welcome back'}</h1><p>{registerMode ? 'Agree on outcomes. Submit evidence. Review with confidence.' : 'Sign in to your milestone workspace.'}</p><form onSubmit={submit}>
    {registerMode && <Field label="Full name"><input required minLength={2} maxLength={100} autoComplete="name" {...register('name')}/></Field>}
    <Field label="Email"><input type="email" required autoComplete="email" {...register('email')}/></Field>
    <Field label="Password"><input type="password" required autoComplete={registerMode ? 'new-password' : 'current-password'} {...register('password')}/></Field>
    {registerMode && <Field label="I am a"><select {...register('role')}><option value="CLIENT">Client</option><option value="FREELANCER">Freelancer</option></select></Field>}
    {Object.entries(errors).map(([key, e]) => <p className="error-notice" key={key} role="alert">{e.message}</p>)}<ErrorNotice error={error}/>
    <button className="button" disabled={isSubmitting}>{isSubmitting ? 'Please wait...' : registerMode ? 'Create account' : 'Sign in'}</button></form>
    <p>{registerMode ? 'Already registered?' : 'New to VeriFlow?'} <Link className="text-link" to={registerMode ? '/login' : '/register'}>{registerMode ? 'Sign in' : 'Create an account'}</Link></p><p className="muted">Local demo accounts are documented in the README. Use PayPal Sandbox accounts only for checkout.</p></section></main>;
}
