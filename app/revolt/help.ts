import { RevoltCommand } from "../interfaces";
import universalExecutor from "../universalExecutor";
import { Message } from "revolt.js/dist/maps/Messages";
import { revoltCommands } from "./commands";

export class HelpCommand implements RevoltCommand {
  data = {
    name: "help",
    description: "Show available commands",
  };

  async execute(
    message: Message,
    args: string,
    executor: universalExecutor
  ): Promise<void> {
    let markup = `
### Command reference
Prefix is \`rc!\`
    `;

    revoltCommands.forEach((command) => {
      markup += `
**${command.data.name}**
${command.data.description}
${command.data.usage ? "Usage: `" + command.data.usage + "`\n" : ""}`;
    });

    markup += ` >[Source code](https://github.com/mayudev/revcord)`;

    message.channel.sendMessage({
      embeds: [
        {
          type: "Text",
          title: "Revcord",
          description: markup,
          colour: "#7289DA", // british moment
        },
      ],
      content: " ",
    });
  }
}
