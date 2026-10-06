import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '1h'; // 1h, 24h, 10d, 30d

    const now = new Date();
    let startTime = new Date();
    let groupByMinutes = 1;

    if (range === '1h') {
      startTime.setHours(now.getHours() - 1);
      groupByMinutes = 1; // 60 points
    } else if (range === '24h') {
      startTime.setHours(now.getHours() - 24);
      groupByMinutes = 30; // Group by 30 mins (48 points)
    } else if (range === '10d') {
      startTime.setDate(now.getDate() - 10);
      groupByMinutes = 60 * 4; // Group by 4 hours (60 points)
    } else if (range === '30d') {
      startTime.setDate(now.getDate() - 30);
      groupByMinutes = 60 * 12; // Group by 12 hours (60 points)
    }

    // Fetch raw logs from DB
    const logs = await prisma.trafficLog.findMany({
      where: {
        timestamp: { gte: startTime }
      },
      orderBy: { timestamp: 'asc' }
    });

    const bucketDurationMs = groupByMinutes * 60 * 1000;
    const numBuckets = Math.max(1, Math.ceil((now.getTime() - startTime.getTime()) / bucketDurationMs));
    
    // Initialize empty buckets
    const buckets = Array(numBuckets).fill(0);
    
    let totalRequests = 0;

    for (const log of logs) {
      totalRequests += log.requests;
      const bucketIndex = Math.floor((log.timestamp.getTime() - startTime.getTime()) / bucketDurationMs);
      if (bucketIndex >= 0 && bucketIndex < numBuckets) {
        buckets[bucketIndex] += log.requests;
      }
    }

    return NextResponse.json({
      range,
      total: totalRequests,
      data: buckets
    });
  } catch (error) {
    console.error('Error fetching metrics from DB:', error);
    return NextResponse.json({ total: 0, data: [] }, { status: 500 });
  }
}
