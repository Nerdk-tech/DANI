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

    // Generate unique ID
    const randomNum = Math.floor(Math.random() * 9000000) + 1000000;
    const userId = `#${randomNum}`;
    const email = `${userId}@dani.app`;
    console.log('Generated user ID:', userId);

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Creating user with admin API...');
    // Create user with admin API - completely bypass email confirmation
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm - no email sent
      user_metadata: {
        username: userId,
        display_id: userId
      },
      app_metadata: {
        provider: 'email',
        providers: ['email']
      }
    });

    if (createError) {
      console.error('User creation error:', createError);
      // If error is about email sending, ignore it and continue if user was created
      if (createError.message.includes('email') && userData?.user) {
        console.log('Email error ignored, user created successfully');
      } else {
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('User created successfully, generating session...');

    // Generate a session token for the user using admin API
    const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (tokenError) {
      console.error('Token generation error:', tokenError);
      // Fall back to regular sign in
      console.log('Falling back to password sign in...');
      
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      );

      const { data: sessionData, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        console.error('Sign in error:', signInError);
        return new Response(
          JSON.stringify({ error: 'Account created but login failed. Please try logging in manually.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Signup completed successfully');
      return new Response(
        JSON.stringify({
          userId,
          session: sessionData.session,
          user: sessionData.user
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Signup completed successfully with token');
    return new Response(
      JSON.stringify({
        userId,
        user: userData.user
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
