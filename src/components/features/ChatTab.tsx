import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Plus, History, Trash2, Volume2, Heart, Frown, Smile, Zap, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import type { Message } from '@/types';
import { isImagePrompt, formatImageApiUrl, downloadImage } from '@/lib/image-gen';

// Markdown & Table Support
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ChatTab() {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const { messages, setMessages } = useMessages(currentConversationId);
  const { conversations, createConversation, deleteConversation } = useConversations();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
    if (messages.length === 0) {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: "Hi! I'm DANI! 💕 How can I help you today?",
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
      const { data, error } = await supabase.functions.invoke('tts-elevenlabs', { body: { text } });
      if (error) throw error;
      const audioUrl = URL.createObjectURL(data);
      const audio = new Audio(audioUrl);
      audio.playbackRate = 1.05;
      currentAudioRef.current = audio;
      audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(audioUrl); };
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

  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userInput = input;
    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: userInput, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // ✅ IMAGE GENERATION CHECK (STILL HERE!)
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
      const { data, error } = await supabase.functions.invoke('chat-ai', {
        body: { messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })), conversationId: currentConversationId }
      });
      if (error) throw error;
      const assistantMessage: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: data.message, timestamp: new Date() };
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

  return (
    <div className="flex-1 flex max-w-7xl mx-auto w-full h-full overflow-hidden">
      {/* Sidebar hidden for brevity, logic remains same */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden relative">
        <div className="flex-1 overflow-y-auto mb-4 space-y-6 pr-2">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div className={`max-w-[90%] rounded-2xl px-5 py-3 transition-all ${
                message.role === 'user' 
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg' 
                : 'glass border border-white/40 text-gray-800 shadow-sm'
              }`}>
                
                {/* ✅ IMAGE RENDERING */}
                {message.type === 'image' ? (
                  <div className="flex flex-col gap-3 w-64 md:w-80">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-800 font-mono">🎨 DANI Art</span>
                    </div>
                    <div className="relative group rounded-xl overflow-hidden border border-white/50 shadow-md bg-gray-100/50">
                      <img src={message.content} alt={message.prompt} className="w-full h-auto object-cover" />
                      <button 
                        onClick={() => downloadImage(message.content, message.prompt || 'DANI-Image')}
                        className="absolute bottom-2 right-2 p-2 bg-black/50 hover:bg-pink-500 text-white rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[10px] opacity-70 italic text-gray-600">✨ "{message.prompt}"</p>
                  </div>
                ) : (
                  /* ✅ TEXT & TABLE RENDERING */
                  <div className="prose prose-sm max-w-none prose-pink">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({node, ...props}) => (
                          <div className="my-4 overflow-x-auto rounded-xl border border-pink-200/50 bg-white/30 backdrop-blur-sm">
                            <table className="min-w-full divide-y divide-pink-200/40" {...props} />
                          </div>
                        ),
                        thead: ({node, ...props}) => <thead className="bg-pink-100/50" {...props} />,
                        th: ({node, ...props}) => <th className="px-4 py-2 text-left text-xs font-bold text-pink-700 uppercase" {...props} />,
                        td: ({node, ...props}) => <td className="px-4 py-2 text-sm text-gray-700 border-t border-pink-100/20" {...props} />,
                        code: ({node, inline, ...props}) => (
                          inline 
                          ? <code className="bg-pink-100 px-1.5 py-0.5 rounded text-pink-600 font-mono text-[13px]" {...props} />
                          : <pre className="bg-gray-900 text-pink-50 p-4 rounded-xl overflow-x-auto my-3 font-mono text-sm border border-white/10 shadow-inner" {...props} />
                        )
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                    <p className={`text-[10px] mt-2 opacity-40 text-right font-medium`}>
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="mt-auto space-y-3">
          <div className="glass rounded-2xl p-2 border-2 border-white/50 shadow-xl flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-4">
              <Sparkles className="w-5 h-5 text-pink-400" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
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
        </div>
      </div>
    </div>
  );
}
