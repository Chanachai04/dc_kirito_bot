const { MessageFlags } = require("discord.js");
const { getUserSummaryTasks } = require("./sheets");
const { createSummaryEmbed } = require("./embeds");

/**
 * จัดการคำสั่ง /summary
 */
async function handleSummaryCommand(interaction, sheets, SPREADSHEET_ID) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const userDisplayName = (interaction.member?.displayName || "").toLowerCase();
    const userName = interaction.user.username.toLowerCase();

    const userTasks = await getUserSummaryTasks(sheets, SPREADSHEET_ID, userDisplayName, userName);
    const embed = createSummaryEmbed(interaction, userTasks);

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error("[CMD ERROR] /summary handler failed:", err);
    await interaction
      .editReply({ content: "❌ เกิดข้อผิดพลาดในการดึงสรุปงานของคุณ กรุณาลองใหม่อีกครั้ง" })
      .catch(() => null);
  }
}

module.exports = handleSummaryCommand;
