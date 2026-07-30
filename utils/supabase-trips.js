import { supabase } from './supabase';

// Helper: parse "Aug 22" with optional year → "2026-08-22" for PostgreSQL DATE columns
function toSqlDate(str, year) {
  if (!str) return null;
  const d = new Date(str);
  if (!isNaN(d)) return d.toISOString().split('T')[0];
  const months = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',
                  Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
  const parts = str.split(' ');
  if (parts.length >= 2 && months[parts[0]]) {
    const y = year || new Date().getFullYear();
    return `${y}-${months[parts[0]]}-${String(parseInt(parts[1])).padStart(2, '0')}`;
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
    return data || [];
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
    return data;
  },

  async add(trip, userId) {
    const { data, error } = await supabase
      .from('trips')
      .insert({
        user_id: userId,
        title: trip.title || 'My trip',
        destination: trip.destination || '',
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
    return data;
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
    return data;
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
