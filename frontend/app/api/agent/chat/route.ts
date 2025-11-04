import { NextResponse } from 'next/server'
import { getAgentByApiKey } from '@/lib/agents'
import { supabase } from '@/lib/supabase'

const EXTERNAL_AGENT_API_URL = 'https://somniaagent-739298578243.us-central1.run.app/agent/chat'

export async function POST(request: Request) {
  try {
    const { api_key, user_message } = await request.json()

    if (!api_key || !user_message) {
      return NextResponse.json(
        { error: 'Missing api_key or user_message in request body' },
        { status: 400 }
      )
    }

    // Fetch agent by API key
    const agent = await getAgentByApiKey(api_key)
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Fetch owner's private_key using agent.user_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('private_key')
      .eq('id', agent.user_id)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found or error fetching user' },
        { status: 404 }
      )
    }

    if (!user.private_key) {
      return NextResponse.json(
        { error: 'Agent owner has no private key configured. Please contact the agent owner.' },
        { status: 400 }
      )
    }

    // Prepare request body
    const requestBody = {
      tools: agent.tools,
      user_message: user_message,
      private_key: user.private_key,
    }

    // Make request to external API
    const response = await fetch(EXTERNAL_AGENT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown external API error' }))
      console.error('External Agent API error:', response.status, errorData)
      return NextResponse.json(
        { error: errorData.message || `External Agent API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error in agent chat API route:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

