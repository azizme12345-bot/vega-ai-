import { useState, useEffect } from 'react';
import { pwaService } from '../services/pwa/pwaService';

export function usePWAInstall() {
  const [isInstallable, setIsInstallable] = useState(pwaService.isInstallable());
  const [isInstalled, setIsInstalled] = useState(pwaService.isInstalled());
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIOSDevice && !pwaService.isInstalled());

    const unsubscribe = pwaService.subscribe((installable) => {
      setIsInstallable(installable);
      setIsInstalled(pwaService.isInstalled());
    });

    return () => unsubscribe();
  }, []);

  const install = async () => {
    return await pwaService.promptInstall();
  };

  return {
    isInstallable,
    isInstalled,
    isIOS,
    install,
  };
}
