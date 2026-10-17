import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { App } from '../App';

afterEach(() => vi.unstubAllGlobals());
function renderApp(path = '/') {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={[path]}><App/></MemoryRouter></QueryClientProvider>);
}
it('shows backend configuration and simulated AI status honestly', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { status: 'ok', version: '0.1.0', integrations: { ai: 'mock_simulated', paypal: 'sandbox_unconfigured', database: 'sqlite_configured' } } }) }));
  renderApp();
  expect(await screen.findByText(/API connected/)).toBeInTheDocument();
  expect(screen.getByText('mock_simulated')).toBeInTheDocument();
  expect(screen.getByText('sandbox_unconfigured')).toBeInTheDocument();
});
it('shows a recoverable error when the API is offline', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  renderApp();
  expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the API');
  expect(screen.getByRole('button', { name: 'Retry connection' })).toBeInTheDocument();
});
it('handles unknown frontend routes', () => {
  renderApp('/unknown');
  expect(screen.getByRole('heading', { name: 'Page not found.' })).toBeInTheDocument();
});
