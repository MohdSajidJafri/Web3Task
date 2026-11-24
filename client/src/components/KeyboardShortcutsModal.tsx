import React from 'react';
import { X, Command, Play, FastForward, Volume2, Maximize2, MessageSquare, HelpCircle } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'Play / Pause Video (or Request Control)', icon: <Play className="w-3.5 h-3.5 text-[#00F593]" /> },
    { key: '← / →', desc: 'Seek Backward / Forward 5 seconds', icon: <FastForward className="w-3.5 h-3.5 text-[#BF94FF]" /> },
    { key: 'M', desc: 'Toggle Local Mute / Unmute', icon: <Volume2 className="w-3.5 h-3.5 text-[#00E5FF]" /> },
    { key: 'F', desc: 'Toggle Fullscreen Theater Mode', icon: <Maximize2 className="w-3.5 h-3.5 text-[#FFD700]" /> },
    { key: 'C', desc: 'Toggle Collapse / Expand Right Sidebar', icon: <MessageSquare className="w-3.5 h-3.5 text-[#FF69B4]" /> },
    { key: '?', desc: 'Toggle Keyboard Shortcuts Guide', icon: <HelpCircle className="w-3.5 h-3.5 text-white" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="bg-[#18181B] border border-[#2F2F35] w-full max-w-md rounded-xl p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2F2F35]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-[#9146FF]/20 text-[#BF94FF]">
              <Command className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Keyboard Shortcuts</h3>
              <p className="text-[11px] text-[#ADADB8]">Quick controls for the Watch Theater</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#ADADB8] hover:text-white hover:bg-[#1F1F23] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="divide-y divide-[#2F2F35]/50">
          {shortcuts.map((s) => (
            <div key={s.key} className="py-2.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-[#EFEFF1]">
                {s.icon}
                <span className="font-medium">{s.desc}</span>
              </div>
              <kbd className="px-2 py-1 rounded bg-[#1F1F23] border border-[#2F2F35] text-white font-mono font-bold text-[11px] shadow-sm shrink-0">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#9146FF] hover:bg-[#772CE8] active:scale-[0.98] text-white font-bold text-xs shadow-md transition-all"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
