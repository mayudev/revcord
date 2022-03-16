import {
  AnyChannel,
  Client as DiscordClient,
  Collection,
  Message,
  MessageAttachment,
  MessageMentions,
  TextChannel,
} from "discord.js";
import npmlog from "npmlog";
import { Client as RevoltClient } from "revolt.js";
import { Main } from "./Main";
import {
  AttachmentType,
  Mapping,
  PartialDiscordMessage,
  ReplyObject,
} from "./interfaces";
import {
  DiscordChannelPattern,
  DiscordEmojiPattern,
  DiscordPingPattern,
} from "./util/regex";

/**
 * This file contains code taking care of things from Discord to Revolt
 * Discord => Revolt
 * and so uses Main.discordCache
 */

/**
 * Format a Discord message with all attachments to Revolt-friendly format
 * @param attachments message.attachments
 * @param content message.content
 * @param ping ID of the user to ping
 * @returns Formatted string
 */
function formatMessage(
  attachments: Collection<string, MessageAttachment>,
  content: string,
  mentions: MessageMentions,
  stickerUrl?: string
) {
  let messageString = "";

  // Handle emojis
  const emojis = content.match(DiscordEmojiPattern);
  if (emojis) {
    emojis.forEach((emoji) => {
      const dissected = DiscordEmojiPattern.exec(emoji);

      // reset internal pointer... what is that even
      DiscordEmojiPattern.lastIndex = 0;

      if (dissected !== null) {
        const emojiName = dissected.groups["name"];
        const emojiId = dissected.groups["id"];
        if (emojiName && emojiId) {
          content = content.replace(emoji, `[:${emojiName}:]()`);
        }
      }
    });
  }

  // Handle pings
  const pings = content.match(DiscordPingPattern);
  if (pings) {
    for (const [index, ping] of pings.entries()) {
      const match = mentions.members.at(index);

      if (match) {
        content = content.replace(
          ping,
          `[@${match.user.username}#${match.user.discriminator}]()`
        );
      }
    }
  }

  // Handle channel mentions
  const channelMentions = content.match(DiscordChannelPattern);
  if (channelMentions) {
    for (const [index, mention] of channelMentions.entries()) {
      const match = mentions.channels.at(index);

      if (match && match instanceof TextChannel) {
        content = content.replace(mention, "#" + match.name);
      }
    }
  }

  messageString += content + "\n";

  attachments.forEach((attachment) => {
    messageString += attachment.url + "\n";
  });

  if (stickerUrl) messageString += stickerUrl + "\n";

  return messageString;
}

/**
 * Find a relevant mapping and direct a Discord message to Revolt
 * @param revolt Revolt client
 * @param discord Discord client
 * @param message Discord message object
 */
export async function handleDiscordMessage(
  revolt: RevoltClient,
  discord: DiscordClient,
  message: Message
) {
  if (message.author.bot) return;

  try {
    // Find target Revolt channel
    const target = Main.mappings.find((mapping) => mapping.discord === message.channelId);

    if (target) {
      const mask = {
        name: message.author.username + "#" + message.author.discriminator,
        avatar: message.author.avatarURL(),
      };

      // Handle replies
      const reference = message.reference;
      let replyPing;

      let replyEmbed: ReplyObject;

      if (reference) {
        const crossPlatformReference = Main.revoltCache.find(
          (cached) => cached.createdMessage === reference.messageId
        );

        if (crossPlatformReference) {
          replyPing = crossPlatformReference.parentMessage;
        } else {
          const samePlatformReference = Main.discordCache.find(
            (cached) => cached.parentMessage === reference.messageId
          );

          if (samePlatformReference) {
            replyPing = samePlatformReference.createdMessage;
          } else {
            // Fallback - this happens when someone replies to a message
            // that was sent before the bot was started

            // Wrap in another try-catch since it may fail
            // if the bot doesn't have permission to view message history
            try {
              // Fetch referenced message
              const sourceChannel = await discord.channels.fetch(
                message.reference.channelId
              );

              if (sourceChannel instanceof TextChannel) {
                const referenced = await sourceChannel.messages.fetch(
                  message.reference.messageId
                );

                // Prepare reply embed
                const formattedContent = formatMessage(
                  referenced.attachments,
                  referenced.content,
                  referenced.mentions
                );

                replyEmbed = {
                  pingable: false,
                  entity:
                    referenced.author.username + "#" + referenced.author.discriminator,
                  entityImage: referenced.author.avatarURL(),
                  content: formattedContent,
                  attachments: [],
                };

                if (referenced.attachments.first()) {
                  replyEmbed.attachments.push("file");
                  replyEmbed.previewAttachment = referenced.attachments.first().url;
                }
              }
            } catch (e) {
              npmlog.error("Discord", 'Bot lacks the "View message history" permission.');
            }
          }
        }
      }

      // Sticker
      const sticker = message.stickers.first();
      let stickerUrl = sticker && sticker.url;

      const messageString = formatMessage(
        message.attachments,
        message.content,
        message.mentions,
        stickerUrl
      );

      // revolt.js doesn't support masquerade yet, but we can use them using this messy trick.
      const messageObject = {
        content: messageString,
        masquerade: mask,
        replies: replyPing
          ? [
              {
                id: replyPing,
                mention: false,
              },
            ]
          : [],
      } as any;

      if (replyEmbed) {
        messageObject.embeds = [
          {
            type: "Text",
            icon_url: replyEmbed.entityImage,
            title: replyEmbed.entity,
            description: `**Reply to**: ${replyEmbed.content}`,
          },
        ];
      }

      const sentMessage = await revolt.channels
        .get(target.revolt)
        .sendMessage(messageObject);

      // Save in cache
      Main.discordCache.push({
        parentMessage: message.id,
        parentAuthor: message.author.id,
        createdMessage: sentMessage._id,
        channelId: target.discord,
      });
    }
  } catch (e) {
    npmlog.error("Revolt", "Couldn't send a message to Revolt");
  }
}

/**
 * Handle Discord message update and update the relevant message in Revolt
 * @param revolt Revolt client
 * @param message PartialDiscordMessage object (oldMessage, just content from newMessage)
 */
export async function handleDiscordMessageUpdate(
  revolt: RevoltClient,
  message: PartialDiscordMessage
) {
  try {
    // Find target Revolt channel
    const target = Main.mappings.find((mapping) => mapping.discord === message.channelId);

    if (target) {
      const cachedMessage = Main.discordCache.find(
        (cached) => cached.parentMessage === message.id
      );

      if (cachedMessage) {
        const messageString = formatMessage(
          message.attachments,
          message.content,
          message.mentions
        );

        const channel = await revolt.channels.get(target.revolt);
        const messageToEdit = await channel.fetchMessage(cachedMessage.createdMessage);

        await messageToEdit.edit({
          content: messageString,
        });
      }
    }
  } catch (e) {
    npmlog.error("Revolt", "Failed to edit message");
    npmlog.error("Discord", e);
  }
}

/**
 * Handle Discord message delete and delete the relevant message in Revolt
 * @param revolt Revolt client
 * @param messageId Deleted Discord message ID
 */
export async function handleDiscordMessageDelete(
  revolt: RevoltClient,
  messageId: string
) {
  const cachedMessage = Main.discordCache.find(
    (cached) => cached.parentMessage === messageId
  );

  if (cachedMessage) {
    try {
      const target = Main.mappings.find(
        (mapping) => mapping.discord === cachedMessage.channelId
      );

      if (target) {
        const channel = await revolt.channels.get(target.revolt);
        const messageToDelete = await channel.fetchMessage(cachedMessage.createdMessage);

        await messageToDelete.delete();

        // TODO remove from cache
      }
    } catch (e) {
      npmlog.error("Revolt", "Failed to delete message");
      npmlog.error("Revolt", e);
    }
  }
}

/**
 * Initialize webhook in a Discord channel
 * @param channel A Discord channel
 * @param mapping A mapping pair
 * @throws
 */
export async function initiateDiscordChannel(channel: AnyChannel, mapping: Mapping) {
  if (channel instanceof TextChannel) {
    if (
      !channel.guild.me.permissions.has("MANAGE_WEBHOOKS") ||
      !channel.guild.me.permissions.has("SEND_MESSAGES") ||
      !channel.guild.me.permissions.has("VIEW_CHANNEL")
    ) {
      throw new Error(
        "Bot doesn't have sufficient permissions in server " + channel.guild.name + "."
      );
    }

    const webhooks = await channel.fetchWebhooks();

    // Try to find already created webhook
    let webhook = webhooks.find((wh) => wh.name === "revcord-" + mapping.revolt);

    if (!webhook) {
      npmlog.info("Discord", "Creating webhook for Discord#" + channel.name);

      // No webhook found, create one
      webhook = await channel.createWebhook("revcord-" + mapping.revolt);
    }

    Main.webhooks.push(webhook);
  }
}

/**
 * Unregister a Discord channel (when disconnecting)
 */
export async function unregisterDiscordChannel(channel: AnyChannel, mapping: Mapping) {
  if (channel instanceof TextChannel) {
    if (
      !channel.guild.me.permissions.has("MANAGE_WEBHOOKS") ||
      !channel.guild.me.permissions.has("SEND_MESSAGES") ||
      !channel.guild.me.permissions.has("VIEW_CHANNEL")
    ) {
      throw new Error(
        "Bot doesn't have sufficient permissions in server " + channel.guild.name + "."
      );
    }

    const webhooks = await channel.fetchWebhooks();

    // Try to find created webhooks
    let webhook = webhooks.find((wh) => wh.name === "revcord-" + mapping.revolt);

    npmlog.info("Discord", "Removing webhook for Discord#" + channel.name);

    // Remove the webhook
    if (webhook) {
      await webhook.delete();

      // Remove from memory
      const i = Main.webhooks.indexOf(webhook);
      Main.webhooks.splice(i, 1);
    }
  }
}
