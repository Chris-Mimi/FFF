import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { requireCoach, isAuthError } from '@/lib/auth-api';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Admin client for RLS bypass
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// GET /api/whiteboard-photos?week=2026-W03
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const week = searchParams.get('week');

    let query = supabaseAdmin
      .from('whiteboard_photos')
      .select('id, workout_week, photo_label, photo_url, caption, display_order, created_at')
      .order('photo_label', { ascending: true });

    if (week) {
      query = query.eq('workout_week', week);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching whiteboard photos:', error);
      return NextResponse.json({ error: 'Failed to fetch whiteboard photos' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/whiteboard-photos
export async function POST(request: NextRequest) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const body = await request.json();
    const { workout_week, photo_label, photo_url, storage_path, caption, uploaded_by, display_order } = body;

    // Validate required fields
    if (!workout_week || !photo_label || !photo_url || !storage_path) {
      return NextResponse.json(
        { error: 'Missing required fields: workout_week, photo_label, photo_url, storage_path' },
        { status: 400 }
      );
    }

    // Verify user exists in auth.users if uploaded_by is provided
    let validatedUploadedBy = null;
    if (uploaded_by) {
      const { data: userExists } = await supabaseAdmin.auth.admin.getUserById(uploaded_by);
      if (userExists.user) {
        validatedUploadedBy = uploaded_by;
      } else {
        console.warn('API: User not found in auth.users, setting uploaded_by to NULL');
      }
    }

    const { data, error } = await supabaseAdmin
      .from('whiteboard_photos')
      .insert({
        workout_week,
        photo_label,
        photo_url,
        storage_path,
        caption: caption || null,
        uploaded_by: validatedUploadedBy,
        display_order: display_order || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating whiteboard photo:', error);
      return NextResponse.json({ error: 'Failed to create whiteboard photo' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/whiteboard-photos/:id (handled via query param)
export async function PATCH(request: NextRequest) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Photo ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { caption, display_order, photo_label } = body;

    const updates: Record<string, unknown> = {};
    if (caption !== undefined) updates.caption = caption;
    if (display_order !== undefined) updates.display_order = display_order;
    if (photo_label !== undefined) updates.photo_label = photo_label;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('whiteboard_photos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating whiteboard photo:', error);
      return NextResponse.json({ error: 'Failed to update whiteboard photo' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/whiteboard-photos?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Photo ID required' }, { status: 400 });
    }

    // Get photo details first (for storage deletion)
    const { data: photo, error: fetchError } = await supabaseAdmin
      .from('whiteboard_photos')
      .select('storage_path')
      .eq('id', id)
      .single();

    if (fetchError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Delete from storage
    const { error: storageError } = await supabaseAdmin.storage
      .from('whiteboard-photos')
      .remove([photo.storage_path]);

    if (storageError) {
      console.error('Error deleting from storage:', storageError);
      // Continue with database deletion even if storage fails
    }

    // Delete from database
    const { error: deleteError } = await supabaseAdmin
      .from('whiteboard_photos')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting whiteboard photo:', deleteError);
      return NextResponse.json({ error: 'Failed to delete whiteboard photo' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
