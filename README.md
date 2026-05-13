# Discord Bot

This is a Discord bot built with Discord.js v14 that has two features:

1. **Auto-Ban on Leave**: Bans any member who leaves the server (whether voluntarily or kicked).

2. **Link Protection & Timeout**: Scans messages for URLs. If a non-administrator sends a link that is not a GIF (from Tenor, Giphy, or ending in .gif), the message is deleted, the user is timed out for 5 minutes, and a warning embed is sent that deletes itself after 5 seconds.

## Setup Instructions

1. **Install Node.js**: Download and install Node.js from [https://nodejs.org/](https://nodejs.org/) if not already installed.

2. **Install Dependencies**: Run `npm install` in the project directory.

3. **Create a Discord Bot**:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications).
   - Create a new application.
   - Go to the "Bot" section and create a bot.
   - Copy the bot token.

4. **Environment Variables**:
   - Create a `.env` file in the project root.
   - Add `DISCORD_TOKEN=your_bot_token_here`.
   - Optionally, set `PORT` for the web server (defaults to 3000).

5. **Invite the Bot to Your Server**:
   - In the Developer Portal, go to "OAuth2" > "URL Generator".
   - Select scopes: `bot`, `applications.commands`.
   - Select permissions: `Ban Members`, `Moderate Members`, `Manage Messages`, `Read Messages`, `Send Messages`.
   - Use the generated URL to invite the bot.

6. **Enable Intents**:
   - In the Bot section of the Developer Portal, enable the following intents:
     - Server Members Intent (GuildMembers)
     - Message Content Intent (MessageContent)
     - Server Moderation Intent (GuildModeration)

7. **Run the Bot**: Execute `node index.js`.

## Hosting on Render

- The bot includes a simple Express.js web server that listens on `process.env.PORT || 3000`.
- A health check route at `/` returns 'Bot is alive' for keep-alive pings.
- Upload the project to GitHub (excluding `node_modules` and `.env` via `.gitignore`).
- Connect your GitHub repo to Render for deployment.
- Set environment variables in Render: `DISCORD_TOKEN` and optionally `PORT`.

## Required Permissions

- Ban Members: For auto-banning on leave.
- Moderate Members: For timing out users.
- Manage Messages: For deleting messages and warning embeds.

## Troubleshooting

- If the bot doesn't respond, check the console for errors.
- Ensure the token is correct and intents are enabled.
- The bot must have the necessary permissions in the server.