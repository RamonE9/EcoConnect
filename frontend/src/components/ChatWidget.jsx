import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles } from 'lucide-react';

const ChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Hello! I am your Eco-Assistant. How can I help you today?" }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const isBypass = token === 'DEV_BYPASS_TOKEN';
            
            const res = await fetch('/api/ai/chat/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': isBypass ? '' : `Bearer ${token}`,
                    'X-Dev-Bypass': isBypass ? 'DEV_BYPASS_TOKEN' : ''
                },
                body: JSON.stringify({ message: input })
            });
            const data = await res.json();
            
            if (res.ok) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.response || 'No response data.' }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.detail || data.message || 'Unknown error'}` }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: `Connection error: ${error.message}` }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-8 right-8 z-[1000] flex flex-col items-end">
            {isOpen && (
                <div className="mb-4 w-[350px] sm:w-[400px] h-[500px] bg-white rounded-[32px] shadow-3xl border border-slate-200 overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-300">
                    <div className="p-6 bg-green-600 text-white flex justify-between items-center shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-xl">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-black text-sm uppercase tracking-widest">Eco Intelligence</h3>
                                <p className="text-[10px] opacity-80 font-bold">System Online</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-2 rounded-xl transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-green-100 text-green-600'}`}>
                                        {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                    </div>
                                    <div className={`p-4 rounded-2xl text-sm font-bold shadow-sm ${m.role === 'user' ? 'bg-white text-slate-800 rounded-tr-none border border-slate-100' : 'bg-green-600 text-white rounded-tl-none'}`}>
                                        {m.content}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-slate-200 p-4 rounded-2xl rounded-tl-none animate-pulse">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Ask about EcoConnect..."
                                className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-6 pr-14 text-sm font-bold focus:ring-2 focus:ring-green-600 transition-all outline-none"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                            />
                            <button type="submit" disabled={loading} className="absolute right-2 top-2 p-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-md shadow-green-200">
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-5 rounded-[24px] shadow-2xl transition-all active:scale-90 flex items-center gap-3 group ${isOpen ? 'bg-slate-800 text-white' : 'bg-green-600 text-white hover:bg-green-500'}`}
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                {!isOpen && <span className="font-black text-xs uppercase tracking-widest hidden sm:block">AI Assistant</span>}
            </button>
        </div>
    );
};

export default ChatWidget;
