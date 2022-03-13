import { SlashCommandBuilder } from "@discordjs/builders";
import { DiscordCommand } from "app/interfaces";
import { CommandInteraction, Interaction } from "discord.js";

export class ConnectCommand implements DiscordCommand {
  data = new SlashCommandBuilder()
    .setName("connect")
    .setDescription("Connect this Discord channel to a specified Revolt channel");

  async execute(interaction: CommandInteraction) {
    await interaction.reply("Pong");
  }
}
