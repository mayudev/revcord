import { SlashCommandBuilder } from "@discordjs/builders";
import universalExecutor from "app/universalExecutor";
import { CommandInteraction, CacheType } from "discord.js";
import npmlog from "npmlog";
import { DiscordCommand } from "../interfaces";

export class ListConnectionsCommand implements DiscordCommand {
  data = new SlashCommandBuilder()
    .setName("connections")
    .setDescription("Show existing connections");

  async execute(interaction: CommandInteraction, executor: universalExecutor) {
    // Permission check
    if (interaction.memberPermissions.has("MANAGE_CHANNELS")) {
      try {
        const connections = await executor.connections();

        let responseString = "**Discord => Revolt**\n";

        if (connections.length) {
          connections.forEach((connection) => {
            responseString += `${connection.discord} => ${connection.revolt}\n`;
          });
        } else {
          responseString = "No connections found.";
        }

        await interaction.reply(responseString);
      } catch (e) {
        npmlog.error("Discord", "An error occured while fetching connections");
        npmlog.error("Discord", e);

        await interaction.reply("An error happened. Check logs.");
      }
    } else {
      await interaction.reply("Error! You don't have enough permissions.");
    }
  }
}
