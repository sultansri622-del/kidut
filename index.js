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

// CONFIG
const WAR_CHANNEL_ID = "1498061270165884928";
const WAR_ROLE_ID = "1495739301055565905";
const COOLDOWN = 60 * 60 * 1000; // 1 jam

const warData = new Map();

const negara = ["Libertera", "Warvane", "Ambarino", "Eloria"];

client.once("ready", () => {
  console.log(`Bot aktif ${client.user.tag}`);
});

// ================= CREATE EMBED =================
async function sendWar(channel, data) {
  const embed = new EmbedBuilder()
    .setTitle("⚔️ SISTEM RAMPOK BETLEHEM")
    .setColor("Red")
    .setDescription(
      data.target
        ? `🎯 Target: **${data.target}**`
        : "Pilih negara yang mau diserang!"
    )
    .addFields({
      name: "👥 Peserta",
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
      .setCustomId("war_join")
      .setLabel("JOIN PERANG")
      .setStyle(ButtonStyle.Success);

    components = [new ActionRowBuilder().addComponents(btn)];
  }

  const msg = await channel.send({
    content: `<@&${WAR_ROLE_ID}> ⚔️ **AYO KITA RAMPOK BWANGGG**`,
    embeds: [embed],
    components,
  });

  return msg;
}

// ================= MESSAGE =================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== WAR_CHANNEL_ID) return;

  const data = warData.get(message.channel.id);
  const now = Date.now();

  // ================= .PERANG =================
  if (message.content === ".perang") {
    // kalau masih ada perang aktif
    if (data) {
      if (now - data.createdAt < COOLDOWN) {
        return message.reply(
          "⚠️ Rampok masih aktif!\nGunakan **`.perang show`** untuk melihat lagi embed."
        );
      }

      warData.delete(message.channel.id);
    }

    const newData = {
      target: null,
      participants: [],
      createdAt: now,
      messageId: null,
    };

    const msg = await sendWar(message.channel, newData);

    newData.messageId = msg.id;

    warData.set(message.channel.id, newData);
  }

  // ================= SHOW =================
  if (message.content === ".perang show") {
    if (!data) {
      return message.reply("❌ Tidak ada perang aktif.");
    }

    const msg = await sendWar(message.channel, data);

    data.messageId = msg.id;
    warData.set(message.channel.id, data);
  }
});

// ================= INTERACTION =================
client.on("interactionCreate", async (interaction) => {
  if (interaction.isStringSelectMenu() && interaction.customId === "war_select") {
    const data = warData.get(interaction.message.channel.id);
    if (!data) return;

    data.target = interaction.values[0];
    data.participants = [];

    warData.set(interaction.message.channel.id, data);

    return interaction.update({
      content: `<@&${WAR_ROLE_ID}> ⚔️ **WAKTU BETLEHEM MERAMPOK**`,
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
            .setCustomId("war_join")
            .setLabel("JOIN PERANG")
            .setStyle(ButtonStyle.Success)
        ),
      ],
    });
  }

  // ================= JOIN =================
  if (interaction.isButton() && interaction.customId === "war_join") {
    const data = warData.get(interaction.message.channel.id);
    if (!data) return;

    const userId = interaction.user.id;

    if (!data.participants.includes(userId)) {
      data.participants.push(userId);
    }

    return interaction.update({
      content: `<@&${WAR_ROLE_ID}> ⚔️ **PERANG AKTIF**`,
      embeds: [
        new EmbedBuilder()
          .setTitle("⚔️ PERANG DIMULAI")
          .setColor("Red")
          .setDescription(`🎯 Target: **${data.target}**`)
          .addFields({
            name: "👥 Peserta",
            value: data.participants.length
              ? data.participants.map((id, i) => `${i + 1}. <@${id}>`).join("\n")
              : "Belum ada peserta",
          }),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("war_join")
            .setLabel("JOIN PERANG")
            .setStyle(ButtonStyle.Success)
        ),
      ],
    });
  }
});

client.login(process.env.TOKEN);
