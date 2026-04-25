import { useEffect, useState, useCallback } from 'react';
import { useSocket as useSocketContext } from '../context/SocketContext';

export function useSocketEvent(event, handler, deps = []) {
  const { socket, connected } = useSocketContext() || { socket: null, connected: false };
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!socket || !connected || !event) return () => {};

    const handleEvent = (eventData) => {
      setData(eventData);
      if (handler) handler(eventData);
    };

    socket.on(event, handleEvent);

    return () => {
      socket.off(event, handleEvent);
    };
  }, [socket, connected, event, ...deps]);

  return { data, connected };
}

export function useSocketSubscription() {
  const { socket, connected } = useSocketContext() || { socket: null, connected: false };

  const subscribe = useCallback((event, handler) => {
    if (!socket || !connected) return () => {};

    socket.on(event, handler);

    return () => {
      socket.off(event, handler);
    };
  }, [socket, connected]);

  return { subscribe, connected };
}

export function useDeliveryEvents(onSuccess, onFailed) {
  const { socket, connected } = useSocketContext() || { socket: null, connected: false };

  useEffect(() => {
    if (!socket || !connected) return () => {};

    const handleSuccess = (data) => {
      if (onSuccess) onSuccess(data);
    };

    const handleFailed = (data) => {
      if (onFailed) onFailed(data);
    };

    socket.on('delivery:success', handleSuccess);
    socket.on('delivery:failed', handleFailed);

    return () => {
      socket.off('delivery:success', handleSuccess);
      socket.off('delivery:failed', handleFailed);
    };
  }, [socket, connected, onSuccess, onFailed]);
}

export function useJobEvents(onCompleted, onFailed) {
  const { socket, connected } = useSocketContext() || { socket: null, connected: false };

  useEffect(() => {
    if (!socket || !connected) return () => {};

    const handleCompleted = (data) => {
      if (onCompleted) onCompleted(data);
    };

    const handleFailed = (data) => {
      if (onFailed) onFailed(data);
    };

    socket.on('job:completed', handleCompleted);
    socket.on('job:failed', handleFailed);

    return () => {
      socket.off('job:completed', handleCompleted);
      socket.off('job:failed', handleFailed);
    };
  }, [socket, connected, onCompleted, onFailed]);
}