import React, { useState, useEffect } from 'react';
import { Tv, Plus, LogIn, Sparkles, Shield, Users, Radio } from 'lucide-react';

interface LobbyProps {
  onJoin: (username: string, roomId?: string) => void;
  initialRoomCode?: string;
}

export const Lobby: React.FC<LobbyProps> = ({ onJoin, initialRoomCode }) => {
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('watchsync_username') || '';
  });
  const [roomCode, setRoomCode] = useState(initialRoomCode || '');
  const [tab, setTab] = useState<'create' | 'join'>(initialRoomCode ? 'join' : 'create');
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialRoomCode) {
      setRoomCode(initialRoomCode);
      setTab('join');
    }
  }, [initialRoomCode]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter a display name to continue');
      return;
    }
    localStorage.setItem('watchsync_username', username.trim());
    onJoin(username.trim());
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter a display name to continue');
      return;
    }
    if (!roomCode.trim()) {
      setError('Please enter a 6-character room code');
      return;
    }
    localStorage.setItem('watchsync_username', username.trim());
    onJoin(username.trim(), roomCode.trim().toUpperCase());
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-950 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Brand Logo & Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 shadow-xl shadow-red-500/20 text-white mb-2">
            <Tv className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            <span>WatchSync</span>
          </h1>
          <p className="text-sm text-slate-400">
            Real-Time YouTube Watch Party with Strict Server-Side RBAC
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-xl">
          {/* Tabs */}
          <div className="flex p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
            <button
              onClick={() => {
                setTab('create');
                setError('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                tab === 'create'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Create Party</span>
            </button>
            <button
              onClick={() => {
                setTab('join');
                setError('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                tab === 'join'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Join Party</span>
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs text-center font-medium">
              {error}
            </div>
          )}

          {tab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Your Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alex"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                  maxLength={24}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 text-xs text-slate-400 space-y-1">
                <p className="flex items-center gap-1.5 font-medium text-slate-300">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>Host Privileges</span>
                </p>
                <p>Creating a room gives you full playback control, role management, and request approval powers.</p>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-semibold text-sm shadow-xl shadow-red-600/20 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Create New Room</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Your Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Jordan"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                  maxLength={24}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">6-Character Room Code</label>
                <input
                  type="text"
                  placeholder="e.g. PARTY9"
                  value={roomCode}
                  onChange={(e) => {
                    setRoomCode(e.target.value.toUpperCase());
                    setError('');
                  }}
                  maxLength={10}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono tracking-wider uppercase text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 text-xs text-slate-400 space-y-1">
                <p className="flex items-center gap-1.5 font-medium text-slate-300">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>Participant Role</span>
                </p>
                <p>You will join as a Participant in perfect sync with the Host. You can submit requests anytime.</p>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-semibold text-sm shadow-xl shadow-red-600/20 transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>Join Watch Party</span>
              </button>
            </form>
          )}
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-slate-400">
          <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
            <span className="font-semibold text-slate-200 block">Sub-Second</span>
            <span>Real-time Sync</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
            <span className="font-semibold text-slate-200 block">Strict RBAC</span>
            <span>Server-side logic</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
            <span className="font-semibold text-slate-200 block">Approval Flow</span>
            <span>Host requests</span>
          </div>
        </div>
      </div>
    </div>
  );
};
