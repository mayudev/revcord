import { SlashCommandBuilder } from "@discordjs/builders";
import universalExecutor from "app/universalExecutor";
import { CommandInteraction, MessageEmbed } from "discord.js";
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

        let replyEmbed = new MessageEmbed()
          .setAuthor({ name: "Revcord" })
          .setColor("#5765f2")
          .setTitle("Connected channels");

        if (connections.length) {
          let desc = "";
          connections.forEach((connection) => {
            desc += `
\`\`\`#${connection.discord} => ${connection.revolt}
Bots allowed: ${connection.allowBots ? "yes" : "no"}
\`\`\``;
          });

          replyEmbed.setDescription(desc);
        } else {
          replyEmbed.setDescription("No connections found.");
        }

        await interaction.reply({ embeds: [replyEmbed] });
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
