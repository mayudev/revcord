import universalExecutor, { EntityNotFoundError } from "../universalExecutor";
import npmlog from "npmlog";
import { Message } from "revolt.js/dist/maps/Messages";
import { RevoltCommand } from "../interfaces";

export class PingCommand implements RevoltCommand {
  data = {
    name: "ping",
    description: "Pings a user in connected Discord channel",
    usage: "rc!ping <username>",
  };

  async execute(
    message: Message,
    args: string,
    executor: universalExecutor
  ): Promise<void> {
    if (!args) {
      await message.reply("Error! You didn't specify a user.");
      return;
    }

    try {
      const pinged = await executor.pingDiscordUser(message, args);
      await message.channel.sendMessage(`Pinged ${pinged}!`);
    } catch (e) {
      if (e instanceof EntityNotFoundError) {
        await message.reply("Error! " + e.message);
      } else {
        await message.reply("Something went very wrong. Check the logs.");
        npmlog.error("Discord", "An error occured while trying to ping a user");
        npmlog.error("Discord", e);
      }
    }
  }
}
