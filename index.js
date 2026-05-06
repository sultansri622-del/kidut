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

// 🔒 CONFIG
const WAR_CHANNEL_ID = "1498061270165884928";
const WAR_ROLE_ID = "1495739301055565905";
const COOLDOWN = 60 * 60 * 1000; // 1 jam

// channel -> war data
const warData = new Map();

const negara = ["Libertera", "Warvane", "Ambarino", "Eloria"];

client.once("ready", () => {
  console.log(`Bot aktif ${client.user.tag}`);
});

async function createWarMessage(channel, data) {
  const embed = new EmbedBuilder()
    .setTitle("⚔️ SISTEM ABSEN RAMPOK BETLEHEM")
    .setColor("Red")
    .setDescription(
      data.target
        ? `🎯 Target: **${data.target}**`
        : "Pilih negara yang mau diserang!"
    )
    .addFields({
      name: "👥 Peserta Perang",
      value: data.participants.length
        ? data.participants.map((id, i) => `${i + 1}. <@${id}>`).join("\n")
        : "Belum ada peserta",
    });

  let components;

  if (!data.target) {
    const select = new StringSelectMenuBuilder()
      .setCustomId("war_select")
      .setPlaceholder("Pilih negara target...")
      .addOptions(
        negara.map((n) => ({
          label: n,
          value: n,
        }))
      );

    components = [new ActionRowBuilder().addComponents(select)];
  } else {
    const btn = new ButtonBuilder()
      .setCustomId(`war_join_${channel.id}`)
      .setLabel("JOIN PERANG")
      .setStyle(ButtonStyle.Success);

    components = [new ActionRowBuilder().addComponents(btn)];
  }

  const msg = await channel.send({
    content: `<@&${WAR_ROLE_ID}> ⚔️ **ROOM RAMPOK BETLEHEM AKTIF**`,
    embeds: [embed],
    components,
  });

  return msg;
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== WAR_CHANNEL_ID) return;

  let data = warData.get(message.channel.id);

  // 🔥 COMMAND .perang
  if (message.content === ".perang") {
    const now = Date.now();

    // kalau sudah ada war aktif
    if (data) {
      // kalau masih cooldown
      if (now - data.createdAt < COOLDOWN) {
        return message.reply("⏳ Masih ada rampok aktif! tunggu 1 jam untuk reset.");
      }

      // reset kalau sudah lewat 1 jam
      warData.delete(message.channel.id);
    }

    const newData = {
      target: null,
      participants: [],
      createdAt: now,
      messageId: null,
    };

    const msg = await createWarMessage(message.channel, newData);

    newData.messageId = msg.id;

    warData.set(message.channel.id, newData);
  }

  // 🔥 SHOW ULANG EMBED (kalau tenggelam)
  if (message.content === ".perang show") {
    const data = warData.get(message.channel.id);
    if (!data) return message.reply("❌ Tidak ada perang aktif.");

    const msg = await createWarMessage(message.channel, data);

    data.messageId = msg.id;
    warData.set(message.channel.id, data);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  if (interaction.customId === "war_select") {
    const data = warData.get(interaction.message.channel.id);
    if (!data) return;

    data.target = interaction.values[0];
    data.participants = [];

    warData.set(interaction.message.channel.id, data);

    await interaction.update({
      content: `<@&${WAR_ROLE_ID}> ⚔️ **ROOM PERANG AKTIF**`,
      embeds: [
        new EmbedBuilder()
          .setTitle("⚔️ BETLEHEM MERAMPOK DIMULAI")
          .setColor("Red")
          .setDescription(`🎯 Target: **${data.target}**`)
          .addFields({
            name: "👥 Peserta",
            value: "Belum ada peserta",
          }),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`war_join_${interaction.message.channel.id}`)
            .setLabel("JOIN PERANG")
            .setStyle(ButtonStyle.Success)
        ),
      ],
    });
  }

  if (
    interaction.isButton() &&
    interaction.customId.startsWith("war_join_")
  ) {
    const channelId = interaction.message.channel.id;
    const data = warData.get(channelId);
    if (!data) return;

    const userId = interaction.user.id;

    if (!data.participants.includes(userId)) {
      data.participants.push(userId);
    }

    await interaction.update({
      content: `<@&${WAR_ROLE_ID}> ⚔️ **ROOM PERANG AKTIF**`,
      embeds: [
        new EmbedBuilder()
          .setTitle("⚔️ PERANG DIMULAI")
          .setColor("Red")
          .setDescription(`🎯 Target: **${data.target}**`)
          .addFields({
            name: "👥 Peserta",
            value: data.participants.length
              ? data.participants
                  .map((id, i) => `${i + 1}. <@${id}>`)
                  .join("\n")
              : "Belum ada peserta",
          }),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`war_join_${channelId}`)
            .setLabel("JOIN PERANG")
            .setStyle(ButtonStyle.Success)
        ),
      ],
    });
  }
});

client.login(process.env.TOKEN);
