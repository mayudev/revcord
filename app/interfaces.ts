import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, Interaction } from "discord.js";
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
