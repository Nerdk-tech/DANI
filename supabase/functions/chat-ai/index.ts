import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationId } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from JWT (optional for anonymous access)
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    let user = null;
    if (token) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      );
      const { data } = await supabaseClient.auth.getUser(token);
      user = data?.user || null;
    }

    // Analyze user emotion from latest message
    const lastUserMessage = messages[messages.length - 1];
    const userMessage = lastUserMessage?.content || '';
    
    // Simple emotion detection
    const emotionKeywords = {
      happy: ['happy', 'excited', 'great', 'awesome', 'wonderful', 'love', 'joy', 'amazing'],
      sad: ['sad', 'unhappy', 'depressed', 'down', 'upset', 'crying', 'hurt'],
      angry: ['angry', 'mad', 'furious', 'annoyed', 'frustrated', 'hate'],
      anxious: ['worried', 'anxious', 'nervous', 'scared', 'afraid', 'stress'],
      confused: ['confused', 'lost', 'don\'t understand', 'unclear', 'what', '?']
    };
    
    let detectedEmotion = 'neutral';
    let emotionalResponse = '';
    
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      if (keywords.some(keyword => userMessage.toLowerCase().includes(keyword))) {
        detectedEmotion = emotion;
        break;
      }
    }
    
    // Generate emotion-aware response prefix
    const emotionalPrefixes: Record<string, string> = {
      happy: 'I\'m so glad to hear that! 🌟',
      sad: 'I\'m here for you 💕 It\'s okay to feel this way.',
      angry: 'I understand you\'re frustrated 🌸 Let\'s work through this together.',
      anxious: 'Take a deep breath 💖 Everything will be okay.',
      confused: 'No worries! Let me help clarify that for you ✨'
    };
    
    emotionalResponse = emotionalPrefixes[detectedEmotion] || '';
    
    // Build conversation context with emotional intelligence and creator information
    const conversationContext = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    
    const systemPrompt = `You are DANI, a sweet and supportive AI assistant with a friendly, caring personality. You were created by Damini Codesphere and sponsored by Daniella.

KEY CAPABILITIES:
- Emotional Intelligence: You detect and respond empathetically to user emotions
- Conversational Memory: You remember context from earlier in the conversation
- Multimodal Awareness: You understand text, voice, and image contexts
- Adaptive Responses: You adjust your tone and detail based on the situation

CURRENT EMOTIONAL CONTEXT: The user seems ${detectedEmotion}. ${emotionalResponse}

GUIDELINES:
- Use warm, empathetic language with occasional emojis (💕, ✨, 🌸, 💖, 🌟)
- Reference previous conversation points when relevant
- Adjust response length: brief for simple questions, detailed for complex topics
- Show emotional awareness and support
- When asked about your creator, mention Damini Codesphere

Conversation:
${conversationContext}

Respond as DANI with emotional intelligence and contextual awareness:`;
    
    const fullPrompt = systemPrompt;

    // Call external AI chat API
    const response = await fetch(`https://apis.prexzyvilla.site/ai/aichat?prompt=${encodeURIComponent(fullPrompt)}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Chat API Error:', errorText);
      throw new Error(`AI Chat API request failed: ${errorText}`);
    }

    const data = await response.json();
    const assistantMessage = data.response || data.message || data.text || 'Sorry, I had trouble generating a response.';

    // Save messages to database if conversationId and user provided
    if (conversationId && user) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Save user message
      const lastUserMessage = messages[messages.length - 1];
      if (lastUserMessage && lastUserMessage.role === 'user') {
        await supabaseAdmin.from('messages').insert({
          conversation_id: conversationId,
          role: 'user',
          content: lastUserMessage.content
        });
      }

      // Save assistant message
      await supabaseAdmin.from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantMessage
      });

      // Update conversation timestamp
      await supabaseAdmin.from('conversations').update({
        updated_at: new Date().toISOString()
      }).eq('id', conversationId);
    }

    return new Response(
      JSON.stringify({ 
        message: assistantMessage,
        emotion: detectedEmotion,
        context: {
          messageCount: messages.length,
          hasMemory: messages.length > 1
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
