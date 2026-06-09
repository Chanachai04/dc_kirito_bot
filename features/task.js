const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  StringSelectMenuBuilder,
} = require("discord.js");

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
    const sheetId = sheet.properties.sheetId;

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

      // ข้ามหัวตารางถ้าชื่อตรงกับคำเหล็กเหล่านี้
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
          rowIndex: i + 1,
          task: row[1] || "ไม่มีรายละเอียด",
          deadline: row[2] || "ไม่มีกำหนดส่ง",
        });
      }
    }

    if (userTasks.length === 0) {
      await interaction.editReply({
        content: "✅ คุณไม่มีงานที่ค้างอยู่ ณ ขณะนี้!",
      });
      return;
    }

    // ฟังก์ชันสร้างหน้าจอยืนยันงานที่เลือก
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

    let responseMsg;

    if (userTasks.length === 1) {
      // กรณีมีงานเดียว แสดงปุ่มเสร็จสิ้นได้ทันที
      await sendTaskConfirmUI(userTasks[0], interaction);
      responseMsg = await interaction.fetchReply();
    } else {
      // กรณีมีหลายงาน แสดง Dropdown ให้เลือกงานก่อน
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("select_task_menu")
        .setPlaceholder("เลือกงานที่ต้องการทำเสร็จสิ้น...")
        .addOptions(
          userTasks.map((t) => ({
            label: t.task.substring(0, 80),
            description: `กำหนดส่ง: ${t.deadline}`,
            value: `select_task_complete_${t.rowIndex}`,
          })),
        );

      const selectRow = new ActionRowBuilder().addComponents(selectMenu);

      responseMsg = await interaction.editReply({
        content:
          "📋 **คุณมีงานที่ค้างอยู่หลายงาน กรุณาเลือกงานที่ต้องการอัปเดต:**",
        components: [selectRow],
      });
    }

    // สร้าง Collector ดักจับ event
    const collector = responseMsg.createMessageComponentCollector({
      time: 60000,
    });

    collector.on("collect", async (itemInteraction) => {
      if (itemInteraction.user.id !== interaction.user.id) {
        await itemInteraction.reply({
          content: "❌ คุณไม่มีสิทธิ์กดปุ่มนี้",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // กรณีเลือกงานจาก Dropdown
      if (
        itemInteraction.isStringSelectMenu() &&
        itemInteraction.customId === "select_task_menu"
      ) {
        await itemInteraction.deferUpdate();
        const selectedRowIndex = parseInt(
          itemInteraction.values[0].replace("select_task_complete_", ""),
        );
        const selectedTask = userTasks.find(
          (t) => t.rowIndex === selectedRowIndex,
        );
        if (selectedTask) {
          await sendTaskConfirmUI(selectedTask, interaction);
        }
      }

      // กรณีการกดยืนยัน "เสร็จเรียบร้อย"
      else if (
        itemInteraction.isButton() &&
        itemInteraction.customId.startsWith("complete_task_btn_")
      ) {
        await itemInteraction.deferUpdate();
        const targetRowIndex = parseInt(
          itemInteraction.customId.replace("complete_task_btn_", ""),
        );
        const completedTask = userTasks.find(
          (t) => t.rowIndex === targetRowIndex,
        );

        if (completedTask) {
          try {
            // บอทเริ่มจำลองสถานะกำลังพิมพ์ในแชนแนลหลัก
            await interaction.channel.sendTyping().catch(() => null);

            // 1. แก้ไข column status ใน Google Sheet เป็น true
            await sheets.spreadsheets.values.update({
              spreadsheetId: SPREADSHEET_ID,
              range: `${sheetName}!D${targetRowIndex}`,
              valueInputOption: "USER_ENTERED",
              resource: {
                values: [[true]],
              },
            });

            // 2. เปลี่ยนพื้นหลังแถวข้อมูลของงานนั้นเป็นสีเขียวพาสเทล
            await sheets.spreadsheets.batchUpdate({
              spreadsheetId: SPREADSHEET_ID,
              resource: {
                requests: [
                  {
                    updateCells: {
                      range: {
                        sheetId: sheetId,
                        startRowIndex: targetRowIndex - 1, // 0-based
                        endRowIndex: targetRowIndex,
                        startColumnIndex: 0,
                        endColumnIndex: 4, // คอลัมน์ A ถึง D
                      },
                      rows: [
                        {
                          values: [
                            {
                              userEnteredFormat: {
                                backgroundColor: {
                                  red: 0.85,
                                  green: 0.95,
                                  blue: 0.85,
                                },
                              },
                            },
                            {
                              userEnteredFormat: {
                                backgroundColor: {
                                  red: 0.85,
                                  green: 0.95,
                                  blue: 0.85,
                                },
                              },
                            },
                            {
                              userEnteredFormat: {
                                backgroundColor: {
                                  red: 0.85,
                                  green: 0.95,
                                  blue: 0.85,
                                },
                              },
                            },
                            {
                              userEnteredFormat: {
                                backgroundColor: {
                                  red: 0.85,
                                  green: 0.95,
                                  blue: 0.85,
                                },
                              },
                            },
                          ],
                        },
                      ],
                      fields: "userEnteredFormat.backgroundColor",
                    },
                  },
                ],
              },
            });

            // 3. ส่งข้อความประกาศความสำเร็จลงห้องแชท
            await interaction.channel.send({
              content:
                `🎉 **[อัปเดตสถานะงาน]**\n` +
                `• **ผู้รับผิดชอบงาน:** ${interaction.user}\n` +
                `• **รายละเอียดงาน:** ${completedTask.task}\n` +
                `• **กำหนดส่ง:** ${completedTask.deadline}\n` +
                `• **สถานะ:** 🟢 เสร็จเรียบร้อยแล้ว!`,
            });

            // 4. ลบข้อความ Ephemeral ออกทันที
            await interaction.deleteReply().catch(() => null);
            collector.stop();
          } catch (err) {
            console.error("[API ERROR] Task Completion Update Failure:", err);
            await interaction.followUp({
              content:
                "❌ เกิดข้อผิดพลาดในการบันทึกข้อมูลสำเร็จลง Google Sheet",
              flags: MessageFlags.Ephemeral,
            });
          }
        }
      }

      // กรณีการกดปุ่ม "ยกเลิก"
      else if (
        itemInteraction.isButton() &&
        itemInteraction.customId === "cancel_task_btn"
      ) {
        await itemInteraction.deferUpdate();
        await interaction.deleteReply().catch(() => null);
        collector.stop();
      }
    });

    collector.on("end", async (collected, reason) => {
      if (reason === "time") {
        await interaction.deleteReply().catch(() => null);
      }
    });
  } catch (err) {
    console.error("[CMD ERROR] /task handler failed:", err);
    await interaction
      .editReply({
        content:
          "❌ เกิดข้อผิดพลาดในการดึงข้อมูลงานของคุณ กรุณาลองใหม่อีกครั้ง",
      })
      .catch(() => null);
  }
};
