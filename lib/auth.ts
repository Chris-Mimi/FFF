import { supabase } from './supabase';
import { authFetch } from './auth-fetch';
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
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Detach this browser's push registration from the account that is logging out.
 * One browser can be registered under several accounts (family phones), so the
 * browser subscription itself stays — only this account's row goes. Without it a
 * coach who logged in as an athlete keeps receiving that athlete's pushes (S415).
 * Best-effort and capped at 2s so logout never hangs.
 */
async function detachPushSubscription(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const work = (async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;
    await authFetch('/api/notifications/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
  })();
  await Promise.race([work, new Promise(resolve => setTimeout(resolve, 2000))]).catch(err =>
    console.error('Push detach on logout failed:', err)
  );
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  try {
    await detachPushSubscription();
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
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
