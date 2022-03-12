import { Client as DiscordClient, TextChannel } from "discord.js";
import npmlog from "npmlog";
import { Client as RevoltClient } from "revolt.js";
import { Message } from "revolt.js/dist/maps/Messages";
import { Main } from "./Main";

export function handleRevoltMessage(
  discord: DiscordClient,
  revolt: RevoltClient,
  message: Message
) {
  if (message.author.bot !== null) return;

  try {
    // Find target Discord channel
    const target = Main.mappings.find((mapping) => mapping.revolt === message.channel_id);

    if (target) {
      const channel = discord.channels.fetch(target.discord);

      let messageString = "";
      messageString += message.content + "\n";

      if (message.attachments !== null) {
        message.attachments.forEach((attachment) => {
          messageString += revolt.generateFileURL(attachment) + "\n";
        });
      }

      channel.then((channel) => {
        if (channel instanceof TextChannel) {
          channel.send(`[${message.author.username}] ${messageString}`);
        }
      });
    }
  } catch (e) {
    npmlog.error("Discord", "Couldn't send a message to Discord", e);
  }
}
