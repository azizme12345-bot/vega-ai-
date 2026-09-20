import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [showRestored, setShowRestored] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline) {
      // Reconnected!
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
        setWasOffline(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (!isOnline) {
    return (
      <div
        id="offline-indicator-banner"
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/95 px-4 py-2 text-xs font-medium text-amber-950 shadow-lg backdrop-blur-xs animate-in fade-in slide-in-from-bottom-2"
      >
        <WifiOff className="h-3.5 w-3.5 shrink-0 text-amber-950 animate-pulse" />
        <span>Offline Mode • Saved chats are readable</span>
      </div>
    );
  }

  if (showRestored) {
    return (
      <div
        id="online-restored-banner"
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/95 px-4 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-xs animate-in fade-in slide-in-from-bottom-2"
      >
        <Wifi className="h-3.5 w-3.5 shrink-0 text-white" />
        <span>Back Online • Reconnected to AI</span>
      </div>
    );
  }

  return null;
};
