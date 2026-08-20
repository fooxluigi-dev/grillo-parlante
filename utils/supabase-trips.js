import { supabase } from './supabase';

// Normalize DB rows (snake_case) to the camelCase shape the UI expects (checkIn/checkOut)
function normalizeTrip(row) {
  if (!row) return row;
  return { ...row, checkIn: row.checkIn || row.start_date, checkOut: row.checkOut || row.end_date };
}

// Helper: parse "Aug 22" with optional year → "2026-08-22" for PostgreSQL DATE columns.
// NEVER rely on `new Date('Aug 22')` — JS parses it as year 2000 and toISOString()
// shifts it to UTC (previous day in CEST). Build the SQL date from local components.
function toSqlDate(str, year) {
  if (!str) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const months = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',
                  Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
  const m1 = str.trim().match(/^([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?$/);
  if (m1 && months[m1[1]]) {
    const y = m1[3] || year || new Date().getFullYear();
    return `${y}-${months[m1[1]]}-${String(parseInt(m1[2], 10)).padStart(2, '0')}`;
  }
  const m2 = str.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?(?:\s*,?\s*(\d{4}))?$/);
  if (m2 && months[m2[2]]) {
    const y = m2[3] || year || new Date().getFullYear();
    return `${y}-${months[m2[2]]}-${String(parseInt(m2[1], 10)).padStart(2, '0')}`;
  }
  const d = new Date(str);
  if (!isNaN(d)) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return null;
}

// Supabase-backed trips CRUD
export const SupabaseTrips = {
  async getAll(userId) {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('SupabaseTrips.getAll error:', error);
      return [];
    }
    return (data || []).map(normalizeTrip);
  },

  async getById(tripId) {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();
    if (error) {
      console.error('SupabaseTrips.getById error:', error);
      return null;
    }
    return normalizeTrip(data);
  },

  async add(trip, userId) {
    const { data, error } = await supabase
      .from('trips')
      .insert({
        user_id: userId,
        title: trip.title || 'My trip',
        destination: trip.destination || '',
        booking_type: trip.booking_type || null,
        start_date: toSqlDate(trip.start_date || trip.checkIn, trip.year),
        end_date: toSqlDate(trip.end_date || trip.checkOut, trip.year),
        booking_data: trip.booking_data || trip,
        itinerary: trip.itinerary || null,
      })
      .select()
      .single();
    if (error) {
      console.error('SupabaseTrips.add error:', error);
      throw error;
    }
    return normalizeTrip(data);
  },

  async update(tripId, updates) {
    const { data, error } = await supabase
      .from('trips')
      .update(updates)
      .eq('id', tripId)
      .select()
      .single();
    if (error) {
      console.error('SupabaseTrips.update error:', error);
      throw error;
    }
    return normalizeTrip(data);
  },

  async remove(tripId) {
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', tripId);
    if (error) {
      console.error('SupabaseTrips.remove error:', error);
      throw error;
    }
  },

  async count(userId) {
    const { count, error } = await supabase
      .from('trips')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (error) return 0;
    return count || 0;
  },

  async nextDays(userId) {
    const trips = await this.getAll(userId);
    const now = new Date();
    const soonest = trips
      .map(t => ({ t, d: new Date(t.start_date) }))
      .filter(({ d }) => d instanceof Date && !isNaN(d) && d >= now)
      .sort((a, b) => a.d - b.d)[0];
    if (!soonest) return null;
    const diff = Math.ceil((soonest.d - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  },
};
