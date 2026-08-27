import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import type { Message } from 'firebase-admin/messaging';
import { prisma } from '../db/prisma.js';

/**
 * Firebase Cloud Messaging (FCM) Notification Service for AttendEase
 */

// Initialize Firebase Admin SDK
if (!getApps().length) {
  try {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountVar) {
      const serviceAccount = JSON.parse(serviceAccountVar);
      initializeApp({
        credential: cert(serviceAccount),
      });
      console.log('[FCM Backend] Initialized Firebase Admin SDK with service account credentials.');
    } else {
      // Fallback initialization for default project
      initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'attendease-mobile-app',
      });
      console.log('[FCM Backend] Initialized Firebase Admin SDK with default project config.');
    }
  } catch (err) {
    console.warn('[FCM Backend] Firebase Admin SDK initialization warning:', err);
  }
}

export interface FcmPayloadData {
  requestId: string;
  role: 'student' | 'faculty' | 'hod' | 'admin';
  notificationType: 'new_request' | 'forwarded_request' | 'approved' | 'rejected' | 'info_requested';
  [key: string]: string;
}

/**
 * Sends a production-ready FCM push notification to a target user token
 */
export async function sendFcmNotification(
  fcmToken: string,
  title: string,
  body: string,
  data: FcmPayloadData,
  userIdToClean?: string,
): Promise<boolean> {
  if (!fcmToken) {
    console.log('[FCM Backend] Skipping push notification: fcmToken is empty.');
    return false;
  }

  const message: Message = {
    token: fcmToken,
    notification: {
      title,
      body,
    },
    data: {
      ...data,
      timestamp: new Date().toISOString(),
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'attendease_notifications',
        sound: 'default',
        priority: 'high',
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
      },
    },
  };

  console.log(`[FCM Backend] Firebase send started for target token ${fcmToken.slice(0, 12)}...`, { title, data });

  try {
    const response = await getMessaging().send(message);
    console.log(`[FCM Backend] Firebase response success -> MessageId: ${response}`);
    return true;
  } catch (error: any) {
    console.error(`[FCM Backend] Firebase response error ->`, error?.message || error);

    // Auto-clean expired / invalid tokens
    const isInvalidToken =
      error?.code === 'messaging/registration-token-not-registered' ||
      error?.code === 'messaging/invalid-registration-token' ||
      error?.message?.includes('Requested entity was not found');

    if (isInvalidToken && userIdToClean) {
      console.log(`[FCM Backend] Removing expired FCM token from PostgreSQL for user: ${userIdToClean}`);
      await prisma.user.update({
        where: { userId: userIdToClean },
        data: { fcmToken: null },
      }).catch(e => console.error('[FCM Backend] Failed to clean expired token from DB:', e));
    }

    return false;
  }
}
