import { Conversation, AppSettings, UserAccount } from '../../types';

const DB_NAME = 'MyAIAssistantDB';
const DB_VERSION = 1;
const STORE_CONVERSATIONS = 'conversations';
const STORE_SETTINGS = 'settings';
const STORE_USER = 'user';

class StorageService {
  private dbPromise: Promise<IDBDatabase | null>;

  constructor() {
    this.dbPromise = this.initDB();
  }

  private initDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_CONVERSATIONS)) {
            const store = db.createObjectStore(STORE_CONVERSATIONS, { keyPath: 'id' });
            store.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
          if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
            db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains(STORE_USER)) {
            db.createObjectStore(STORE_USER, { keyPath: 'key' });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = (err) => {
          console.warn('IndexedDB failed to open, falling back to localStorage:', err);
          resolve(null);
        };
      } catch (e) {
        console.warn('IndexedDB initialization exception, using localStorage fallback:', e);
        resolve(null);
      }
    });
  }

  // Conversation operations
  async getAllConversations(): Promise<Conversation[]> {
    const db = await this.dbPromise;
    if (!db) {
      return this.getLocalFallback<Conversation[]>('conversations', []);
    }

    return new Promise((resolve) => {
      try {
        const transaction = db.transaction(STORE_CONVERSATIONS, 'readonly');
        const store = transaction.objectStore(STORE_CONVERSATIONS);
        const index = store.index('updatedAt');
        const request = index.getAll();

        request.onsuccess = () => {
          const list = (request.result as Conversation[]) || [];
          // Sort descending by updatedAt
          resolve(list.reverse());
        };

        request.onerror = () => {
          resolve(this.getLocalFallback<Conversation[]>('conversations', []));
        };
      } catch (err) {
        console.warn('getAllConversations error:', err);
        resolve(this.getLocalFallback<Conversation[]>('conversations', []));
      }
    });
  }

  async getConversation(id: string): Promise<Conversation | null> {
    const db = await this.dbPromise;
    if (!db) {
      const list = this.getLocalFallback<Conversation[]>('conversations', []);
      return list.find((c) => c.id === id) || null;
    }

    return new Promise((resolve) => {
      try {
        const transaction = db.transaction(STORE_CONVERSATIONS, 'readonly');
        const store = transaction.objectStore(STORE_CONVERSATIONS);
        const request = store.get(id);

        request.onsuccess = () => {
          resolve((request.result as Conversation) || null);
        };

        request.onerror = () => {
          const list = this.getLocalFallback<Conversation[]>('conversations', []);
          resolve(list.find((c) => c.id === id) || null);
        };
      } catch (e) {
        resolve(null);
      }
    });
  }

  async saveConversation(conv: Conversation): Promise<void> {
    const db = await this.dbPromise;
    if (!db) {
      const list = this.getLocalFallback<Conversation[]>('conversations', []);
      const index = list.findIndex((c) => c.id === conv.id);
      if (index >= 0) {
        list[index] = conv;
      } else {
        list.unshift(conv);
      }
      this.setLocalFallback('conversations', list);
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(STORE_CONVERSATIONS, 'readwrite');
        const store = transaction.objectStore(STORE_CONVERSATIONS);
        const request = store.put(conv);

        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e);
      } catch (err) {
        // Fallback
        const list = this.getLocalFallback<Conversation[]>('conversations', []);
        const idx = list.findIndex((c) => c.id === conv.id);
        if (idx >= 0) list[idx] = conv;
        else list.unshift(conv);
        this.setLocalFallback('conversations', list);
        resolve();
      }
    });
  }

  async deleteConversation(id: string): Promise<void> {
    const db = await this.dbPromise;
    if (!db) {
      const list = this.getLocalFallback<Conversation[]>('conversations', []);
      this.setLocalFallback('conversations', list.filter((c) => c.id !== id));
      return;
    }

    return new Promise((resolve) => {
      try {
        const transaction = db.transaction(STORE_CONVERSATIONS, 'readwrite');
        const store = transaction.objectStore(STORE_CONVERSATIONS);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      } catch (err) {
        resolve();
      }
    });
  }

  async clearAllConversations(): Promise<void> {
    const db = await this.dbPromise;
    if (!db) {
      localStorage.removeItem('conversations');
      return;
    }

    return new Promise((resolve) => {
      try {
        const transaction = db.transaction(STORE_CONVERSATIONS, 'readwrite');
        const store = transaction.objectStore(STORE_CONVERSATIONS);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  }

  // Settings
  async getSettings(): Promise<AppSettings> {
    const defaultSettings: AppSettings = {
      theme: 'dark',
      speechLang: 'en-US',
      ttsEnabled: true,
      ttsRate: 1.0,
      ttsPitch: 1.0,
      customSystemPrompt: '',
      soundEffects: true,
      autoScroll: true,
    };

    try {
      const stored = localStorage.getItem('app_settings');
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) };
      }
    } catch {
      // Fallback
    }
    return defaultSettings;
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      localStorage.setItem('app_settings', JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  }

  // User auth state
  async getUser(): Promise<UserAccount> {
    const guestUser: UserAccount = {
      id: 'local_user_default',
      name: 'Guest User',
      email: '',
      isLoggedIn: false,
    };

    try {
      const stored = localStorage.getItem('user_account');
      if (stored) {
        return { ...guestUser, ...JSON.parse(stored) };
      }
    } catch {
      // Fallback
    }
    return guestUser;
  }

  async saveUser(user: UserAccount): Promise<void> {
    try {
      localStorage.setItem('user_account', JSON.stringify(user));
    } catch (e) {
      console.warn('Failed to save user account:', e);
    }
  }

  // Local storage helpers
  private getLocalFallback<T>(key: string, fallback: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  }

  private setLocalFallback<T>(key: string, val: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.warn('localStorage set failed:', e);
    }
  }
}

export const storageService = new StorageService();
