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

    // ป้องกันปัญหา play-dl แครชเมื่อเจอ YouTube Mix (list=RD...)
    if (type === "playlist" && query.includes("list=RD")) {
      type = "video";
    }

    if (type === "playlist") {
      const util = require("util");
      const { exec } = require("child_process");
      const execPromise = util.promisify(exec);
      
      try {
        const { stdout } = await execPromise(`.\\yt-dlp.exe -J --flat-playlist --playlist-end 100 "${query}"`, { maxBuffer: 1024 * 1024 * 10 });
        const parsed = JSON.parse(stdout);
        if (parsed && parsed.entries) {
          const videos = parsed.entries.filter(v => v.title && v.url && !v.title.includes("[Private video]") && !v.title.includes("[Deleted video]"));
          songInfos = videos.map((v) => ({
            title: v.title,
            url: v.url,
            thumbnail: v.thumbnails && v.thumbnails.length > 0 ? v.thumbnails[0].url : "",
            duration: v.duration || 0
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

      if ((typeof messageOrInteraction.isButton === "function" || typeof messageOrInteraction.isModalSubmit === "function") && typeof messageOrInteraction.followUp === "function") {
        const replyText =
          songInfos.length === 1
            ? `🎵 นำ **${songInfos[0].title}** เข้าคิวและเริ่มเล่นแล้วครับ!`
            : `🎵 นำ **${songInfos.length} เพลง** เข้าคิวและเริ่มเล่นแล้วครับ!`;
        await messageOrInteraction.followUp({ content: replyText, ephemeral: true }).catch(console.error);
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

    if (!messageOrInteraction.isButton && !messageOrInteraction.isModalSubmit) {
      const replyText =
        songInfos.length === 1
          ? `🎵 เพิ่ม **${songInfos[0].title}** ลงในคิวแล้วครับ!`
          : `🎵 เพิ่ม **${songInfos.length} เพลง** ลงในคิวแล้วครับ!`;

      if (messageOrInteraction.editReply) {
        return messageOrInteraction.editReply(replyText);
      } else {
        return messageOrInteraction.reply(replyText);
      }
    } else {
      const embed = generateMusicEmbed(serverQueue);
      const components = generateMusicComponents(serverQueue);
      
      const replyText =
        songInfos.length === 1
          ? `🎵 เพิ่ม **${songInfos[0].title}** ลงในคิวแล้วครับ!`
          : `🎵 เพิ่ม **${songInfos.length} เพลง** ลงในคิวแล้วครับ!`;

      if (typeof messageOrInteraction.editReply === "function") {
        await messageOrInteraction.editReply({
          content: "",
          embeds: [embed],
          components: components,
        });
        if (typeof messageOrInteraction.followUp === "function") {
          await messageOrInteraction.followUp({ content: replyText, ephemeral: true }).catch(console.error);
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
  const queueString = serverQueue.songs
    .map((song, index) => {
      const dur = formatTime(song.duration || 0);
      if (index === 0) return `**1.** ${song.title} [${dur}] *(กำลังเล่น 🎶)*`;
      return `**${index + 1}.** ${song.title} [${dur}]`;
    })
    .join("\n");

  const limitedString =
    queueString.length > 1900
      ? queueString.substring(0, 1900) + "\n...และอื่นๆ"
      : queueString;
  const replyText = `📋 **คิวเพลงปัจจุบัน:**\n${limitedString}`;

  if (messageOrInteraction.isButton) {
    return messageOrInteraction.reply({ content: replyText, ephemeral: true });
  } else {
    return messageOrInteraction.reply(replyText);
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
