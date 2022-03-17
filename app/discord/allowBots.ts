import { SlashCommandBuilder } from "@discordjs/builders";
import { DiscordCommand } from "../interfaces";
import { Main } from "../Main";
import universalExecutor, { ConnectionError } from "../universalExecutor";
import { CommandInteraction, CacheType } from "discord.js";
import npmlog from "npmlog";

export class AllowBotsCommand implements DiscordCommand {
  data = new SlashCommandBuilder()
    .setName("bots")
    .setDescription("Toggle whether bot messages should be forwarded to Revolt channel");

  async execute(
    interaction: CommandInteraction<CacheType>,
    executor: universalExecutor
  ): Promise<void> {
    // Permission check
    if (interaction.memberPermissions.has("ADMINISTRATOR")) {
      try {
        const target = Main.mappings.find(
          (mapping) => mapping.discord === interaction.channelId
        );

        if (target) {
          const state = await executor.toggleAllowBots(target);
          await interaction.reply(
            `Forwarding of bot messages was ${state ? "enabled" : "disabled"}.`
          );
        } else {
          await interaction.reply("This channel is not connected!");
        }
      } catch (e) {
        if (e instanceof ConnectionError) {
          await interaction.reply("Error! " + e.message);
        } else {
          await interaction.reply("Something went very wrong. Check the logs.");
          npmlog.error("Discord", "An error occured while toggling bots");
          npmlog.error("Discord", e);
        }
      }
    } else {
      await interaction.reply("Error! You don't have enough permissions.");
    }
  }
}
