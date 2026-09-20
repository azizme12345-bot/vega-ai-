import React, { useState } from 'react';
import { X, User, Mail, LogOut, CheckCircle2, RefreshCw, Sparkles } from 'lucide-react';
import { UserAccount } from '../types';
import { authService } from '../services/auth/authService';
import { syncService } from '../services/sync/syncService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserAccount;
  chatCount: number;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, user, chatCount }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    await authService.login(name, email);
    onClose();
  };

  const handleGoogleSignIn = async () => {
    await authService.mockGoogleSignIn();
    onClose();
  };

  const handleLogout = async () => {
    await authService.logout();
    onClose();
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncStatus('Syncing chats...');
    const result = await syncService.syncConversations();
    setIsSyncing(false);
    if (result.success) {
      setSyncStatus(`Successfully synced ${result.count} conversations.`);
      setTimeout(() => setSyncStatus(null), 3000);
    } else {
      setSyncStatus(`Sync issue: ${result.error}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="flex flex-col w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {user.isLoggedIn ? 'Account Profile' : 'Sign In to VEGA AI'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 text-xs text-slate-700 dark:text-slate-300">
          {user.isLoggedIn ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600 font-bold text-white text-base">
                  {user.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 dark:text-white truncate">
                    {user.name}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] truncate">
                    {user.email || 'Synced user'}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500 font-medium mt-0.5">
                    <CheckCircle2 className="h-3 w-3" />
                    Account Active
                  </span>
                </div>
              </div>

              {/* Chat sync status */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-800/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-900 dark:text-white">Chat Cloud Sync</span>
                  <button
                    onClick={handleSyncNow}
                    disabled={isSyncing}
                    className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                  >
                    <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Sync Now</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {chatCount} saved conversation{chatCount === 1 ? '' : 's'} linked to your account.
                </p>
                {syncStatus && (
                  <p className="mt-1.5 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                    {syncStatus}
                  </p>
                )}
              </div>

              <button
                onClick={handleLogout}
                id="auth-logout-btn"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 py-2.5 font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition"
              >
                <LogOut className="h-4 w-4" />
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            <div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                Signing in enables seamless cross-device synchronization for your chats, preferences, and custom prompts.
              </p>

              {/* Google Sign In option */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                id="google-signin-btn"
                className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-750 transition mb-4"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.93 6.72-4.93z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative my-3 flex items-center justify-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                <span className="absolute bg-white dark:bg-slate-900 px-2 text-[10px] text-slate-400 uppercase">
                  or with email
                </span>
              </div>

              {/* Standard Email Login */}
              <form onSubmit={handleLogin} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Your Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@example.com"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  id="auth-submit-btn"
                  className="w-full rounded-xl bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700 transition"
                >
                  Sign In / Create Account
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
