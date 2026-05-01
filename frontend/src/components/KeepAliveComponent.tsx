'use client';

import { useEffect } from 'react';

/**
 * KeepAlive Component
 * 
 * Automatically pings backend services every 10 minutes to prevent
 * Render.com free tier cold starts (services sleep after 15 min idle).
 * 
 * This component renders nothing (invisible) but runs in the background
 * when users have the app open.
 * 
 * Note: This only works when users are active. For 24/7 uptime,
 * use an external cron service like UptimeRobot (see FIX_COLD_START_GUIDE.md)
 */
export default function KeepAliveComponent() {
  useEffect(() => {
    // Only run in browser (not during SSR)
    if (typeof window === 'undefined') return;

    // Ping keep-alive endpoint every 10 minutes
    const PING_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds

    const pingServices = async () => {
      try {
        const response = await fetch('/api/keep-alive', {
          method: 'GET',
          cache: 'no-store',
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('🏓 Keep-alive ping successful:', data.message || 'Services pinged');
        } else {
          console.warn('⚠️ Keep-alive ping returned error:', response.status);
        }
      } catch (error) {
        // Silently fail - don't disrupt user experience
        console.error('❌ Keep-alive ping failed:', error);
      }
    };

    // Initial ping on component mount (when user opens app)
    console.log('🚀 KeepAlive component mounted - starting service ping');
    pingServices();

    // Set up interval for regular pings
    const intervalId = setInterval(pingServices, PING_INTERVAL);

    // Cleanup: Stop pinging when component unmounts (user closes app)
    return () => {
      console.log('🛑 KeepAlive component unmounted - stopping service ping');
      clearInterval(intervalId);
    };
  }, []);

  // This component is invisible - it just runs the effect
  return null;
}
