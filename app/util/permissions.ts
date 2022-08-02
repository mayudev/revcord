import { GuildMember, PermissionFlagsBits, PermissionsBitField } from "discord.js";

/**
 * Checks if the bot has enough permissions to manage webhooks and use them to send messages.
 */
export function hasWebhookPermissions(member: GuildMember) {
  return (
    member.permissions.has(PermissionFlagsBits.ManageWebhooks) &&
    member.permissions.has(PermissionFlagsBits.SendMessages) &&
    member.permissions.has(PermissionFlagsBits.ViewChannel)
  );
}

/**
 * Checks if the user has Administrator permission.
 */
export function hasAdministratorPermission(perms: PermissionsBitField) {
  return perms.has(PermissionFlagsBits.Administrator);
}
