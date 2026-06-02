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
const WAR_CHANNEL_IDS = [
  "1495757305667649557", // Channel A (lama)
  "1511346686746951750",  // Channel B (ganti dengan ID channel B)
];
const WAR_ROLE_ID = "1495739301055565905";
const VOICE_CHANNEL_ID = "1488854856633680083";
const COOLDOWN = 3 * 60 * 60 * 1000; // 3 jam

// DATA PERANG GLOBAL (1 perang untuk semua channel)
let globalWarData = null;

const negara = ["Libertera", "Warvane", "Ambarino", "Eloria"];

// ================= FORMAT LIST PESERTA =================
function formatParticipants(participants) {
  if (!participants.length) return "Belum ada peserta";

  const utama = participants.slice(0, 10);
  const cadangan = participants.slice(10);

  let text = utama
    .map((id, i) => `${i + 1}. <@${id}>`)
    .join("\n");

  if (cadangan.length) {
    text +=
      "\n\n📦 **Cadangan:**\n" +
      cadangan
        .map((id, i) => `${i + 11}. <@${id}>`)
        .join("\n");
  }

  return text;
}

// ================= JAM AKSES WIB =================
function isWarTime() {
  const now = new Date();
  const wibHour = (now.getUTCHours() + 7) % 24;
  return wibHour >= 17;
}

client.once("ready", () => {
  console.log(`Bot aktif ${client.user.tag}`);

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

// ================= ANTI CRASH =================
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

// ================= HAPUS EMBED LAMA =================
async function deleteOldEmbed() {
  if (!globalWarData) return;
  try {
    const oldChannel = client.channels.cache.get(globalWarData.channelId);
    if (oldChannel) {
      const oldMsg = await oldChannel.messages.fetch(globalWarData.messageId).catch(() => null);
      if (oldMsg) await oldMsg.delete().catch(() => {});
    }
  } catch (err) {}
}

// ================= SEND WAR =================
async function sendWar(channel, data) {
  const embed = embedBase(
    "LIST REGION YANG MAU DI RAMPOK",
    data.target
      ? `🎯 Target: **${data.target}**`
      : "Pilih region yang mau diserang!",
    channel.guild
  ).addFields({
    name: "👥 Peserta",
    value: formatParticipants(data.participants),
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

  // Cek apakah channel termasuk war channel
  if (!WAR_CHANNEL_IDS.includes(message.channel.id)) return;

  const content = message.content.toLowerCase();

  // Cek jam untuk .perang dan .list
  if ([".perang", ".list"].includes(content)) {
    if (!isWarTime()) {
      return message.reply({
        embeds: [
          embedBase(
            "⏰ BELUM WAKTUNYA RAMPOK",
            "Jam segini banget nih 😭\n\nlist rampok baru bisa dipakai mulai jam **18:00 WIB sampai 00:00 WIB**.\n\nBalik lagi nanti ya bossku!! 🔥",
            message.guild
          ),
        ],
      });
    }
  }

  const now = Date.now();

  // ================= .PERANG =================
  if (content === ".perang") {
    if (globalWarData) {
      if (now - globalWarData.createdAt < COOLDOWN) {
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
      // Cooldown habis, reset
      await deleteOldEmbed();
      globalWarData = null;
    }

    globalWarData = {
      target: null,
      participants: [],
      createdAt: now,
      messageId: null,
      channelId: message.channel.id,
    };

    const msg = await sendWar(message.channel, globalWarData);
    globalWarData.messageId = msg.id;
    globalWarData.channelId = message.channel.id;
  }

  // ================= .LIST =================
  if (content === ".list") {
    if (!globalWarData) {
      return message.reply({
        embeds: [
          embedBase("❌ ERROR", "Tidak ada rampok aktif.", message.guild),
        ],
      });
    }

    // Hapus embed lama (bisa dari channel mana saja)
    await deleteOldEmbed();

    // Kirim embed baru di channel yang nulis .list
    const msg = await sendWar(message.channel, globalWarData);
    globalWarData.messageId = msg.id;
    globalWarData.channelId = message.channel.id;
  }
});

// ================= INTERACTION =================
client.on("interactionCreate", async (interaction) => {

  if (
    interaction.isStringSelectMenu() &&
    interaction.customId === "war_select"
  ) {
    if (!globalWarData) return;

    globalWarData.target = interaction.values[0];
    globalWarData.participants = [];

    return interaction.update({
      content: `<@&${WAR_ROLE_ID}>  **YANG MAU IKUT RAMPOK LANGSUNG JOIN**`,
      embeds: [
        embedBase(
          "LISTNYA DIBAWAH INI YA GUYSSS",
          `🎯 Target: **${globalWarData.target}**\n\n👥 Peserta:\n${formatParticipants(globalWarData.participants)}`,
          interaction.guild
        ),
      ],
      components: [warButtons()],
    });
  }

  if (interaction.isButton() && interaction.customId === "war_join") {
    if (interaction.replied || interaction.deferred) return;
    if (!globalWarData) return;

    const userId = interaction.user.id;
    if (!globalWarData.participants.includes(userId)) {
      globalWarData.participants.push(userId);
    }

    return interaction.update({
      content: `<@&${WAR_ROLE_ID}>  **Yang udah masuk dalam list langsung prepare biar ga lama!!**`,
      embeds: [
        embedBase(
          "LISTNYA DIBAWAH INI YA GUYSSS",
          `🎯 Target: **${globalWarData.target}**\n\n👥 Peserta:\n${formatParticipants(globalWarData.participants)}`,
          interaction.guild
        ),
      ],
      components: [warButtons()],
    });
  }

  if (interaction.isButton() && interaction.customId === "war_leave") {
    if (interaction.replied || interaction.deferred) return;
    if (!globalWarData) return;

    const userId = interaction.user.id;
    globalWarData.participants = globalWarData.participants.filter(
      (id) => id !== userId
    );

    return interaction.update({
      content: `<@&${WAR_ROLE_ID}> **Yang udah masuk dalam list langsung prepare biar ga lama!!**`,
      embeds: [
        embedBase(
          "LISTNYA DIBAWAH INI YA GUYSSS",
          `🎯 Target: **${globalWarData.target}**\n\n👥 Peserta:\n${formatParticipants(globalWarData.participants)}`,
          interaction.guild
        ),
      ],
      components: [warButtons()],
    });
  }
});

client.login(process.env.TOKEN);
