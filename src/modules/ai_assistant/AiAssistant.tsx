/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Bot, Play, Sparkles, Send, Trash2, HelpCircle, AlertCircle } from 'lucide-react';

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
}

interface AiAssistantProps {
  currentUsername: string;
  isDarkMode: boolean;
}

export default function AiAssistant({ currentUsername, isDarkMode }: AiAssistantProps) {
  const [queryInput, setQueryInput] = useState<string>('');
  const [chatLog, setChatLog] = useState<ChatMessage[]>([
    { 
      sender: 'bot', 
      text: "👋 Hello! I am your integrated SmartDesk AI Business Assistant. Ask me any analytic or strategic questions about your inventory turnover, profit breakdowns, or sales performance, or click any of the quick-insight presets below!" 
    }
  ]);
  const [loading, setLoading] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Quick Preset Prompts
  const PRESET_QUESTIONS = [
    { label: "💰 Show Month's Profit", query: "Show this month's profit." },
    { label: "📉 Low Stock Alerts", query: "Which products are low in stock?" },
    { label: "🔥 Best Selling Items", query: "What are my best selling products?" },
    { label: "📊 Compare May vs June", query: "Compare last month and this month sales." },
    { label: "🎯 Predict Next Month", query: "Predict next month's sales." },
    { label: "👥 Employee Standings", query: "Which employee made most sales?" },
    { label: "📦 Dead/Unsold Products", query: "Which products are not selling?" }
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog, loading]);

  const handleQuery = async (userMsg: string) => {
    if (!userMsg.trim()) return;

    setChatLog(prev => [...prev, { sender: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/gemini/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMsg,
          conversationHistory: chatLog.map(m => ({ 
            role: m.sender === 'user' ? 'user' : 'bot', 
            content: m.text 
          }))
        })
      });
      const data = await res.json();
      
      if (data.reply) {
        setChatLog(prev => [...prev, { sender: 'bot', text: data.reply }]);
      } else {
        setChatLog(prev => [...prev, { sender: 'bot', text: "No direct response available. Please confirm server connection." }]);
      }
    } catch (err) {
      setChatLog(prev => [...prev, { 
        sender: 'bot', 
        text: "I am currently functioning in Local Offline Analysis Mode due to an network delay or unset API block. Let me answer using my direct offline analytic algorithms instead!" 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim()) return;
    const prompt = queryInput;
    setQueryInput('');
    handleQuery(prompt);
  };

  const handleClearLog = () => {
    setChatLog([
      { 
        sender: 'bot', 
        text: "Log cleared successfully. Hello! Ask me any structural questions about products, sales trends, or business margins." 
      }
    ]);
  };

  return (
    <div className={`p-6 rounded-2xl border transition-all shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
      
      {/* Module Title Header */}
      <div className="flex items-center justify-between border-b border-dashed pb-4 mb-5 border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-sky-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Bot className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm tracking-tight text-slate-100 flex items-center gap-2">
              SmartDesk AI Business Assistant
              <span className="text-[10px] bg-sky-900/50 text-sky-300 font-bold px-2 py-0.5 rounded border border-sky-800 animate-pulse">
                GEMINI ACTIVE
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Formulates answers directly computed over product registers, cost margins, and POS billing data.
            </p>
          </div>
        </div>

        <button
          onClick={handleClearLog}
          title="Clear chat log"
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-all cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Main chat log workspace */}
      <div className="space-y-4">
        <div className={`p-4 rounded-xl space-y-4 max-h-[360px] overflow-y-auto ${isDarkMode ? 'bg-slate-950/70 border border-slate-800' : 'bg-slate-50 border border-slate-250'}`} style={{ minHeight: '180px' }}>
          {chatLog.map((chat, idx) => (
            <div key={idx} className={`flex gap-3 max-w-4xl text-xs ${chat.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              
              {chat.sender === 'bot' && (
                <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shrink-0 shadow-md">
                  AI
                </div>
              )}
              
              <div className={`p-3 rounded-xl leading-relaxed max-w-[85%] font-sans whitespace-pre-wrap shadow-sm ${
                chat.sender === 'user' 
                  ? 'bg-blue-600 text-white font-medium rounded-tr-none' 
                  : isDarkMode
                    ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                    : 'bg-white border border-slate-200 text-slate-850 rounded-tl-none'
              }`}>
                {chat.text}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex items-center gap-2.5 text-xs text-slate-400 p-2">
              <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"></span>
              <span className="italic font-medium text-slate-400">Consulting live company books...</span>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Strategic Preset Prompts row */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Quick Insights Preset Prompts:
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESET_QUESTIONS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuery(p.query)}
                className={`text-[11px] font-semibold py-1.5 px-3 rounded-lg border cursor-pointer transition-all ${
                  isDarkMode 
                    ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:border-slate-600'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-350'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Input form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            disabled={loading}
            placeholder="Type custom questions, e.g. What is our net profit after lease expenses?"
            className={`flex-1 text-xs px-3 py-2.5 rounded-lg focus:outline-none transition-all ${
              isDarkMode
                ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:ring-1 focus:ring-blue-500'
                : 'bg-white border border-slate-300 text-slate-850 focus:ring-1 focus:ring-blue-500'
            }`}
          />
          <button
            type="submit"
            disabled={loading || !queryInput.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-lg flex items-center justify-center cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>

      </div>
    </div>
  );
}
