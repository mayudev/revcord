import { Channel, PermissionFlagsBits, TextChannel } from "discord.js";
import { InsufficientPermissionsError } from "../errors";

/**
 * checkWebhookPermissions checks if the bot has sufficient permissions
 * to manage webhooks in the specific server and channel.
 * Otherwise, it throws an [InsufficientPermissionsError].
 */
export async function checkWebhookPermissions(channel: TextChannel) {

  const selfMember = channel.guild.members.me

  // Server-wide permission check
  if (
    !selfMember.permissions.has(PermissionFlagsBits.ManageWebhooks) ||
    !selfMember.permissions.has(PermissionFlagsBits.SendMessages) ||
    !selfMember.permissions.has(PermissionFlagsBits.ViewChannel)
  ) {
    throw new InsufficientPermissionsError(
      "Bot doesn't have sufficient permissions in server " +
      channel.guild.name +
      ". Please check if the bot has the following permissions:" +
      "Manage Webhooks, Send Messages, View Channel"
    );
  }

  // Channel-specific permission check
  if (!selfMember.permissionsIn(channel).has(PermissionFlagsBits.ManageWebhooks)) {
    throw new InsufficientPermissionsError(
      "Bot doesn't have sufficient permission in the channel. " +
      "Please check if the `Manage Webhooks` permission isn't being overridden" +
      " for the bot role in that specific channel."
    );
  }
}
