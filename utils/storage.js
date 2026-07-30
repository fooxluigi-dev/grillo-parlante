import { Platform } from 'react-native';

// Web fallback for SecureStore
const isWeb = Platform.OS === 'web';

export const Storage = {
  async getItem(key) {
    if (isWeb) {
      return localStorage.getItem(key);
    }
    try {
      const { getItemAsync } = require('expo-secure-store');
      return await getItemAsync(key);
    } catch {
      return localStorage.getItem(key);
    }
  },

  async setItem(key, value) {
    if (isWeb) {
      localStorage.setItem(key, value);
      return;
    }
    try {
      const { setItemAsync } = require('expo-secure-store');
      await setItemAsync(key, value);
    } catch {
      localStorage.setItem(key, value);
    }
  },

  async deleteItem(key) {
    if (isWeb) {
      localStorage.removeItem(key);
      return;
    }
    try {
      const { deleteItemAsync } = require('expo-secure-store');
      await deleteItemAsync(key);
    } catch {
      localStorage.removeItem(key);
    }
  },
};
