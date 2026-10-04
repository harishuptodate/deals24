import { useCallback, useEffect, useState } from 'react';
import {
  createDealAlert,
  deleteDealAlert,
  getDealAlerts,
  updateDealAlert,
  type CreateDealAlertInput,
  type DealAlert,
} from '@/services/api/alertsApi';

export function useDealAlerts() {
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
    refresh().catch((error) => console.error('Failed to load deal alerts:', error));
  }, [refresh]);

  const create = async (input: CreateDealAlertInput) => {
    const alert = await createDealAlert(input);
    setAlerts((current) => [alert, ...current.filter((item) => item._id !== alert._id)]);
    return alert;
  };

  const setActive = async (alert: DealAlert, active: boolean) => {
    const updated = await updateDealAlert(alert._id, { active });
    setAlerts((current) => current.map((item) => item._id === updated._id ? updated : item));
  };

  const remove = async (alert: DealAlert) => {
    await deleteDealAlert(alert._id);
    setAlerts((current) => current.filter((item) => item._id !== alert._id));
  };

  return { alerts, isLoading, create, setActive, remove };
}
