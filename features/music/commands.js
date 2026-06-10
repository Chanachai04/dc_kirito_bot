const play = require("play-dl");
const {
  joinVoiceChannel,
  createAudioPlayer,
  AudioPlayerStatus,
  VoiceConnectionStatus,
} = require("@discordjs/voice");

const { queueMap } = require("./state");
const { playNextSong } = require("./player");
const {
  clearProgressInterval,
  formatTime,
  generateMusicEmbed,
  generateMusicComponents,
} = require("./ui");

async function playCommand(
  messageOrInteraction,
  args,
  voiceChannel,
  serverQueue,
) {
  const guildId = messageOrInteraction.guildId || messageOrInteraction.guild.id;
  if (args.length === 0) {
    const replyText =
      "⚠️ กรุณาระบุชื่อเพลงหรือลิงก์ YouTube ด้วยครับ (เช่น `!play รักข้ามคลอง`)";
    return messageOrInteraction.editReply
      ? messageOrInteraction.editReply(replyText)
      : messageOrInteraction.reply(replyText);
  }

  const query = args.join(" ");
  let songInfos = [];

  try {
    let type = play.yt_validate(query);

    // เปิดใช้งาน YouTube Mix (list=RD...) เพื่อให้ yt-dlp จัดการดึงข้อมูลเพลย์ลิสต์
    if (query.includes("list=RD") || query.includes("list=PL")) {
      type = "playlist";
    }

    if (type === "playlist") {
      const util = require("util");
      const { exec } = require("child_process");
      const execPromise = util.promisify(exec);

      try {
        const playlistEnd = query.includes("list=RD") ? 20 : 40;
        const { stdout } = await execPromise(
          `.\\yt-dlp.exe -J --flat-playlist --playlist-end ${playlistEnd} "${query}"`,
          { maxBuffer: 1024 * 1024 * 10 },
        );
        const parsed = JSON.parse(stdout);
        if (parsed && parsed.entries) {
          const videos = parsed.entries.filter(
            (v) =>
              v.title &&
              v.url &&
              !v.title.includes("[Private video]") &&
              !v.title.includes("[Deleted video]"),
          );
          songInfos = videos.map((v) => ({
            title: v.title,
            url: v.url,
            thumbnail:
              v.thumbnails && v.thumbnails.length > 0
                ? v.thumbnails[0].url
                : "",
            duration: v.duration || 0,
          }));
        }

        if (songInfos.length === 0) {
          type = "video"; // Fallback to single video if playlist parsing failed or is empty
        }
      } catch (err) {
        console.error("yt-dlp playlist error:", err.message);
        type = "video"; // Fallback to single video
      }
    }

    if (type === "video") {
      const info = await play.video_info(query);
      songInfos.push({
        title: info.video_details.title,
        url: info.video_details.url,
        thumbnail: info.video_details.thumbnails?.[0]?.url || "",
        duration: info.video_details.durationInSec || 0,
      });
    } else if (type !== "playlist") {
      const searchResults = await play.search(query, { limit: 1 });
      if (!searchResults || searchResults.length === 0) {
        const replyText = "❌ ไม่พบเพลงที่ค้นหาครับ";
        return messageOrInteraction.editReply
          ? messageOrInteraction.editReply(replyText)
          : messageOrInteraction.reply(replyText);
      }
      songInfos.push({
        title: searchResults[0].title,
        url: searchResults[0].url,
        thumbnail: searchResults[0].thumbnails?.[0]?.url || "",
        duration: searchResults[0].durationInSec || 0,
      });
    }
  } catch (error) {
    console.error(error);
    const replyText = "❌ เกิดข้อผิดพลาดในการค้นหาหรือดึงข้อมูลเพลงครับ";
    return messageOrInteraction.editReply
      ? messageOrInteraction.editReply(replyText)
      : messageOrInteraction.reply(replyText);
  }

  const currentQueueSize = serverQueue ? serverQueue.songs.length : 0;
  const availableSpace = 60 - currentQueueSize;

  if (availableSpace <= 0) {
    const replyText = "❌ คิวเพลงเต็มแล้วครับ (เก็บได้สูงสุด 60 เพลง)";
    return messageOrInteraction.editReply
      ? messageOrInteraction.editReply(replyText)
      : messageOrInteraction.reply(replyText);
  }

  let truncated = false;
  if (songInfos.length > availableSpace) {
    songInfos = songInfos.slice(0, availableSpace);
    truncated = true;
  }

  if (!serverQueue) {
    const queueConstruct = {
      textChannel: messageOrInteraction.channel,
      voiceChannel: voiceChannel,
      connection: null,
      player: createAudioPlayer(),
      songs: [],
      playing: true,
      volume: 100,
      resource: null,
      repeat: false,
      progressInterval: null,
      playingMessage: null,
    };

    queueMap.set(guildId, queueConstruct);
    queueConstruct.songs.push(...songInfos);

    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guildId,
        adapterCreator: messageOrInteraction.guild.voiceAdapterCreator,
      });

      queueConstruct.connection = connection;
      connection.subscribe(queueConstruct.player);

      queueConstruct.player.on(AudioPlayerStatus.Idle, () => {
        if (!queueConstruct.repeat) {
          queueConstruct.songs.shift();
        }
        playNextSong(guildId);
      });

      queueConstruct.player.on("error", (error) => {
        console.error("Audio Player Error:", error);
        queueConstruct.songs.shift();
        playNextSong(guildId);
      });

      connection.on(VoiceConnectionStatus.Disconnected, () => {
        clearProgressInterval(queueMap.get(guildId));
        queueMap.delete(guildId);
      });

      await playNextSong(guildId);

      if (
        (typeof messageOrInteraction.isButton === "function" ||
          typeof messageOrInteraction.isModalSubmit === "function" || typeof messageOrInteraction.isChatInputCommand === "function") &&
        typeof messageOrInteraction.followUp === "function"
      ) {
        let replyText =
          songInfos.length === 1
            ? `🎵 นำ **${songInfos[0].title}** เข้าคิวและเริ่มเล่นแล้วครับ!`
            : `🎵 นำ **${songInfos.length} เพลง** เข้าคิวและเริ่มเล่นแล้วครับ!`;
        if (truncated) replyText += "\n*(คำเตือน: ตัดเพลงบางส่วนออกเพราะคิวเต็ม 60 เพลงแล้ว)*";

        await messageOrInteraction
          .followUp({ content: replyText, ephemeral: true })
          .catch(console.error);
      }
    } catch (error) {
      console.error(error);
      clearProgressInterval(queueMap.get(guildId));
      queueMap.delete(guildId);
      const replyText = "❌ ไม่สามารถเข้าร่วม Voice Channel ได้ครับ";
      return messageOrInteraction.editReply
        ? messageOrInteraction.editReply(replyText)
        : messageOrInteraction.reply(replyText);
    }
  } else {
    serverQueue.songs.push(...songInfos);

    let replyText =
      songInfos.length === 1
        ? `🎵 เพิ่ม **${songInfos[0].title}** ลงในคิวแล้วครับ!`
        : `🎵 เพิ่ม **${songInfos.length} เพลง** ลงในคิวแล้วครับ!`;
    if (truncated) replyText += "\n*(คำเตือน: ตัดเพลงบางส่วนออกเพราะคิวเต็ม 60 เพลงแล้ว)*";

    if (!messageOrInteraction.isButton && !messageOrInteraction.isModalSubmit) {
      if (messageOrInteraction.editReply) {
        return messageOrInteraction.editReply(replyText);
      } else {
        return messageOrInteraction.reply(replyText);
      }
    } else {
      const embed = generateMusicEmbed(serverQueue);
      const components = generateMusicComponents(serverQueue);

      let replyText =
        songInfos.length === 1
          ? `🎵 เพิ่ม **${songInfos[0].title}** ลงในคิวแล้วครับ!`
          : `🎵 เพิ่ม **${songInfos.length} เพลง** ลงในคิวแล้วครับ!`;
      if (truncated) replyText += "\n*(คำเตือน: ตัดเพลงบางส่วนออกเพราะคิวเต็ม 60 เพลงแล้ว)*";

      if (typeof messageOrInteraction.editReply === "function") {
        await messageOrInteraction.editReply({
          content: "",
          embeds: [embed],
          components: components,
        });
        if (typeof messageOrInteraction.followUp === "function") {
          await messageOrInteraction
            .followUp({ content: replyText, ephemeral: true })
            .catch(console.error);
        }
      }
    }
  }
}

async function stopCommand(messageOrInteraction, serverQueue) {
  if (!serverQueue) {
    const text = "❌ ไม่มีเพลงที่กำลังเล่นอยู่ครับ";
    return messageOrInteraction.isButton
      ? messageOrInteraction.reply({ content: text, ephemeral: true })
      : messageOrInteraction.reply(text);
  }

  clearProgressInterval(serverQueue);
  serverQueue.songs = [];
  serverQueue.player.stop();
  if (serverQueue.connection) {
    serverQueue.connection.destroy();
  }
  queueMap.delete(
    messageOrInteraction.guildId || messageOrInteraction.guild.id,
  );

  if (typeof messageOrInteraction.deferUpdate === "function") {
    return messageOrInteraction.deferUpdate().catch(console.error);
  } else {
    return messageOrInteraction.reply(text);
  }
}

async function nextCommand(messageOrInteraction, serverQueue) {
  if (!serverQueue || serverQueue.songs.length === 0) {
    const text = "❌ ไม่มีเพลงในคิวให้ข้ามครับ";
    return messageOrInteraction.isButton
      ? messageOrInteraction.reply({ content: text, ephemeral: true })
      : messageOrInteraction.reply(text);
  }
  clearProgressInterval(serverQueue);
  serverQueue.repeat = false; // ปิด repeat เมื่อกดข้าม
  serverQueue.player.stop();

  if (typeof messageOrInteraction.deferUpdate === "function") {
    return messageOrInteraction.deferUpdate().catch(console.error);
  } else {
    return messageOrInteraction.reply(text);
  }
}

async function listCommand(messageOrInteraction, serverQueue) {
  if (!serverQueue || serverQueue.songs.length === 0) {
    const text = "📭 ตอนนี้ไม่มีเพลงในคิวครับ";
    return messageOrInteraction.isButton
      ? messageOrInteraction.reply({ content: text, ephemeral: true })
      : messageOrInteraction.reply(text);
  }

  let column1 = "";
  let column2 = "";

  const half = Math.ceil(serverQueue.songs.length / 2);
  
  serverQueue.songs.forEach((song, index) => {
    const dur = formatTime(song.duration || 0);
    const isPlaying = index === 0 ? " *(กำลังเล่น 🎶)*" : "";
    let line = `**${index + 1}.** ${song.title.length > 30 ? song.title.substring(0, 30) + "..." : song.title} [${dur}]${isPlaying}\n`;
    
    if (index < half) {
      column1 += line;
    } else {
      column2 += line;
    }
  });

  if (!column1) column1 = "-";
  if (!column2) column2 = "-";

  const { EmbedBuilder } = require("discord.js");
  const embed = new EmbedBuilder()
    .setColor("#FF0000")
    .setTitle("📋 คิวเพลงปัจจุบัน")
    .addFields(
      { name: "คอลัมน์ 1", value: column1, inline: true },
      { name: "คอลัมน์ 2", value: column2, inline: true }
    )
    .setFooter({ text: `ทั้งหมด ${serverQueue.songs.length} เพลง` });

  if (messageOrInteraction.isButton) {
    return messageOrInteraction.reply({ embeds: [embed], ephemeral: true });
  } else {
    return messageOrInteraction.reply({ embeds: [embed] });
  }
}

async function volumeCommand(messageOrInteraction, args, serverQueue) {
  if (!serverQueue) {
    return messageOrInteraction.reply("❌ ไม่มีเพลงที่กำลังเล่นอยู่ครับ");
  }
  if (args.length === 0) {
    return messageOrInteraction.reply(
      `🔊 ระดับเสียงปัจจุบันคือ **${serverQueue.volume}%**`,
    );
  }
  const vol = parseInt(args[0]);
  if (isNaN(vol) || vol < 1 || vol > 100) {
    return messageOrInteraction.reply(
      "❌ กรุณาระบุระดับเสียงระหว่าง 1 - 100 ครับ",
    );
  }
  serverQueue.volume = vol;
  if (serverQueue.resource && serverQueue.resource.volume) {
    serverQueue.resource.volume.setVolume(vol / 100);
  }
  return messageOrInteraction.reply(
    `🔊 ปรับระดับเสียงเป็น **${vol}%** แล้วครับ`,
  );
}

module.exports = {
  playCommand,
  stopCommand,
  nextCommand,
  listCommand,
  volumeCommand,
};
