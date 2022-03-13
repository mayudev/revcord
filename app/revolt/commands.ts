import { RevoltCommand } from "../interfaces";
import { ConnectCommand } from "./connect";
import { DisconnectCommand } from "./disconnect";

/**
 * An array of Revolt commands
 */
export const revoltCommands: RevoltCommand[] = [
  new ConnectCommand(),
  new DisconnectCommand(),
];
