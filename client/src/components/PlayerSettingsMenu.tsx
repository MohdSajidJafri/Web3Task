import React, { useState } from 'react';
import {
  Settings,
  ChevronRight,
  ChevronLeft,
  Check,
  Gauge,
  Sliders,
  Subtitles,
  Sparkles,
  Repeat,
  X
} from 'lucide-react';

export type SettingsSubMenu = 'main' | 'speed' | 'quality' | 'captions';

interface PlayerSettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  playbackRate: number;
  onSelectSpeed: (speed: number) => void;
  quality: string;
  onSelectQuality: (quality: string) => void;
  captions: string;
  onSelectCaptions: (captions: string) => void;
  ambientMode: boolean;
  onToggleAmbient: () => void;
  loop: boolean;
  onToggleLoop: () => void;
}

export const PlayerSettingsMenu: React.FC<PlayerSettingsMenuProps> = ({
  isOpen,
  onClose,
  playbackRate,
  onSelectSpeed,
  quality,
  onSelectQuality,
  captions,
  onSelectCaptions,
  ambientMode,
  onToggleAmbient,
  loop,
  onToggleLoop,
}) => {
  const [subMenu, setSubMenu] = useState<SettingsSubMenu>('main');

  if (!isOpen) return null;

  const speedOptions = [
    { label: '0.25x', value: 0.25 },
    { label: '0.5x', value: 0.5 },
    { label: '0.75x', value: 0.75 },
    { label: 'Normal (1x)', value: 1 },
    { label: '1.25x', value: 1.25 },
    { label: '1.5x', value: 1.5 },
    { label: '1.75x', value: 1.75 },
    { label: '2x', value: 2 },
  ];

  const qualityOptions = [
    { label: 'Auto (1080p)', value: 'auto' },
    { label: '1080p HD', value: 'hd1080' },
    { label: '720p HD', value: 'hd720' },
    { label: '480p', value: 'large' },
    { label: '360p', value: 'medium' },
    { label: '240p', value: 'small' },
    { label: '144p', value: 'tiny' },
  ];

  const captionOptions = [
    { label: 'Off', value: 'off' },
    { label: 'English (auto-generated)', value: 'en' },
    { label: 'Spanish', value: 'es' },
    { label: 'French', value: 'fr' },
  ];

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute bottom-12 right-2 z-50 w-64 bg-[#1B1D24]/95 backdrop-blur-md border border-white/[0.1] rounded-2xl shadow-2xl p-2 text-xs text-white select-none animate-in fade-in zoom-in-95 duration-150"
    >
      {/* 1. Main Settings Menu */}
      {subMenu === 'main' && (
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/[0.08] text-zinc-400 font-bold text-[11px] uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-white">
              <Settings className="w-3.5 h-3.5 text-[#FF9966]" />
              <span>Playback Settings</span>
            </span>
            <button onClick={onClose} className="hover:text-white transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Speed Row */}
          <button
            onClick={() => setSubMenu('speed')}
            className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-[#242731] rounded-xl transition-colors text-left"
          >
            <span className="flex items-center gap-2">
              <Gauge className="w-3.5 h-3.5 text-[#ADADB8]" />
              <span>Playback speed</span>
            </span>
            <span className="flex items-center gap-1 text-[#ADADB8] font-mono text-[11px]">
              <span>{playbackRate === 1 ? 'Normal' : `${playbackRate}x`}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </button>

          {/* Quality Row */}
          <button
            onClick={() => setSubMenu('quality')}
            className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-[#26262C] rounded-lg transition-colors text-left"
          >
            <span className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-[#ADADB8]" />
              <span>Quality</span>
            </span>
            <span className="flex items-center gap-1 text-[#ADADB8] text-[11px]">
              <span>{qualityOptions.find((q) => q.value === quality)?.label || 'Auto (1080p)'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </button>

          {/* Subtitles / CC Row */}
          <button
            onClick={() => setSubMenu('captions')}
            className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-[#26262C] rounded-lg transition-colors text-left"
          >
            <span className="flex items-center gap-2">
              <Subtitles className="w-3.5 h-3.5 text-[#ADADB8]" />
              <span>Subtitles / CC</span>
            </span>
            <span className="flex items-center gap-1 text-[#ADADB8] text-[11px]">
              <span>{captionOptions.find((c) => c.value === captions)?.label || 'Off'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </button>

          {/* Ambient Mode Toggle */}
          <button
            onClick={onToggleAmbient}
            className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-[#26262C] rounded-lg transition-colors text-left"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#ADADB8]" />
              <span>Ambient mode</span>
            </span>
            <span
              className={`w-8 h-4 rounded-full transition-colors relative flex items-center px-0.5 ${
                ambientMode ? 'bg-[#9146FF]' : 'bg-[#2F2F35]'
              }`}
            >
              <span
                className={`w-3 h-3 rounded-full bg-white transition-transform ${
                  ambientMode ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </span>
          </button>

          {/* Loop Video Toggle */}
          <button
            onClick={onToggleLoop}
            className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-[#26262C] rounded-lg transition-colors text-left"
          >
            <span className="flex items-center gap-2">
              <Repeat className="w-3.5 h-3.5 text-[#ADADB8]" />
              <span>Loop video</span>
            </span>
            <span
              className={`w-8 h-4 rounded-full transition-colors relative flex items-center px-0.5 ${
                loop ? 'bg-[#9146FF]' : 'bg-[#2F2F35]'
              }`}
            >
              <span
                className={`w-3 h-3 rounded-full bg-white transition-transform ${
                  loop ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </span>
          </button>
        </div>
      )}

      {/* 2. Playback Speed Submenu */}
      {subMenu === 'speed' && (
        <div className="space-y-0.5">
          <button
            onClick={() => setSubMenu('main')}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 border-b border-[#2F2F35]/60 hover:text-white text-[#ADADB8] font-bold text-[11px]"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Playback speed</span>
          </button>
          <div className="max-h-56 overflow-y-auto no-scrollbar py-1">
            {speedOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onSelectSpeed(opt.value);
                  setSubMenu('main');
                }}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-[#26262C] transition-colors text-left ${
                  playbackRate === opt.value ? 'text-[#9146FF] font-bold' : 'text-[#EFEFF1]'
                }`}
              >
                <span>{opt.label}</span>
                {playbackRate === opt.value && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Quality Submenu */}
      {subMenu === 'quality' && (
        <div className="space-y-0.5">
          <button
            onClick={() => setSubMenu('main')}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 border-b border-[#2F2F35]/60 hover:text-white text-[#ADADB8] font-bold text-[11px]"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Quality</span>
          </button>
          <div className="max-h-56 overflow-y-auto no-scrollbar py-1">
            {qualityOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onSelectQuality(opt.value);
                  setSubMenu('main');
                }}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-[#26262C] transition-colors text-left ${
                  quality === opt.value ? 'text-[#9146FF] font-bold' : 'text-[#EFEFF1]'
                }`}
              >
                <span>{opt.label}</span>
                {quality === opt.value && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Subtitles Submenu */}
      {subMenu === 'captions' && (
        <div className="space-y-0.5">
          <button
            onClick={() => setSubMenu('main')}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 border-b border-[#2F2F35]/60 hover:text-white text-[#ADADB8] font-bold text-[11px]"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Subtitles / Closed Captions</span>
          </button>
          <div className="max-h-56 overflow-y-auto no-scrollbar py-1">
            {captionOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onSelectCaptions(opt.value);
                  setSubMenu('main');
                }}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-[#26262C] transition-colors text-left ${
                  captions === opt.value ? 'text-[#9146FF] font-bold' : 'text-[#EFEFF1]'
                }`}
              >
                <span>{opt.label}</span>
                {captions === opt.value && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
