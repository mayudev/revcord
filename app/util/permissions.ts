import { AnyChannel, TextChannel } from "discord.js";
import { InsufficientPermissionsError } from "../errors";

/**
 * checkWebhookPermissions checks if the bot has sufficient permissions
 * to manage webhooks in the specific server and channel.
 * Otherwise, it throws an [InsufficientPermissionsError].
 */
export async function checkWebhookPermissions(channel: TextChannel) {
  // Server-wide permission check
  if (
    !channel.guild.me.permissions.has("MANAGE_WEBHOOKS") ||
    !channel.guild.me.permissions.has("SEND_MESSAGES") ||
    !channel.guild.me.permissions.has("VIEW_CHANNEL")
  ) {
    throw new InsufficientPermissionsError(
      "Bot doesn't have sufficient permissions in server " +
        channel.guild.name +
        ". Please check if the bot has the following permissions:" +
        "Manage Webhooks, Send Messages, View Channel"
    );
  }

  // Channel-specific permission check
  if (!channel.guild.me.permissionsIn(channel).has("MANAGE_WEBHOOKS")) {
    throw new InsufficientPermissionsError(
      "Bot doesn't have sufficient permission in the channel. " +
        "Please check if the `Manage Webhooks` permission isn't being overridden" +
        " for the bot role in that specific channel."
    );
  }
}
