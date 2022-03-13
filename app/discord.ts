import { AnyChannel, Guild, Message, TextChannel } from "discord.js";
import npmlog from "npmlog";
import { Client as RevoltClient } from "revolt.js";
import { Client as DiscordClient } from "discord.js";
import { Main } from "./Main";
import { Mapping } from "./interfaces";

/**
 * Find a relevant mapping and direct a Discord message to Revolt
 * @param revolt Revolt client
 * @param message Discord message object
 */
export function handleDiscordMessage(revolt: RevoltClient, message: Message) {
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
