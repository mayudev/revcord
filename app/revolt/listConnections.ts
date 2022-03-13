import { RevoltCommand } from "../interfaces";
import universalExecutor from "../universalExecutor";
import npmlog from "npmlog";
import { Message } from "revolt.js/dist/maps/Messages";

export class ListConnectionsCommand implements RevoltCommand {
  data = {
    name: "connections",
    description: "Show existing connections",
  };

  async execute(
    message: Message,
    args: string,
    executor: universalExecutor
  ): Promise<void> {
    try {
      const connections = await executor.connections();

      let responseString = "**Revolt => Discord**\n";

      if (connections.length) {
        connections.forEach((connection) => {
          responseString += `${connection.revolt} => ${connection.discord}\n`;
        });
      } else {
        responseString = "No connections found.";
      }

      await message.reply(responseString);
    } catch (e) {
      npmlog.error("Discord", "An error occured while fetching connections");
      npmlog.error("Discord", e);

      await message.reply("An error happened. Check logs.");
    }
  }
}
