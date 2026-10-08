import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Download, X, ShieldCheck, Eye } from 'lucide-react';
import logoImg from '../assets/logo.png';
import posterImg from '../assets/recruitment-poster.png';

const FORM_URL = 'https://forms.gle/FRM122rsw5pb541D9?utm_source=chatgpt.com';

export default function Recruitment() {
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [viewCount, setViewCount] = useState<number | null>(null);

  // Client-Side View Counter via hits.sh
  useEffect(() => {
    let isMounted = true;
    const fetchViews = async () => {
      try {
        // Cache bust query ensures the latest live count is returned
        const res = await fetch(`https://hits.sh/attendease.srkr.edu.in/recruitment.svg?v=${Date.now()}`);
        if (!res.ok) return;
        const svg = await res.text();
        const match = svg.match(/(?:Views|hits):\s*(\d+)/i);
        if (match && match[1] && isMounted) {
          setViewCount(parseInt(match[1], 10));
        }
      } catch {
        // Silently fail if offline or blocked
      }
    };

    fetchViews();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#09090B] font-sans antialiased selection:bg-orange-500 selection:text-white flex flex-col justify-between">
      {/* Top Navigation — Brand on Left */}
      <nav className="border-b border-zinc-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logoImg} alt="AttendEase Logo" className="w-6 h-6 rounded-md object-contain" />
            <span className="font-bold text-sm tracking-tight text-zinc-900">AttendEase</span>
            <span className="text-zinc-300 text-xs">/</span>
            <span className="text-xs font-medium text-zinc-500">Recruitment</span>
          </Link>

          {viewCount !== null && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200/80 text-[11px] font-mono text-zinc-600 shadow-2xs">
              <Eye size={12} className="text-zinc-400" />
              <span>{viewCount.toLocaleString()} {viewCount === 1 ? 'view' : 'views'}</span>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 w-full flex flex-col items-center justify-center text-center">
        {/* 1. Title Above Poster */}
        <div className="w-full mb-6 sm:mb-8 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[11px] font-mono font-semibold tracking-widest text-zinc-400 uppercase">
              JOIN THE TEAM
            </p>
            {viewCount !== null && (
              <>
                <span className="text-zinc-300">•</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-500">
                  <Eye size={11} className="text-zinc-400" />
                  <span>{viewCount.toLocaleString()} views</span>
                </span>
              </>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 text-center">
            AttendEase Team Recruitment
          </h1>
        </div>

        {/* 2. Poster Container */}
        <div className="w-full bg-white border border-zinc-200/90 rounded-2xl p-2.5 sm:p-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] relative group mx-auto">
          <a
            href={agreedToTerms ? FORM_URL : '#'}
            onClick={(e) => {
              if (!agreedToTerms) {
                e.preventDefault();
                setAgreedToTerms(true);
              }
            }}
            target={agreedToTerms ? '_blank' : undefined}
            rel="noopener noreferrer"
            title={agreedToTerms ? 'Click to apply' : 'Agree to terms to apply'}
            className="w-full block overflow-hidden rounded-xl"
          >
            <img
              src={posterImg}
              alt="AttendEase Team Recruitment Poster"
              className="w-full h-auto object-contain rounded-xl transition-opacity hover:opacity-95 mx-auto"
            />
          </a>

          {/* Download button in top-right */}
          <a
            href="/recruitment-poster.png"
            download="AttendEase Team Recruitment Poster.png"
            className="absolute top-4 right-4 bg-white/90 hover:bg-white text-zinc-700 hover:text-zinc-900 border border-zinc-200/80 rounded-lg px-2.5 py-1 text-[11px] font-medium shadow-xs transition-all backdrop-blur-xs flex items-center gap-1.5"
            title="Download Poster"
          >
            <Download size={12} />
            <span>Download</span>
          </a>
        </div>

        {/* 3. Description, Terms Checkbox & Apply Button Below Poster */}
        <div className="w-full mt-6 sm:mt-8 flex flex-col items-center text-center">
          <p className="text-sm sm:text-base text-zinc-600 leading-relaxed max-w-md mx-auto text-center">
            We’re building a passionate team to take AttendEase forward. If you’re interested in contributing, learning, and being part of the project, fill out the form below.
          </p>

          {/* Terms and Conditions Checkbox */}
          <div className="mt-6 flex flex-col items-center gap-4 w-full">
            <label className="inline-flex items-center gap-2 text-xs sm:text-sm text-zinc-700 cursor-pointer select-none">
              <input
                type="checkbox"
                id="terms-checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 transition-colors cursor-pointer accent-zinc-900"
              />
              <span>
                I agree to the{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsTermsModalOpen(true);
                  }}
                  className="font-medium text-zinc-900 underline underline-offset-2 hover:text-orange-600 transition-colors cursor-pointer"
                >
                  Terms and Conditions
                </button>
              </span>
            </label>

            {/* Apply button — enabled only when terms are accepted */}
            <div className="flex justify-center w-full">
              {agreedToTerms ? (
                <a
                  href={FORM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-black text-white text-sm font-semibold px-6 py-3 rounded-full shadow-xs hover:shadow-md transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <span>Apply here: Team Recruitment Form</span>
                  <ArrowUpRight size={15} />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setAgreedToTerms(true)}
                  className="inline-flex items-center justify-center gap-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-500 hover:text-zinc-700 text-sm font-semibold px-6 py-3 rounded-full transition-all cursor-pointer"
                  title="Check the box above to apply"
                >
                  <span>Apply here: Team Recruitment Form</span>
                  <ArrowUpRight size={15} />
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Terms & Conditions Modal */}
      {isTermsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsTermsModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-zinc-200 max-w-md w-full p-6 shadow-2xl relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-zinc-900" />
                <h2 className="text-base font-bold text-zinc-900">Terms &amp; Conditions</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs sm:text-sm text-zinc-600 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
              <p>
                <strong className="text-zinc-900">1. Student Eligibility:</strong> You must be an enrolled student of SRKR Engineering College interested in technology, design, product, or team operations.
              </p>
              <p>
                <strong className="text-zinc-900">2. Active Commitment:</strong> Joining the AttendEase team involves dedication towards learning, collaborating with peers, and contributing to project milestones.
              </p>
              <p>
                <strong className="text-zinc-900">3. Integrity &amp; Conduct:</strong> All applicants must submit truthful credentials and demonstrate mutual respect and teamwork.
              </p>
              <p>
                <strong className="text-zinc-900">4. Confidentiality:</strong> College data, system architecture, and student privacy must be strictly respected.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setAgreedToTerms(true);
                  setIsTermsModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Accept &amp; Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Minimal Footer — Centered */}
      <footer className="w-full border-t border-zinc-200/80 bg-white py-6">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 flex flex-col items-center justify-center gap-3 text-xs text-zinc-500 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="font-semibold text-zinc-800">AttendEase</span>
            <span>•</span>
            <span>SRKR Engineering College</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/" className="hover:text-zinc-900 transition-colors">Home</Link>
            <Link to="/developers" className="hover:text-zinc-900 transition-colors">Developers</Link>
            <a
              href={FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-600 hover:text-orange-700 font-medium inline-flex items-center gap-0.5"
            >
              <span>Recruitment Form</span>
              <ArrowUpRight size={11} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
