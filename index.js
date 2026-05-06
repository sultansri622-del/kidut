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
const WAR_CHANNEL_ID = "1498061270165884928";

const warData = new Map();

const negara = ["Libertera", "Ambarino", "Warvane", "Eloria"];

client.once("ready", () => {
  console.log(`Bot aktif sebagai ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === ".perang") {
    if (message.channel.id !== WAR_CHANNEL_ID) {
      return message.reply("❌ Command ini hanya bisa dipakai di room perang!");
    }

    const embed = new EmbedBuilder()
      .setTitle("⚔️ SISTEM ABSEN PERANG BETLEHEM")
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
  // PILIH NEGARA TARGET
  if (
    interaction.isStringSelectMenu() &&
    interaction.customId === "war_select"
  ) {
    const data = warData.get(interaction.message.id);
    if (!data) return;

    data.target = interaction.values[0];
    data.participants = [];

    const embed = new EmbedBuilder()
      .setTitle("⚔️ LIST YANG IKUT PERANG")
      .setColor("Red")
      .setDescription(`🎯 Target Serangan: **${data.target}**`)
      .addFields({
        name: "👥 Peserta Perang",
        value: "Belum ada peserta",
      });

    const btn = new ButtonBuilder()
      .setCustomId(`war_join_${interaction.message.id}`)
      .setLabel("JOIN PERANG")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(btn);

    warData.set(interaction.message.id, data);

    await interaction.update({
      embeds: [embed],
      components: [row],
    });
  }

  // JOIN BUTTON
  if (
    interaction.isButton() &&
    interaction.customId.startsWith("war_join_")
  ) {
    const msgId = interaction.customId.split("_")[2];
    const data = warData.get(msgId);
    if (!data) return;

    const userId = interaction.user.id;

    // anti double join
    if (!data.participants.includes(userId)) {
      data.participants.push(userId);
    }

    const embed = new EmbedBuilder()
      .setTitle("⚔️ PERANG DIMULAI")
      .setColor("Red")
      .setDescription(`🎯 Target Serangan: **${data.target}**`)
      .addFields({
        name: "👥 Peserta Perang",
        value: data.participants.length
          ? data.participants
              .map((id, i) => `${i + 1}. <@${id}>`)
              .join("\n")
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
