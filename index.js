require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// 🔒 CHANNEL KHUSUS PERANG
const WAR_CHANNEL_ID = "ISI_ID_CHANNEL_KAMU";

const warData = new Map();

const negara = ["Indonesia", "Amerika", "Rusia", "Jepang"];

client.once("ready", () => {
  console.log(`Bot aktif ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // 🔒 LOCK CHANNEL
  if (message.content === ".perang") {
    if (message.channel.id !== WAR_CHANNEL_ID) {
      return message.reply("❌ Command ini hanya bisa dipakai di room perang!");
    }

    const embed = new EmbedBuilder()
      .setTitle("⚔️ SISTEM PERANG")
      .setColor("Red")
      .setDescription("Pilih negara yang mau diserang!");

    const select = new StringSelectMenuBuilder()
      .setCustomId(`war_select`)
      .setPlaceholder("Pilih negara target...")
      .addOptions(
        negara.map((n) => ({
          label: n,
          value: n,
        }))
      );

    const row = new ActionRowBuilder().addComponents(select);

    const msg = await message.channel.send({
      embeds: [embed],
      components: [row],
    });

    warData.set(msg.id, {
      target: null,
      participants: [],
    });
  }
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isStringSelectMenu() && interaction.customId === "war_select") {
    const data = warData.get(interaction.message.id);
    if (!data) return;

    data.target = interaction.values[0];
    warData.set(interaction.message.id, data);

    const embed = new EmbedBuilder()
      .setTitle("⚔️ PERANG DIMULAI")
      .setColor("Red")
      .setDescription(`🎯 Target: **${data.target}**`)
      .addFields({
        name: "👥 Peserta",
        value: "Belum ada peserta",
      });

    const btn = new ButtonBuilder()
      .setCustomId(`war_join_${interaction.message.id}`)
      .setLabel("JOIN PERANG")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(btn);

    await interaction.update({
      embeds: [embed],
      components: [row],
    });

    data.participants = [];
  }

  if (interaction.isButton() && interaction.customId.startsWith("war_join_")) {
    const msgId = interaction.customId.split("_")[2];
    const data = warData.get(msgId);
    if (!data) return;

    const user = interaction.user.username;

    if (!data.participants.includes(user)) {
      data.participants.push(user);
    }

    const embed = new EmbedBuilder()
      .setTitle("⚔️ PERANG DIMULAI")
      .setColor("Red")
      .setDescription(`🎯 Target: **${data.target}**`)
      .addFields({
        name: "👥 Peserta",
        value: data.participants.length
          ? data.participants.map((u, i) => `${i + 1}. ${u}`).join("\n")
          : "Belum ada peserta",
      });

    const btn = new ButtonBuilder()
      .setCustomId(`war_join_${msgId}`)
      .setLabel("JOIN PERANG")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(btn);

    await interaction.update({
      embeds: [embed],
      components: [row],
    });
  }
});

client.login(process.env.TOKEN);
