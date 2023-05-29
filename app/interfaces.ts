import { SlashCommandBuilder } from "@discordjs/builders";
import {
  Collection,
  CommandInteraction,
  MessageAttachment,
  MessageEmbed,
  MessageMentions,
  User,
} from "discord.js";
import { Message } from "revolt.js/dist/maps/Messages";
import UniversalExecutor from "./universalExecutor";

export interface Mapping {
  discord: string;
  revolt: string;
  allowBots?: boolean;
}

export interface DiscordCommand {
  data:
    | SlashCommandBuilder
    | Omit<SlashCommandBuilder, "addSubcommandGroup" | "addSubcommand">;
  execute(interaction: CommandInteraction, executor: UniversalExecutor): Promise<void>;
}

interface RevoltCommandData {
  name: string;
  description: string;
  usage?: string;
}

export interface RevoltCommand {
  data: RevoltCommandData;
  execute(message: Message, args: string, executor: UniversalExecutor): Promise<void>;
}

export interface ConnectionPair extends Mapping {}

export interface CachedMessage {
  /** ID of the original message
   *
   * Tip: if it's discordCache, parent is the Discord message.
   */
  parentMessage: string;

  /** ID of the author of the original message */
  parentAuthor: string;

  /** ID of the message sent by the bot */
  createdMessage: string;

  /** ID of the channel the original message was sent in */
  channelId: string;
}

export interface PartialDiscordMessage {
  author: User;
  attachments: Collection<string, MessageAttachment>;
  channelId: string;
  content: string;
  embeds: MessageEmbed[];
  id: string;
  mentions: MessageMentions;
}

export interface ReplyObject {
  pingable: boolean;
  entity?: string;
  entityImage?: string;
  originalUrl?: string;
  content: string;
  attachments: AttachmentType[];
  previewAttachment?: string;
}

export type AttachmentType = "embed" | "file";

export interface RevoltSourceParams {
  messageId: string;
  authorId: string;
  channelId: string;
}
