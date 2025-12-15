// Keep-alive endpoint to ping backend services and prevent Render cold starts
// Set up a free cron service (like cron-job.org) to call this endpoint every 5-10 minutes
// Schedule: 12 PM to 12 AM IST only

import { NextResponse } from 'next/server';

const SERVICES = [
  {
    name: 'auth-service',
    url: 'https://authentication-fwdq.onrender.com/api/v1/auth/health',
  },
  {
    name: 'trade-service',
    url: 'https://trade-service-60gz.onrender.com/api/v1/trades/health',
  },
];

export async function GET() {
  // Check if within active hours (12 PM - 12 AM IST)
  const now = new Date();
  const istHour = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getHours();
  
  // Active hours: 12 (noon) to 23 (11 PM) - i.e., 12 PM to 12 AM
  const isActiveHours = istHour >= 12 && istHour <= 23;
  
  if (!isActiveHours) {
    return NextResponse.json({
      success: true,
      message: 'Outside active hours (12 PM - 12 AM IST). Skipping ping.',
      istHour,
      timestamp: now.toISOString(),
    });
  }

  const results = await Promise.allSettled(
    SERVICES.map(async (service) => {
      const startTime = Date.now();
      try {
        const response = await fetch(service.url, {
          method: 'GET',
          headers: { 'User-Agent': 'KeepAlive-Ping/1.0' },
          cache: 'no-store',
        });
        const latency = Date.now() - startTime;
        
        return {
          name: service.name,
          status: response.ok ? 'online' : 'error',
          statusCode: response.status,
          latency: `${latency}ms`,
        };
      } catch (error) {
        const latency = Date.now() - startTime;
        return {
          name: service.name,
          status: 'offline',
          error: error instanceof Error ? error.message : 'Unknown error',
          latency: `${latency}ms`,
        };
      }
    })
  );

  const serviceStatus = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return {
      name: SERVICES[index].name,
      status: 'error',
      error: 'Promise rejected',
    };
  });

  const allOnline = serviceStatus.every((s) => s.status === 'online');

  return NextResponse.json({
    success: allOnline,
    message: allOnline ? 'All services are online' : 'Some services are offline',
    services: serviceStatus,
    timestamp: now.toISOString(),
    istHour,
  });
}

// Also support POST for cron services that prefer POST
export async function POST() {
  return GET();
}
