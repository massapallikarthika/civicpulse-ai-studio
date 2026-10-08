/**
 * Centralized API client for CivicPulse
 * Automatically injects the Supabase JWT Bearer token into all requests
 */

const TOKEN_KEY = 'civicpulse_auth_token';

let memoryToken: string | null =
  typeof window !== 'undefined' ? window.sessionStorage.getItem(TOKEN_KEY) || window.localStorage.getItem(TOKEN_KEY) : null;

export function setAuthToken(token: string | null): void {
  memoryToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      window.sessionStorage.setItem(TOKEN_KEY, token);
      window.localStorage.setItem(TOKEN_KEY, token);
    } else {
      window.sessionStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(TOKEN_KEY);
    }
  }
}

export function getAuthToken(): string | null {
  if (!memoryToken && typeof window !== 'undefined') {
    memoryToken = window.sessionStorage.getItem(TOKEN_KEY) || window.localStorage.getItem(TOKEN_KEY);
  }
  return memoryToken;
}

export function clearAuthToken(): void {
  setAuthToken(null);
}

export function getAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = getAuthHeaders();

  const response = await fetch(endpoint, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMessage =
      typeof data === 'object' && data !== null && 'message' in data
        ? (data as { message: string }).message
        : typeof data === 'object' && data !== null && 'error' in data
        ? (data as { error: string }).error
        : `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return data as T;
}
