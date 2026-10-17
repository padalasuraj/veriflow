import { z } from 'zod';

// This application deliberately supports currencies with two decimal places only.
export const currencySchema = z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD']);
export const minorSchema = z.number().int().min(1).max(100_000_000);
export const formatPayPalAmount = (minor: number) => `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, '0')}`;
export function parsePayPalAmount(value: string): number {
  if (!/^\d{1,9}\.\d{2}$/.test(value)) return -1;
  const [whole, cents] = value.split('.');
  return Number(whole) * 100 + Number(cents);
}
