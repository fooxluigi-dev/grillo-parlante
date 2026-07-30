// Centralized API config
import { supabase } from './supabase';

// Base URL for all API calls
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://gp-landing-rho.vercel.app';

/**
 * Make an authenticated API call to the backend.
 * Automatically attaches the Supabase access token.
 */
export async function apiCall(endpoint, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Auth failed - user needs to re-login
    throw new Error('Session expired. Please sign in again.');
  }

  return response;
}

export const API_ENDPOINTS = {
  PARSE_BOOKING: '/api/parse-booking',
  ITINERARY: '/api/itinerary',
  CHAT: '/api/chat',
};
