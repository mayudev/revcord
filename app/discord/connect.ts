import { SlashCommandBuilder } from "@discordjs/builders";
import { DiscordCommand } from "../interfaces";
import UniversalExecutor, { ConnectionError } from "../universalExecutor";
import { CommandInteraction } from "discord.js";
import npmlog from "npmlog";

export class ConnectCommand implements DiscordCommand {
  data = new SlashCommandBuilder()
    .setName("connect")
    .setDescription("Connect this Discord channel to a specified Revolt channel")
    .addStringOption((option) =>
      option
        .setName("channel")
        .setDescription("Revolt channel ID or name")
        .setRequired(true)
    );

  async execute(interaction: CommandInteraction, executor: UniversalExecutor) {
    // Argument check
    const target = interaction.options.getString("channel");

    if (!target) {
      await interaction.reply({ content: "Error! You didn't provide a channel" });
      return;
    }

    // Permission check
    if (interaction.memberPermissions.has("ADMINISTRATOR")) {
      try {
        await executor.connect(interaction.channelId, target);
        await interaction.reply("Channels are now connected!");
      } catch (e) {
        if (e instanceof ConnectionError) {
          await interaction.reply("Error! " + e.message);
        } else {
          await interaction.reply("Something went very wrong. Check the logs.");
          npmlog.error("Discord", "An error occured while connecting channels");
          npmlog.error("Discord", e);
        }
      }
    } else {
      await interaction.reply("Error! You don't have enough permissions.");
    }
  }
}
