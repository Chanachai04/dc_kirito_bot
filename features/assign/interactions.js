const { MessageFlags } = require("discord.js");
const { appendTaskToSheet, formatRowAsAssigned } = require("./sheets");

/**
 * จัดการเมื่อผู้ใช้กดปุ่ม ยืนยัน หรือ ยกเลิก
 */
async function handleAssignInteractions(btnInteraction, interaction, targetUser, discordName, task, deadline, sheets, SPREADSHEET_ID, collector) {
  if (btnInteraction.customId === "confirm_sheet") {
    await btnInteraction.deferUpdate();

    try {
      await interaction.channel.sendTyping().catch(() => null);

      const rowIndex = await appendTaskToSheet(sheets, SPREADSHEET_ID, discordName, task, deadline);

      if (rowIndex) {
        await formatRowAsAssigned(sheets, SPREADSHEET_ID, rowIndex);
      }

      await interaction.channel.send({
        content:
          `📢 **[สรุปการมอบหมายงาน]**\n` +
          `• **ผู้มอบหมายงาน:** ${interaction.user} \n` +
          `• **ผู้รับผิดชอบงาน:** ${targetUser}\n` +
          `• **รายละเอียดงาน:** ${task}\n` +
          `• **กำหนดส่ง:** ${deadline}\n`,
      });

      await interaction.deleteReply().catch(() => null);
      collector.stop();
    } catch (err) {
      console.error("[API ERROR] Sheets Writing Failure:", err);
      await interaction.followUp({
        content: "❌ ระบบหลังบ้านขัดข้อง ไม่สามารถเขียนข้อมูลลง Google Sheet ได้",
        flags: MessageFlags.Ephemeral,
      });
    }
  } else if (btnInteraction.customId === "cancel_sheet") {
    await btnInteraction.deferUpdate();
    await interaction.deleteReply().catch(() => null);
    collector.stop();
  }
}

module.exports = handleAssignInteractions;
