import { NextResponse } from 'next/server';
import { getAuthHeaders, getAgentUrl } from '@/lib/auth';

export async function GET() {
  try {
    const headers = await getAuthHeaders();
    const agentUrl = getAgentUrl();

    const response = await fetch(agentUrl, {
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { 
          status: 'offline',
          error: 'Agent not responding',
          service: 'NebulaSEO SEO Agent',
          version: 'unknown'
        },
        { status: 503 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { 
        status: 'offline',
        error: 'Failed to connect to agent',
        service: 'NebulaSEO SEO Agent',
        version: 'unknown'
      },
      { status: 503 }
    );
  }
}
