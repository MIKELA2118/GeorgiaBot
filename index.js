require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Alive');
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
  ],
});

client.once('ready', () => {
  console.log('Bot is ready!');
});

client.on('guildMemberRemove', async (member) => {
  try {
    await member.guild.bans.create(member.user.id, { reason: 'Left the server' });
  } catch (error) {
    console.error('Error banning user:', error);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = message.content.match(urlRegex);
  if (!urls) return;

  let hasNonGifLink = false;
  for (const url of urls) {
    if (!url.includes('tenor.com') && !url.includes('giphy.com') && !url.endsWith('.gif')) {
      hasNonGifLink = true;
      break;
    }
  }

  if (!hasNonGifLink) return;

  try {
    await message.delete();
    await message.member.timeout(5 * 60 * 1000, 'Sent unauthorized link');
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('Warning')
      .setDescription('You have been timed out for 5 minutes for sending an unauthorized link.');
    const warningMessage = await message.channel.send({ embeds: [embed] });
    setTimeout(() => {
      warningMessage.delete();
    }, 5000);
  } catch (error) {
    console.error('Error handling message:', error);
  }
});

client.login(process.env.DISCORD_TOKEN);