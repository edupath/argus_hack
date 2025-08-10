import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_SERVER_BASE_URL || 'http://localhost:3001';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  console.log('API Route: GET /api/profile/[userId] called with userId:', params.userId);
  console.log('Backend URL:', BACKEND_URL);
  
  try {
    const url = `${BACKEND_URL}/api/profile/${params.userId}`;
    console.log('Fetching from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Backend response status:', response.status);
    const data = await response.json();
    console.log('Backend response data:', data);
    
    if (response.ok) {
      return NextResponse.json(data);
    } else {
      return NextResponse.json(
        { error: data.message || 'Failed to fetch profile' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  console.log('API Route: PUT /api/profile/[userId] called with userId:', params.userId);
  
  try {
    const body = await request.json();
    console.log('PUT request body:', body);
    
    const url = `${BACKEND_URL}/api/profile/${params.userId}`;
    console.log('Sending PUT request to:', url);
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('Backend PUT response status:', response.status);
    const data = await response.json();
    console.log('Backend PUT response data:', data);
    
    if (response.ok) {
      return NextResponse.json(data);
    } else {
      return NextResponse.json(
        { error: data.message || 'Failed to update profile' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 