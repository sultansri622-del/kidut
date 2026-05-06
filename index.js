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

// ================= FOOTER EMBED (ADDED ICON SERVER) =================
function embedBase(title, description, guild) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor("Red")
    .setFooter({
      text: "BETLEHEM • Copyright ©️2018 - BTHL",
      iconURL: guild?.iconURL({ dynamic: true })
    });
}

// ================= CREATE EMBED =================
async function sendWar(channel, data) {
  const embed = embedBase(
    "⚔️ LIST REGION YANG MAU DI RAMPOK",
    data.target
      ? `🎯 Target: **${data.target}**`
      : "Pilih region yang mau diserang!",
    channel.guild
  ).addFields({
    name: "👥 Peserta",
    value: data.participants.length
      ? data.participants.map((id, i) => `${i + 1}. <@${id}>`).join("\n")
      : "Belum ada peserta",
  });

  let components;

  if (!data.target) {
    const select = new StringSelectMenuBuilder()
      .setCustomId("war_select")
      .setPlaceholder("Pilih region target...")
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
      .setLabel("JOIN RAMPOK")
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
    if (data) {
      if (now - data.createdAt < COOLDOWN) {
        return message.reply({
          embeds: [
            embedBase(
              "⚠️ PERINGATAN",
              "Rampok masih aktif!\nGunakan `.perang show` untuk melihat embed.",
              message.guild
            ),
          ],
        });
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
      return message.reply({
        embeds: [
          embedBase("❌ ERROR", "Tidak ada rampok yang aktif.", message.guild),
        ],
      });
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
      content: `<@&${WAR_ROLE_ID}> ⚔️ **ABSEN YANG MAU IKUT RAMPOK**`,
      embeds: [
        embedBase(
          "⚔️ INI LIST YANG MAU IKUT RAMPOK ⚔️",
          `🎯 Target: **${data.target}**\n\n👥 Peserta:\nBelum ada peserta`,
          interaction.guild
        ),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("war_join")
            .setLabel("JOIN RAMPOK")
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
      content: `<@&${WAR_ROLE_ID}> ⚔️ **LANGSUNG PREPARE YAAA**`,
      embeds: [
        embedBase(
          "⚔️ INI LIST YANG MAU IKUT RAMPOK ⚔️",
          `🎯 Target: **${data.target}**\n\n👥 Peserta:\n${
            data.participants.length
              ? data.participants.map((id, i) => `${i + 1}. <@${id}>`).join("\n")
              : "Belum ada peserta"
          }`,
          interaction.guild
        ),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("war_join")
            .setLabel("JOIN RAMPOK")
            .setStyle(ButtonStyle.Success)
        ),
      ],
    });
  }
});

client.login(process.env.TOKEN);
