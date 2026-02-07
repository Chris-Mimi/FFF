import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { User } from '@supabase/supabase-js';

/**
 * Verify the caller is an authenticated user.
 * Returns the user or a 401 response.
 */
export async function requireAuth(request: NextRequest): Promise<User | NextResponse> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const accessToken = authHeader.replace('Bearer ', '');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  return user;
}

/**
 * Verify the caller is an authenticated coach.
 * Returns the user or a 401/403 response.
 */
export async function requireCoach(request: NextRequest): Promise<User | NextResponse> {
  const result = await requireAuth(request);

  if (result instanceof NextResponse) {
    return result;
  }

  const user = result;
  const role = user.user_metadata?.role;

  if (role !== 'coach') {
    return NextResponse.json(
      { error: 'Coach access required' },
      { status: 403 }
    );
  }

  return user;
}

/**
 * Type guard to check if requireAuth/requireCoach returned an error response
 */
export function isAuthError(result: User | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
