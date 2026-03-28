import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Plus, History, Trash2, Volume2, Heart, Frown, Smile, Zap, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import type { Message } from '@/types';

// 🖼️ Enhanced Image helpers
const isImagePrompt = (text: string) => {
  const lower = text.toLowerCase();
  return lower.startsWith('draw') || lower.startsWith('generate') || lower.includes('image of');
};

const formatImageApiUrl = (userInput: string) => {
  const cleanPrompt = userInput
    .replace(/^(draw|generate|create|make|show me)\s+(an?|a)\s+(image|picture|photo)\s+of\s+/i, '')
    .replace(/^(draw|generate|image of)\s+/i, '')
    .trim();
    
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=1024&height=1024&nologo=true`;
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

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
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
      if (data.context?.messageCount) setMessageCount(data.context.messageCount);
      
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
            <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-gray-800">✕</button>
          </div>
          <button onClick={startNewConversation} className="w-full mb-4 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg flex items-center justify-center gap-2 font-medium shadow-md">
            <Plus className="w-4 h-4" /> New Chat
          </button>
          <div className="space-y-2">
            {conversations.map(conv => (
              <div key={conv.id} onClick={() => loadConversation(conv.id)} className={`p-3 rounded-lg cursor-pointer flex items-center justify-between transition-all ${currentConversationId === conv.id ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white' : 'bg-white/60 hover:bg-white/80 text-gray-700'}`}>
                <div className="flex-1 truncate text-sm font-medium">
                  {conv.title}
                </div>
                <button onClick={(e) => handleDeleteConversation(conv.id, e)} className="p-1 hover:bg-white/20 rounded transition-all"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden relative">
        {isAuthenticated && (
          <div className="flex gap-2 mb-4">
            <button onClick={() => setShowHistory(!showHistory)} className="px-4 py-2 glass rounded-lg flex items-center gap-2 text-sm font-medium transition-all hover:bg-white/50"><History className="w-4 h-4" /> History</button>
            <button onClick={startNewConversation} className="px-4 py-2 glass rounded-lg flex items-center gap-2 text-sm font-medium transition-all hover:bg-white/50"><Plus className="w-4 h-4" /> New Chat</button>
          </div>
        )}

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-6 pr-2">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div className={`max-w-[85%] rounded-2xl px-5 py-3 transition-all ${message.role === 'user' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg' : 'glass border border-white/40 text-gray-800 shadow-sm'}`}>
                {message.type === 'image' ? (
                  <div className="flex flex-col gap-3 w-full max-w-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-800">🎨 I've generated an image for you!</span>
                    </div>
                    <div className="relative group rounded-xl overflow-hidden border border-white/50 shadow-md bg-gray-100/50">
                      <img src={message.content} alt={message.prompt} className="w-full h-auto object-cover" />
                      <button 
                        onClick={() => handleDownload(message.content, `DANI-${Date.now()}.jpg`)}
                        className="absolute bottom-2 right-2 p-2 bg-black/50 hover:bg-pink-500 text-white rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[10px] opacity-70 italic text-gray-600">✨ "{message.prompt}"</p>
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{message.content}</p>
                    <p className={`text-[10px] mt-1 opacity-50 text-right font-medium`}>
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="glass border border-white/40 rounded-2xl px-6 py-4 shadow-sm">
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
        <div className="mt-auto space-y-3">
          {currentEmotion !== 'neutral' && (
            <div className="glass rounded-2xl px-4 py-2 border border-white/40 flex items-center gap-3 animate-fade-in shadow-sm">
              {currentEmotion === 'happy' && <Smile className="w-5 h-5 text-yellow-500" />}
              <span className="text-sm text-gray-600 font-medium">I sense you're feeling <span className="text-pink-600 capitalize">{currentEmotion}</span></span>
              <Heart className="w-4 h-4 text-pink-400 ml-auto animate-pulse" />
            </div>
          )}
          
          <div className="glass rounded-2xl p-2 border-2 border-white/50 shadow-xl flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-4">
              <Sparkles className="w-5 h-5 text-pink-400" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Message DANI..."
                className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder-gray-400 text-[15px]"
              />
            </div>
            <button onClick={handleSend} disabled={!input.trim()} className="p-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl transition-all disabled:opacity-50 shadow-md active:scale-95">
              <Send className="w-5 h-5" />
            </button>
            {isSpeaking && (
              <button onClick={stopSpeaking} className="p-3 bg-purple-600 text-white rounded-xl shadow-md animate-pulse">
                <Volume2 className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Replaced Version footer with original footer content */}
          <div className="text-center space-y-1">
            <p className="text-[11px] text-gray-500 font-medium">
              DANI can make mistakes. Consider checking important information.
            </p>
            {messageCount > 0 && (
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                Conversational Memory: {messageCount} messages remembered
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
