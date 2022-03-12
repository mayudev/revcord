# revcord

(WIP)
An easy to setup bridge for Discord and Revolt (an awesome open source Discord-inspired chat app).

## Features
- [x] Bridge messages between platforms
- [x] Bridge attachments
- [x] Display user information

![Screenshot - Revolt](ss1.png) ![Screenshot - Discord](ss2.png)

## Setup

Important: this bot is meant to be used in one server (Discord+Revolt), but can be used in few as long as they share the same admin.

1. Clone this repository
```sh
git clone https://github.com/mayudev/revcord
cd revcord
```
2. Install dependencies
```sh
npm install
```
3. Create a bot in Discord ([Guide](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot)) and Revolt (Open user settings -> `My bots` -> `Create a bot` -> Name it however you want -> Done.)
4. Revcord uses environment variables to store tokens. The easiest way is to create a `.env` file (yes, a file called `.env`):
```
DISCORD_TOKEN = ...
REVOLT_TOKEN = ...
```
Of course, replace ... with tokens.

5. Build the bot
```
npm run build
```
6. Apply configuation (see below)
7. Run the bot
   
You have to use this weird command because of `revolt.js` stuff. I'm going to make it easier in the future.
```
node --experimental-specifier-resolution=node build/index.js
```
8. Invite the bot to a Revolt and Discord server
   
**Important** Make sure the bot can, obviously, read and send messages on both platforms. Moreover:

On Revolt: Add a role with the `Masquerade` permission to the bot.

On Discord: Make sure the bot has the `Manage Webhooks` permission. It will warn you if you don't (it just won't work without it).

## Configuration

### with mappings.json
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
