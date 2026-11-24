import React, { useState, useEffect } from 'react';
import { Tv, Sparkles, LogIn, Users, Flame, Radio, Play, Shield, Globe, Lock } from 'lucide-react';

interface LobbyProps {
  onJoin: (username: string, roomId?: string) => void;
  initialRoomCode?: string;
}

export const Lobby: React.FC<LobbyProps> = ({ onJoin, initialRoomCode }) => {
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('watchsync_username') || '';
  });
  const [roomCode, setRoomCode] = useState(initialRoomCode || '');
  const [partyName, setPartyName] = useState('My Stream Night');
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialRoomCode) {
      setRoomCode(initialRoomCode);
    }
  }, [initialRoomCode]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter your display name to start a party');
      return;
    }
    localStorage.setItem('watchsync_username', username.trim());
    onJoin(username.trim());
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter your display name to join');
      return;
    }
    if (!roomCode.trim()) {
      setError('Please enter a valid 6-character room code');
      return;
    }
    localStorage.setItem('watchsync_username', username.trim());
    onJoin(username.trim(), roomCode.trim().toUpperCase());
  };

  // Sample curated parties for the "Browse Active Parties" shelf
  const sampleParties = [
    {
      id: 'GTAVIP',
      title: 'GTA VI Trailer Reveal & Breakdown',
      creator: 'Sajid (Host)',
      viewers: '1.7K',
      thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
      duration: '25m',
    },
    {
      id: 'LOFIPY',
      title: 'Lofi Hip Hop Radio — Beats to Relax/Study',
      creator: 'Alex',
      viewers: '3.2K',
      thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
      duration: 'LIVE',
    },
    {
      id: 'CYBER9',
      title: 'Cyberpunk 2077 Night City Walkthrough',
      creator: 'Jordan',
      viewers: '850',
      thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
      duration: '1h 12m',
    },
    {
      id: 'WEB3AI',
      title: 'Next-Gen Web3 & AI Keynote Livestream',
      creator: 'Elena',
      viewers: '2.4K',
      thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
      duration: '45m',
    },
  ];

  const handleSelectSample = (sampleCode: string) => {
    setRoomCode(sampleCode);
    if (username.trim()) {
      onJoin(username.trim(), sampleCode);
    } else {
      setError('Enter your display name above to join this party');
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col items-center justify-start py-8 px-4 sm:px-6 lg:px-8 relative overflow-y-auto">
      {/* Top subtle purple glow backdrop */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-[#9146FF]/10 blur-[120px] pointer-events-none rounded-full" />

      <div className="w-full max-w-4xl z-10 space-y-8">
        {/* Header Hero Banner */}
        <div className="space-y-1.5 text-left">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Start or Join a Watch Party
          </h1>
          <p className="text-xs sm:text-sm text-[#ADADB8]">
            Start or join a Watch Party, to keep synchronous connection, videos, and private conversations to continue.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-[#EB0400]/10 border border-[#EB0400]/40 rounded-lg text-[#FF4A4A] text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Two Side-by-Side Cards (Twitch Theater Style) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Create Watch Party */}
          <div className="bg-[#18181B] border border-[#2F2F35] rounded-xl p-5 sm:p-6 flex flex-col justify-between shadow-2xl hover:border-[#9146FF]/40 transition-colors">
            <div className="space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Create Watch Party</span>
              </h2>

              <button
                type="button"
                onClick={handleCreate}
                className="w-full py-2.5 px-4 bg-[#9146FF] hover:bg-[#772CE8] active:bg-[#5C16C5] text-white rounded font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Create Room</span>
              </button>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[11px] font-semibold text-[#ADADB8] uppercase tracking-wider block mb-1">
                    Your Display Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sajid"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError('');
                    }}
                    maxLength={24}
                    className="w-full bg-[#1F1F23] hover:bg-[#26262C] focus:bg-[#0E0E10] border border-[#2F2F35] focus:border-[#9146FF] rounded px-3 py-2 text-xs text-white placeholder-[#71717A] outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#ADADB8] uppercase tracking-wider block mb-1">
                    Party Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. GTA VI Trailer & Beats"
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    className="w-full bg-[#1F1F23] hover:bg-[#26262C] focus:bg-[#0E0E10] border border-[#2F2F35] focus:border-[#9146FF] rounded px-3 py-2 text-xs text-white placeholder-[#71717A] outline-none transition-colors"
                  />
                </div>

                {/* Public / Private radios */}
                <div className="flex items-center gap-5 pt-1 text-xs">
                  <label
                    onClick={() => setIsPublic(true)}
                    className="flex items-center gap-1.5 cursor-pointer text-[#EFEFF1]"
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        isPublic ? 'border-[#9146FF]' : 'border-[#464649]'
                      }`}
                    >
                      {isPublic && <span className="w-2 h-2 rounded-full bg-[#9146FF]" />}
                    </span>
                    <Globe className="w-3.5 h-3.5 text-[#ADADB8]" />
                    <span>Public</span>
                  </label>

                  <label
                    onClick={() => setIsPublic(false)}
                    className="flex items-center gap-1.5 cursor-pointer text-[#ADADB8] hover:text-[#EFEFF1]"
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        !isPublic ? 'border-[#9146FF]' : 'border-[#464649]'
                      }`}
                    >
                      {!isPublic && <span className="w-2 h-2 rounded-full bg-[#9146FF]" />}
                    </span>
                    <Lock className="w-3.5 h-3.5 text-[#ADADB8]" />
                    <span>Private</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Join Room Code */}
          <div className="bg-[#18181B] border border-[#2F2F35] rounded-xl p-5 sm:p-6 flex flex-col justify-between shadow-2xl hover:border-[#9146FF]/40 transition-colors">
            <form onSubmit={handleJoin} className="space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Join Room Code</span>
              </h2>

              <div>
                <label className="text-[11px] font-semibold text-[#ADADB8] uppercase tracking-wider block mb-1">
                  Your Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. ViewerOne"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                  maxLength={24}
                  className="w-full bg-[#1F1F23] hover:bg-[#26262C] focus:bg-[#0E0E10] border border-[#2F2F35] focus:border-[#9146FF] rounded px-3 py-2 text-xs text-white placeholder-[#71717A] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#ADADB8] uppercase tracking-wider block mb-1">
                  Enter Room Code
                </label>
                <input
                  type="text"
                  placeholder="Enter Room Code (e.g., TYX-901)"
                  value={roomCode}
                  onChange={(e) => {
                    setRoomCode(e.target.value.toUpperCase());
                    setError('');
                  }}
                  maxLength={10}
                  className="w-full bg-[#1F1F23] hover:bg-[#26262C] focus:bg-[#0E0E10] border border-[#2F2F35] focus:border-[#9146FF] rounded px-3 py-2 text-xs font-mono tracking-widest uppercase text-white placeholder-[#71717A] outline-none transition-colors"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-[#1F1F23] hover:bg-[#26262C] active:bg-[#323238] border border-[#2F2F35] text-white rounded font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4 text-[#BF94FF]" />
                  <span>Join Party</span>
                </button>
              </div>

              <p className="text-[11px] text-[#ADADB8] text-center pt-1">
                You will join as a <span className="text-[#00F593] font-semibold">Synced Participant</span>.
              </p>
            </form>
          </div>
        </div>

        {/* Shelf: Browse Active Parties */}
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#EB0400]" />
              <span>Browse Active Parties</span>
            </h3>
            <span className="text-xs text-[#ADADB8]">Click any party to quick-join</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sampleParties.map((p) => (
              <div
                key={p.id}
                onClick={() => handleSelectSample(p.id)}
                className="group cursor-pointer bg-[#18181B] border border-[#2F2F35] hover:border-[#9146FF] rounded-lg overflow-hidden transition-all duration-200 hover:-translate-y-1 shadow-lg"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video w-full bg-black overflow-hidden">
                  <img
                    src={p.thumbnail}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80 group-hover:opacity-100"
                  />
                  {/* Live Badge */}
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-[#EB0400] text-white text-[10px] font-black uppercase flex items-center gap-1 shadow">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    <span>LIVE</span>
                  </div>
                  {/* Viewers */}
                  <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/75 text-[#EFEFF1] text-[10px] font-mono">
                    👥 {p.viewers}
                  </div>
                  {/* Duration */}
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/75 text-[#EFEFF1] text-[10px] font-mono">
                    {p.duration}
                  </div>
                </div>

                {/* Details */}
                <div className="p-2.5 space-y-1">
                  <h4 className="text-xs font-semibold text-white line-clamp-1 group-hover:text-[#BF94FF] transition-colors">
                    {p.title}
                  </h4>
                  <p className="text-[11px] text-[#ADADB8] flex items-center justify-between">
                    <span>{p.creator}</span>
                    <span className="font-mono text-[10px] text-[#9146FF]">CODE: {p.id}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
