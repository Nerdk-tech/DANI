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
    
    // Use service role to create and auto-confirm user via SQL
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // First check if user already exists
    const { data: existingUsers } = await supabaseAdmin
      .from('auth.users')
      .select('email')
      .eq('email', email)
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      console.log('User already exists, attempting to sign in...');
      const { data: existingSession, error: existingSignInError } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (!existingSignInError && existingSession) {
        return new Response(
          JSON.stringify({
            session: existingSession.session,
            user: existingSession.user
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create new user with standard signup
    const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: email.split('@')[0],
        }
      }
    });

    if (signUpError) {
      console.error('Signup error:', signUpError);
      return new Response(
        JSON.stringify({ error: signUpError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User created, auto-confirming email via SQL...');
    
    // Use service role to confirm email directly via SQL
    const { error: confirmError } = await supabaseAdmin.rpc('confirm_user_email', { 
      user_email: email 
    });

    if (confirmError) {
      console.error('Email confirmation error:', confirmError);
      // Continue anyway, try to sign in
    } else {
      console.log('Email confirmed successfully');
    }

    // Wait a moment for the confirmation to process
    await new Promise(resolve => setTimeout(resolve, 200));

    // Now sign in with the confirmed account
    console.log('Signing in with confirmed account...');
    const { data: sessionData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      console.error('Sign in error:', signInError);
      return new Response(
        JSON.stringify({ error: 'Account created but unable to sign in automatically. Please refresh the page.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Signup and sign-in completed successfully');
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
