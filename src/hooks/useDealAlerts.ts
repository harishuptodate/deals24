import { useCallback, useEffect, useState } from 'react';
import {
  createDealAlert,
  deleteDealAlert,
  getDealAlerts,
  updateDealAlert,
  type CreateDealAlertInput,
  type DealAlert,
} from '@/services/api/alertsApi';
import { useAuth } from '@/contexts/AuthContext';

export function useDealAlerts() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [alerts, setAlerts] = useState<DealAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setAlerts(await getDealAlerts());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthLoading) return;
    refresh().catch((error) => console.error('Failed to load deal alerts:', error));
  }, [refresh, isAuthLoading, user?.id]);

  const create = async (input: CreateDealAlertInput) => {
    const alert = await createDealAlert(input);
    await refresh();
    return alert;
  };

  const setActive = async (alert: DealAlert, active: boolean) => {
    const updated = await updateDealAlert(alert._id, { active });
    setAlerts((current) => current.map((item) => item._id === updated._id
      ? { ...updated, deal: item.deal }
      : item));
  };

  const remove = async (alert: DealAlert) => {
    await deleteDealAlert(alert._id);
    setAlerts((current) => current.filter((item) => item._id !== alert._id));
  };

  return { alerts, isLoading, create, setActive, remove };
}
