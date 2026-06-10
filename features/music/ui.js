const { AudioPlayerStatus } = require("@discordjs/voice");
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

// Helper: แปลงวินาทีเป็นนาที:วินาที
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Helper: สร้างหลอดเวลาจำลอง
function createProgressBar(currentSec, totalSec) {
  const barLength = 15;
  if (totalSec === 0 || isNaN(totalSec))
    return `**0:00 🔵▬▬▬▬▬▬▬▬▬▬▬▬▬▬ 0:00**`;

  // ป้องกันไม่ให้เกิน 100%
  currentSec = Math.min(currentSec, totalSec);

  const progress = currentSec / totalSec;
  const pos = Math.round(barLength * progress);

  let bar = "";
  for (let i = 0; i < barLength; i++) {
    if (i === pos) bar += "🔵";
    else bar += "▬";
  }

  if (pos >= barLength) bar = "▬▬▬▬▬▬▬▬▬▬▬▬▬▬🔵";

  return `**${formatTime(currentSec)} ${bar} ${formatTime(totalSec)}**`;
}

// Helper: ล้างการอัปเดตเวลาหลอดจำลอง
function clearProgressInterval(serverQueue) {
  if (serverQueue && serverQueue.progressInterval) {
    clearInterval(serverQueue.progressInterval);
    serverQueue.progressInterval = null;
  }
}

// Helper: สร้าง Embed ของหน้าต่างเพลง
function generateMusicEmbed(serverQueue) {
  if (!serverQueue || serverQueue.songs.length === 0) return null;
  const song = serverQueue.songs[0];
  const queueStatus =
    serverQueue.songs.length > 1
      ? `${serverQueue.songs.length - 1} เพลงรอ`
      : "ไม่มีเพลงรอ";

  let currentSec = 0;
  if (serverQueue.resource && serverQueue.resource.playbackDuration) {
    currentSec = Math.floor(serverQueue.resource.playbackDuration / 1000);
  }

  const progressBar = createProgressBar(currentSec, song.duration || 0);

  const embed = new EmbedBuilder()
    .setColor("#FF0000") // สีแดงแบบ YouTube
    .setAuthor({
      name: "YouTube Music Player",
      iconURL: "https://cdn-icons-png.flaticon.com/512/1384/1384060.png",
    })
    .setTitle(`✨ ${song.title}`)
    .setURL(song.url)
    .setDescription(progressBar)
    .addFields(
      {
        name: "🔁 โหมดเล่นซ้ำ",
        value: serverQueue.repeat ? "เปิด" : "ปิด",
        inline: true,
      },
      { name: "📭 คิวเพลง", value: queueStatus, inline: true },
    )
    .setFooter({ text: "Kirito-Bot • ระบบเพลงคุณภาพสูง 💖" });

  if (song.thumbnail) {
    embed.setThumbnail(song.thumbnail);
  }
  return embed;
}

// Helper: สร้างปุ่ม
function generateMusicComponents(serverQueue) {
  const isPaused =
    serverQueue &&
    serverQueue.player &&
    serverQueue.player.state.status === AudioPlayerStatus.Paused;
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("music_add")
      .setLabel("➕ เพิ่มเพลง")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("music_pause")
      .setLabel(isPaused ? "▶️ เล่นต่อ" : "⏸️ พักเพลง")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("music_next")
      .setLabel("⏭️ ข้าม")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("music_repeat")
      .setLabel("🔁 วนลูป")
      .setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("music_stop")
      .setLabel("🛑 ปิดเครื่องเล่น")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("music_queue")
      .setLabel("📋 คิวเพลง")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("music_vol_down")
      .setLabel("🔉 ลดเสียง")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("music_vol_up")
      .setLabel("🔊 เพิ่มเสียง")
      .setStyle(ButtonStyle.Secondary),
  );

  return [row1, row2];
}

module.exports = {
  formatTime,
  createProgressBar,
  clearProgressInterval,
  generateMusicEmbed,
  generateMusicComponents,
};
