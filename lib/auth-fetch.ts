import { supabase } from './supabase';

/**
 * Authenticated fetch wrapper for API routes.
 * Automatically includes the Authorization header with the current session token.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);
  // Default Content-Type to JSON, but skip for FormData uploads — the browser
  // sets multipart/form-data with the correct boundary automatically.
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
