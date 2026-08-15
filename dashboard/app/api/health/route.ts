import { NextResponse } from 'next/server'
import { getAuthHeaders, getAgentUrl } from '@/lib/auth'

export async function GET() {
  try {
    const headers = await getAuthHeaders()
    const agentUrl = getAgentUrl()

    // Check agent health
    const agentResponse = await fetch(`${agentUrl}/health`, {
      method: 'GET',
      headers,
    })
    
    const agentHealth = await agentResponse.json()
    
    return NextResponse.json({
      status: 'healthy',
      dashboard: 'online',
      agent: agentHealth,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      status: 'degraded',
      dashboard: 'online',
      agent: 'unreachable',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 503 })
  }
}
