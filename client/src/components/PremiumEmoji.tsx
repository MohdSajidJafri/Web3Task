import React, { useState } from 'react';

/**
 * Verified Icons8 Apple/3D Emoji Style CDN URLs (https://icons8.com/icons/set/emoji--style-emoji)
 */
export const EMOJI_CDN_MAP: Record<string, string> = {
  '🔥': 'https://img.icons8.com/emoji/96/fire.png',
  '😂': 'https://img.icons8.com/emoji/96/face-with-tears-of-joy.png',
  '😱': 'https://img.icons8.com/emoji/96/face-screaming-in-fear.png',
  '💜': 'https://img.icons8.com/emoji/96/purple-heart.png',
  '👏': 'https://img.icons8.com/emoji/96/clapping-hands-light-skin-tone.png',
  '😍': 'https://img.icons8.com/emoji/96/smiling-face-with-heart-eyes.png',
  '🤩': 'https://img.icons8.com/emoji/96/star-struck.png',
  '🤣': 'https://img.icons8.com/emoji/96/rolling-on-the-floor-laughing.png',
  '😎': 'https://img.icons8.com/emoji/96/smiling-face-with-sunglasses.png',
  '🎉': 'https://img.icons8.com/emoji/96/party-popper.png',
  '💯': 'https://img.icons8.com/emoji/96/hundred-points.png',
  '👍': 'https://img.icons8.com/emoji/96/thumbs-up.png',
  '❤️': 'https://img.icons8.com/emoji/96/red-heart.png',
  '✨': 'https://img.icons8.com/emoji/96/sparkles.png',
  '👀': 'https://img.icons8.com/emoji/96/eyes-emoji.png',
  '🎮': 'https://img.icons8.com/emoji/96/video-game.png',
  '🎵': 'https://img.icons8.com/emoji/96/musical-notes-emoji.png',
  '🌿': 'https://img.icons8.com/emoji/96/deciduous-tree-emoji.png',
  '🎬': 'https://img.icons8.com/emoji/96/clapper-board-emoji.png',
  '💻': 'https://img.icons8.com/emoji/96/laptop-emoji.png',
  '🍿': 'https://img.icons8.com/emoji/96/popcorn-emoji.png',
  '📺': 'https://img.icons8.com/emoji/96/television-emoji.png',
  '👑': 'https://img.icons8.com/emoji/96/crown-emoji.png',
  '🔔': 'https://img.icons8.com/emoji/96/bell-emoji.png',
  '🔒': 'https://img.icons8.com/emoji/96/locked.png',
};

export const REACTION_EMOJIS = ['🔥', '😂', '😱', '💜', '👏', '🤩', '🎉', '💯'];

export const CHAT_PICKER_EMOJIS = [
  '🔥', '😂', '🤣', '😍', '🤩', '😱',
  '😎', '💜', '❤️', '👏', '👍', '🎉',
  '💯', '✨', '👀', '🍿', '🎮', '🎵',
];

interface PremiumEmojiProps {
  emoji: string;
  size?: number;
  className?: string;
  alt?: string;
}

export const PremiumEmoji: React.FC<PremiumEmojiProps> = ({
  emoji,
  size = 20,
  className = '',
  alt,
}) => {
  const [failed, setFailed] = useState(false);
  const src = EMOJI_CDN_MAP[emoji];

  if (!src || failed) {
    return (
      <span
        className={`inline-flex items-center justify-center leading-none select-none ${className}`}
        style={{ fontSize: Math.max(12, Math.round(size * 0.85)) }}
      >
        {emoji}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt || emoji}
      width={size}
      height={size}
      draggable={false}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`inline-block object-contain select-none shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
};

/**
 * Splits text so any known Unicode emoji renders as an inline PremiumEmoji.
 */
export function renderTextWithPremiumEmojis(text: string, size = 16): React.ReactNode[] {
  const keys = Object.keys(EMOJI_CDN_MAP);
  // Escape regex special chars and sort longest first
  const escaped = keys
    .sort((a, b) => b.length - a.length)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'g');
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (EMOJI_CDN_MAP[part]) {
      return <PremiumEmoji key={i} emoji={part} size={size} className="align-text-bottom mx-0.5" />;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}
