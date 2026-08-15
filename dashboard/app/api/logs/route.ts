import { NextRequest, NextResponse } from 'next/server'
import { getAuthHeaders, getAgentUrl } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '50'
    const type = searchParams.get('type') || ''
    const status = searchParams.get('status') || ''

    const params = new URLSearchParams({ limit })
    if (type) params.append('type', type)
    if (status) params.append('status', status)

    const headers = await getAuthHeaders()
    const agentUrl = getAgentUrl()

    const response = await fetch(`${agentUrl}/logs?${params.toString()}`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `Agent error: ${errorText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Logs API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch logs' },
      { status: 500 }
    )
  }
}
