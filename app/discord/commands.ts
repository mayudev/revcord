import { DiscordCommand } from "app/interfaces";
import { ConnectCommand } from "./connect";
import { DisconnectCommand } from "./disconnect";

/**
 * An array of slash commands
 */
export const slashCommands: DiscordCommand[] = [
  new ConnectCommand(),
  new DisconnectCommand(),
];
