const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require("discord.js");
const handleAssignInteractions = require("./interactions");

/**
 * จัดการ Slash Command /assign
 */
async function handleAssignCommand(interaction, sheets, SPREADSHEET_ID) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const targetUser = interaction.options.getUser("user");
    const targetMember = interaction.options.getMember("user");
    const task = interaction.options.getString("task");
    const deadline = interaction.options.getString("deadline");

    const discordName = targetMember ? targetMember.displayName : targetUser.username;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm_sheet")
        .setLabel("ยืนยันบันทึกข้อมูล")
        .setStyle(ButtonStyle.Success)
        .setEmoji("✅"),
      new ButtonBuilder()
        .setCustomId("cancel_sheet")
        .setLabel("ยกเลิกรายการ")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("❌"),
    );

    const response = await interaction.editReply({
      content:
        `📋 **ตรวจสอบข้อมูลการมอบหมายงาน (ข้อความนี้เห็นเฉพาะคุณ):**\n` +
        `• **ผู้รับผิดชอบงาน:** ${targetUser}\n` +
        `• **รายละเอียดงาน:** ${task}\n` +
        `• **กำหนดส่ง:** ${deadline}`,
      components: [row],
    });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
    });

    collector.on("collect", async (btnInteraction) => {
      await handleAssignInteractions(btnInteraction, interaction, targetUser, discordName, task, deadline, sheets, SPREADSHEET_ID, collector);
    });

    collector.on("end", async (collected, reason) => {
      if (reason === "time") {
        await interaction.editReply({
          content: "⏰ หมดเวลาทำรายการ ระบบยกเลิกอัตโนมัติ",
          components: [],
        }).catch(() => null);
      }
    });
  } catch (err) {
    console.error("[CMD ERROR] /assign handler failed:", err);
    const errorMsg = "❌ เกิดข้อผิดพลาดในการประมวลผลคำสั่ง กรุณาลองใหม่อีกครั้ง";
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMsg, flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: errorMsg, flags: MessageFlags.Ephemeral });
      }
    } catch (_) {}
  }
}

module.exports = handleAssignCommand;
