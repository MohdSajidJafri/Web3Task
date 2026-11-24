import React from 'react';
import { LiveReaction } from '../types';

interface FloatingReactionsProps {
  reactions: LiveReaction[];
}

export const FloatingReactions: React.FC<FloatingReactionsProps> = ({ reactions }) => {
  return (
    <div className="absolute inset-y-0 right-3 w-28 pointer-events-none overflow-hidden z-20 flex flex-col justify-end items-end pb-12">
      {reactions.map((r, index) => {
        // Deterministic offset based on timestamp
        const xOffset = ((r.timestamp % 5) - 2) * 8; // -16px to +16px
        return (
          <div
            key={r.id}
            className="animate-float-reaction flex items-center gap-1.5 select-none absolute"
            style={{
              right: `${12 + xOffset}px`,
              bottom: '16px',
            }}
          >
            <span className="text-3xl filter drop-shadow-lg">{r.emoji}</span>
            {r.username && (
              <span className="text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded shadow">
                {r.username}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
