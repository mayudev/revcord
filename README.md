<p align="center">
  <img src="docs/revcord.png" width="64px" />
</p>

<h1 align="center">revcord</h1>
<p align="center">
  <img src="https://img.shields.io/github/v/release/mayudev/revcord?style=for-the-badge">
  <img src="https://img.shields.io/github/license/mayudev/revcord?style=for-the-badge">
  <img src="https://img.shields.io/github/languages/top/mayudev/revcord?style=for-the-badge">
</p>

<p align="center"><b>🌉 A cord to connect your Revolt and Discord servers</b></p>

🔗 A bridge for Discord and [Revolt](https://revolt.chat) with easy setup through commands, written in TypeScript using [revolt.js](https://github.com/revoltchat/revolt.js).

## 📔 Features
- [x] Bridge messages between platforms
- [x] Bridge attachments
- [x] Bridge replies
- [x] Bridge message edit and delete
- [x] Bridge embeds
- [x] Seamlessly display user information

![Screenshot - Revolt](docs/discord.png) ![Screenshot - Discord](docs/revolt.png)

## 🔩 Setup

It's recommended to have the latest version of Node.js (v16)

Important: this bot is meant to be used in one server (Discord+Revolt), but can be used in more as long as they share the same admin.

1. Clone this repository, install dependencies and build
```sh
git clone https://github.com/mayudev/revcord
cd revcord
npm install
npm run build
```
2. Create a bot in Discord ([Guide](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot)) and Revolt (Open user settings -> `My Bots` -> `Create a bot`)
3. Place the relevant tokens in environment variables. The easiest way is to create a `.env` file (yes, a file called `.env`):
```
DISCORD_TOKEN = ...
REVOLT_TOKEN = ...
```
Of course, replace ... with tokens.

4. **Important!** Make sure to select the following permissions in URL Generator when making an invite for your bot (Your bot in Discord Developers -> `OAuth2` -> `URL Generator`) (or if you're lazy, just select `Administrator`) Note **applications.commands**!
   
![permissions](docs/permissions.png)

5. **Important!** On Revolt, make sure to add the bot to a role that has the **Masquerade** permission!

![revolt permissions](docs/mask.png)

6. Invite the bot to to a Revolt and Discord server.
7. Start the bot using `npm start`.

## 🔧 Configuration

### with commands

You can use either slash commands on Discord or `rc!` prefix on Revolt (use `rc!help` to show all commands)

To use the commands, **you** need the `Administrator` permission on Discord. On Revolt, only the server owner can run them (for now).

### Connecting Discord and Revolt channels 

From **Discord**:
```
/connect <Revolt channel name or ID>
```

From **Revolt**:
```
rc!connect <Discord channel name or ID>
```

For example:
```
# From Discord
/connect lounge
/connect 01AB23BC34CD56DE78ZX90WWDB

# From Revolt
rc!connect general
rc!connect 591234567890123456
```

✔️ Send a message to see if it works. Try editing and deleting it.

### Removing the connection

From **Discord**:
```
/disconnect
```

From **Revolt**:
```
rc!disconnect
```

You don't have to specify any channel. It will disconnect the channel the command is sent in.

### Showing connections

From **Discord**:
```
/connections
```

From **Revolt**:
```
rc!connections
```

### Toggling bots

You can toggle whether messages sent by bots should be forwarded. It's enabled by default (it's requied for NQN to work properly).

Use either `rc!bots` or `/bots`

### with mappings.json (not recommended)
1. Create a `mappings.json` file in the root directory.
2. Use the following format:
```json
[
  {
    "discord": "discord_channel_id",
    "revolt": "revolt_channel_id"
  },
  {
    "discord": "another_discord_channel_id",
    "revolt": "another_revolt_channel_id"
  }
]
```
