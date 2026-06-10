const { queueMap } = require("./state");
const { playCommand, stopCommand, nextCommand, listCommand, volumeCommand } = require("./commands");
const { handleMusicInteraction } = require("./interactions");

async function handleMusicCommand(message, command, args) {
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
    await playCommand(message, args, voiceChannel, serverQueue);
  } else if (command === "stop") {
    await stopCommand(message, serverQueue);
  } else if (command === "next") {
    await nextCommand(message, serverQueue);
  } else if (command === "list") {
    await listCommand(message, serverQueue);
  } else if (command === "volume") {
    await volumeCommand(message, args, serverQueue);
  }
}

module.exports = {
  handleMusicCommand,
  handleMusicInteraction,
};
