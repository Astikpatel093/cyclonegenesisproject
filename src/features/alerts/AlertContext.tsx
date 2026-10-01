import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { AlertContext, defaultPreferences, SEVERITY_ORDER, type Alert, type AlertPreferences, type AlertChannel, type AlertContextValue } from './alertState';
export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('cyclone-ai-alerts');
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [preferences, setPreferences] = useState<AlertPreferences>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('cyclone-ai-alert-prefs');
        return stored ? { ...defaultPreferences, ...JSON.parse(stored) } : defaultPreferences;
      } catch {
        return defaultPreferences;
      }
    }
    return defaultPreferences;
  });

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => typeof Notification !== 'undefined' ? Notification.permission : 'default');

  useEffect(() => {
    localStorage.setItem('cyclone-ai-alerts', JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem('cyclone-ai-alert-prefs', JSON.stringify(preferences));
  }, [preferences]);


  const sendNotification = useCallback(async (alert: Alert) => {
    const shouldNotify = alert.channels.some(channel => preferences.channels.includes(channel));
    if (!shouldNotify) return;

    if (preferences.quietHours.enabled) {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      if (currentTime >= preferences.quietHours.start || currentTime <= preferences.quietHours.end) {
        return;
      }
    }

    if (alert.channels.includes('push') && preferences.channels.includes('push') && notificationPermission === 'granted') {
      new Notification(alert.title, {
        body: alert.message,
        icon: '/icons/alert-192.png',
        badge: '/icons/badge-72.png',
        tag: alert.id,
        requireInteraction: alert.severity === 'critical' || alert.severity === 'danger',
        data: { alertId: alert.id },
      });
    }

    if (alert.channels.includes('sms') || alert.channels.includes('ivr')) {
      try {
        await fetch('/api/alerts/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alert, channels: alert.channels.filter(c => ['sms', 'ivr'].includes(c)) }),
        });
      } catch (error) {
        console.error('Failed to send SMS/IVR:', error);
      }
    }
  }, [preferences, notificationPermission]);

  const addAlert = useCallback((alert: Omit<Alert, 'id' | 'acknowledged' | 'dismissed'>) => {
    const newAlert: Alert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      acknowledged: false,
      dismissed: false,
    };

    setAlerts(prev => [newAlert, ...prev].slice(0, 100));

    if (preferences.enabled && SEVERITY_ORDER.indexOf(alert.severity) >= SEVERITY_ORDER.indexOf(preferences.severityThreshold)) {
      sendNotification(newAlert);
    }
  }, [preferences, sendNotification]);

  const acknowledgeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, dismissed: true } : a));
  }, []);

  const clearAll = useCallback(() => {
    setAlerts([]);
  }, []);

  const updatePreferences = useCallback((prefs: Partial<AlertPreferences>) => {
    setPreferences(prev => ({ ...prev, ...prefs }));
  }, []);

  const subscribeToRegion = useCallback((region: string) => {
    setPreferences(prev => ({
      ...prev,
      regions: [...new Set([...prev.regions, region])],
    }));
  }, []);

  const unsubscribeFromRegion = useCallback((region: string) => {
    setPreferences(prev => ({
      ...prev,
      regions: prev.regions.filter(r => r !== region),
    }));
  }, []);

  const testAlert = useCallback(async (channel: AlertChannel) => {
    const testAlert: Omit<Alert, 'id' | 'acknowledged' | 'dismissed'> = {
      type: 'cyclone',
      severity: 'warning',
      title: 'Test Alert - Cyclone AI',
      message: `This is a test ${channel.toUpperCase()} alert from Cyclone AI. No action required.`,
      language: 'en',
      region: { state: 'Test State', district: 'Test District' },
      channels: [channel],
      metadata: {
        issuedAt: new Date().toISOString(),
        issuedBy: 'Cyclone AI Test System',
      },
      actions: [
        { label: 'Acknowledge', type: 'acknowledge', payload: '', style: 'primary' },
        { label: 'Dismiss', type: 'dismiss', payload: '', style: 'secondary' },
      ],
    };
    addAlert(testAlert);
  }, [addAlert]);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    return permission === 'granted';
  }, []);

  const unreadCount = alerts.filter(a => !a.acknowledged && !a.dismissed).length;

  const value: AlertContextValue = {
    alerts,
    unreadCount,
    preferences,
    addAlert,
    acknowledgeAlert,
    dismissAlert,
    clearAll,
    updatePreferences,
    subscribeToRegion,
    unsubscribeFromRegion,
    testAlert,
    requestPermission,
  };

  return (
    <AlertContext.Provider value={value}>
      {children}
    </AlertContext.Provider>
  );
}

