import { Message } from "discord.js";
import npmlog from "npmlog"
// ---------------------------------------------------------------------------
// Raw component data shapes (Discord API types not fully exposed by discord.js)
// ---------------------------------------------------------------------------

interface RawComponent {
  type: number;
  id?: number;
  content?: string;           // type 10 TextDisplay
  components?: RawComponent[]; // type 17 Container, type 9 Section, type 1 ActionRow
  media?: { url?: string };  // type 11 Thumbnail
  items?: Array<{ media?: { url?: string } }>;
  accessory?: RawComponent;   // type 9 Section
  divider?: boolean;          // type 14 Separator
  spacing?: number;           // type 14 Separator
  spoiler?: boolean;          // type 17 Container
  accent_color?: number | null;
  // Interactive component fields (ignored)
  label?: string;
  custom_id?: string;
  placeholder?: string;
  options?: unknown[];
}

// ---------------------------------------------------------------------------
// Timestamp formatter
// ---------------------------------------------------------------------------

function formatTimestamp(unix: number, fmt: string): string {
  const date = new Date(unix * 1000);

  switch (fmt) {
    case "t": // Short time  → 9:41 PM
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    case "T": // Long time   → 9:41:30 PM
      return date.toLocaleTimeString("en-US");
    case "d": // Short date  → 06/14/2026
      return date.toLocaleDateString("en-US");
    case "D": // Long date   → June 14, 2026
      return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    case "f": // Short DT    → June 14, 2026 9:41 PM
      return date.toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
    case "F": // Long DT     → Sunday, June 14, 2026 9:41 PM
      return date.toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
    case "R": { // Relative  → in 3 days / 2 hours ago
      const diff = unix * 1000 - Date.now();
      const abs = Math.abs(diff);
      const ago = diff < 0;
      const rel = (n: number, unit: string) =>
        ago ? `${n} ${unit}${n !== 1 ? "s" : ""} ago` : `in ${n} ${unit}${n !== 1 ? "s" : ""}`;
      if (abs < 60_000)        return ago ? "just now" : "in a moment";
      if (abs < 3_600_000)     return rel(Math.floor(abs / 60_000), "minute");
      if (abs < 86_400_000)    return rel(Math.floor(abs / 3_600_000), "hour");
      if (abs < 2_592_000_000) return rel(Math.floor(abs / 86_400_000), "day");
      return rel(Math.floor(abs / 2_592_000_000), "month");
    }
    default:
      return date.toLocaleString("en-US");
  }
}

// ---------------------------------------------------------------------------
// Discord markdown → Revolt-compatible text
// ---------------------------------------------------------------------------

/**
 * Strip/convert Discord-specific syntax that Revolt doesn't understand:
 *   <:name:id>   custom emoji        → :name:
 *   <a:name:id>  animated emoji      → :name:
 *   <t:unix:fmt> timestamp           → formatted date/time string
 *   -# text      Discord subtext     → text (strip prefix; Revolt has no equivalent)
 *   \uFEFF       zero-width NBS      → removed (bots use these for padding tricks)
 *
 * Standard markdown (bold, italic, links, headers, code blocks) is kept
 * because Revolt supports it natively.
 */
function transformMarkdown(text: string): string {
  // Custom / animated emoji  <:name:id>  or  <a:name:id>
  text = text.replace(/<a?:([^:>]+):\d+>/g, ":$1:");

  // Timestamps  <t:unix>  or  <t:unix:fmt>
  text = text.replace(/<t:(\d+)(?::([tTdDfFR]))?>/g, (_, unix, fmt) =>
    formatTimestamp(Number(unix), fmt ?? "f")
  );

  // Discord "subtext" introduced alongside Components v2: -# some text
  // Strip the marker; Revolt has no small-text equivalent
  text = text.replace(/^-# ?/gm, "");

  // Zero-width no-break spaces used by bots for visual alignment
  text = text.replace(/\uFEFF/g, "");

  return text.trim();
}

// ---------------------------------------------------------------------------
// Component tree walker
// ---------------------------------------------------------------------------

/**
 * Recursively walk a Components v2 tree and collect text segments.
 *
 * Component types handled:
 *   17 Container   → transparent wrapper, recurse
 *   10 TextDisplay → extract .content
 *   14 Separator   → blank line or "---" divider
 *    9 Section     → recurse into .components (ignore .accessory)
 *    1 ActionRow   → skip (interactive)
 *    2 Button      → skip
 *    3 SelectMenu  → skip
 */

// discord.js puts child components on the class instance (.components),
// NOT inside .data — so we have to pull them separately.
function extractRawComponent(c: any): RawComponent {
  const data: RawComponent = { ...(c.data ?? {}) };

  // DEBUG - remove after finding the right path
  if (data.type === 12) {
    npmlog.warn("MEDIAGALLERY KEYS", Object.keys(c).join(", "));
    npmlog.warn("MEDIAGALLERY DATA", JSON.stringify(c.data, null, 2));
  }

  if (Array.isArray(c.components) && c.components.length > 0) {
    data.components = c.components.map(extractRawComponent);
  }

  if (c.accessory) {
    data.accessory = extractRawComponent(c.accessory);
  }

  // ThumbnailComponent stores media on the instance, not always in .data
  if (c.media != null && !data.media) {
    data.media = { url: (c.media as any)?.url ?? String(c.media) };
  }

  // MediaGalleryComponent stores items on the instance, not in .data
  if (Array.isArray(c.items) && c.items.length > 0 && !data.items) {
    data.items = c.items.map((item: any) => ({
      ...(item.data ?? {}),
      media: item.media ? { url: (item.media as any)?.url } : (item.data?.media),
    }));
  }

  return data;
}

export function extractComponentImageUrls(message: Message): string[] {
  if (!message.components || message.components.length === 0) return [];
  const raw = message.components.map((c: any) => extractRawComponent(c));
  return collectUrls(raw);
}

function collectUrls(components: RawComponent[]): string[] {
  const urls: string[] = [];
  for (const c of components) {
    switch (c.type) {
      case 17:
        urls.push(...collectUrls(c.components ?? []));
        break;
      case 9:
        urls.push(...collectUrls(c.components ?? []));
        // Skip accessory — always a store logo (Steam, Epic, etc.)
        break;
      // case 11 removed — standalone thumbnails are store icons, not game art
      case 12: // MediaGallery — this is the actual game image
        for (const item of c.items ?? [])
          if (item.media?.url) urls.push(item.media.url);
        break;
      default:
        if (Array.isArray(c.components)) urls.push(...collectUrls(c.components));
    }
  }
  return urls;
}

function walkComponents(components: RawComponent[]): string[] {
  const parts: string[] = [];

  for (const c of components) {
    switch (c.type) {
      case 17: // Container
        parts.push(...walkComponents(c.components ?? []));
        break;

      case 10: // TextDisplay
        if (c.content) {
          parts.push(transformMarkdown(c.content));
        }
        break;

      case 14: // Separator
        parts.push(c.divider ? "---" : "");
        break;

      case 9: // Section — recurse children, also extract thumbnail accessory
        parts.push(...walkComponents(c.components ?? []));
        if (c.accessory?.type === 11 && c.accessory.media?.url) {
          parts.push(`![image](${c.accessory.media.url})`);
        }
        break;

      case 11: // Thumbnail (standalone, outside a section)
        if (c.media?.url) parts.push(`![image](${c.media.url})`);
        break;

      case 1:  // ActionRow
      case 2:  // Button
      case 3:  // StringSelect
      case 5:  // UserSelect
      case 6:  // RoleSelect
      case 7:  // MentionableSelect
      case 8:  // ChannelSelect
        break; // All interactive — drop silently

      default:
        // Unknown future type — recurse if it has children
        if (Array.isArray(c.components)) {
          parts.push(...walkComponents(c.components));
        }
    }
  }

  return parts;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert a Discord message's Components v2 tree to a Revolt-ready string.
 *
 * Returns `null` when there is nothing bridgeable (so the caller can decide
 * whether to skip the message entirely).
 */
export function componentsV2ToText(message: Message): string | null {
  if (!message.components || message.components.length === 0) {
    return null;
  }

  npmlog.warn(
    "COMPONENT PARSER INPUT",
    JSON.stringify(
      message.components.map((c: any) => c.data),
      null,
      2
    )
  );

  const raw = message.components.map((c: any) => extractRawComponent(c));

  npmlog.warn("EXTRACTED FULL", JSON.stringify(raw, null, 2));

  const text = walkComponents(raw)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  npmlog.warn("COMPONENT PARSER OUTPUT", text);

  return text.length > 0 ? text : null;
}