import { UserAccount } from '../../types';
import { storageService } from '../storage/indexedDB';

export type AuthChangeListener = (user: UserAccount) => void;

export class AuthService {
  private currentUser: UserAccount | null = null;
  private listeners: Set<AuthChangeListener> = new Set();

  async init(): Promise<UserAccount> {
    const user = await storageService.getUser();
    this.currentUser = user;
    return user;
  }

  getCurrentUser(): UserAccount {
    return (
      this.currentUser || {
        id: 'local_user_default',
        name: 'Guest User',
        email: '',
        isLoggedIn: false,
      }
    );
  }

  async login(name: string, email: string): Promise<UserAccount> {
    const user: UserAccount = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim() || 'AI User',
      email: email.trim().toLowerCase(),
      isLoggedIn: true,
      lastSyncedAt: Date.now(),
    };

    this.currentUser = user;
    await storageService.saveUser(user);
    this.notifyListeners(user);
    return user;
  }

  async mockGoogleSignIn(): Promise<UserAccount> {
    // Adapter for Google Sign-In integration
    const user: UserAccount = {
      id: `usr_google_${Date.now()}`,
      name: 'Google Account User',
      email: 'user@example.com',
      isLoggedIn: true,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      lastSyncedAt: Date.now(),
    };

    this.currentUser = user;
    await storageService.saveUser(user);
    this.notifyListeners(user);
    return user;
  }

  async logout(): Promise<void> {
    const guestUser: UserAccount = {
      id: 'local_user_default',
      name: 'Guest User',
      email: '',
      isLoggedIn: false,
    };

    this.currentUser = guestUser;
    await storageService.saveUser(guestUser);
    this.notifyListeners(guestUser);
  }

  subscribe(listener: AuthChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(user: UserAccount) {
    this.listeners.forEach((fn) => fn(user));
  }
}

export const authService = new AuthService();
