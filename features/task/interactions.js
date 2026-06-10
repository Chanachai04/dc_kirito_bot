const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const { markTaskAsComplete } = require("./sheets");

/**
 * ส่งหน้าจอยืนยันว่างานเสร็จสิ้นแล้ว
 */
const sendTaskConfirmUI = async (taskObj, replyInteraction) => {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`complete_task_btn_${taskObj.rowIndex}`)
      .setLabel("เสร็จเรียบร้อย")
      .setStyle(ButtonStyle.Success)
      .setEmoji("✅"),
    new ButtonBuilder()
      .setCustomId("cancel_task_btn")
      .setLabel("ยกเลิก")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("❌"),
  );

  await replyInteraction.editReply({
    content:
      `📋 **ยืนยันการเสร็จสิ้นงาน (ข้อความนี้เห็นเฉพาะคุณ):**\n` +
      `• **รายละเอียดงาน:** ${taskObj.task}\n` +
      `• **กำหนดส่ง:** ${taskObj.deadline}`,
    components: [row],
  });
};

/**
 * จัดการเมื่อผู้ใช้กดโต้ตอบกับ UI ของ Task
 */
async function handleTaskInteractions(itemInteraction, interaction, userTasks, sheets, SPREADSHEET_ID, sheetName, sheetId, collector) {
  if (itemInteraction.user.id !== interaction.user.id) {
    await itemInteraction.reply({
      content: "❌ คุณไม่มีสิทธิ์กดปุ่มนี้",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // กรณีเลือกงานจาก Dropdown
  if (itemInteraction.isStringSelectMenu() && itemInteraction.customId === "select_task_menu") {
    await itemInteraction.deferUpdate();
    const selectedRowIndex = parseInt(itemInteraction.values[0].replace("select_task_complete_", ""));
    const selectedTask = userTasks.find((t) => t.rowIndex === selectedRowIndex);
    if (selectedTask) {
      await sendTaskConfirmUI(selectedTask, interaction);
    }
  }

  // กรณีการกดยืนยัน "เสร็จเรียบร้อย"
  else if (itemInteraction.isButton() && itemInteraction.customId.startsWith("complete_task_btn_")) {
    await itemInteraction.deferUpdate();
    const targetRowIndex = parseInt(itemInteraction.customId.replace("complete_task_btn_", ""));
    const completedTask = userTasks.find((t) => t.rowIndex === targetRowIndex);

    if (completedTask) {
      try {
        await interaction.channel.sendTyping().catch(() => null);

        await markTaskAsComplete(sheets, SPREADSHEET_ID, targetRowIndex, sheetName, sheetId);

        await interaction.channel.send({
          content:
            `🎉 **[อัปเดตสถานะงาน]**\n` +
            `• **ผู้รับผิดชอบงาน:** ${interaction.user}\n` +
            `• **รายละเอียดงาน:** ${completedTask.task}\n` +
            `• **กำหนดส่ง:** ${completedTask.deadline}\n` +
            `• **สถานะ:** 🟢 เสร็จเรียบร้อยแล้ว!`,
        });

        await interaction.deleteReply().catch(() => null);
        collector.stop();
      } catch (err) {
        console.error("[API ERROR] Task Completion Update Failure:", err);
        await interaction.followUp({
          content: "❌ เกิดข้อผิดพลาดในการบันทึกข้อมูลสำเร็จลง Google Sheet",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  }

  // กรณีการกดปุ่ม "ยกเลิก"
  else if (itemInteraction.isButton() && itemInteraction.customId === "cancel_task_btn") {
    await itemInteraction.deferUpdate();
    await interaction.deleteReply().catch(() => null);
    collector.stop();
  }
}

module.exports = {
  sendTaskConfirmUI,
  handleTaskInteractions,
};
