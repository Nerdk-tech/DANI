import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Plus, History, Trash2, Volume2, Heart, Frown, Smile, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import type { Message } from '@/types';

// 🖼️ Image helpers
const isImagePrompt = (text: string) => {
  const lower = text.toLowerCase();
  return lower.includes('draw') || lower.includes('image') || lower.includes('generate');
};

const formatImageApiUrl = (prompt: string) => {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
};

export default function ChatTab() {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const { messages, setMessages } = useMessages(currentConversationId);
  const { conversations, createConversation, deleteConversation } = useConversations();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<string>('neutral');
  const [messageCount, setMessageCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
    setUserId(user?.id || null);
    
    if (messages.length === 0) {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: "Hi! I'm DANI, your sweet and supportive AI assistant! 💕 How can I help you today?",
        timestamp: new Date()
      }]);
    }
  };

  const speakText = async (text: string) => {
    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      setIsSpeaking(true);
      const { data, error } = await supabase.functions.invoke('tts-elevenlabs', {
        body: { text }
      });
      if (error) throw error;
      const audioUrl = URL.createObjectURL(data);
      const audio = new Audio(audioUrl);
      audio.playbackRate = 1.05;
      currentAudioRef.current = audio;
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      await audio.play();
    } catch (error) {
      console.error('TTS Error:', error);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      setIsSpeaking(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const startNewConversation = async () => {
    if (!isAuthenticated) {
      setCurrentConversationId(null);
      setMessages([{
        id: '1', role: 'assistant', content: "Hi! I'm DANI! 💕", timestamp: new Date()
      }]);
      return;
    }
    const title = `Chat ${new Date().toLocaleDateString()}`;
    const conversation = await createConversation(title);
    setCurrentConversationId(conversation.id);
  };

  const loadConversation = (id: string) => {
    setCurrentConversationId(id);
    setShowHistory(false);
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this conversation?')) {
      await deleteConversation(id);
      if (currentConversationId === id) setCurrentConversationId(null);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userInput = input;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    if (isImagePrompt(userInput)) {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        type: 'image',
        content: formatImageApiUrl(userInput),
        prompt: userInput,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
      return;
    }

    try {
      const messageHistory = [...messages, userMessage].map(msg => ({
        role: msg.role, content: msg.content
      }));
      const { data, error } = await supabase.functions.invoke('chat-ai', {
        body: { messages: messageHistory, conversationId: currentConversationId }
      });
      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      };
      if (data.emotion) setCurrentEmotion(data.emotion);
      setMessages(prev => [...prev, assistantMessage]);
      speakText(data.message);
    } catch (error) {
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex max-w-7xl mx-auto w-full h-full overflow-hidden">
      {/* History Sidebar */}
      {isAuthenticated && showHistory && (
        <div className="w-80 border-r border-white/20 glass p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">Chat History</h3>
            <button onClick={() => setShowHistory(false)}>✕</button>
          </div>
          <button onClick={startNewConversation} className="w-full mb-4 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> New Chat
          </button>
          <div className="space-y-2">
            {conversations.map(conv => (
              <div key={conv.id} onClick={() => loadConversation(conv.id)} className={`p-3 rounded-lg cursor-pointer flex items-center justify-between ${currentConversationId === conv.id ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white' : 'bg-white/60 hover:bg-white/80'}`}>
                <div className="flex-1 truncate">
                  <p className="font-medium truncate">{conv.title}</p>
                </div>
                <button onClick={(e) => handleDeleteConversation(conv.id, e)} className="p-1 hover:bg-white/20 rounded"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        {isAuthenticated && (
          <div className="flex gap-2 mb-4">
            <button onClick={() => setShowHistory(!showHistory)} className="px-4 py-2 glass rounded-lg flex items-center gap-2"><History className="w-4 h-4" /> History</button>
            <button onClick={startNewConversation} className="px-4 py-2 glass rounded-lg flex items-center gap-2"><Plus className="w-4 h-4" /> New Chat</button>
          </div>
        )}

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div className={`max-w-[85%] rounded-2xl px-6 py-3 transition-all ${message.role === 'user' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg' : 'glass border-2 border-white/30 text-gray-800 shadow-md'}`}>
                {message.type === 'image' ? (
                  <div className="space-y-2">
                    <img src={message.content} alt="Generated" className="rounded-xl max-w-full h-auto shadow-inner" />
                    <p className="text-[10px] opacity-70 italic">✨ {message.prompt}</p>
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    <p className={`text-[10px] mt-1 opacity-60 text-right`}>
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="glass border-2 border-white/30 rounded-2xl px-6 py-3">
                <div className="flex gap-2 items-center">
                  <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Emotion & Input */}
        <div className="mt-auto">
          {currentEmotion !== 'neutral' && (
            <div className="mb-3 glass rounded-2xl px-4 py-2 border border-white/30 flex items-center gap-3">
              {currentEmotion === 'happy' && <Smile className="w-5 h-5 text-yellow-500" />}
              <span className="text-sm text-gray-600">I sense you're feeling <span className="font-semibold capitalize">{currentEmotion}</span></span>
              <Heart className="w-4 h-4 text-pink-500 ml-auto" />
            </div>
          )}
          
          <div className="glass rounded-3xl p-2 border-2 border-white/30 shadow-lg flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-4">
              <Sparkles className="w-5 h-5 text-pink-500" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Message DANI..."
                className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder-gray-400"
              />
            </div>
            <button onClick={handleSend} disabled={!input.trim()} className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl transition-all disabled:opacity-50">
              <Send className="w-5 h-5" />
            </button>
            {isSpeaking && (
              <button onClick={stopSpeaking} className="px-4 py-3 bg-purple-600 text-white rounded-2xl animate-pulse">
                <Volume2 className="w-5 h-5" />
              </button>
            )}
          </div>
          <p className="text-[10px] text-center text-gray-400 mt-2">DANI can make mistakes. Memory: {messageCount} msgs.</p>
        </div>
      </div>
    </div>
  );
}
