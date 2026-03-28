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
  const [showHistory, setShowHistory] = useState(false); // Controls the Sidebar
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const userInput = input;
    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: userInput, timestamp: new Date() };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // ✅ IMAGE GEN FIX: isImagePrompt now correctly ignores table requests
    if (isImagePrompt(userInput)) {
      await new Promise(r => setTimeout(r, 2000)); // Animation delay
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

      await new Promise(r => setTimeout(r, 2500)); // Spin ~3 times
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
      
      {/* 📜 CONVERSATION HISTORY SIDEBAR */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex md:relative md:z-0">
          <div className="w-80 glass border-r border-white/40 h-full p-4 flex flex-col shadow-2xl">
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
                <div key={conv.id} className="group flex items-center gap-2 p-3 rounded-xl hover:bg-white/50 cursor-pointer transition-all border border-transparent hover:border-pink-200">
                  <span className="flex-1 text-sm truncate text-gray-700" onClick={() => setCurrentConversationId(conv.id)}>
                    {conv.title || "Untitled Chat"}
                  </span>
                  <Trash2 onClick={() => deleteConversation(conv.id)} className="w-4 h-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 bg-black/10 md:hidden" onClick={() => setShowHistory(false)} />
        </div>
      )}

      {/* 💬 MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Header with History Toggle */}
        <div className="p-4 flex items-center justify-between glass border-b border-white/40">
          <button onClick={() => setShowHistory(!showHistory)} className="p-2 hover:bg-white/50 rounded-xl transition-all">
            <History className="w-6 h-6 text-pink-500" />
          </button>
          <div className="text-center">
            <h1 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">DANI AI</h1>
            <p className="text-[10px] text-pink-400 font-medium tracking-widest uppercase">Sweet & Supportive</p>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-5 py-3 ${m.role === 'user' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg' : 'glass border border-white/40 text-gray-800'}`}>
                {m.type === 'image' ? (
                   <div className="flex flex-col gap-3 w-64">
                    <img src={m.content} className="rounded-xl" />
                    <button onClick={() => downloadImage(m.content, m.prompt!)} className="p-2 bg-pink-500 text-white rounded-full w-fit self-end"><Download className="w-4 h-4" /></button>
                   </div>
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                    table: ({...props}) => <div className="overflow-x-auto my-2 rounded-lg border border-pink-200"><table className="min-w-full divide-y divide-pink-100" {...props} /></div>,
                    th: ({...props}) => <th className="px-3 py-2 bg-pink-50 text-pink-700 text-xs font-bold uppercase" {...props} />,
                    td: ({...props}) => <td className="px-3 py-2 text-sm border-t border-pink-50" {...props} />,
                    pre: ({...props}) => <pre className="bg-gray-900 text-pink-50 p-3 rounded-lg my-2 text-xs overflow-x-auto" {...props} />
                  }}>{m.content}</ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="glass px-5 py-3 rounded-2xl flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-pink-500 animate-spin" strokeWidth={3} />
                <span className="text-sm font-medium text-pink-600 italic">DANI is thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input & Footer */}
        <div className="p-4 bg-gradient-to-t from-[#fdf2f8] via-[#fdf2f8] to-transparent">
          <div className="max-w-4xl mx-auto space-y-2">
            <div className="glass rounded-2xl p-2 border-2 border-white/60 shadow-xl flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Message DANI..."
                className="flex-1 bg-transparent px-4 outline-none text-gray-800"
              />
              <button onClick={handleSend} disabled={isTyping} className="p-3 bg-pink-500 text-white rounded-xl active:scale-95 transition-all">
                <Send className="w-5 h-5" />
              </button>
            </div>
            
            {/* ⚠️ DISCLAIMER FOOTER */}
            <p className="text-[10px] text-center text-gray-400 font-medium">
              DANI can make mistakes. Memory: {messages.length} msgs. Conversation history is saved locally.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
