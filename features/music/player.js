const { createAudioResource, AudioPlayerStatus } = require("@discordjs/voice");
const play = require("play-dl");
const { queueMap } = require("./state");
const {
  clearProgressInterval,
  generateMusicEmbed,
  generateMusicComponents,
} = require("./ui");

async function playNextSong(guildId) {
  const serverQueue = queueMap.get(guildId);
  if (!serverQueue) return;

  clearProgressInterval(serverQueue);

  if (serverQueue.songs.length === 0) {
    if (serverQueue.connection) {
      serverQueue.connection.destroy();
    }
    queueMap.delete(guildId);
    return;
  }

  const song = serverQueue.songs[0];
  try {
    const { spawn } = require("child_process");
    const fs = require("fs");
    let resource;

    if (fs.existsSync("./yt-dlp.exe")) {
      const ytdlp = spawn(".\\yt-dlp.exe", [
        "-f",
        "bestaudio",
        "-o",
        "-",
        song.url,
      ]);
      ytdlp.on("error", (err) => console.error("yt-dlp spawn error:", err));
      resource = createAudioResource(ytdlp.stdout, { inlineVolume: true });
    } else {
      const stream = await play.stream(song.url);
      resource = createAudioResource(stream.stream, {
        inputType: stream.type,
        inlineVolume: true,
      });
    }

    resource.volume.setVolume(serverQueue.volume / 100);
    serverQueue.resource = resource;
    serverQueue.player.play(resource);

    const embed = generateMusicEmbed(serverQueue);
    const components = generateMusicComponents(serverQueue);

    if (serverQueue.playingMessage) {
      try {
        await serverQueue.playingMessage.edit({ embeds: [embed], components: components });
      } catch (e) {
        // ถ้าข้อความเดิมโดนลบไปแล้ว ให้ส่งใหม่
        const msg = await serverQueue.textChannel.send({ embeds: [embed], components: components });
        serverQueue.playingMessage = msg;
      }
    } else {
      const msg = await serverQueue.textChannel.send({
        embeds: [embed],
        components: components,
      });
      serverQueue.playingMessage = msg;
    }

    // ตั้งเวลาให้อัปเดตหลอดเพลงทุกๆ 5 วินาที
    serverQueue.progressInterval = setInterval(async () => {
      if (
        serverQueue &&
        serverQueue.player.state.status === AudioPlayerStatus.Playing
      ) {
        const newEmbed = generateMusicEmbed(serverQueue);
        if (serverQueue.playingMessage) {
          try {
            await serverQueue.playingMessage.edit({ embeds: [newEmbed] });
          } catch (e) {
            // Error ถ้าหากข้อความถูกลบไปแล้ว
            console.error("Failed to edit progress bar:", e);
            clearProgressInterval(serverQueue);
          }
        }
      }
    }, 5000);
  } catch (error) {
    console.error("Error playing song:", error);
    serverQueue.textChannel.send(
      `❌ ไม่สามารถเล่นเพลง **${song.title}** ได้ครับ ข้ามไปยังเพลงถัดไป...`,
    );
    serverQueue.songs.shift();
    playNextSong(guildId);
  }
}

module.exports = {
  playNextSong,
};
