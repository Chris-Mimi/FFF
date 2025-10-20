import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';

/**
 * Get the currently authenticated user
 * Returns the user object or null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    console.log('getCurrentUser result:', { user: user?.id, email: user?.email, error });
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

/**
 * Get user's role from their metadata
 * Returns 'coach' or 'athlete'
 */
export async function getUserRole(): Promise<'coach' | 'athlete' | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  // Role is stored in user metadata
  return (user.user_metadata?.role as 'coach' | 'athlete') || 'athlete';
}

/**
 * Check if user is authenticated
 * Throws an error if not authenticated
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string) {
  try {
    console.log('Attempting sign in for:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    console.log('Sign in successful:', {
      userId: data.user?.id,
      email: data.user?.email,
      session: !!data.session,
    });
    return data;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
}

/**
 * Sign up with email, password, and additional metadata
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string,
  role: 'coach' | 'athlete'
) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        },
      },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
}
