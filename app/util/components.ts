import { Message } from "discord.js";

/* ============================================================
 * TYPES
 * ============================================================ */

interface RawComponent {
    type: number;
    content?: string;
    components?: RawComponent[];
    accessory?: RawComponent;
    media?: {
        url?: string;
    };
    items?: {
        media?: {
            url?: string;
        };
    }[];
}

/* ============================================================
 * MARKDOWN
 * ============================================================ */

function formatTimestamp(unix: number, fmt: string): string {
    const date = new Date(unix * 1000);

    switch (fmt) {
        case "t":
            return date.toLocaleTimeString();

        case "T":
            return date.toLocaleTimeString();

        case "d":
            return date.toLocaleDateString();

        case "D":
            return date.toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
            });

        case "f":
            return date.toLocaleString();

        case "F":
            return date.toLocaleString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
            });

        case "R": {
            const diff = unix * 1000 - Date.now();
            const mins = Math.round(diff / 60000);

            if (Math.abs(mins) < 60)
                return mins >= 0
                    ? `in ${mins} minutes`
                    : `${-mins} minutes ago`;

            const hrs = Math.round(mins / 60);

            if (Math.abs(hrs) < 24)
                return hrs >= 0
                    ? `in ${hrs} hours`
                    : `${-hrs} hours ago`;

            const days = Math.round(hrs / 24);

            return days >= 0
                ? `in ${days} days`
                : `${-days} days ago`;
        }

        default:
            return date.toLocaleString();
    }
}

function transformMarkdown(text: string): string {
    return text
        .replace(/<a?:([^:>]+):\d+>/g, ":$1:")
        .replace(
            /<t:(\d+)(?::([tTdDfFR]))?>/g,
            (_, ts, fmt) => formatTimestamp(Number(ts), fmt ?? "f")
        )
        .replace(/^-# ?/gm, "")
        .replace(/\uFEFF/g, "")
        .trim();
}

/* ============================================================
 * RAW EXTRACTION
 * ============================================================ */

function extractRawComponent(component: any): RawComponent {
    const raw: RawComponent = {
        ...(component.data ?? {}),
    };

    if (component.components)
        raw.components = component.components.map(extractRawComponent);

    if (component.accessory)
        raw.accessory = extractRawComponent(component.accessory);

    if (component.media && !raw.media)
        raw.media = {
            url: component.media.url,
        };

    if (component.items && !raw.items)
        raw.items = component.items.map((item: any) => ({
            ...(item.data ?? {}),
            media: {
                url: item.media?.url,
            },
        }));

    return raw;
}

/* ============================================================
 * WALKER
 * ============================================================ */

function walkComponents(
    components: RawComponent[]
): ParsedComponent[] {

    const parts: ParsedComponent[] = [];

    for (const c of components) {

        switch (c.type) {

            // Container
            case 17:
                parts.push(...walkComponents(c.components ?? []));
                break;

            // TextDisplay
            case 10:
                if (c.content?.trim()) {
                    parts.push({
                        type: "text",
                        content: transformMarkdown(c.content)
                    });
                }
                break;

            // Section
            case 9:

                parts.push(...walkComponents(c.components ?? []));

                // ignore thumbnail accessories
                break;

            // MediaGallery
            case 12:

                for (const item of c.items ?? []) {

                    if (item.media?.url) {
                        parts.push({
                            type: "image",
                            url: item.media.url
                        });
                    }

                }

                break;

            // Separator
            case 14:
                break;

            default:

                if (Array.isArray(c.components)) {
                    parts.push(...walkComponents(c.components));
                }

        }

    }

    return parts;
}

/* ============================================================
 * PUBLIC
 * ============================================================ */

export function parseComponentsV2(
    message: Message
): ParsedComponent[] {

    if (!message.components?.length)
        return [];

    const raw = message.components.map(extractRawComponent);

    return walkComponents(raw);
}

export interface ParsedComponent {
    type: "text" | "image";
    content?: string;
    url?: string;
}