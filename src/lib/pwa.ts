// PWA Management, Android Install Prompt Handling, and Native API Bridges

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

class PWAManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private listeners: ((installable: boolean) => void)[] = [];
  private wakeLockSentinel: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent default mini-infobar or banner
        e.preventDefault();
        this.deferredPrompt = e as BeforeInstallPromptEvent;
        this.notifyListeners(true);
      });

      window.addEventListener('appinstalled', () => {
        this.deferredPrompt = null;
        this.notifyListeners(false);
      });
    }
  }

  public isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  }

  public isInstallable(): boolean {
    return this.deferredPrompt !== null;
  }

  public async promptInstall(): Promise<'accepted' | 'dismissed' | 'unsupported'> {
    if (!this.deferredPrompt) {
      return 'unsupported';
    }

    try {
      await this.deferredPrompt.prompt();
      const choice = await this.deferredPrompt.userChoice;
      this.deferredPrompt = null;
      this.notifyListeners(false);
      return choice.outcome;
    } catch {
      return 'unsupported';
    }
  }

  public onInstallStateChange(callback: (installable: boolean) => void) {
    this.listeners.push(callback);
    callback(this.isInstallable());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners(state: boolean) {
    this.listeners.forEach((l) => l(state));
  }

  // Native Web Share API
  public async sharePdfFile(fileBytes: Uint8Array, fileName: string): Promise<boolean> {
    try {
      const blob = new Blob([fileBytes], { type: 'application/pdf' });
      const file = new File([blob], fileName, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: fileName,
          text: `Signed and edited with Secure PDF Pro: ${fileName}`,
        });
        return true;
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Native share failed:', err);
      }
    }
    return false;
  }

  public async sharePdf(fileBytes: Uint8Array, fileName: string): Promise<boolean> {
    return this.sharePdfFile(fileBytes, fileName);
  }

  // Wake Lock API (keeps screen active during document reading)
  public async requestWakeLock(): Promise<boolean> {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        return true;
      }
    } catch {
      // Ignored
    }
    return false;
  }

  public releaseWakeLock() {
    if (this.wakeLockSentinel) {
      try {
        this.wakeLockSentinel.release();
      } catch {
        // Ignored
      }
      this.wakeLockSentinel = null;
    }
  }
}

export const pwaManager = new PWAManager();
