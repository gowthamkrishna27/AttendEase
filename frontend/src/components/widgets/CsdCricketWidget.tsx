import React, { useState, useEffect } from 'react';
import { Trophy, ExternalLink, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TeamStanding {
  id: number;
  name: string;
  color: string;
  logo?: string;
  played: number;
  wins: number;
  losses: number;
  nrr: number;
  points: number;
}

const DEFAULT_SR_TEAMS: TeamStanding[] = [
  { id: 1, name: 'House Vayu', color: '#2563EB', logo: 'vayu.png', played: 4, wins: 4, losses: 0, nrr: 2.39, points: 8 },
  { id: 4, name: 'House Jal', color: '#9333EA', logo: 'jal.png', played: 4, wins: 3, losses: 1, nrr: 4.57, points: 6 },
  { id: 2, name: 'House Agni', color: '#DC2626', logo: 'agni.png', played: 4, wins: 2, losses: 2, nrr: -0.40, points: 4 },
  { id: 3, name: 'House Prudvi', color: '#16A34A', logo: 'Prudhvi.png', played: 3, wins: 0, losses: 3, nrr: -3.89, points: 0 },
  { id: 5, name: 'House Akash', color: '#0891B2', logo: 'Akash.png', played: 3, wins: 0, losses: 3, nrr: -6.53, points: 0 },
];

const DEFAULT_JR_TEAMS: TeamStanding[] = [
  { id: 4, name: 'House Jal', color: '#9333EA', logo: 'jal.png', played: 4, wins: 3, losses: 1, nrr: 2.64, points: 6 },
  { id: 1, name: 'House Vayu', color: '#2563EB', logo: 'vayu.png', played: 4, wins: 3, losses: 1, nrr: -0.95, points: 6 },
  { id: 5, name: 'House Akash', color: '#0891B2', logo: 'Akash.png', played: 3, wins: 2, losses: 1, nrr: 1.97, points: 4 },
  { id: 2, name: 'House Agni', color: '#DC2626', logo: 'agni.png', played: 3, wins: 2, losses: 1, nrr: 1.36, points: 4 },
  { id: 3, name: 'House Prudvi', color: '#16A34A', logo: 'Prudhvi.png', played: 4, wins: 0, losses: 4, nrr: -4.41, points: 0 },
];

function sortStandings(teams: TeamStanding[]): TeamStanding[] {
  return [...teams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.nrr !== a.nrr) return b.nrr - a.nrr;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.id - b.id;
  });
}

function formatNRR(nrr: number): string {
  const n = typeof nrr === 'number' ? nrr : parseFloat(nrr);
  if (isNaN(n)) return '+0.00';
  return (n >= 0 ? '+' : '') + n.toFixed(2);
}

const MEDALS = ['🥇', '🥈', '🥉'];

interface CsdCricketWidgetProps {
  containerId?: string;
  defaultLeague?: 'jr' | 'sr';
  linkToSite?: string;
  className?: string;
}

export const CsdCricketWidget: React.FC<CsdCricketWidgetProps> = ({
  defaultLeague = 'jr',
  linkToSite = 'https://csit-csd-pointstable.vercel.app/points-table.html',
  className = '',
}) => {
  const [activeLeague, setActiveLeague] = useState<'jr' | 'sr'>(defaultLeague);
  const [srTeams, setSrTeams] = useState<TeamStanding[]>(DEFAULT_SR_TEAMS);
  const [jrTeams, setJrTeams] = useState<TeamStanding[]>(DEFAULT_JR_TEAMS);
  const [isLiveLoaded, setIsLiveLoaded] = useState(false);

  // Dynamically fetch and sync real-time points data from official Vercel widget script
  useEffect(() => {
    let isMounted = true;
    fetch('https://csit-csd-pointstable.vercel.app/widget.js')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch widget code');
        return res.text();
      })
      .then((code) => {
        if (!isMounted) return;
        const srMatch = code.match(/const\s+SR_TEAMS\s*=\s*(\[[\s\S]*?\]);/);
        const jrMatch = code.match(/const\s+JR_TEAMS\s*=\s*(\[[\s\S]*?\]);/);

        if (srMatch && srMatch[1]) {
          try {
            const parsed = Function(`"use strict"; return (${srMatch[1]});`)();
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSrTeams(parsed);
            }
          } catch (e) {
            console.warn('Could not parse SR teams:', e);
          }
        }

        if (jrMatch && jrMatch[1]) {
          try {
            const parsed = Function(`"use strict"; return (${jrMatch[1]});`)();
            if (Array.isArray(parsed) && parsed.length > 0) {
              setJrTeams(parsed);
            }
          } catch (e) {
            console.warn('Could not parse JR teams:', e);
          }
        }
        setIsLiveLoaded(true);
      })
      .catch((err) => {
        console.warn('Using local fallback standings data:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const currentTeams = sortStandings(activeLeague === 'sr' ? srTeams : jrTeams);

  return (
    <div
      className={`w-full max-w-[560px] bg-white rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.06),0_1px_4px_-1px_rgba(0,0,0,0.03)] overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_-4px_rgba(249,115,22,0.12)] ${className}`}
    >
      {/* ── Widget Header ── */}
      <div className="flex items-center justify-between px-4 py-3.5 bg-slate-50/80 border-b border-slate-200/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600 shrink-0 shadow-2xs">
            <Trophy size={16} className="text-orange-500" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-[13.5px] font-bold text-slate-900 tracking-tight truncate m-0">
                CSD &amp; CSIT Cricket League 2026
              </h3>
              {isLiveLoaded && (
                <span
                  title="Live Data Connected"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200"
                >
                  <Activity size={10} className="animate-pulse text-emerald-500" />
                  LIVE
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium text-slate-500 m-0">Official Points Table &amp; Standings</p>
          </div>
        </div>

        {linkToSite && (
          <a
            href={linkToSite}
            target="_blank"
            rel="noopener noreferrer"
            title="Open Complete Points Table &amp; Fixtures"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-orange-600 bg-orange-50/90 hover:bg-orange-100 hover:text-orange-700 border border-orange-200/80 transition-all duration-150 shrink-0 active:scale-95 shadow-2xs"
          >
            <span>Full View</span>
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      {/* ── League Tabs Switcher ── */}
      <div className="p-3 pb-0">
        <div className="grid grid-cols-2 gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/60">
          <button
            type="button"
            onClick={() => setActiveLeague('jr')}
            className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer select-none flex items-center justify-center gap-1.5 ${
              activeLeague === 'jr'
                ? 'bg-white text-orange-600 shadow-xs border border-slate-200/60 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Junior League (JR)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveLeague('sr')}
            className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer select-none flex items-center justify-center gap-1.5 ${
              activeLeague === 'sr'
                ? 'bg-white text-orange-600 shadow-xs border border-slate-200/60 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Senior League (SR)</span>
          </button>
        </div>
      </div>

      {/* ── Standings Table ── */}
      <div className="p-3 pt-2">
        <div className="overflow-x-auto rounded-xl border border-slate-200/70 bg-white">
          <AnimatePresence mode="wait">
            <motion.table
              key={activeLeague}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="w-full text-left border-collapse text-[12px]"
            >
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3 text-center w-8">#</th>
                  <th className="py-2.5 px-3 text-left">Team</th>
                  <th className="py-2.5 px-2 text-center" title="Matches Played">P</th>
                  <th className="py-2.5 px-2 text-center" title="Matches Won">W</th>
                  <th className="py-2.5 px-2 text-center" title="Matches Lost">L</th>
                  <th className="py-2.5 px-2.5 text-center" title="Net Run Rate">NRR</th>
                  <th className="py-2.5 px-3 text-center" title="Tournament Points">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentTeams.map((team, idx) => {
                  const isTopTwo = idx < 2;
                  const nrrVal = typeof team.nrr === 'number' ? team.nrr : parseFloat(team.nrr);
                  const isPosNrr = nrrVal > 0;
                  const isNegNrr = nrrVal < 0;

                  return (
                    <tr
                      key={team.id || team.name}
                      className={`transition-colors duration-100 hover:bg-slate-50/80 ${
                        isTopTwo ? 'bg-orange-50/30' : ''
                      }`}
                    >
                      {/* Rank Position */}
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                        {MEDALS[idx] ? (
                          <span className="text-[13px]">{MEDALS[idx]}</span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded text-[11px] font-bold text-slate-500 bg-slate-100">
                            {idx + 1}
                          </span>
                        )}
                      </td>

                      {/* Team Name with Color Pill */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: team.color }}
                          />
                          <span className="font-semibold text-slate-900 text-[12.5px] truncate">
                            {team.name}
                          </span>
                        </div>
                      </td>

                      {/* Played */}
                      <td className="py-2.5 px-2 text-center font-medium text-slate-600">
                        {team.played}
                      </td>

                      {/* Won */}
                      <td className="py-2.5 px-2 text-center font-semibold text-slate-700">
                        {team.wins}
                      </td>

                      {/* Lost */}
                      <td className="py-2.5 px-2 text-center font-medium text-slate-500">
                        {team.losses}
                      </td>

                      {/* NRR */}
                      <td
                        className={`py-2.5 px-2.5 text-center font-bold text-[11.5px] ${
                          isPosNrr
                            ? 'text-emerald-600'
                            : isNegNrr
                            ? 'text-rose-500'
                            : 'text-slate-400'
                        }`}
                      >
                        {formatNRR(team.nrr)}
                      </td>

                      {/* Points */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-md font-black text-slate-900 bg-slate-100/90 text-[12.5px]">
                          {team.points}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </motion.table>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="px-4 py-2.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />
          <span className="font-medium">Top 2 teams qualify for the Championship Final</span>
        </div>
        <span className="text-[10.5px] text-slate-400 font-medium">SRKR CSD &amp; CSIT</span>
      </div>
    </div>
  );
};

export default CsdCricketWidget;
