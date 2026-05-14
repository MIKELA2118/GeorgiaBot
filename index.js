require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
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

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
let clientId = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const BOOST_CHANNEL_ID = process.env.BOOST_CHANNEL_ID || '1166384469033353346';
const boostCommand = new SlashCommandBuilder()
  .setName('testboost')
  .setDescription('Send a test boost notification embed.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setDMPermission(false);
const boostCommands = [boostCommand.toJSON()];

function createBoostNotification(user, guild) {
  const mentionText = `✦ <@${user.id}> — მოახდინა ცვლილება!`;
  const boostThumbnail = process.env.BOOST_THUMBNAIL_URL || 'https://cdn.discordapp.com/attachments/1036967921543869442/1125442452995209200/boost.png';
  const boostImage = process.env.BOOST_IMAGE_URL || 'https://media.discordapp.net/attachments/1162046656733253642/1498088189724725400/d4dj-anime-girl.gif?ex=6a064c59&is=6a04fad9&hm=c4ecf4d4a62be1c5b4577f3736d2a7705971509079347d0e514bb841ebae63d4&=';
  const totalBoosts = guild.premiumSubscriptionCount ?? 0;
  const embed = new EmbedBuilder()
    .setColor('#ff73fa')
    .setAuthor({ name: `${user.tag}`, iconURL: user.displayAvatarURL() })
    .setTitle('ახალი ბუსტი!')
    .setDescription(`${guild.name} = ${totalBoosts} ბუსტი!\n______________________________\nდიდი მადლობა ბუსტისთვის💎.`)
    .setThumbnail(boostThumbnail)
    .setImage(boostImage)
    .setFooter({ text: `${user.username} ახლახანს დააბუსტა სერვერი!`, iconURL: guild.iconURL() })
    .setTimestamp();
  return { mentionText, embed };
}

client.once('ready', async () => {
  console.log('Bot is ready!');
  try {
    if (!clientId) {
      await client.application.fetch();
      clientId = client.application?.id;
      if (!clientId) {
        console.error('Unable to determine bot application ID. Slash command registration skipped.');
        return;
      }
    }

    const guildIdToRegister = GUILD_ID || client.guilds.cache.first()?.id;
    if (guildIdToRegister) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildIdToRegister), { body: boostCommands });
      console.log(`Registered guild slash commands in guild ${guildIdToRegister}`);
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: boostCommands });
      console.log('Registered global slash commands');
      console.log('Note: global commands may take up to 1 hour to appear.');
    }
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }
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

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
    if (!oldMember.premiumSince && newMember.premiumSince) {
      const guild = newMember.guild;
      const channel = guild.channels.cache.get(BOOST_CHANNEL_ID)
        || guild.channels.cache.find((ch) => ch.name === 'boosts' && ch.isTextBased());
      if (!channel) return;

      const { mentionText, embed } = createBoostNotification(newMember.user, guild);
      await channel.send({ content: mentionText, embeds: [embed] });
    }
  } catch (error) {
    console.error('Error handling boost notification:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'testboost') return;

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: 'You must have Administrator permissions to use this command.', ephemeral: true });
  }

  const guild = interaction.guild;
  if (!guild) {
    return interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
  }

  const channel = guild.channels.cache.get(BOOST_CHANNEL_ID)
    || guild.channels.cache.find((ch) => ch.name === 'boosts' && ch.isTextBased());
  if (!channel) {
    return interaction.reply({ content: 'No `boosts` channel was found in this server.', ephemeral: true });
  }

  try {
    const { mentionText, embed } = createBoostNotification(interaction.user, guild);
    await channel.send({ content: mentionText, embeds: [embed] });
    await interaction.reply({ content: 'Boost test notification sent successfully.', ephemeral: true });
  } catch (error) {
    console.error('Error sending test boost notification:', error);
    await interaction.reply({ content: 'Failed to send the boost test notification.', ephemeral: true });
  }
});

client.login(process.env.DISCORD_TOKEN);