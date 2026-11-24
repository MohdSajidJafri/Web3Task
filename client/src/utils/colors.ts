// Deterministic Twitch chat colors for usernames
const TWITCH_CHAT_COLORS = [
  '#FF4A4A', // Crimson Red
  '#00FF7F', // Spring Green
  '#1E90FF', // Dodger Blue
  '#FF69B4', // Hot Pink
  '#BF94FF', // Light Purple
  '#FFA500', // Orange
  '#00F593', // Emerald Mint
  '#FFD700', // Goldenrod
  '#00E5FF', // Cyan
  '#E066FF', // Medium Orchid
  '#FF7F50', // Coral
  '#2EE59D', // Jade Green
];

export function getTwitchUserColor(identifier: string): string {
  if (!identifier) return TWITCH_CHAT_COLORS[0];
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % TWITCH_CHAT_COLORS.length;
  return TWITCH_CHAT_COLORS[index];
}
