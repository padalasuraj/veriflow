import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import type { Payment } from '../../types/domain';
import { ErrorNotice } from '../ui/Common';

interface Buttons { render: (element: HTMLElement) => Promise<void>; close: () => Promise<void> }
interface PayPalSdk { Buttons: (config: { createOrder: () => Promise<string>; onApprove: (data: { orderID: string }) => Promise<void>; onCancel: () => void; onError: (error: unknown) => void }) => Buttons }
declare global { interface Window { paypal?: PayPalSdk } }
let sdkPromise: Promise<PayPalSdk> | undefined;
let sdkKey = '';
function loadSdk(clientId: string, currency: string) {
  const key = `${clientId}:${currency}`;
  if (sdkKey !== key) { sdkPromise = undefined; sdkKey = key; }
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<PayPalSdk>((resolve, reject) => {
    const old = document.getElementById('paypal-sdk');
    old?.remove();
    const script = document.createElement('script');
    script.id = 'paypal-sdk';
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${currency}&intent=capture&components=buttons`;
    script.onload = () => window.paypal ? resolve(window.paypal) : reject(new Error('PayPal SDK did not initialize.'));
    script.onerror = () => { sdkPromise = undefined; reject(new Error('PayPal SDK could not load. Check your connection.')); };
    document.head.append(script);
  });
  return sdkPromise;
}

export function PayPalCheckout({ milestoneId, currency, existing, onConfirmed }: { milestoneId: string; currency: string; existing?: Payment | null; onConfirmed: () => void }) {
  const config = useQuery({ queryKey: ['paypal-config'], queryFn: () => api<{ configured: boolean; clientId: string | null }>('/payments/config') });
  const element = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<unknown>();
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!enabled || !config.data?.clientId || !element.current) return;
    let cancelled = false;
    let buttons: Buttons | undefined;
    void loadSdk(config.data.clientId, currency).then(sdk => {
      if (cancelled || !element.current) return;
      buttons = sdk.Buttons({
        createOrder: async () => {
          setError(undefined); setMessage('Creating a Sandbox order...');
          const payment = await api<Payment>('/payments/orders', { method: 'POST', body: { milestoneId } });
          if (!payment.paypalOrderId) throw new Error('Server did not return a PayPal order.');
          return payment.paypalOrderId;
        },
        onApprove: async ({ orderID }) => {
          try {
            setMessage('Buyer approved. Verifying the capture on the server...');
            const payment = await api<Payment>(`/payments/orders/${orderID}/capture`, { method: 'POST' });
            if (payment.status !== 'COMPLETED') throw new Error('Server has not confirmed this payment.');
            setMessage('Sandbox capture verified. Test money only.'); onConfirmed();
          } catch (e) { setMessage(''); setError(e); onConfirmed(); }
        },
        onCancel: () => setMessage('Checkout cancelled. No payment success was assumed.'),
        onError: () => { setMessage(''); setError(new Error('Sandbox checkout could not complete. Retry or reconcile the stored order.')); },
      });
      return buttons.render(element.current);
    }).catch(e => { if (!cancelled) { setError(e); setEnabled(false); sdkPromise = undefined; } });
    return () => { cancelled = true; void buttons?.close(); };
  }, [enabled, config.data?.clientId, currency, milestoneId, onConfirmed]);
  return <section className="panel"><p className="eyebrow">PAYPAL SANDBOX CHECKOUT</p><h2>Human-approved payment</h2><p>Use a separate Sandbox personal buyer account. This sends test money to the configured Sandbox merchant; it does not pay a freelancer or hold funds in escrow.</p><ErrorNotice error={config.error ?? error}/>{config.isPending ? <p>Checking Sandbox configuration...</p> : !config.data?.configured ? <p className="mode-notice">Checkout unavailable: backend PayPal Sandbox credentials have not been configured.</p> : <><button className="button" disabled={enabled} onClick={() => setEnabled(true)}>{enabled ? 'Checkout loaded below' : 'Load PayPal Sandbox checkout'}</button><div ref={element} className="paypal-buttons"/>{existing?.paypalOrderId && <button className="secondary" onClick={async () => {
      try { setError(undefined); await api(`/payments/orders/${existing.paypalOrderId}/capture`, { method: 'POST' }); setMessage('Stored order reconciled.'); onConfirmed(); } catch (e) { setError(e); }
    }}>Reconcile stored order</button>}</>}{message && <p role="status">{message}</p>}</section>;
}
