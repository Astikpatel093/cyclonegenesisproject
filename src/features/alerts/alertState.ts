// Cyclone AI - Alert System for SMS, IVR, Push Notifications
import { createContext, useContext } from 'react';

export type AlertSeverity = 'info' | 'watch' | 'warning' | 'danger' | 'critical';
export type AlertChannel = 'push' | 'sms' | 'ivr' | 'ussd' | 'email' | 'webhook';

export interface Alert {
  id: string;
  type: 'cyclone' | 'storm_surge' | 'heavy_rain' | 'wind' | 'flood' | 'evacuation' | 'all_clear';
  severity: AlertSeverity;
  title: string;
  message: string;
  language: string;
  region: {
    state: string;
    district?: string;
    coordinates?: [number, number];
    radius?: number;
  };
  channels: AlertChannel[];
  metadata: {
    cycloneName?: string;
    category?: number;
    windSpeed?: number;
    pressure?: number;
    surgeHeight?: number;
    rainfall?: number;
    validUntil?: string;
    issuedAt: string;
    issuedBy: string;
  };
  actions: AlertAction[];
  acknowledged: boolean;
  dismissed: boolean;
}

export interface AlertAction {
  label: string;
  type: 'navigate' | 'call' | 'sms' | 'share' | 'acknowledge' | 'dismiss';
  payload: string;
  style: 'primary' | 'secondary' | 'danger';
}

export interface AlertPreferences {
  enabled: boolean;
  channels: AlertChannel[];
  severityThreshold: AlertSeverity;
  regions: string[];
  languages: string[];
  quietHours: { enabled: boolean; start: string; end: string };
  cycloneCategories: number[];
  districts: string[];
}

export interface AlertContextValue {
  alerts: Alert[];
  unreadCount: number;
  preferences: AlertPreferences;
  addAlert: (alert: Omit<Alert, 'id' | 'acknowledged' | 'dismissed'>) => void;
  acknowledgeAlert: (id: string) => void;
  dismissAlert: (id: string) => void;
  clearAll: () => void;
  updatePreferences: (prefs: Partial<AlertPreferences>) => void;
  subscribeToRegion: (region: string) => void;
  unsubscribeFromRegion: (region: string) => void;
  testAlert: (channel: AlertChannel) => void;
  requestPermission: () => Promise<boolean>;
}

export const AlertContext = createContext<AlertContextValue | null>(null);

export function useAlerts() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
}

export const SEVERITY_ORDER: AlertSeverity[] = ['info', 'watch', 'warning', 'danger', 'critical'];

export const defaultPreferences: AlertPreferences = {
  enabled: true,
  channels: ['push', 'sms'],
  severityThreshold: 'watch',
  regions: [],
  languages: ['en'],
  quietHours: { enabled: false, start: '22:00', end: '07:00' },
  cycloneCategories: [1, 2, 3, 4, 5, 6, 7],
  districts: [],
};

export function playAlertSound(severity: AlertSeverity) {
  if (typeof window === 'undefined') return;
  
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  const frequencies = {
    info: 440,
    watch: 523,
    warning: 659,
    danger: 784,
    critical: 1047,
  };
  
  oscillator.frequency.value = frequencies[severity];
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 1);
}

export function vibrateAlert(severity: AlertSeverity) {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  
  const patterns = {
    info: [100],
    watch: [200, 100, 200],
    warning: [300, 100, 300, 100, 300],
    danger: [500, 100, 500, 100, 500, 100, 500],
    critical: [1000, 200, 1000, 200, 1000],
  };
  
  navigator.vibrate(patterns[severity]);
}