const { AudioPlayerStatus } = require("@discordjs/voice");
const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const { queueMap } = require("./state");
const { generateMusicEmbed, generateMusicComponents } = require("./ui");
const { stopCommand, nextCommand, listCommand, playCommand } = require("./commands");

async function handleMusicInteraction(interaction) {
  const guildId = interaction.guildId;
  const serverQueue = queueMap.get(guildId);

  if (interaction.isButton()) {
    const customId = interaction.customId;

    if (
      ![
        "music_add",
        "music_next",
        "music_stop",
        "music_repeat",
        "music_queue",
        "music_pause",
        "music_vol_down",
        "music_vol_up",
      ].includes(customId)
    )
      return;

    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel && customId !== "music_queue") {
      return interaction.reply({
        content: "🎙️ คุณต้องอยู่ใน Voice Channel ก่อนครับ!",
        ephemeral: true,
      });
    }

    if (customId === "music_add") {
      const modal = new ModalBuilder()
        .setCustomId("music_add_modal")
        .setTitle("เพิ่มเพลงลงในคิว");

      const songInput = new TextInputBuilder()
        .setCustomId("song_query")
        .setLabel("ระบุชื่อเพลงหรือลิงก์ YouTube")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder("เช่น รักข้ามคลอง หรือ URL...");

      modal.addComponents(new ActionRowBuilder().addComponents(songInput));
      await interaction.showModal(modal);
    } else if (customId === "music_pause") {
      if (!serverQueue)
        return interaction.reply({
          content: "❌ ไม่มีเพลงที่กำลังเล่นอยู่ครับ",
          ephemeral: true,
        });

      if (serverQueue.player.state.status === AudioPlayerStatus.Paused) {
        serverQueue.player.unpause();
        const embed = generateMusicEmbed(serverQueue);
        const components = generateMusicComponents(serverQueue);
        return interaction.update({
          content: "▶️ เล่นเพลงต่อแล้วครับ",
          embeds: [embed],
          components: components,
        });
      } else {
        serverQueue.player.pause();
        const embed = generateMusicEmbed(serverQueue);
        const components = generateMusicComponents(serverQueue);
        return interaction.update({
          content: "⏸️ พักเพลงแล้วครับ",
          embeds: [embed],
          components: components,
        });
      }
    } else if (customId === "music_next") {
      await nextCommand(interaction, serverQueue);
    } else if (customId === "music_stop") {
      await stopCommand(interaction, serverQueue);
    } else if (customId === "music_repeat") {
      if (!serverQueue)
        return interaction.reply({
          content: "❌ ไม่มีเพลงที่กำลังเล่นอยู่ครับ",
          ephemeral: true,
        });
      serverQueue.repeat = !serverQueue.repeat;

      const embed = generateMusicEmbed(serverQueue);
      const components = generateMusicComponents(serverQueue);

      await interaction.update({ embeds: [embed], components: components });
    } else if (customId === "music_queue") {
      await listCommand(interaction, serverQueue);
    } else if (customId === "music_vol_down" || customId === "music_vol_up") {
      if (!serverQueue)
        return interaction.reply({
          content: "❌ ไม่มีเพลงที่กำลังเล่นอยู่ครับ",
          ephemeral: true,
        });

      let change = customId === "music_vol_up" ? 10 : -10;
      let newVol = serverQueue.volume + change;
      if (newVol > 100) newVol = 100;
      if (newVol < 1) newVol = 1;

      serverQueue.volume = newVol;
      if (serverQueue.resource && serverQueue.resource.volume) {
        serverQueue.resource.volume.setVolume(newVol / 100);
      }

      return interaction.deferUpdate().catch(console.error);
    }
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === "music_add_modal") {
      const query = interaction.fields.getTextInputValue("song_query");
      const voiceChannel = interaction.member?.voice?.channel;
      await interaction.deferUpdate().catch(console.error);
      const args = query.split(" ");
      await playCommand(interaction, args, voiceChannel, serverQueue);
    }
  }
}

module.exports = { handleMusicInteraction };
