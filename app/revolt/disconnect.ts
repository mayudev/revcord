import { RevoltCommand } from "../interfaces";
import universalExecutor, { ConnectionError } from "../universalExecutor";
import npmlog from "npmlog";
import { Message } from "revolt.js/dist/maps/Messages";

export class DisconnectCommand implements RevoltCommand {
  data = {
    name: "disconnect",
    description: "Disconnect this channel from Discord",
  };

  async execute(
    message: Message,
    args: string,
    executor: universalExecutor
  ): Promise<void> {
    // Permission check
    // For now, allow only the owner to access
    if (message.channel.server.owner === message.author_id) {
      try {
        await executor.disconnect("revolt", message.channel_id);
        await message.reply("Channel disconnected successfully.");
      } catch (e) {
        if (e instanceof ConnectionError) {
          await message.reply("Error! " + e.message);
        } else {
          await message.reply("Something went very wrong. Check the logs.");
          npmlog.error("Revolt", "An error occurred while disconnecting channels");
          npmlog.error("Revolt", e);
        }
      }
    } else {
      await message.reply("Error! You don't have enough permissions.");
    }
  }
}
