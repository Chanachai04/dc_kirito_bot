const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
} = require("@discordjs/voice");
const play = require("play-dl");

// จัดเก็บคิวของแต่ละเซิร์ฟเวอร์
const queueMap = new Map();

async function musicFeature(message, command, args) {
  const guildId = message.guild.id;
  const voiceChannel = message.member?.voice?.channel;

  if (!voiceChannel && ["play", "stop", "next"].includes(command)) {
    return message.reply(
      "🎙️ คุณต้องอยู่ใน Voice Channel ก่อนถึงจะใช้คำสั่งนี้ได้ครับ!",
    );
  }

  if (voiceChannel) {
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("Connect") || !permissions.has("Speak")) {
      return message.reply(
        "❌ บอทไม่มีสิทธิ์ Connect หรือ Speak ใน Voice Channel นี้ครับ",
      );
    }
  }

  let serverQueue = queueMap.get(guildId);

  if (command === "play") {
    if (args.length === 0) {
      return message.reply(
        "⚠️ กรุณาระบุชื่อเพลงหรือลิงก์ YouTube ด้วยครับ (เช่น `!play รักข้ามคลอง`)",
      );
    }

    const query = args.join(" ");
    let songInfo;

    try {
      const isUrl = play.yt_validate(query) === "video";
      if (isUrl) {
        const info = await play.video_info(query);
        songInfo = {
          title: info.video_details.title,
          url: info.video_details.url,
        };
      } else {
        const searchResults = await play.search(query, { limit: 1 });
        if (!searchResults || searchResults.length === 0) {
          return message.reply("❌ ไม่พบเพลงที่ค้นหาครับ");
        }
        songInfo = {
          title: searchResults[0].title,
          url: searchResults[0].url,
        };
      }
    } catch (error) {
      console.error(error);
      return message.reply("❌ เกิดข้อผิดพลาดในการค้นหาหรือดึงข้อมูลเพลงครับ");
    }

    if (!serverQueue) {
      const queueConstruct = {
        textChannel: message.channel,
        voiceChannel: voiceChannel,
        connection: null,
        player: createAudioPlayer(),
        songs: [],
        playing: true,
      };

      queueMap.set(guildId, queueConstruct);
      queueConstruct.songs.push(songInfo);

      try {
        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: guildId,
          adapterCreator: message.guild.voiceAdapterCreator,
        });

        queueConstruct.connection = connection;
        connection.subscribe(queueConstruct.player);

        // เมื่อเล่นเพลงจบ (Idle)
        queueConstruct.player.on(AudioPlayerStatus.Idle, () => {
          queueConstruct.songs.shift();
          playNextSong(guildId);
        });

        queueConstruct.player.on("error", (error) => {
          console.error("Audio Player Error:", error);
          queueConstruct.songs.shift();
          playNextSong(guildId);
        });

        connection.on(VoiceConnectionStatus.Disconnected, () => {
          queueMap.delete(guildId);
        });

        await playNextSong(guildId);
      } catch (error) {
        console.error(error);
        queueMap.delete(guildId);
        return message.reply("❌ ไม่สามารถเข้าร่วม Voice Channel ได้ครับ");
      }
    } else {
      serverQueue.songs.push(songInfo);
      return message.reply(`🎵 เพิ่ม **${songInfo.title}** ลงในคิวแล้วครับ!`);
    }
  } else if (command === "stop") {
    if (!serverQueue) {
      return message.reply("❌ ไม่มีเพลงที่กำลังเล่นอยู่ครับ");
    }
    serverQueue.songs = [];
    serverQueue.player.stop(); // ทำให้ตัดจบเพลงปัจจุบัน
    if (serverQueue.connection) {
      serverQueue.connection.destroy();
    }
    queueMap.delete(guildId);
    return message.reply("🛑 หยุดเพลง เคลียร์คิว และออกจากห้องเรียบร้อยครับ!");
  } else if (command === "next") {
    if (!serverQueue || serverQueue.songs.length === 0) {
      return message.reply("❌ ไม่มีเพลงในคิวให้ข้ามครับ");
    }
    // สั่ง stop player ชั่วคราว ซึ่งจะกระตุ้นอีเวนต์ AudioPlayerStatus.Idle ทำให้เพลงถัดไปเล่นอัตโนมัติ
    serverQueue.player.stop();
    return message.reply("⏭️ ข้ามเพลงเรียบร้อยครับ!");
  } else if (command === "list") {
    if (!serverQueue || serverQueue.songs.length === 0) {
      return message.reply("📭 ตอนนี้ไม่มีเพลงในคิวครับ");
    }
    const queueString = serverQueue.songs
      .map((song, index) => {
        if (index === 0) return `**1.** ${song.title} *(กำลังเล่น 🎶)*`;
        return `**${index + 1}.** ${song.title}`;
      })
      .join("\n");
    return message.reply(`📋 **คิวเพลงปัจจุบัน:**\n${queueString}`);
  }
}

async function playNextSong(guildId) {
  const serverQueue = queueMap.get(guildId);
  if (!serverQueue) return;

  if (serverQueue.songs.length === 0) {
    if (serverQueue.connection) {
      serverQueue.connection.destroy();
    }
    queueMap.delete(guildId);
    return;
  }

  const song = serverQueue.songs[0];
  try {
    const { spawn } = require('child_process');
    const fs = require('fs');
    let resource;

    // ใช้ yt-dlp.exe เพื่อดึงสตรีมเสียงโดยตรง (ป้องกันการถูกบล็อคได้ดีที่สุด)
    if (fs.existsSync('./yt-dlp.exe')) {
      const ytdlp = spawn('.\\yt-dlp.exe', ['-f', 'bestaudio', '-o', '-', song.url]);
      
      ytdlp.on('error', (err) => console.error("yt-dlp spawn error:", err));
      
      resource = createAudioResource(ytdlp.stdout);
    } else {
      // กรณีไม่พบ yt-dlp.exe ให้ถอยกลับไปใช้ play-dl (อาจจะโดนบล็อค)
      const stream = await play.stream(song.url);
      resource = createAudioResource(stream.stream, {
        inputType: stream.type,
      });
    }

    serverQueue.player.play(resource);
    serverQueue.textChannel.send(`🎶 กำลังเล่น: **${song.title}**`);
  } catch (error) {
    console.error("Error playing song:", error);
    serverQueue.textChannel.send(
      `❌ ไม่สามารถเล่นเพลง **${song.title}** ได้ครับ ข้ามไปยังเพลงถัดไป...`,
    );
    serverQueue.songs.shift();
    playNextSong(guildId);
  }
}

module.exports = musicFeature;
