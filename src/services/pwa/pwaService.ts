export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type PWAInstallListener = (canInstall: boolean) => void;

export class PWAService {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private listeners: Set<PWAInstallListener> = new Set();
  private isStandalone = false;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    // Check if already installed / standalone
    this.isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    // Register service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/service-worker.js')
          .then((registration) => {
            console.log('PWA ServiceWorker registered successfully with scope:', registration.scope);
          })
          .catch((error) => {
            console.warn('PWA ServiceWorker registration failed:', error);
          });
      });
    }

    // Capture install prompt
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.notifyListeners(true);
    });

    window.addEventListener('appinstalled', () => {
      this.isStandalone = true;
      this.deferredPrompt = null;
      this.notifyListeners(false);
      console.log('VEGA AI installed to home screen / system.');
    });
  }

  isInstallable(): boolean {
    return !!this.deferredPrompt && !this.isStandalone;
  }

  isInstalled(): boolean {
    return this.isStandalone;
  }

  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      return false;
    }
    try {
      await this.deferredPrompt.prompt();
      const choice = await this.deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        this.deferredPrompt = null;
        this.notifyListeners(false);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Install prompt error:', err);
      return false;
    }
  }

  subscribe(listener: PWAInstallListener): () => void {
    this.listeners.add(listener);
    listener(this.isInstallable());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(canInstall: boolean) {
    this.listeners.forEach((fn) => fn(canInstall));
  }
}

export const pwaService = new PWAService();
