import { Client as DiscordClient, TextChannel } from "discord.js";
import npmlog from "npmlog";
import { Client as RevoltClient } from "revolt.js";
import { Message } from "revolt.js/dist/maps/Messages";
import { Main } from "./Main";

/**
 * This file contains code taking care of things from Revolt to Discord
 * Revolt => Discord
 * and so uses Main.revoltCache
 */

/**
 * Format a Revolt message with all attachments to Discord-friendly format
 * @param revolt Revolt client
 * @param message Revolt message object
 * @returns Formatted string
 */
function formatMessage(revolt: RevoltClient, message: Message) {
  let messageString = "";
  messageString += message.content.toString() + "\n";

  if (message.attachments !== null) {
    message.attachments.forEach((attachment) => {
      messageString += revolt.generateFileURL(attachment) + "\n";
    });
  }

  return messageString;
}

/**
 * Find a relevant mapping and direct a Revolt message to Discord
 * @param discord Discord client
 * @param revolt Revolt client
 * @param message Revolt message object
 */
export function handleRevoltMessage(
  discord: DiscordClient,
  revolt: RevoltClient,
  message: Message
) {
  try {
    // Find target Discord channel
    const target = Main.mappings.find((mapping) => mapping.revolt === message.channel_id);

    if (target) {
      const channel = discord.channels.fetch(target.discord);

      channel
        .then((channel) => {
          if (channel instanceof TextChannel) {
            const webhook = Main.webhooks.find(
              (webhook) => webhook.name === "revcord-" + target.revolt
            );

            if (!webhook) {
              throw new Error("No webhook in channel Discord#" + channel.name);
            }

            let messageString = formatMessage(revolt, message);

            webhook
              .send({
                content: messageString,
                username: message.author.username,
                avatarURL: message.author.generateAvatarURL({}, true),
              })
              .then((webhookMessage) => {
                Main.revoltCache.push({
                  parentMessage: message._id,
                  createdMessage: webhookMessage.id,
                  channelId: message.channel_id,
                });
              })
              .catch((e) => {
                npmlog.error("Discord", "A webhook error occured.");
                npmlog.error("Discord", e);
              });
          }
        })
        .catch((e) => {
          npmlog.error(
            "Discord",
            "Couldn't find the webhook. Restart the bot to rebuild webhook database. Permissions might be missing as well."
          );
        });
    }
  } catch (e) {
    npmlog.error("Discord", "Couldn't send a message to Discord", e);
  }
}

export async function handleRevoltMessageUpdate(revolt: RevoltClient, message: Message) {
  // Find target Discord channel
  const target = Main.mappings.find((mapping) => mapping.revolt === message.channel_id);

  if (target) {
    try {
      const cachedMessage = Main.revoltCache.find(
        (cached) => cached.parentMessage === message._id
      );

      if (cachedMessage) {
        const webhook = Main.webhooks.find(
          (webhook) => webhook.name === "revcord-" + target.revolt
        );

        if (webhook) {
          const messageString = formatMessage(revolt, message);

          await webhook.editMessage(cachedMessage.createdMessage, {
            content: messageString,
          });
        }
      }
    } catch (e) {
      npmlog.error("Discord", "Failed to edit message");
      npmlog.error("Discord", e);
    }
  }
}

export async function handleRevoltMessageDelete(revolt: RevoltClient, messageId: string) {
  // Find target Discord channel
  const cachedMessage = Main.revoltCache.find(
    (cached) => cached.parentMessage === messageId
  );

  if (cachedMessage) {
    try {
      const target = Main.mappings.find(
        (mapping) => mapping.revolt === cachedMessage.channelId
      );

      if (target) {
        const webhook = Main.webhooks.find(
          (webhook) => webhook.name === "revcord-" + target.revolt
        );

        if (webhook) {
          await webhook.deleteMessage(cachedMessage.createdMessage);

          // TODO remove from cache
        }
      }
    } catch (e) {
      npmlog.error("Discord", "Failed to delete message");
      npmlog.error("Discord", e);
    }
  }
}
