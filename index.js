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

const {
  joinVoiceChannel,
  getVoiceConnection,
} = require("@discordjs/voice");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// CONFIG
const WAR_CHANNEL_ID = "1495757305667649557";
const WAR_ROLE_ID = "1495739301055565905";
const VOICE_CHANNEL_ID = "1488854856633680083";
const COOLDOWN = 3 * 60 * 60 * 1000; // 3 jam

const warData = new Map();

const negara = ["Libertera", "Warvane", "Ambarino", "Eloria"];

// ================= JAM AKSES WIB =================
function isWarTime() {
  const now = new Date();

  // WIB UTC+7
  const wibHour = (now.getUTCHours() + 7) % 24;

  // Aktif mulai 19:00 sampai sebelum 00:00
  return wibHour >= 22;
}

client.once("ready", () => {
  console.log(`Bot aktif ${client.user.tag}`);

  // ================= AUTO JOIN VOICE =================
  setTimeout(() => {
    try {
      const channel = client.channels.cache.get(VOICE_CHANNEL_ID);

      if (!channel) return console.log("❌ Voice channel tidak ditemukan");

      joinVoiceChannel({
        channelId: VOICE_CHANNEL_ID,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: false,
      });

      console.log("🎧 Bot masuk voice channel");
    } catch (err) {
      console.log("Voice error:", err);
    }
  }, 5000);
});

// ================= AUTO REJOIN VC =================
client.on("voiceStateUpdate", async () => {
  try {
    const guild = client.guilds.cache.first();

    if (!guild) return;

    const connection = getVoiceConnection(guild.id);

    if (!connection) {
      const channel = client.channels.cache.get(VOICE_CHANNEL_ID);

      if (!channel) return;

      joinVoiceChannel({
        channelId: VOICE_CHANNEL_ID,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: false,
      });

      console.log("🔄 Bot rejoin voice");
    }
  } catch (err) {
    console.log("Rejoin VC Error:", err);
  }
});

// ================= ANTI CRASH (24/7 SUPPORT) =================
process.on("unhandledRejection", (err) => {
  console.log("Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.log("Uncaught Exception:", err);
});

// ================= FOOTER =================
function embedBase(title, description, guild) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor("Gold")
    .setFooter({
      text: "BETLEHEM • Copyright ©️2018 - BTHL",
      iconURL: guild?.iconURL?.({ dynamic: true }) || null,
    });
}

// ================= BUTTON ROW =================
function warButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("war_join")
      .setLabel("JOIN RAMPOK")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("war_leave")
      .setLabel("KELUAR LIST")
      .setStyle(ButtonStyle.Danger)
  );
}

// ================= CREATE WAR =================
async function sendWar(channel, data) {
  const embed = embedBase(
    "LIST REGION YANG MAU DI RAMPOK",
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
    components = [warButtons()];
  }

  return channel.send({
    content: `<@&${WAR_ROLE_ID}>  **AYO WAKTUNYA MERAMPOK!!!!**`,
    embeds: [embed],
    components,
  });
}

// ================= MESSAGE =================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== WAR_CHANNEL_ID) return;

  // ================= BATAS JAM AKSES =================
  if (
    [".perang", ".list"].includes(message.content.toLowerCase())
  ) {
    if (!isWarTime()) {
      return message.reply({
        embeds: [
          embedBase(
            "⏰ BELUM WAKTUNYA RAMPOK",
            "Jam segini banget nih 😭\n\nlist rampok baru bisa dipakai mulai jam **19:00 WIB sampai 00:00 WIB**.\n\nBalik lagi nanti malem ya bossku 🔥",
            message.guild
          ),
        ],
      });
    }
  }

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
              "Rampok masih aktif!\nGunakan `.list` untuk melihat yang ikut merampok.",
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

  // ================= LIST =================
  if (message.content === ".list") {
    if (!data) {
      return message.reply({
        embeds: [
          embedBase("❌ ERROR", "Tidak ada rampok aktif.", message.guild),
        ],
      });
    }

    try {
      const oldMsg = await message.channel.messages.fetch(data.messageId);

      if (oldMsg) {
        await oldMsg.delete().catch(() => {});
      }
    } catch (err) {}

    const msg = await sendWar(message.channel, data);

    data.messageId = msg.id;

    warData.set(message.channel.id, data);
  }
});

// ================= INTERACTION =================
client.on("interactionCreate", async (interaction) => {

  // ================= SELECT REGION =================
  if (
    interaction.isStringSelectMenu() &&
    interaction.customId === "war_select"
  ) {
    const data = warData.get(interaction.message.channel.id);

    if (!data) return;

    data.target = interaction.values[0];
    data.participants = [];

    warData.set(interaction.message.channel.id, data);

    return interaction.update({
      content: `<@&${WAR_ROLE_ID}>  **YANG MAU IKUT RAMPOK LANGSUNG JOIN**`,
      embeds: [
        embedBase(
          "LISTNYA DIBAWAH INI YA GUYSSS",
          `🎯 Target: **${data.target}**\n\n👥 Peserta:\nBelum ada peserta`,
          interaction.guild
        ),
      ],
      components: [warButtons()],
    });
  }

  // ================= JOIN =================
  if (interaction.isButton() && interaction.customId === "war_join") {

    if (interaction.replied || interaction.deferred) return;

    const data = warData.get(interaction.message.channel.id);

    if (!data) return;

    const userId = interaction.user.id;

    if (!data.participants.includes(userId)) {
      data.participants.push(userId);
    }

    warData.set(interaction.message.channel.id, data);

    return interaction.update({
      content: `<@&${WAR_ROLE_ID}>  **Yang udah masuk dalam list langsung prepare biar ga lama!!**`,
      embeds: [
        embedBase(
          "LISTNYA DIBAWAH INI YA GUYSSS",
          `🎯 Target: **${data.target}**\n\n👥 Peserta:\n${
            data.participants.length
              ? data.participants
                  .map((id, i) => `${i + 1}. <@${id}>`)
                  .join("\n")
              : "Belum ada peserta"
          }`,
          interaction.guild
        ),
      ],
      components: [warButtons()],
    });
  }

  // ================= LEAVE =================
  if (interaction.isButton() && interaction.customId === "war_leave") {

    if (interaction.replied || interaction.deferred) return;

    const data = warData.get(interaction.message.channel.id);

    if (!data) return;

    const userId = interaction.user.id;

    data.participants = data.participants.filter(
      (id) => id !== userId
    );

    warData.set(interaction.message.channel.id, data);

    return interaction.update({
      content: `<@&${WAR_ROLE_ID}> **Yang udah masuk dalam list langsung prepare biar ga lama!!**`,
      embeds: [
        embedBase(
          "LISTNYA DIBAWAH INI YA GUYSSS",
          `🎯 Target: **${data.target}**\n\n👥 Peserta:\n${
            data.participants.length
              ? data.participants
                  .map((id, i) => `${i + 1}. <@${id}>`)
                  .join("\n")
              : "Belum ada peserta"
          }`,
          interaction.guild
        ),
      ],
      components: [warButtons()],
    });
  }
});

client.login(process.env.TOKEN);
