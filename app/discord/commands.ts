import { DiscordCommand } from "app/interfaces";
import { ConnectCommand } from "./connect";
import { DisconnectCommand } from "./disconnect";
import { ListConnectionsCommand } from "./listConnections";

/**
 * An array of slash commands
 */
export const slashCommands: DiscordCommand[] = [
  new ConnectCommand(),
  new DisconnectCommand(),
  new ListConnectionsCommand(),
];
