import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Sparkles } from 'lucide-react';

const ChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Hi! I can help with cleanup events, your Eco-Points, rewards and recycling tips. What would you like to know?" }
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
        if (!input.trim() || loading) return;

        const userMessage = { role: 'user', content: input };
        const history = messages.slice(1).slice(-6);
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 30000);
            const res = await fetch('/api/ai/chat/', {
                signal: controller.signal,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ message: input, history })
            });
            clearTimeout(timer);
            const data = await res.json();
            
            if (res.ok) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.response || 'No response data.' }]);
            } else {
                const text = res.status === 429
                    ? 'You are sending messages too quickly. Please wait a moment and try again.'
                    : (data.detail || data.message || 'Sorry, something went wrong. Please try again.');
                setMessages(prev => [...prev, { role: 'assistant', content: text }]);
            }
        } catch (error) {
            const text = error.name === 'AbortError'
                ? 'The assistant is taking too long to answer. Please try again.'
                : 'Cannot reach the server. Check your internet connection.';
            setMessages(prev => [...prev, { role: 'assistant', content: text }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-20 right-4 z-[1000] flex flex-col items-end lg:bottom-4">
            {isOpen && (
                <div className="mb-3 flex h-[70vh] max-h-[560px] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:h-[500px] sm:w-[380px]"
                    role="dialog" aria-label="Eco Assistant chat">
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                        <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700">
                                <Sparkles className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900">Eco Assistant</h3>
                                <p className="text-xs text-slate-500">Ask about events, points and eco-tips</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="eco-icon-btn" aria-label="Close chat">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4" aria-live="polite">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <p className={`max-w-[85%] whitespace-pre-line rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'rounded-br-sm bg-brand-700 text-white' : 'rounded-bl-sm border border-slate-200 bg-white text-slate-800'}`}>
                                    {m.content}
                                </p>
                            </div>
                        ))}
                        {loading && <p className="text-sm text-slate-500">Thinking…</p>}
                    </div>

                    <form onSubmit={handleSend} className="flex gap-2 border-t border-slate-200 p-3">
                        <input
                            type="text"
                            maxLength={500}
                            aria-label="Message the eco assistant"
                            placeholder="Type your question…"
                            className="eco-input h-10"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                        />
                        <button type="submit" disabled={loading || !input.trim()} className="eco-btn eco-btn-green h-10 w-10 shrink-0 px-0" aria-label="Send">
                            <Send className="h-4 w-4" />
                        </button>
                    </form>
                </div>
            )}

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold shadow-lg transition-colors ${isOpen ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50' : 'bg-brand-700 text-white hover:bg-brand-800'}`}
                aria-expanded={isOpen}
                aria-label={isOpen ? 'Close assistant' : 'Open eco assistant'}
            >
                {isOpen ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
                <span className="hidden sm:inline">{isOpen ? 'Close' : 'Ask AI'}</span>
            </button>
        </div>
    );
};

export default ChatWidget;
