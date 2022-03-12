import { Message } from "discord.js";
import npmlog from "npmlog";
import { Client } from "revolt.js";
import { Main } from "./Main";

export function handleDiscordMessage(revolt: Client, message: Message) {
  if (message.author.bot) return;

  try {
    // Find target Revolt channel
    const target = Main.mappings.find((mapping) => mapping.discord === message.channelId);

    if (target) {
      const mask = {
        name: message.author.username + "#" + message.author.discriminator,
        avatar: message.author.avatarURL(),
      };

      let messageString = "";
      messageString += message.content + "\n";

      message.attachments.forEach((attachment) => {
        messageString += attachment.url + "\n";
      });

      // revolt.js doesn't support masquerade yet, but we can use them using this messy trick.
      revolt.channels.get(target.revolt).sendMessage({
        content: messageString,
        masquerade: mask,
      } as any);
    }
  } catch (e) {
    npmlog.error("Revolt", "Couldn't send a message to Revolt");
  }
}
