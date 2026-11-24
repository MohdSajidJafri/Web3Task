import React from 'react';
import { X, Command, Play, FastForward, Volume2, Maximize2, MessageSquare, HelpCircle } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'Play / Pause Video (or Request Control)', icon: <Play className="w-3.5 h-3.5 text-[#2EE59D]" /> },
    { key: '← / →', desc: 'Seek Backward / Forward 5 seconds', icon: <FastForward className="w-3.5 h-3.5 text-[#FF9966]" /> },
    { key: 'M', desc: 'Toggle Local Mute / Unmute', icon: <Volume2 className="w-3.5 h-3.5 text-[#00E5FF]" /> },
    { key: 'F', desc: 'Toggle Fullscreen Theater Mode', icon: <Maximize2 className="w-3.5 h-3.5 text-[#FFD700]" /> },
    { key: 'C', desc: 'Toggle Collapse / Expand Right Sidebar', icon: <MessageSquare className="w-3.5 h-3.5 text-[#FF5E62]" /> },
    { key: '?', desc: 'Toggle Keyboard Shortcuts Guide', icon: <HelpCircle className="w-3.5 h-3.5 text-white" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="bg-[#1B1D24] border border-white/[0.08] w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-r from-[#FF5E62]/15 to-[#FF9966]/15 text-[#FF9966] border border-[#FF5E62]/20">
              <Command className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Keyboard Shortcuts</h3>
              <p className="text-[11px] text-zinc-400">Quick controls for the Watch Theater</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-[#242731] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="divide-y divide-white/[0.06]">
          {shortcuts.map((s) => (
            <div key={s.key} className="py-2.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-zinc-200">
                {s.icon}
                <span className="font-medium">{s.desc}</span>
              </div>
              <kbd className="px-2.5 py-1 rounded-xl bg-[#242731] border border-white/[0.08] text-white font-mono font-bold text-[11px] shadow-sm shrink-0">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#FF5E62] to-[#FF9966] hover:brightness-110 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-[#FF5E62]/25 transition-all"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
