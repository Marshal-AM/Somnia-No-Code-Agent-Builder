import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_query } = body

    if (!user_query) {
      return NextResponse.json(
        { error: 'user_query is required' },
        { status: 400 }
      )
    }

    // Make request to external workflow builder API
    const response = await fetch(
      'https://workflowbuilder-739298578243.us-central1.run.app/create-workflow',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_query,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `External API error: ${response.status}`, details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error in create-workflow API route:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

