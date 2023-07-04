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

[Features](#features) | [Setup](#setup) | [Configuration](#configuration) | [Troubleshooting](#troubleshooting)

## 📔 Features <a id="features"></a>

- [x] Bridge messages between platforms
- [x] Bridge attachments
- [x] Bridge replies
- [x] Bridge message edit and delete
- [x] Bridge embeds
- [x] Bridge emoji[^1]
- [x] Seamlessly display user information

[^1]: Revolt to Discord works, but limited to 3 emojis displayed to stop bombing with links

![Screenshot - Revolt](docs/discord.png) ![Screenshot - Discord](docs/revolt.png)

## 🔩 Setup <a id="setup"></a>

You can use [Docker](#using-docker) as well.

**Node v16.9+ is required!**

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

If you are running a self-hosted instance of Revolt, additionally set the `API_URL` variable:

```
API_URL = https://api.revolt.chat
```

4. **Important!** Make sure to select the following permissions in URL Generator when making an invite for your bot (Your bot in Discord Developers -> `OAuth2` -> `URL Generator`) (or if you're lazy, just select `Administrator`) Note **applications.commands**!

![permissions](docs/permissions.png)

5. Enable the `Message Content Intent` under Bot -> Privileged Gateway Intents. If you forget to do this, the bot will crash with a `Used disallowed intents` message.

![intent](docs/intent.png)

6. **Important!** On Revolt, make sure to add the bot to a role that has the **Masquerade** permission!

![revolt permissions](docs/mask.png)

7. Invite the bot to to a Revolt and Discord server.
8. Start the bot using `npm start`.

Note: it's recommended to use something like [pm2](https://pm2.keymetrics.io/) or [nodemon](https://nodemon.io/) to run the bot. Make sure to pass the `--experimental-specifier-resolution=node` flag to node manually, otherwise it will not run (it's included in the default start script).

### Using Docker

You need Docker and docker-compose installed.

Follow the steps above to create a `.env` file[^2]. You do not have to run `npm install` and `npm run build`, obviously. Also, make sure your bots have all the required permissions as explained above.

Before you run docker-compose, use `touch revcord.sqlite` to create the database file and leave it empty.

Then you should be ready to go.

```
docker-compose up -d
```

[^2]: Alternatively, you can edit the `docker-compose.yml` file appropriately. Make sure to remove `./.env:/app/.env` below `volumes:` so it won't complain when you don't have a `.env` file.

## 🔧 Configuration <a id="configuration"></a>

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

#### This is not recommended!

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

## 🔥 Troubleshooting <a id="troubleshooting"></a>

### `npm install` takes way too long, or `Please install sqlite3 package manually` (Raspberry Pi / 32-bit arm devices)

This is an issue with `node-sqlite3` being a native module, but has no prebuilt binaries for 32-bit arm architectures available, therefore falling back to building from source.

However, a Raspberry Pi is usually too low powered to finish compiling it.

So, the only solution would be to use a more powerful device to cross-compile it to arm. For convenience, a prebuilt binary for `armv7l` architecture was provided [here](https://github.com/mayudev/revcord/releases/download/v1.2/node_sqlite3.node)

You have to place it in `node_modules/sqlite3/lib/binding/napi-v6-linux-glibc-arm/node_sqlite3.node`.

Alternatively, if your device supports it (Raspberry Pi 3 does), you can install a 64-bit distribution.

### Messages sent to Discord have no content!

As in [setup](#setup) step 5, you need to enable the `Message Content Intent` in Discord bot settings. If this doesn't work, make sure the bot has permissions to read the messages in a channel.

![intent](docs/intent.png)

### Bot doesn't have sufficient permissions in the channel. Please check if the Manage Webhooks permission isn't being overridden for the bot role in that specific channel.

Aside from server-wide permissions, there are also channel-specific permissions. This message means that at some point, the bot's permission to manage webhooks is being overridden on the channel level. The easiest fix is to change the override to allow it. Alternatively, you can grant the bot the `Administrator` permission which overrides all channel-specific permissions.

In channel settings -> Permissions:

![override](docs/override.png)
