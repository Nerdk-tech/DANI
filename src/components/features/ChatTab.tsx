import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Plus, History, Trash2, Volume2, Download, Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import type { Message } from '@/types';
import { isImagePrompt, formatImageApiUrl, downloadImage } from '@/lib/image-gen';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ChatTab() {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const { messages, setMessages } = useMessages(currentConversationId);
  const { conversations, createConversation, deleteConversation } = useConversations();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Restore the sweet welcome message if there are no messages
    if (messages.length === 0) {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: "Hi! I'm DANI, your sweet and supportive AI assistant! 💕 How can I help you today?",
        timestamp: new Date()
      }]);
    }
  }, [messages.length, setMessages]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const userInput = input;
    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: userInput, timestamp: new Date() };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    if (isImagePrompt(userInput)) {
      await new Promise(r => setTimeout(r, 2000));
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

      await new Promise(r => setTimeout(r, 2500)); 
      const assistantMessage: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: data.message, timestamp: new Date() };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-full w-full bg-[#fdf2f8] overflow-hidden">
      
      {/* 📜 SIDEBAR */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex md:relative md:z-0">
          <div className="w-80 glass border-r border-white/40 h-full p-4 flex flex-col shadow-2xl bg-white/20 backdrop-blur-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-pink-600 font-bold flex items-center gap-2">
                <History className="w-5 h-5" /> History
              </h2>
              <button onClick={() => setShowHistory(false)} className="md:hidden p-1 hover:bg-pink-100 rounded-full">
                <X className="w-5 h-5 text-pink-400" />
              </button>
            </div>
            <button onClick={() => createConversation()} className="w-full py-3 mb-4 rounded-xl border-2 border-dashed border-pink-300 text-pink-500 font-medium flex items-center justify-center gap-2 hover:bg-pink-50 transition-all">
              <Plus className="w-4 h-4" /> New Chat
            </button>
            <div className="flex-1 overflow-y-auto space-y-2">
              {conversations.map((conv) => (
                <div key={conv.id} 
                     onClick={() => { setCurrentConversationId(conv.id); setShowHistory(false); }}
                     className="group flex items-center gap-2 p-3 rounded-xl hover:bg-white/50 cursor-pointer transition-all border border-transparent hover:border-pink-200">
                  <span className="flex-1 text-sm truncate text-gray-700">
                    {conv.title || "Untitled Chat"}
                  </span>
                  <Trash2 onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }} className="w-4 h-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 bg-black/10 md:hidden" onClick={() => setShowHistory(false)} />
        </div>
      )}

      {/* 💬 MAIN CHAT */}
      <div className="flex-1 flex flex-col h-full relative">
        <div className="p-4 flex items-center justify-between glass border-b border-white/40 bg-white/10 backdrop-blur-sm">
          <button onClick={() => setShowHistory(!showHistory)} className="p-2 hover:bg-white/50 rounded-xl transition-all">
            <History className="w-6 h-6 text-pink-500" />
          </button>
          <div className="text-center">
            <h1 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">DANI AI</h1>
            <p className="text-[10px] text-pink-400 font-medium tracking-widest uppercase">Sweet & Supportive</p>
          </div>
          <div className="w-10" /> 
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
              <div className={`max-w-[85%] rounded-2xl px-5 py-3 shadow-sm ${m.role === 'user' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white' : 'glass border border-white/40 text-gray-800 bg-white/40'}`}>
                {m.type === 'image' ? (
                   <div className="flex flex-col gap-3 w-64 md:w-80">
                    <img src={m.content} className="rounded-xl border border-white/20 shadow-inner" alt="Generated" />
                    <button onClick={() => downloadImage(m.content, m.prompt || 'art')} className="p-2 bg-pink-500 hover:bg-pink-600 text-white rounded-full w-fit self-end shadow-lg transition-transform active:scale-90">
                      <Download className="w-4 h-4" />
                    </button>
                   </div>
                ) : (
                  <div className="prose prose-sm max-w-none prose-pink">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                      table: ({...props}) => <div className="overflow-x-auto my-3 rounded-xl border border-pink-100 shadow-sm"><table className="min-w-full divide-y divide-pink-50" {...props} /></div>,
                      thead: ({...props}) => <thead className="bg-pink-50/50" {...props} />,
                      th: ({...props}) => <th className="px-3 py-2 text-pink-700 text-xs font-bold uppercase text-left" {...props} />,
                      td: ({...props}) => <td className="px-3 py-2 text-sm border-t border-pink-50 text-gray-700" {...props} />,
                      pre: ({...props}) => <pre className="bg-gray-900 text-pink-50 p-4 rounded-xl my-3 text-xs overflow-x-auto border border-white/10" {...props} />,
                      code: ({...props}) => <code className="bg-pink-50 text-pink-600 px-1 rounded font-mono" {...props} />
                    }}>{m.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start animate-in fade-in slide-in-from-left-2">
              <div className="glass px-5 py-3 rounded-2xl flex items-center gap-3 border border-white/40 bg-white/40">
                <Loader2 className="w-5 h-5 text-pink-500 animate-spin" strokeWidth={3} />
                <span className="text-sm font-medium text-pink-600 italic">DANI is thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-gradient-to-t from-[#fdf2f8] via-[#fdf2f8] to-transparent">
          <div className="max-w-4xl mx-auto space-y-3">
            <div className="glass rounded-2xl p-2 border-2 border-white/60 shadow-xl flex gap-2 bg-white/30 backdrop-blur-md">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Message DANI..."
                className="flex-1 bg-transparent px-4 outline-none text-gray-800 placeholder-gray-400"
              />
              <button onClick={handleSend} disabled={!input.trim() || isTyping} className="p-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl active:scale-95 transition-all shadow-md disabled:opacity-50">
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[10px] text-center text-gray-400 font-medium">
              DANI can make mistakes. Memory: {messages.length} msgs. Conversation history is saved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
