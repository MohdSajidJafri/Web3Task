import React from 'react';
import { LiveReaction } from '../types';
import { PremiumEmoji } from './PremiumEmoji';

interface FloatingReactionsProps {
  reactions: LiveReaction[];
}

export const FloatingReactions: React.FC<FloatingReactionsProps> = ({ reactions }) => {
  return (
    <div className="absolute inset-y-0 right-3 w-32 pointer-events-none overflow-hidden z-20 flex flex-col justify-end items-end pb-12">
      {reactions.map((r) => {
        const xOffset = ((r.timestamp % 5) - 2) * 8;
        return (
          <div
            key={r.id}
            className="animate-float-reaction flex items-center gap-1.5 select-none absolute"
            style={{
              right: `${12 + xOffset}px`,
              bottom: '16px',
            }}
          >
            <PremiumEmoji emoji={r.emoji} size={36} className="filter drop-shadow-xl" />
            {r.username && (
              <span className="text-[10px] font-bold text-white bg-black/70 px-1.5 py-0.5 rounded-[4px] shadow">
                {r.username}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
