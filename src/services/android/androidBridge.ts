export interface AndroidDeviceInfo {
  isAndroid: boolean;
  isCapacitor: boolean;
  isStandalonePWA: boolean;
  userAgent: string;
}

export class AndroidBridge {
  private backButtonHandlers: Array<() => boolean> = [];

  constructor() {
    this.setupHardwareBackListener();
  }

  getDeviceInfo(): AndroidDeviceInfo {
    if (typeof window === 'undefined') {
      return { isAndroid: false, isCapacitor: false, isStandalonePWA: false, userAgent: '' };
    }

    const ua = navigator.userAgent.toLowerCase();
    const isAndroid = /android/.test(ua);
    const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.();
    const isStandalonePWA =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    return {
      isAndroid,
      isCapacitor,
      isStandalonePWA,
      userAgent: navigator.userAgent,
    };
  }

  // Register hardware back button handler
  // If the handler returns true, the event is considered handled
  registerBackButton(handler: () => boolean): () => void {
    this.backButtonHandlers.push(handler);
    return () => {
      this.backButtonHandlers = this.backButtonHandlers.filter((h) => h !== handler);
    };
  }

  private setupHardwareBackListener() {
    if (typeof window === 'undefined') return;

    // Standard Capacitor hardware back button event
    window.addEventListener('ionBackButton', (e: any) => {
      for (let i = this.backButtonHandlers.length - 1; i >= 0; i--) {
        const handled = this.backButtonHandlers[i]();
        if (handled) {
          e.detail?.register?.(10, () => {});
          return;
        }
      }
    });

    // Browser popstate for Android WebView / PWA back navigation
    window.addEventListener('popstate', () => {
      for (let i = this.backButtonHandlers.length - 1; i >= 0; i--) {
        const handled = this.backButtonHandlers[i]();
        if (handled) break;
      }
    });
  }

  async checkPermissions(): Promise<{
    camera: PermissionState | 'prompt';
    microphone: PermissionState | 'prompt';
  }> {
    const results: {
      camera: PermissionState | 'prompt';
      microphone: PermissionState | 'prompt';
    } = {
      camera: 'prompt',
      microphone: 'prompt',
    };

    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      try {
        const micStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        results.microphone = micStatus.state;
      } catch {
        // Safe ignore
      }

      try {
        const camStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
        results.camera = camStatus.state;
      } catch {
        // Safe ignore
      }
    }

    return results;
  }
}

export const androidBridge = new AndroidBridge();
