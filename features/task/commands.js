const { ActionRowBuilder, StringSelectMenuBuilder, MessageFlags } = require("discord.js");
const { getUserPendingTasks } = require("./sheets");
const { sendTaskConfirmUI, handleTaskInteractions } = require("./interactions");

/**
 * จัดการ Slash Command /task
 */
async function handleTaskCommand(interaction, sheets, SPREADSHEET_ID) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const userDisplayName = (interaction.member?.displayName || "").toLowerCase();
    const userName = interaction.user.username.toLowerCase();

    const { userTasks, sheetName, sheetId } = await getUserPendingTasks(
      sheets,
      SPREADSHEET_ID,
      userDisplayName,
      userName
    );

    if (userTasks.length === 0) {
      await interaction.editReply({ content: "✅ คุณไม่มีงานที่ค้างอยู่ ณ ขณะนี้!" });
      return;
    }

    let responseMsg;

    if (userTasks.length === 1) {
      await sendTaskConfirmUI(userTasks[0], interaction);
      responseMsg = await interaction.fetchReply();
    } else {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("select_task_menu")
        .setPlaceholder("เลือกงานที่ต้องการทำเสร็จสิ้น...")
        .addOptions(
          userTasks.map((t) => ({
            label: t.task.substring(0, 80),
            description: `กำหนดส่ง: ${t.deadline}`,
            value: `select_task_complete_${t.rowIndex}`,
          }))
        );

      const selectRow = new ActionRowBuilder().addComponents(selectMenu);

      responseMsg = await interaction.editReply({
        content: "📋 **คุณมีงานที่ค้างอยู่หลายงาน กรุณาเลือกงานที่ต้องการอัปเดต:**",
        components: [selectRow],
      });
    }

    const collector = responseMsg.createMessageComponentCollector({ time: 60000 });

    collector.on("collect", async (itemInteraction) => {
      await handleTaskInteractions(
        itemInteraction,
        interaction,
        userTasks,
        sheets,
        SPREADSHEET_ID,
        sheetName,
        sheetId,
        collector
      );
    });

    collector.on("end", async (collected, reason) => {
      if (reason === "time") {
        await interaction.deleteReply().catch(() => null);
      }
    });
  } catch (err) {
    console.error("[CMD ERROR] /task handler failed:", err);
    await interaction
      .editReply({ content: "❌ เกิดข้อผิดพลาดในการดึงข้อมูลงานของคุณ กรุณาลองใหม่อีกครั้ง" })
      .catch(() => null);
  }
}

module.exports = handleTaskCommand;
