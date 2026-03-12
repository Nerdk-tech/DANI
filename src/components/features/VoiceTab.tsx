import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Square, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';
import AnimatedOrb from './AnimatedOrb';

export default function VoiceTab() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [browserSupport, setBrowserSupport] = useState(true);
  const [emotion, setEmotion] = useState<string>('neutral');
  const [conversationContext, setConversationContext] = useState<Array<{role: string, content: string}>>([]);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    // Check browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition || !window.speechSynthesis) {
      setBrowserSupport(false);
      return;
    }

    // Initialize speech recognition
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      setTranscript(finalTranscript || interimTranscript);
      
      // Process final result
      if (finalTranscript) {
        console.log('Final transcript:', finalTranscript);
        handleVoiceInput(finalTranscript);
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    synthRef.current = window.speechSynthesis;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const handleVoiceInput = async (text: string) => {
    if (!text || !text.trim()) {
      setIsProcessing(false);
      return;
    }
    
    setIsProcessing(true);
    console.log('Voice input received:', text);
    
    // Check for voice commands
    const lowerText = text.toLowerCase();
    
    // Navigation commands
    if (lowerText.includes('switch to chat') || lowerText.includes('open chat')) {
      speakTextWithAPI("Switching to chat tab!");
      setTimeout(() => {
        // Trigger tab change - you'll need to pass this down from parent
        window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'chat' }));
      }, 1500);
      setIsProcessing(false);
      return;
    }
    
    if (lowerText.includes('switch to image') || lowerText.includes('open image')) {
      speakTextWithAPI("Switching to image generation!");
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'image' }));
      }, 1500);
      setIsProcessing(false);
      return;
    }
    
    // Image generation command
    if (lowerText.includes('generate image') || lowerText.includes('create image')) {
      const imagePrompt = text.replace(/generate image (of|about)?/i, '').replace(/create image (of|about)?/i, '').trim();
      if (imagePrompt) {
        speakTextWithAPI(`Creating an image of ${imagePrompt}. This will take a moment!`);
        window.dispatchEvent(new CustomEvent('generate-image', { detail: imagePrompt }));
        setIsProcessing(false);
        return;
      }
    }
    
    // History command
    if (lowerText.includes('show history') || lowerText.includes('my history')) {
      speakTextWithAPI("Opening your chat history!");
      window.dispatchEvent(new CustomEvent('show-history'));
      setIsProcessing(false);
      return;
    }
    
    // New chat command
    if (lowerText.includes('new chat') || lowerText.includes('start new conversation')) {
      speakTextWithAPI("Starting a new conversation!");
      window.dispatchEvent(new CustomEvent('new-chat'));
      setIsProcessing(false);
      return;
    }
    
    try {
      // Add user message to conversation context
      const updatedContext = [...conversationContext, { role: 'user', content: text }];
      setConversationContext(updatedContext);
      
      // Call AI chat API with full conversation context
      const { data, error } = await supabase.functions.invoke('chat-ai', {
        body: {
          messages: updatedContext,
          conversationId: null
        }
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
          } catch {
            errorMessage = `${error.message || 'Failed to read response'}`;
          }
        }
        throw new Error(errorMessage);
      }

      const aiResponse = data.message;
      const detectedEmotion = data.emotion || 'neutral';
      
      console.log('AI response:', aiResponse, 'Emotion:', detectedEmotion);
      
      // Update emotion and conversation context
      setEmotion(detectedEmotion);
      setConversationContext([...updatedContext, { role: 'assistant', content: aiResponse }]);
      
      setResponse(aiResponse);
      setIsProcessing(false);
      
      // Speak the response with adaptive cadence based on emotion
      await speakTextWithAPI(aiResponse, detectedEmotion);
    } catch (error) {
      console.error('Error:', error);
      const errorResponse = "Sorry, I had trouble processing that. Please try again! 💕";
      setResponse(errorResponse);
      setIsProcessing(false);
      await speakTextWithAPI(errorResponse);
    }
  };

  const speakTextWithAPI = async (text: string, emotionContext: string = 'neutral') => {
    // Adaptive cadence based on emotion
    const speedMultipliers: Record<string, number> = {
      happy: 1.08,
      excited: 1.12,
      sad: 0.95,
      anxious: 1.02,
      angry: 1.05,
      neutral: 1.05
    };
    
    const playbackSpeed = speedMultipliers[emotionContext] || 1.05;
    try {
      setIsSpeaking(true);
      
      console.log('Generating speech for:', text.substring(0, 50));
      
      // Call ElevenLabs TTS Edge Function with faster processing
      const { data, error } = await supabase.functions.invoke('tts-elevenlabs', {
        body: { text }
      });

      if (error) {
        console.error('TTS Error:', error);
        throw error;
      }
      
      // The response is the audio blob - play immediately
      const audioUrl = URL.createObjectURL(data);
      
      const audio = new Audio(audioUrl);
      audio.playbackRate = playbackSpeed; // Adaptive playback based on emotion
      
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      // Start playing immediately
      await audio.play();
      console.log('Audio started playing');
    } catch (error) {
      console.error('TTS Error:', error);
      setIsSpeaking(false);
      // Fallback to browser TTS
      speakTextFallback(text);
    }
  };

  const speakTextFallback = (text: string) => {
    if (!synthRef.current) return;

    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.2;
    utterance.volume = 1;
    
    const voices = synthRef.current.getVoices();
    const femaleVoice = voices.find(voice => 
      voice.name.includes('Female') || 
      voice.name.includes('Samantha') || 
      voice.name.includes('Victoria') ||
      voice.name.includes('Karen')
    ) || voices.find(voice => voice.lang === 'en-US');
    
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    
    synthRef.current.speak(utterance);
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      // Stop any ongoing speech
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      setIsSpeaking(false);
      setTranscript('');
      setResponse('');
      setIsProcessing(false);
      
      try {
        recognitionRef.current.start();
        setIsListening(true);
        console.log('Started listening...');
      } catch (error) {
        console.error('Error starting recognition:', error);
      }
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  if (!browserSupport) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="glass rounded-3xl p-12 border-2 border-white/30 text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-br from-pink-200 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <MicOff className="w-10 h-10 text-purple-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-700 mb-3">Voice Not Supported</h3>
          <p className="text-gray-600">
            Your browser doesn't support voice features. Please use Chrome, Edge, or Safari for the best experience.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="glass rounded-3xl p-8 md:p-12 border-2 border-white/30 text-center">
          {/* Advanced Animated Orb Visualizer - Like Siri */}
          <div className="mb-8 flex justify-center">
            <AnimatedOrb 
              isListening={isListening}
              isSpeaking={isSpeaking}
              isProcessing={isProcessing}
            />
          </div>
          
          {/* Emotion Indicator */}
          {emotion !== 'neutral' && (
            <div className="mb-4 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium text-gray-600 capitalize">
                Emotion detected: {emotion}
              </span>
            </div>
          )}

          {/* Status */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : isProcessing ? 'Thinking...' : 'Voice Conversation'}
            </h2>
            <p className="text-gray-600">
              {isListening ? 'Say something to DANI' : isSpeaking ? 'DANI is responding' : 'Click the microphone to start talking'}
            </p>
          </div>

          {/* Transcript and Response */}
          {(transcript || response) && (
            <div className="mb-6 space-y-4">
              {transcript && (
                <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl p-4 text-left">
                  <p className="text-sm font-semibold mb-1">You said:</p>
                  <p className="text-base">{transcript}</p>
                </div>
              )}
              {response && (
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 text-left border border-pink-200">
                  <p className="text-sm font-semibold text-gray-600 mb-1">DANI:</p>
                  <p className="text-base text-gray-800">{response}</p>
                </div>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={toggleListening}
              disabled={isSpeaking || isProcessing}
              className={`px-8 py-4 rounded-full font-semibold text-white transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                isListening
                  ? 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700'
                  : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700'
              }`}
            >
              {isListening ? (
                <>
                  <Square className="w-5 h-5 inline mr-2" />
                  Stop Listening
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 inline mr-2" />
                  Start Talking
                </>
              )}
            </button>

            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="px-8 py-4 bg-gray-600 text-white rounded-full font-semibold hover:bg-gray-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <VolumeX className="w-5 h-5 inline mr-2" />
                Stop Speaking
              </button>
            )}
          </div>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-500">
              Speak naturally and I'll respond with emotional intelligence 💕
            </p>
            {conversationContext.length > 0 && (
              <p className="text-xs text-gray-400">
                Conversation memory: {conversationContext.length} messages
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
