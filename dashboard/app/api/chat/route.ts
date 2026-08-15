import { NextRequest, NextResponse } from 'next/server'
import { getAuthHeaders, getAgentUrl } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, session_id } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const headers = await getAuthHeaders()
    const agentUrl = getAgentUrl()

    const response = await fetch(`${agentUrl}/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message,
        session_id: session_id || `dashboard-${Date.now()}`,
      }),
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
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to communicate with agent' },
      { status: 500 }
    )
  }
}
