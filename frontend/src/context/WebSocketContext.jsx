import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

const WebSocketContext = createContext(null);

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef(null);
    const listenersRef = useRef({});

    const connect = () => {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Dynamically get the host (including port) and adjust if needed
        let host = window.location.host;

        // If the frontend is on 5173 (Vite) and backend is on 8000
        if (host.includes('5173')) {
            host = host.replace('5173', '8000');
        }

        const wsUrl = `${wsProtocol}//${host}/ws/updates/`;

        socketRef.current = new WebSocket(wsUrl);

        socketRef.current.onopen = () => {
            console.log('🚀 WebSocket Connected');
            setIsConnected(true);
        };

        socketRef.current.onmessage = (event) => {
            const message = JSON.parse(event.data);
            const { type, data } = message;

            // Dispatch to all listeners for this type
            if (listenersRef.current[type]) {
                listenersRef.current[type].forEach(callback => callback(data));
            }
        };

        socketRef.current.onclose = () => {
            console.log('🔌 WebSocket Disconnected. Retrying in 3s...');
            setIsConnected(false);
            setTimeout(connect, 3000); // Simple auto-reconnect
        };

        socketRef.current.onerror = (err) => {
            console.error('❌ WebSocket Error:', err);
            socketRef.current.close();
        };
    };

    useEffect(() => {
        connect();
        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, []);

    const subscribe = (type, callback) => {
        if (!listenersRef.current[type]) {
            listenersRef.current[type] = [];
        }
        listenersRef.current[type].push(callback);
        return () => {
            listenersRef.current[type] = listenersRef.current[type].filter(cb => cb !== callback);
        };
    };

    return (
        <WebSocketContext.Provider value={{ isConnected, subscribe }}>
            {children}
        </WebSocketContext.Provider>
    );
};
