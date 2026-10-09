import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createDealAlert,
  deleteDealAlert,
  getDealAlerts,
  updateDealAlert,
  type CreateDealAlertInput,
  type DealAlert,
} from '@/services/api/alertsApi';
import { useAuth } from '@/contexts/AuthContext';
import { getUserSessionToken } from '@/services/userSession';

function alertCacheKey(ownerKey: string) {
  return `deals24-alerts:${ownerKey}`;
}

function readCachedAlerts(ownerKey: string): DealAlert[] | null {
  try {
    const raw = localStorage.getItem(alertCacheKey(ownerKey));
    if (raw === null) return null;
    const stored = JSON.parse(raw);
    return Array.isArray(stored) ? stored : null;
  } catch {
    return null;
  }
}

function saveCachedAlerts(ownerKey: string, alerts: DealAlert[]) {
  localStorage.setItem(alertCacheKey(ownerKey), JSON.stringify(alerts));
}

export function useDealAlerts() {
  const { user } = useAuth();
  const ownerKey = user?.id ? `account:${user.id}` : getUserSessionToken() ? 'account:pending' : 'browser';
  const initialAlerts = readCachedAlerts(ownerKey);
  const [alerts, setAlerts] = useState<DealAlert[]>(initialAlerts ?? []);
  const [isLoading, setIsLoading] = useState(initialAlerts === null);
  const activeOwnerKey = useRef(ownerKey);
  activeOwnerKey.current = ownerKey;

  const commitAlerts = useCallback((update: (current: DealAlert[]) => DealAlert[]) => {
    setAlerts((current) => {
      const updated = update(current);
      saveCachedAlerts(ownerKey, updated);
      return updated;
    });
  }, [ownerKey]);

  const refresh = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const freshAlerts = await getDealAlerts();
      if (activeOwnerKey.current !== ownerKey) return;
      setAlerts(freshAlerts);
      saveCachedAlerts(ownerKey, freshAlerts);
    } finally {
      if (activeOwnerKey.current === ownerKey) setIsLoading(false);
    }
  }, [ownerKey]);

  useEffect(() => {
    const cachedAlerts = readCachedAlerts(ownerKey);
    setAlerts(cachedAlerts ?? []);
    refresh(cachedAlerts === null).catch((error) => console.error('Failed to load deal alerts:', error));
  }, [ownerKey, refresh]);

  const create = async (input: CreateDealAlertInput) => {
    const alert = await createDealAlert(input);
    await refresh(false);
    return alert;
  };

  const setActive = async (alert: DealAlert, active: boolean) => {
    const updated = await updateDealAlert(alert._id, { active });
    commitAlerts((current) => current.map((item) => item._id === updated._id
      ? { ...updated, deal: item.deal }
      : item));
  };

  const remove = async (alert: DealAlert) => {
    await deleteDealAlert(alert._id);
    commitAlerts((current) => current.filter((item) => item._id !== alert._id));
  };

  return { alerts, isLoading, create, setActive, remove };
}
