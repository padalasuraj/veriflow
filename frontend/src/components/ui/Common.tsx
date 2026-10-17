import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';

export const money = (minor: number, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(minor / 100);
export const words = (value: string) => value.toLowerCase().replaceAll('_', ' ');
export function Badge({ value }: { value: string }) { return <span className={`state state-${value.toLowerCase()}`}>{words(value)}</span>; }
export function ErrorNotice({ error }: { error: unknown }) { return error ? <p className="error-notice" role="alert">{error instanceof Error ? error.message : 'Something went wrong. Please retry.'}</p> : null; }
export function Loading() { return <div className="loading" role="status">Loading workspace data...</div>; }
export function Field({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return <div className="field"><label htmlFor={id}>{label}</label>{isValidElement(children) ? cloneElement(children as ReactElement<{ id: string }>, { id }) : children}</div>;
}
