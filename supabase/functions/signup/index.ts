import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { password } = await req.json();
    console.log('Signup request received');

    if (!password || password.length < 6) {
      console.log('Password validation failed');
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique email using a valid domain
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const email = `dani_${timestamp}_${random}@example.com`;
    console.log('Generated email:', email);

    // Create client with anon key for standard signup
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    console.log('Creating user account...');
    // Use standard signUp - it will trigger the database triggers automatically
    const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: email.split('@')[0],
        },
        emailRedirectTo: undefined, // Don't send confirmation email
      }
    });

    if (signUpError) {
      console.error('Signup error:', signUpError);
      return new Response(
        JSON.stringify({ error: signUpError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User created, attempting to sign in...');

    // Try to sign in immediately
    const { data: sessionData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    // If sign in fails due to unconfirmed email, use service role to confirm
    if (signInError && signInError.message.includes('Email not confirmed')) {
      console.log('Email not confirmed, using database direct update...');
      
      // Use service role to update the user's email confirmation
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Update user via SQL to confirm email
      const { error: updateError } = await supabaseAdmin.rpc('confirm_user_email', { 
        user_email: email 
      });

      if (updateError) {
        console.error('Email confirmation error:', updateError);
      }

      // Try signing in again
      const { data: retrySessionData, error: retrySignInError } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (retrySignInError) {
        console.error('Retry sign in error:', retrySignInError);
        return new Response(
          JSON.stringify({ error: 'Account created. Please try logging in again.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Signup completed successfully after confirmation');
      return new Response(
        JSON.stringify({
          session: retrySessionData.session,
          user: retrySessionData.user
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (signInError) {
      console.error('Sign in error:', signInError);
      return new Response(
        JSON.stringify({ error: 'Account created. Please try logging in again.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Signup completed successfully');
    return new Response(
      JSON.stringify({
        session: sessionData.session,
        user: sessionData.user
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Unexpected signup error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create account' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
