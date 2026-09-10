import React, { useEffect, useState } from 'react';
import type { AnnouncementItem, AnnouncementPlacement } from '../../lib/api';
import * as api from '../../lib/api';
import { AnnouncementBanner } from './AnnouncementBanner';
import { AnnouncementWidget } from './AnnouncementWidget';
import { OpeningAnimation } from './OpeningAnimation';

interface AnnouncementRendererProps {
  announcements?: AnnouncementItem[];
  placement: AnnouncementPlacement;
  onDismiss?: (id: string) => void;
}

const SESSION_STORAGE_PREFIX = 'attendease_announcement_session_';
const DAILY_STORAGE_PREFIX = 'attendease_announcement_daily_';

function isFrequencyAllowed(item: AnnouncementItem): boolean {
  try {
    if (item.displayMode === 'EVERY_PAGE_LOAD') {
      return true;
    }

    if (item.displayMode === 'ONCE_PER_SESSION' || item.displayMode === 'ONCE_PER_LOGIN') {
      const key = `${SESSION_STORAGE_PREFIX}${item.id}`;
      return !sessionStorage.getItem(key);
    }

    if (item.displayMode === 'ONCE_PER_DAY') {
      const today = new Date().toISOString().split('T')[0];
      const key = `${DAILY_STORAGE_PREFIX}${item.id}`;
      const savedDate = localStorage.getItem(key);
      return savedDate !== today;
    }

    // ONCE_PER_USER is checked server-side
    return true;
  } catch {
    return true;
  }
}

function markFrequencySeen(item: AnnouncementItem): void {
  try {
    if (item.displayMode === 'ONCE_PER_SESSION' || item.displayMode === 'ONCE_PER_LOGIN') {
      sessionStorage.setItem(`${SESSION_STORAGE_PREFIX}${item.id}`, 'true');
    } else if (item.displayMode === 'ONCE_PER_DAY') {
      const today = new Date().toISOString().split('T')[0]!;
      localStorage.setItem(`${DAILY_STORAGE_PREFIX}${item.id}`, today);
    }
  } catch {}
}

export const AnnouncementRenderer: React.FC<AnnouncementRendererProps> = ({
  announcements = [],
  placement,
  onDismiss,
}) => {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Filter items for this placement
  const placementItems = announcements.filter(
    (a) => a.placement === placement && !dismissedIds.has(a.id) && isFrequencyAllowed(a)
  );

  // Track impressions on mount
  useEffect(() => {
    placementItems.forEach((item) => {
      markFrequencySeen(item);
      api.markAnnouncementViewed(item.id);
    });
  }, [placementItems.map((p) => p.id).join(',')]);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
    if (onDismiss) {
      onDismiss(id);
    }
  };

  if (placementItems.length === 0) {
    return null;
  }

  return (
    <div className="announcement-renderer-container w-full">
      {placementItems.map((item) => {
        if (item.type === 'OPENING_ANIMATION' || item.placement === 'POPUP') {
          return <OpeningAnimation key={item.id} announcement={item} onDismiss={handleDismiss} />;
        }

        if (item.type === 'BANNER') {
          return <AnnouncementBanner key={item.id} announcement={item} onDismiss={handleDismiss} />;
        }

        if (item.type === 'WIDGET') {
          return <AnnouncementWidget key={item.id} announcement={item} />;
        }

        return <AnnouncementBanner key={item.id} announcement={item} onDismiss={handleDismiss} />;
      })}
    </div>
  );
};
