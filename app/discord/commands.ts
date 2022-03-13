import { DiscordCommand } from "app/interfaces";
import { ConnectCommand } from "./connect";

/**
 * An array of slash commands
 */
export const slashCommands: DiscordCommand[] = [new ConnectCommand()];
