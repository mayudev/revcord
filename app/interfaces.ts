import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, Interaction } from "discord.js";
import { Message } from "revolt.js/dist/maps/Messages";
import UniversalExecutor from "./universalExecutor";

export interface Mapping {
  discord: string;
  revolt: string;
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
