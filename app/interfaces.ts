import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, Interaction } from "discord.js";

export interface Mapping {
  discord: string;
  revolt: string;
}

export interface DiscordCommand {
  data: SlashCommandBuilder | Omit<SlashCommandBuilder, "a">;
  execute(interaction: CommandInteraction): Promise<void>;
}
