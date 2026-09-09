import React, { useState } from 'react';
import { SendButton } from '../../components/ui/SendButton';
import { Sparkles, Sliders, ShieldCheck, ArrowRight, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AnimationShowcasePage() {
  const [autoResetTime, setAutoResetTime] = useState<number>(2500);
  const [debugWireframe, setDebugWireframe] = useState<boolean>(false);
  const [sendCount, setSendCount] = useState<number>(0);
  const [messageLog, setMessageLog] = useState<string[]>([]);
  const [customLabel, setCustomLabel] = useState<string>('Send');
  const [customSentLabel, setCustomSentLabel] = useState<string>('Sent');

  const handleSendAction = () => {
    setSendCount((c) => c + 1);
    const time = new Date().toLocaleTimeString();
    setMessageLog((prev) => [
      `[${time}] IDLE → FOLDING → TRIANGLE → PLANE → FLY → SENT (#${sendCount + 1})`,
      ...prev.slice(0, 4),
    ]);
  };

  return (
    <div className="min-h-screen bg-[#140E36] text-white p-6 sm:p-10 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-900/60 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs font-semibold mb-2">
              <Sparkles size={13} />
              <span>AttendEase Orange Theme</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-orange-100 to-orange-400 bg-clip-text text-transparent">
              Send Button Animation
            </h1>
            <p className="text-slate-300 text-sm sm:text-base mt-1">
              Exact continuous geometric transformation: <code className="text-orange-300">IDLE → FOLDING → TRIANGLE → PLANE → FLY → SENT</code>
            </p>
          </div>
          <Link
            to="/"
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 text-sm font-medium text-indigo-200 border border-indigo-800/80 transition"
          >
            <span>Back to App</span>
            <ArrowRight size={14} />
          </Link>
        </header>

        {/* Main Stage Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Exact Reference Stage Card (Deep Purple Card from Reference Image) */}
          <div className="lg:col-span-7 flex flex-col items-center gap-6">
            <div className="w-full bg-[#1A162B] border border-orange-500/20 rounded-3xl p-10 flex flex-col items-center justify-between shadow-2xl relative overflow-visible min-h-[380px]">
              <div className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-indigo-200/80 mb-6">
                <span className="flex items-center gap-1.5">
                  <Eye size={14} className="text-indigo-300" />
                  Visual Reference Canvas
                </span>
                <button
                  type="button"
                  onClick={() => setDebugWireframe(!debugWireframe)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition ${
                    debugWireframe
                      ? 'bg-indigo-400/20 text-indigo-200 border-indigo-400'
                      : 'bg-indigo-900/40 text-indigo-300/80 border-indigo-700/50 hover:text-white'
                  }`}
                >
                  Facet Mesh {debugWireframe ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Exact Centered Reference Target */}
              <div className="flex-1 flex flex-col items-center justify-center my-12 overflow-visible">
                <SendButton
                  autoReset={autoResetTime}
                  label={customLabel}
                  sentLabel={customSentLabel}
                  showFacetDebug={debugWireframe}
                  onSend={handleSendAction}
                />
              </div>

              <div className="w-full flex items-center justify-center text-xs text-indigo-200/60 gap-1.5">
                <ShieldCheck size={14} className="text-indigo-300" />
                <span>Single continuous geometric sheet • Native CSS polygon & @property</span>
              </div>
            </div>

            {/* Event Dispatch Console */}
            <div className="w-full bg-[#1A1344] border border-indigo-900/60 rounded-2xl p-4 text-xs font-mono text-indigo-200 space-y-1.5 shadow-inner">
              <div className="flex items-center justify-between text-[11px] text-indigo-300/70 font-semibold pb-1.5 border-b border-indigo-900/80">
                <span>ANIMATION STAGE LOG</span>
                <span>Sent count: {sendCount}</span>
              </div>
              {messageLog.length === 0 ? (
                <div className="text-indigo-300/50 italic py-1">Click the button above to trigger the sequence...</div>
              ) : (
                messageLog.map((log, i) => (
                  <div key={i} className="text-indigo-200/90 leading-relaxed truncate">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Reference Specification Guide & Parameters */}
          <div className="lg:col-span-5 bg-[#1F1752] border border-indigo-900/80 rounded-3xl p-6 flex flex-col gap-6 shadow-xl">
            <div className="flex items-center gap-2 border-b border-indigo-800/60 pb-3">
              <Sliders size={18} className="text-indigo-300" />
              <h2 className="text-base font-bold text-white">Reference Stage Timeline</h2>
            </div>

            {/* Visual Timeline Checklist */}
            <div className="space-y-3 text-xs">
              <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-between">
                <div>
                  <div className="font-bold text-indigo-200">1. IDLE</div>
                  <div className="text-indigo-300/60 text-[11px]">Small white rounded rectangular button</div>
                </div>
                <span className="font-mono text-indigo-300 bg-indigo-900/60 px-2 py-0.5 rounded text-[10px]">0%</span>
              </div>

              <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-between">
                <div>
                  <div className="font-bold text-indigo-200">2. FOLDING</div>
                  <div className="text-indigo-300/60 text-[11px]">Trapezoid with 45° angled sides; text fades</div>
                </div>
                <span className="font-mono text-indigo-300 bg-indigo-900/60 px-2 py-0.5 rounded text-[10px]">26%</span>
              </div>

              <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-between">
                <div>
                  <div className="font-bold text-indigo-200">3. TRIANGLE</div>
                  <div className="text-indigo-300/60 text-[11px]">Isosceles triangle with visible vertical crease</div>
                </div>
                <span className="font-mono text-indigo-300 bg-indigo-900/60 px-2 py-0.5 rounded text-[10px]">50%</span>
              </div>

              <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-between">
                <div>
                  <div className="font-bold text-indigo-200">4. PLANE</div>
                  <div className="text-indigo-300/60 text-[11px]">Delta origami paper plane tilted ~32°</div>
                </div>
                <span className="font-mono text-indigo-300 bg-indigo-900/60 px-2 py-0.5 rounded text-[10px]">72%</span>
              </div>

              <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-between">
                <div>
                  <div className="font-bold text-indigo-200">5. FLY</div>
                  <div className="text-indigo-300/60 text-[11px]">Decisive diagonal flight up & to the right</div>
                </div>
                <span className="font-mono text-indigo-300 bg-indigo-900/60 px-2 py-0.5 rounded text-[10px]">100%</span>
              </div>

              <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-between">
                <div>
                  <div className="font-bold text-indigo-200">6. SENT</div>
                  <div className="text-indigo-300/60 text-[11px]">Clean white "✓ Sent" centered in button spot</div>
                </div>
                <span className="font-mono text-indigo-300 bg-indigo-900/60 px-2 py-0.5 rounded text-[10px]">Done</span>
              </div>
            </div>

            {/* Auto-Reset Parameter */}
            <div className="space-y-2 pt-2 border-t border-indigo-800/60">
              <div className="flex justify-between text-sm">
                <span className="text-indigo-200 font-medium">Auto-Reset Delay</span>
                <span className="text-indigo-300 font-mono font-semibold">{autoResetTime}ms</span>
              </div>
              <input
                type="range"
                min="1500"
                max="5000"
                step="250"
                value={autoResetTime}
                onChange={(e) => setAutoResetTime(Number(e.target.value))}
                className="w-full h-2 bg-indigo-950 rounded-lg appearance-none cursor-pointer accent-indigo-400"
              />
              <div className="flex justify-between text-[11px] text-indigo-300/50">
                <span>1.5s</span>
                <span>2.5s (default)</span>
                <span>5.0s</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
