import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

export function useFamilies(params?: Record<string, string>) {
  const [families, setFamilies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getFamilies(params);
      setFamilies(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => { fetch(); }, [fetch]);

  return { families, loading, error, refetch: fetch };
}
