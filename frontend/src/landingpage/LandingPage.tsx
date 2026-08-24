import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, X, Sparkles, Download, CheckCircle2,
  Clock, ArrowRight, Lock, ChevronDown, ChevronUp,
  Bot, FileText
} from 'lucide-react';
import './landing.css';
import logoImg from '../assets/logo.png';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const FAQS = [
  {
    question: "How do students apply for duty-leave / permissions?",
    answer: "Students can log in to the Student Portal, click 'New Permission Request', select their date, time slot/periods, reason category, and upload proof documents. Once submitted, it forwards to their assigned Faculty Advisor."
  },
  {
    question: "How does Faculty mark attendance?",
    answer: "Faculty members log in, select the Year and Target Section (e.g. CSIT-B), select the specific period (P1 to P8), and tap student roll numbers to mark Present/Absent. Approved permissions automatically highlight in yellow."
  },
  {
    question: "What is the HOD Direct Exemption feature?",
    answer: "HODs can grant bulk attendance exemptions to multiple students directly for academic events, hackathons, sports, or official college duties without requiring individual student submissions."
  },
  {
    question: "How can I export attendance to WhatsApp?",
    answer: "On the Public Permissions & Attendance page, tap 'Share to WhatsApp' or 'WhatsApp Report' to automatically format sorted presentees and absentees lists with Date and Time, ready to paste directly into official WhatsApp groups."
  }
];

export default function LandingPage() {
  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: '👋 Hi! I am the AttendEase AI Support Assistant powered by LLM. Ask me anything about student permissions, faculty attendance, or portal features!' }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [isLoadingMsg, setIsLoadingMsg] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoadingMsg]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMsg).trim();
    if (!query || isLoadingMsg) return;

    const userMessage: ChatMessage = { role: 'user', content: query };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    if (!textToSend) setInputMsg('');
    setIsLoadingMsg(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (res.ok) {
        const data = await res.json();
        const replyText = data.reply || 'Thank you for reaching out! How else can I assist you?';
        setMessages(prev => [...prev, { role: 'assistant', content: replyText }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'I encountered a temporary connection issue. Please try again.' }]);
      }
    } catch (err) {
      console.error('Chat request error:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Unable to connect to AttendEase AI Assistant right now.' }]);
    } finally {
      setIsLoadingMsg(false);
    }
  };

  return (
    <div className="landing-page-wrapper">
      {/* ── Top Navigation Bar ── */}
      <nav className="landing-nav">
        <div className="landing-container landing-nav-inner">
          <Link to="/" className="landing-nav-logo">
            <img
              src={logoImg}
              alt="AttendEase Logo"
              className="landing-nav-logo-img"
            />
            <span className="landing-nav-brand">AttendEase</span>
          </Link>
          <div className="landing-nav-links">
            <Link to="/permissions" className="landing-btn landing-btn-secondary">
              View Attendance
            </Link>
            <Link to="/" className="landing-btn landing-btn-primary">
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <header className="landing-hero landing-container">
        <img
          src={logoImg}
          alt="Attend Ease Emblem"
          className="landing-hero-logo"
        />
        <div>
          <span className="landing-hero-badge">Designed for Modern Classrooms</span>
        </div>
        <h1 className="landing-hero-title landing-display-font">
          Attend Ease.<br />
          <span className="text-orange-500 font-extrabold">Smart Attendance System.</span>
        </h1>
        <p className="landing-hero-sub">
          A modern attendance &amp; permission management system built for SRKR Engineering College. Track, manage, and export attendance effortlessly.
        </p>
        <div className="landing-hero-ctas">
          <Link to="/" className="landing-btn landing-btn-primary">
            <span>Sign In to Portal</span>
            <ArrowRight size={16} />
          </Link>
          <Link to="/permissions" className="landing-btn landing-btn-secondary">
            <span>View Public Permissions</span>
          </Link>
          <a
            href="https://github.com/gowthamkrishna27/AttendEase/releases/download/stable/AttendEase-v1.1.0.apk"
            target="_blank"
            rel="noopener noreferrer"
            className="landing-btn border border-slate-300 bg-white hover:bg-slate-50 text-slate-800"
          >
            <Download size={16} className="text-orange-500" />
            <span>Download Android App</span>
          </a>
        </div>
      </header>

      {/* ── Screenshots Marquee ── */}
      <section className="landing-marquee-wrapper">
        <div className="landing-container mb-6 text-center">
          <span className="text-[12px] font-extrabold text-orange-600 uppercase tracking-widest block mb-1">Interactive Interface</span>
          <h2 className="text-[28px] font-extrabold text-slate-900 landing-display-font">Built For Everyday Workflow</h2>
        </div>
        <div className="landing-marquee-container">
          {[
            { title: "Dashboard Overview", src: "https://res.cloudinary.com/q40pqnho/image/upload/v1786111774/WhatsApp_Image_2026-08-07_at_7.31.38_PM_fs2vcw.jpg" },
            { title: "Student Portal", src: "https://res.cloudinary.com/ucckdidb/image/upload/v1787078511/Screenshot_20260819-001007_rtfv3g.png" },
            { title: "Faculty Attendance", src: "https://res.cloudinary.com/ucckdidb/image/upload/v1787078511/Screenshot_20260819-000150_yd6g1x.png" },
            { title: "HOD Dashboard", src: "https://res.cloudinary.com/ucckdidb/image/upload/v1787078511/Screenshot_20260819-000004_mojjji.png" },
            { title: "Permissions Grid", src: "https://res.cloudinary.com/q40pqnho/image/upload/v1786111849/WhatsApp_Image_2026-08-07_at_7.31.50_PM_1_kxqwb6.jpg" },
            // Repeat for smooth loop
            { title: "Dashboard Overview", src: "https://res.cloudinary.com/q40pqnho/image/upload/v1786111774/WhatsApp_Image_2026-08-07_at_7.31.38_PM_fs2vcw.jpg" },
            { title: "Student Portal", src: "https://res.cloudinary.com/ucckdidb/image/upload/v1787078511/Screenshot_20260819-001007_rtfv3g.png" },
            { title: "Faculty Attendance", src: "https://res.cloudinary.com/ucckdidb/image/upload/v1787078511/Screenshot_20260819-000150_yd6g1x.png" },
            { title: "HOD Dashboard", src: "https://res.cloudinary.com/ucckdidb/image/upload/v1787078511/Screenshot_20260819-000004_mojjji.png" },
            { title: "Permissions Grid", src: "https://res.cloudinary.com/q40pqnho/image/upload/v1786111849/WhatsApp_Image_2026-08-07_at_7.31.50_PM_1_kxqwb6.jpg" },
          ].map((item, idx) => (
            <div key={idx} className="text-center shrink-0">
              <img src={item.src} alt={item.title} className="landing-phone-mockup" />
              <p className="text-[12px] font-bold text-slate-500 mt-2">{item.title}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature Grid ── */}
      <section className="landing-features-section">
        <div className="landing-container">
          <h2 className="landing-section-title landing-display-font">Key Features</h2>
          <p className="landing-section-sub">Engineered specifically for SRKR Engineering College departmental workflows.</p>

          <div className="landing-features-grid">
            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <Lock size={24} className="text-orange-500" />
              </div>
              <h3 className="landing-feature-title landing-display-font">Flexible Login &amp; Security</h3>
              <p className="landing-feature-desc">Sign in with password, 4-digit PIN code, or registered biometric passkeys (Touch ID, Face ID, Windows Hello).</p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <CheckCircle2 size={24} className="text-emerald-500" />
              </div>
              <h3 className="landing-feature-title landing-display-font">Instant Permission Sync</h3>
              <p className="landing-feature-desc">Approved duty-leave requests auto-highlight students in yellow across faculty attendance and public permission pages.</p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <Clock size={24} className="text-amber-500" />
              </div>
              <h3 className="landing-feature-title landing-display-font">Period-Wise Selection</h3>
              <p className="landing-feature-desc">Multi-period selection (P1-P8) allows faculty and representatives to inspect specific periods or combined session attendance.</p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <FileText size={24} className="text-emerald-600" />
              </div>
              <h3 className="landing-feature-title landing-display-font">WhatsApp Formatting</h3>
              <p className="landing-feature-desc">Format presentees and absentees automatically with Date and Time stamp, ready to share directly into WhatsApp groups.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ Accordion Section ── */}
      <section className="py-16 bg-slate-50 border-t border-slate-200/80">
        <div className="landing-container max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-[12px] font-extrabold text-orange-600 uppercase tracking-wider block mb-1">Help &amp; Answers</span>
            <h2 className="text-[28px] font-bold text-slate-900 landing-display-font">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => (
              <div key={idx} className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full px-5 py-4 text-left font-bold text-[14px] text-slate-900 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <span>{faq.question}</span>
                  {activeFaq === idx ? <ChevronUp size={18} className="text-orange-500" /> : <ChevronDown size={18} className="text-slate-400" />}
                </button>
                <AnimatePresence>
                  {activeFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-5 pb-4 text-[13px] text-slate-600 leading-relaxed border-t border-slate-100 pt-3"
                    >
                      {faq.answer}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── OpenRouter LLM Floating Chatbot Widget ── */}
      <div className="landing-chat-fab">
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="landing-fab-btn"
          title="Ask AttendEase AI Assistant"
        >
          {isChatOpen ? <X size={24} /> : <Bot size={26} />}
        </button>

        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="landing-chat-window"
            >
              {/* Chat Header */}
              <div className="landing-chat-header">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-[14px] leading-tight">AttendEase AI Support</h4>
                    <span className="text-[10px] text-emerald-300 font-medium">Gemini 2.0 LLM Online</span>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              {/* Chat Message History */}
              <div className="landing-chat-messages">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={msg.role === 'user' ? 'landing-msg-user' : 'landing-msg-bot'}
                  >
                    {msg.content}
                  </div>
                ))}
                {isLoadingMsg && (
                  <div className="landing-msg-bot italic text-slate-500 animate-pulse">
                    Thinking with Gemini LLM...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggestion Pills */}
              <div className="px-3 py-1 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
                {["How to request permission?", "WhatsApp Format?", "HOD Exemption?"].map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(sug)}
                    className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-600 whitespace-nowrap transition-colors shrink-0 font-medium"
                  >
                    {sug}
                  </button>
                ))}
              </div>

              {/* Chat Input Bar */}
              <div className="landing-chat-input-area">
                <input
                  type="text"
                  value={inputMsg}
                  onChange={e => setInputMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask a question..."
                  className="landing-chat-input"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={isLoadingMsg || !inputMsg.trim()}
                  className="landing-chat-send disabled:opacity-40"
                >
                  <Send size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
