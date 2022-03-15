// Yes, I did look at Jan's DiscordBridge code, but I tried to make those pattern myself. Really. Trust me.

export const DiscordEmojiPattern = /<:(?<name>.+?):(?<id>[0-9]{1,22})>/g;
export const DiscordPingPattern = /<(@|@!)(?<id>[0-9]{1,22})>/g;
