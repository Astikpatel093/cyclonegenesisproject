import { useAsyncResource } from '../../hooks/useAsyncResource';
// Cyclone AI - PWA Registration and Offline Support
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

export interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  updateAvailable: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
  registration: ServiceWorkerRegistration | null;
}

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PWAContextValue extends PWAState {
  install: () => Promise<void>;
  update: () => Promise<void>;
  requestNotificationPermission: () => Promise<NotificationPermission>;
  subscribeToPush: () => Promise<PushSubscription | null>;
  unsubscribeFromPush: () => Promise<boolean>;
  cacheCycloneData: (data: any) => Promise<void>;
  getCachedCycloneData: () => Promise<any>;
  syncPendingData: () => Promise<void>;
}

export const PWAContext = createContext<PWAContextValue | null>(null);

export function usePWA() {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
}

export function useOfflineData<T>(key: string, fetcher: () => Promise<T>) {
  const { isOnline } = usePWA();
  const load = useCallback(async () => {
    const cache = await caches.open('cyclone-ai-dynamic-v2');
    if (isOnline) {
      const data = await fetcher();
      await cache.put(key, new Response(JSON.stringify(data)));
      return data;
    }
    if (new URL(key, window.location.href).pathname.startsWith('/api/')) throw new Error('Current observations require an online data service.');
    const cached = await cache.match(key);
    if (!cached) throw new Error('No offline copy is available.');
    return await cached.json() as T;
  }, [key, fetcher, isOnline]);
  const result = useAsyncResource(load);
  const { refresh } = result;
  useEffect(() => {
    window.addEventListener('cyclone-data-updated', refresh);
    return () => window.removeEventListener('cyclone-data-updated', refresh);
  }, [refresh]);
  return { ...result, refetch: refresh };
}

export function useNetworkStatus() {
  const { isOnline, syncPendingData } = usePWA();
  const [wasOffline, setWasOffline] = useState(() => !navigator.onLine);
  useEffect(() => {
    const offline = () => setWasOffline(true);
    const online = () => { setWasOffline(false); void syncPendingData(); };
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    return () => { window.removeEventListener('offline', offline); window.removeEventListener('online', online); };
  }, [syncPendingData]);
  return { isOnline, wasOffline };
}
