import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { PWAContext, type PWAState, type BeforeInstallPromptEvent, type PWAContextValue } from './pwaContext';
interface PWAProviderProps {
  children: ReactNode;
}

export function PWAProvider({ children }: PWAProviderProps) {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true,
    isOnline: navigator.onLine,
    updateAvailable: false,
    installPrompt: null,
    registration: null,
  });

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(registration => {
          setState(prev => ({ ...prev, registration }));
          
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setState(prev => ({ ...prev, updateAvailable: true }));
                }
              });
            }
          });
          
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data?.type === 'CYCLONE_DATA_UPDATED') {
              window.dispatchEvent(new CustomEvent('cyclone-data-updated', { detail: event.data.data }));
            }
          });
        })
        .catch(error => console.error('SW registration failed:', error));
    }

    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setState(prev => ({ ...prev, isInstallable: true, installPrompt: e }));
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);

    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const install = useCallback(async () => {
    if (!state.installPrompt) return;
    await state.installPrompt.prompt();
    const { outcome } = await state.installPrompt.userChoice;
    if (outcome === 'accepted') {
      setState(prev => ({ ...prev, isInstallable: false, isInstalled: true, installPrompt: null }));
    }
  }, [state.installPrompt]);

  const update = useCallback(async () => {
    if (state.registration?.waiting) {
      state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }, [state.registration]);

  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'denied';
    const permission = await Notification.requestPermission();
    return permission;
  }, []);

  const subscribeToPush = useCallback(async () => {
    const reg = state.registration;
    if (!reg) return null;
    
    try {
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
      let applicationServerKey: BufferSource | undefined;
      
      if (vapidKey) {
        const padding = '='.repeat((4 - (vapidKey.length % 4)) % 4);
        const base64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        applicationServerKey = outputArray;
      }
      
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
      
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });
      
      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }, [state.registration]);

  const unsubscribeFromPush = useCallback(async () => {
    const reg = state.registration;
    if (!reg) return false;
    
    try {
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Push unsubscription failed:', error);
      return false;
    }
  }, [state.registration]);

  const cacheCycloneData = useCallback(async (data: any) => {
    const reg = state.registration;
    if (!reg) return;
    reg.active?.postMessage({
      type: 'CACHE_CYCLONE_DATA',
      data,
    });
  }, [state.registration]);

  const getCachedCycloneData = useCallback(async () => {
    const reg = state.registration;
    if (!reg) return null;
    
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => resolve(event.data.data);
      reg.active?.postMessage(
        { type: 'GET_CACHED_DATA', key: '/api/cyclones/active' },
        [channel.port2]
      );
    });
  }, [state.registration]);

  const syncPendingData = useCallback(async () => {
    const reg = state.registration;
    if (!reg || !('sync' in reg)) return;
    try {
      await (reg as any).sync.register('sync-alerts');
      await (reg as any).sync.register('sync-location');
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }, [state.registration]);

  const value: PWAContextValue = {
    ...state,
    install,
    update,
    requestNotificationPermission,
    subscribeToPush,
    unsubscribeFromPush,
    cacheCycloneData,
    getCachedCycloneData,
    syncPendingData,
  };

  return (
    <PWAContext.Provider value={value}>
      {children}
    </PWAContext.Provider>
  );
}

