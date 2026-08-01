import React, { useEffect, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { StatusBar, Style } from '@capacitor/status-bar';
import { PushNotifications } from '@capacitor/push-notifications';
import { OfflineBanner } from '../components/mobile/OfflineBanner';
import { registerDeviceToken } from '../lib/api';
import { useAuth } from './AuthContext';

interface NativeAppProviderProps {
  children: React.ReactNode;
}

function logcatFCM(step: string, details?: any) {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  console.log(`[AttendEase-FCM ${timestamp}] ${step}${details ? ' -> ' + JSON.stringify(details) : ''}`);
}

export const NativeAppProvider: React.FC<NativeAppProviderProps> = ({ children }) => {
  const [isOffline, setIsOffline] = useState(false);
  const [activeBanner, setActiveBanner] = useState<{ title: string; body: string; requestId?: string } | null>(null);
  const { user } = useAuth();

  // 1. Setup Status Bar & Android Hardware Back Button
  useEffect(() => {
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#F97316' }).catch(() => {});

    const backButtonListener = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack && window.history.length > 1) {
        window.history.back();
      } else {
        CapacitorApp.minimizeApp().catch(() => {});
      }
    });

    Network.getStatus().then(status => setIsOffline(!status.connected)).catch(() => {});
    const networkListener = Network.addListener('networkStatusChange', status => {
      setIsOffline(!status.connected);
    });

    return () => {
      backButtonListener.then(h => h.remove()).catch(() => {});
      networkListener.then(h => h.remove()).catch(() => {});
    };
  }, []);

  // 2. Setup Firebase Cloud Messaging (FCM), Channel, and Deep Link Handlers
  useEffect(() => {
    if (!user) return;

    logcatFCM('Initializing Push Notifications & Android Channel');

    // Create high-priority Android Notification Channel
    PushNotifications.createChannel({
      id: 'attendease_notifications',
      name: 'AttendEase Alerts',
      description: 'Instant attendance request & approval notifications',
      importance: 5, // High Importance for heads-up alert banner
      sound: 'default',
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: '#F97316',
    }).then(() => {
      logcatFCM('Android Notification Channel Created (attendease_notifications)');
    }).catch(e => logcatFCM('Channel Creation Warning', e));

    // Request Android 13+ Notification Permission
    logcatFCM('Requesting Notification Permission');
    PushNotifications.checkPermissions().then(res => {
      if (res.receive !== 'granted') {
        return PushNotifications.requestPermissions();
      }
      return res;
    }).then(res => {
      logcatFCM('Permission Status', res?.receive);
      if (res?.receive === 'granted') {
        logcatFCM('Registering Device Token with Firebase');
        PushNotifications.register().catch(e => logcatFCM('Push register error', e));
      }
    }).catch(e => logcatFCM('Push Permission Error', e));

    // 3. FCM Registration Token Listener
    const tokenListener = PushNotifications.addListener('registration', token => {
      if (token?.value) {
        logcatFCM('FCM Token Generated', token.value.slice(0, 20) + '...');
        registerDeviceToken(token.value).then(() => {
          logcatFCM('Token Uploaded to PostgreSQL Backend Successfully');
        }).catch(e => logcatFCM('Token Upload Error', e));
      }
    });

    const tokenErrListener = PushNotifications.addListener('registrationError', err => {
      logcatFCM('FCM Registration Error', err);
    });

    // 4. Foreground Notification Listener
    const notificationListener = PushNotifications.addListener('pushNotificationReceived', notification => {
      logcatFCM('Notification Received in Foreground', notification);
      const title = notification.title || 'AttendEase Notification';
      const body = notification.body || '';
      const requestId = notification.data?.requestId;

      setActiveBanner({ title, body, requestId });
      setTimeout(() => setActiveBanner(null), 5000);
    });

    // 5. Deep-Link Action Listener (Tapped Notification)
    const actionListener = PushNotifications.addListener('pushNotificationActionPerformed', action => {
      logcatFCM('Notification Opened / Tapped', action);
      const data = action.notification.data;
      const targetRequestId = data?.requestId || data?.id;

      if (targetRequestId) {
        const role = user.role;
        let targetRoute = `/student/request/${targetRequestId}`;
        if (role === 'faculty') targetRoute = `/faculty/request/${targetRequestId}`;
        if (role === 'hod') targetRoute = `/hod/request/${targetRequestId}`;

        logcatFCM('Executing Deep Link Navigation to Route', targetRoute);
        window.location.href = targetRoute;
      }
    });

    return () => {
      tokenListener.then(h => h.remove()).catch(() => {});
      tokenErrListener.then(h => h.remove()).catch(() => {});
      notificationListener.then(h => h.remove()).catch(() => {});
      actionListener.then(h => h.remove()).catch(() => {});
    };
  }, [user]);

  const handleRetryConnection = () => {
    Network.getStatus().then(status => {
      setIsOffline(!status.connected);
      if (status.connected) {
        window.location.reload();
      }
    }).catch(() => {});
  };

  return (
    <>
      <OfflineBanner isOffline={isOffline} onRetry={handleRetryConnection} />
      
      {/* Foreground Notification Banner */}
      {activeBanner && (
        <div
          onClick={() => {
            if (activeBanner.requestId && user) {
              const role = user.role;
              let route = `/student/request/${activeBanner.requestId}`;
              if (role === 'faculty') route = `/faculty/request/${activeBanner.requestId}`;
              if (role === 'hod') route = `/hod/request/${activeBanner.requestId}`;
              window.location.href = route;
            }
          }}
          className="fixed top-3 left-3 right-3 z-50 p-4 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-orange-500/40 flex items-start gap-3 cursor-pointer animate-slide-down"
        >
          <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-md">
            🔔
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-[14px] font-bold text-white leading-tight truncate">{activeBanner.title}</h4>
            <p className="text-[12px] text-slate-300 mt-0.5 line-clamp-2">{activeBanner.body}</p>
          </div>
        </div>
      )}

      <div className={isOffline ? 'pt-10 transition-all' : ''}>
        {children}
      </div>
    </>
  );
};
