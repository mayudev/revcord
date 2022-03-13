import { RevoltCommand } from "app/interfaces";
import { DisconnectCommand } from "./disconnect";

/**
 * An array of Revolt commands
 */
export const revoltCommands: RevoltCommand[] = [new DisconnectCommand()];
