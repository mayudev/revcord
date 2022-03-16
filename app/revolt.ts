import { Client as DiscordClient, MessageEmbed, TextChannel } from "discord.js";
import npmlog from "npmlog";
import { Client as RevoltClient } from "revolt.js";
import { Message } from "revolt.js/dist/maps/Messages";
import { AttachmentType } from "./interfaces";
import { Main } from "./Main";
import { RevoltPingPattern } from "./util/regex";

/**
 * This file contains code taking care of things from Revolt to Discord
 * Revolt => Discord
 * and so uses Main.revoltCache
 */

interface ReplyObject {
  pingable: boolean;
  entity?: string;
  entityImage?: string;
  originalUrl?: string;
  content: string;
  attachments: AttachmentType[];
}

/**
 * Format a Revolt message with all attachments to Discord-friendly format
 * @param revolt Revolt client
 * @param message Revolt message object
 * @param ping ID of the user to ping
 * @returns Formatted string
 */
function formatMessage(revolt: RevoltClient, message: Message) {
  let messageString = "";
  let content = message.content.toString();

  const pings = content.match(RevoltPingPattern);
  if (pings && message.mentions) {
    for (const [index, ping] of pings.entries()) {
      const match = message.mentions.at(index);

      if (match) {
        content = content.replace(ping, `[@${match.username}]`);
      }
    }
  }

  messageString += content + "\n";

  // Handle pings
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
export async function handleRevoltMessage(
  discord: DiscordClient,
  revolt: RevoltClient,
  message: Message
) {
  try {
    // Find target Discord channel
    const target = Main.mappings.find((mapping) => mapping.revolt === message.channel_id);

    if (target) {
      const channel = await discord.channels.fetch(target.discord);

      if (channel instanceof TextChannel) {
        const webhook = Main.webhooks.find(
          (webhook) => webhook.name === "revcord-" + target.revolt
        );

        if (!webhook) {
          throw new Error("No webhook in channel Discord#" + channel.name);
        }

        // Handle replies
        const reply_ids = message.reply_ids;
        let reply: ReplyObject;

        if (reply_ids) {
          const crossPlatformReference = Main.discordCache.find(
            (cached) => cached.createdMessage === reply_ids[0]
          );

          if (crossPlatformReference) {
            // Find Discord message that's being replied to
            const referencedMessage = await channel.messages.fetch(
              crossPlatformReference.parentMessage
            );

            // Parse attachments
            let attachments: AttachmentType[] = [];

            if (referencedMessage.attachments.first()) {
              attachments.push("file");
            }

            if (referencedMessage.embeds.length > 0) {
              attachments.push("embed");
            }

            const replyObject: ReplyObject = {
              pingable: false,
              entity:
                referencedMessage.author.username +
                "#" +
                referencedMessage.author.discriminator,
              entityImage: referencedMessage.author.avatarURL(),
              content: referencedMessage.content,
              originalUrl: referencedMessage.url,
              attachments: attachments ? attachments : [],
            };

            reply = replyObject;
          } else {
            try {
              const channel = revolt.channels.get(target.revolt);
              const message = await channel.fetchMessage(reply_ids[0]);

              // Parse attachments
              let attachments: AttachmentType[] = [];

              if (message.attachments !== null) {
                attachments.push("file");
              }

              const replyObject: ReplyObject = {
                pingable: false,
                entity: message.author.username,
                entityImage: message.author.generateAvatarURL({ size: 64 }),
                content: message.content.toString(),
                attachments: attachments ? attachments : [],
              };

              reply = replyObject;
            } catch {}
          }
        }

        let messageString = formatMessage(revolt, message);

        let embed =
          reply &&
          new MessageEmbed()
            .setColor("#5875e8")
            .setAuthor({ name: reply.entity, iconURL: reply.entityImage });

        // Add original message URL and content
        if (reply && reply.content) {
          if (reply.originalUrl) {
            embed?.setDescription(
              `[**Reply to:**](${reply.originalUrl}) ` + reply.content
            );
          } else {
            embed?.setDescription(`**Reply to**: ` + reply.content);
          }
        } else if (reply && reply.originalUrl) {
          embed?.setDescription(`[**Reply to**](${reply.originalUrl})`);
        }

        // Add attachments field
        if (reply && reply.attachments.length > 0) {
          embed?.setFooter({
            text: "contains " + reply.attachments.map((a) => a + " "),
          });
        }

        const webhookMessage = await webhook.send({
          content: messageString,
          username: message.author.username,
          avatarURL: message.author.generateAvatarURL({}, true),
          embeds: embed ? [embed] : [],
        });

        Main.revoltCache.push({
          parentMessage: message._id,
          parentAuthor: message.author_id,
          createdMessage: webhookMessage.id,
          channelId: message.channel_id,
        });
      }
    }
  } catch (e) {
    npmlog.error("Discord", "Couldn't send a message to Discord");
    npmlog.error("Discord", e);
  }
}

/**
 * Handle Revolt message update and update the relevant message in Discord
 * @param revolt Revolt client
 * @param message Discord message object
 */
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

/**
 * Handle Revolt message delete and delete the relevant message in Discord
 * @param revolt Revolt client
 * @param messageId Deleted Revolt message ID
 */
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
