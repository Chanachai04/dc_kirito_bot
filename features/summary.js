const { EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = async (interaction, sheets, SPREADSHEET_ID) => {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // ดึงข้อมูล Spreadsheet และแผ่นงาน
    const doc = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    const sheet =
      doc.data.sheets.find((s) => s.properties.title === "Sheet1") ||
      doc.data.sheets[0];
    const sheetName = sheet.properties.title;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:D`,
    });
    const rows = response.data.values || [];

    // ค้นหาและคัดกรองงานที่ยังไม่เสร็จที่เป็นของผู้ใช้คนนี้
    const userDisplayName = (
      interaction.member?.displayName || ""
    ).toLowerCase();
    const userName = interaction.user.username.toLowerCase();
    const userTasks = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowName = (row[0] || "").toLowerCase();
      const rowStatus = (row[3] || "").toLowerCase();

      // ข้ามหัวตาราง
      if (
        rowName === "ผู้รับผิดชอบงาน" ||
        rowName === "ผู้รับมอบหมาย" ||
        rowName === "ชื่อ"
      )
        continue;

      if (
        (rowName === userDisplayName || rowName === userName) &&
        rowStatus !== "true"
      ) {
        userTasks.push({
          task: row[1] || "ไม่มีรายละเอียด",
          deadline: row[2] || "ไม่มีกำหนดส่ง",
        });
      }
    }

    // นำเสนอผลลัพธ์ด้วย Embed หรูหราพรีเมียม
    const embed = new EmbedBuilder()
      .setTitle("📋 สรุปรายการงานค้าง")
      .setDescription(
        `รายการงานที่ยังไม่เสร็จสิ้นของ ${interaction.member ? interaction.member : interaction.user}`,
      )
      .setColor(0x7000ff); // สีม่วงพรีเมียม

    if (userTasks.length === 0) {
      embed.addFields({
        name: "🎉 ยินดีด้วย!",
        value: "คุณไม่มีงานค้างอยู่ในขณะนี้! ทำงานหมดเกลี้ยงเลย สุดยอดมากๆ 👍",
      });
    } else {
      userTasks.forEach((t, index) => {
        embed.addFields({
          name: `📌 งานที่ ${index + 1}: ${t.task}`,
          value: `⏰ **กำหนดส่ง:** ${t.deadline}`,
        });
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error("[CMD ERROR] /summary handler failed:", err);
    await interaction
      .editReply({
        content: "❌ เกิดข้อผิดพลาดในการดึงสรุปงานของคุณ กรุณาลองใหม่อีกครั้ง",
      })
      .catch(() => null);
  }
};
