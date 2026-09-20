import { Conversation } from '../../types';
import { storageService } from '../storage/indexedDB';
import { authService } from '../auth/authService';

export class SyncService {
  private isSyncing = false;

  async syncConversations(): Promise<{ success: boolean; count: number; error?: string }> {
    if (this.isSyncing) {
      return { success: false, count: 0, error: 'Sync in progress' };
    }

    if (!navigator.onLine) {
      return { success: false, count: 0, error: 'Cannot sync while offline' };
    }

    const user = authService.getCurrentUser();
    if (!user.isLoggedIn) {
      // Local chats only
      return { success: true, count: 0 };
    }

    this.isSyncing = true;
    try {
      const localChats = await storageService.getAllConversations();
      // Update sync timestamp
      const updatedUser = { ...user, lastSyncedAt: Date.now() };
      await storageService.saveUser(updatedUser);
      return { success: true, count: localChats.length };
    } catch (e: any) {
      return { success: false, count: 0, error: e.message || 'Sync failed' };
    } finally {
      this.isSyncing = false;
    }
  }

  getIsSyncing(): boolean {
    return this.isSyncing;
  }
}

export const syncService = new SyncService();
