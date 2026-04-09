import { useEffect, useRef, useState, useCallback } from 'react';
import { connectWS } from '../api/client';

export function useWebSocket(runId: string | null) {
  const [events, setEvents] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!runId) return;

    setEvents([]);
    setIsDone(false);

    const ws = connectWS(
      runId,
      (data) => {
        if (data.type === 'done') {
          setIsDone(true);
          return;
        }
        if (data.type === 'ping') return;
        setEvents((prev) => [...prev, data]);
      },
      () => setIsConnected(false),
    );

    wsRef.current = ws;
    ws.onopen = () => setIsConnected(true);

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [runId]);

  const clear = useCallback(() => setEvents([]), []);

  return { events, isConnected, isDone, clear };
}
