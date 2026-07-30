import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

const store = {
  async get(key) {
    if (isWeb) return localStorage.getItem(key);
    try {
      const { getItemAsync } = require('expo-secure-store');
      return await getItemAsync(key);
    } catch {
      return localStorage.getItem(key);
    }
  },
  async set(key, val) {
    if (isWeb) { localStorage.setItem(key, val); return; }
    try {
      const { setItemAsync } = require('expo-secure-store');
      await setItemAsync(key, val);
    } catch { localStorage.setItem(key, val); }
  },
  async del(key) {
    if (isWeb) { localStorage.removeItem(key); return; }
    try {
      const { deleteItemAsync } = require('expo-secure-store');
      await deleteItemAsync(key);
    } catch { localStorage.removeItem(key); }
  },
};

const TRIPS_KEY = 'grillo_trips';
const CHATS_KEY = 'grillo_chats';

export const TripsDB = {
  async getAll() {
    const raw = await store.get(TRIPS_KEY);
    return raw ? JSON.parse(raw) : [];
  },
  async add(trip) {
    const trips = await this.getAll();
    const newTrip = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      ...trip,
      createdAt: Date.now(),
    };
    trips.unshift(newTrip);
    await store.set(TRIPS_KEY, JSON.stringify(trips));
    return newTrip;
  },
  async remove(id) {
    const trips = await this.getAll();
    await store.set(TRIPS_KEY, JSON.stringify(trips.filter(t => t.id !== id)));
  },
  async count() {
    const trips = await this.getAll();
    return trips.length;
  },
  async nextDays() {
    const trips = await this.getAll();
    const soonest = trips
      .map(t => ({ t, d: new Date(t.checkIn || t.checkInDate) }))
      .filter(({ d }) => d instanceof Date && !isNaN(d))
      .sort((a, b) => a.d - b.d)[0];
    if (!soonest) return null;
    const diff = Math.ceil((soonest.d - new Date()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  },
};

export const ChatsDB = {
  async getTodayCount() {
    const raw = await store.get(CHATS_KEY);
    const data = raw ? JSON.parse(raw) : {};
    const today = new Date().toDateString();
    return data[today] || 0;
  },
  async increment() {
    const raw = await store.get(CHATS_KEY);
    const data = raw ? JSON.parse(raw) : {};
    const today = new Date().toDateString();
    data[today] = (data[today] || 0) + 1;
    await store.set(CHATS_KEY, JSON.stringify(data));
  },
};
