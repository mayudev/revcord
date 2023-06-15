import { Client as DiscordClient, EmbedBuilder, TextChannel, Webhook } from "discord.js";
import npmlog from "npmlog";
import { Client as RevoltClient } from "revolt.js";
import { Message } from "revolt.js/dist/maps/Messages";
import { AttachmentType, ReplyObject, RevoltSourceParams } from "./interfaces";
import { Main } from "./Main";
import { RevoltChannelPattern, RevoltPingPattern } from "./util/regex";

/**
 * This file contains code taking care of things from Revolt to Discord
 * Revolt => Discord
 */

/**
 * Format a Revolt message with all attachments to Discord-friendly format
 * @param revolt Revolt client
 * @param message Revolt message object
 * @param ping ID of the user to ping
 * @returns Formatted string
 */
async function formatMessage(revolt: RevoltClient, message: Message) {
  let messageString = "";
  let content = message.content.toString();

  // Handle pings
  const pings = content.match(RevoltPingPattern);
  if (pings && message.mentions) {
    for (const ping of pings) {
      const matched = RevoltPingPattern.exec(ping);
      RevoltPingPattern.lastIndex = 0;

      // Extract the mentioned member's ID and look for it in mentions
      if (matched !== null) {
        const id = matched.groups["id"];

        if (id) {
          const match = message.mentions.find((member) => member._id === id);

          if (match) {
            content = content.replace(ping, `@${match.username}`);
          }
        }
      }
    }
  }

  // Handle channel mentions
  const channelMentions = content.match(RevoltChannelPattern);
  if (channelMentions) {
    for (const mention of channelMentions) {
      const channel = RevoltChannelPattern.exec(mention);
      RevoltChannelPattern.lastIndex = 0;

      if (channel !== null) {
        const channelId = channel.groups["id"];
        if (channelId) {
          try {
            const channelData = await revolt.channels.fetch(channelId);
            content = content.replace(mention, "#" + channelData.name);
          } catch { }
        }
      }
    }
  }

  messageString += content + "\n";

  // Handle attachments
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
            } catch { }
          }
        }

        let messageString = await formatMessage(revolt, message);

        let embed =
          reply &&
          new EmbedBuilder()
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

        const avatarURL = message.author.generateAvatarURL({}, true);

        await sendDiscordMessage(
          webhook,
          {
            messageId: message._id,
            authorId: message.author_id,
            channelId: message.channel_id,
          },
          messageString,
          message.author.username,
          avatarURL,
          embed,
          false
        );
      }
    }
  } catch (e) {
    npmlog.error("Discord", "Couldn't send a message to Discord");
    npmlog.error("Discord", e);
  }
}

/**
 * Send a message to Discord
 * @param webhook Discord webhook
 * @param sourceParams Revolt source message params
 * @param content Target message content
 * @param username Username for webhook
 * @param avatarURL Avatar URL for webhook
 * @param embed Embed for webhook
 * @param allowUserPing Whether to allow user pings
 */
export async function sendDiscordMessage(
  webhook: Webhook,
  sourceParams: RevoltSourceParams,
  content: string,
  username: string,
  avatarURL: string,
  embed: EmbedBuilder,
  allowUserPing: boolean
) {
  const webhookMessage = await webhook.send({
    content,
    username,
    avatarURL,
    embeds: embed ? [embed] : [],
    allowedMentions: {
      parse: allowUserPing ? ["users"] : [],
    },
  });

  Main.revoltCache.push({
    parentMessage: sourceParams.messageId,
    parentAuthor: sourceParams.authorId,
    channelId: sourceParams.channelId,
    createdMessage: webhookMessage.id,
  });
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
          const messageString = await formatMessage(revolt, message);

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
