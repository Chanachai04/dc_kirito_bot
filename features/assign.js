const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} = require("discord.js");

module.exports = async (interaction, sheets, SPREADSHEET_ID) => {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // ดึงค่าออบเจกต์ข้อมูลจาก Options ที่ส่งมา
    const targetUser = interaction.options.getUser("user");
    const targetMember = interaction.options.getMember("user");
    const task = interaction.options.getString("task");
    const deadline = interaction.options.getString("deadline");

    // คว้าชื่อเล่นในเซิร์ฟเวอร์ (Server Nickname/Display Name) ถ้าไม่มีจะถอยไปใช้ Username สากล
    const discordName = targetMember
      ? targetMember.displayName
      : targetUser.username;

    // สร้างปุ่มยืนยันและยกเลิก
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

    // อัปเดตข้อความ Ephemeral ด้วยข้อมูลและปุ่มจริง
    const response = await interaction.editReply({
      content:
        `📋 **ตรวจสอบข้อมูลการมอบหมายงาน (ข้อความนี้เห็นเฉพาะคุณ):**\n` +
        `• **ผู้รับผิดชอบงาน:** ${targetUser}\n` +
        `• **รายละเอียดงาน:** ${task}\n` +
        `• **กำหนดส่ง:** ${deadline}`,
      components: [row],
    });

    // สร้าง Collector รอดักจับการกดปุ่ม (สโคปจำกัดไว้ 1 นาที)
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
    });

    collector.on("collect", async (btnInteraction) => {
      // ระบบ Interaction ปลอดภัยในตัวอยู่แล้วเพราะข้อความ Ephemeral ไม่มีผู้ใช้อื่นสามารถมองเห็นหรือมากดปุ่มแทนกันได้

      // --- กรณีที่ 1: ผู้ใช้กดปุ่ม "ยืนยัน" ---
      if (btnInteraction.customId === "confirm_sheet") {
        await btnInteraction.deferUpdate(); // ยืนยันสถานะเพื่อไม่ให้ปุ่มค้าง

        try {
          // แสดงสถานะบอทกำลังพิมพ์ในช่องแชทส่วนรวม
          await interaction.channel.sendTyping().catch(() => null);

          // ยิงข้อมูลเข้า Google Sheets แบบต่อท้าย (Append)
          const range = "Sheet1!A:D";
          const values = [[discordName, task, deadline, false]]; // คอลัมน์ D ส่ง Boolean false ไปดื้อๆ

          const appendResult = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range,
            valueInputOption: "USER_ENTERED",
            resource: { values },
          });

          // ดึง rowIndex ของแถวที่เพิ่มใหม่มาเปลี่ยนสีพื้นหลังเป็นสีแดงพาสเทล
          const updatedRange = appendResult.data.updates.updatedRange; // e.g. 'Sheet1!A12:D12'
          const rangePart = updatedRange.includes("!")
            ? updatedRange.split("!")[1]
            : updatedRange;
          const match = rangePart.match(/\d+/);
          const rowIndex = match ? parseInt(match[0], 10) : null;

          if (rowIndex) {
            const doc = await sheets.spreadsheets.get({
              spreadsheetId: SPREADSHEET_ID,
            });
            const sheet =
              doc.data.sheets.find((s) => s.properties.title === "Sheet1") ||
              doc.data.sheets[0];
            const sheetId = sheet.properties.sheetId;

            // เปลี่ยนสีแถวใหม่เป็นสีแดงพาสเทล (คอลัมน์ A ถึง D)
            await sheets.spreadsheets.batchUpdate({
              spreadsheetId: SPREADSHEET_ID,
              resource: {
                requests: [
                  {
                    updateCells: {
                      range: {
                        sheetId: sheetId,
                        startRowIndex: rowIndex - 1,
                        endRowIndex: rowIndex,
                        startColumnIndex: 0,
                        endColumnIndex: 4, // คอลัมน์ A ถึง D
                      },
                      rows: [
                        {
                          values: [
                            {
                              userEnteredFormat: {
                                backgroundColor: {
                                  red: 0.98,
                                  green: 0.85,
                                  blue: 0.85,
                                },
                              },
                            },
                            {
                              userEnteredFormat: {
                                backgroundColor: {
                                  red: 0.98,
                                  green: 0.85,
                                  blue: 0.85,
                                },
                              },
                            },
                            {
                              userEnteredFormat: {
                                backgroundColor: {
                                  red: 0.98,
                                  green: 0.85,
                                  blue: 0.85,
                                },
                              },
                            },
                            {
                              userEnteredFormat: {
                                backgroundColor: {
                                  red: 0.98,
                                  green: 0.85,
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
          }

          // ประกาศข้อความใหม่เข้า Channel เพื่อให้ "ทุกคนในเซิร์ฟเวอร์เห็นสรุป"
          await interaction.channel.send({
            content:
              `📢 **[สรุปการมอบหมายงาน]**\n` +
              `• **ผู้มอบหมายงาน:** ${interaction.user} \n` +
              `• **ผู้รับผิดชอบงาน:** ${targetUser}\n` +
              `• **รายละเอียดงาน:** ${task}\n` +
              `• **กำหนดส่ง:** ${deadline}\n`,
          });

          // ลบข้อความ Ephemeral เดิมทิ้งไปเลยเพื่อให้หน้าจอปิดลงและหายไป
          await interaction.deleteReply().catch(() => null);

          collector.stop();
        } catch (err) {
          console.error("[API ERROR] Sheets Writing Failure:", err);
          await interaction.followUp({
            content:
              "❌ ระบบหลังบ้านขัดข้อง ไม่สามารถเขียนข้อมูลลง Google Sheet ได้",
            flags: MessageFlags.Ephemeral,
          });
        }
      }

      // --- กรณีที่ 2: ผู้ใช้กดปุ่ม "ยกเลิก" ---
      else if (btnInteraction.customId === "cancel_sheet") {
        await btnInteraction.deferUpdate(); // ยืนยันสถานะปุ่ม
        await interaction.deleteReply().catch(() => null); // ลบข้อความ Ephemeral ทิ้งทันทีเพื่อให้หายไป
        collector.stop();
      }
    });

    // เคลียร์ปุ่มทิ้งเมื่อปล่อยหมดเวลาเพื่อความสะอาดของหน่วยความจำ
    collector.on("end", async (collected, reason) => {
      if (reason === "time") {
        await interaction
          .editReply({
            content: "⏰ หมดเวลาทำรายการ ระบบยกเลิกอัตโนมัติ",
            components: [],
          })
          .catch(() => null);
      }
    });
  } catch (err) {
    console.error("[CMD ERROR] /assign handler failed:", err);
    // ถ้ายังไม่เคย reply ให้ลอง reply กลับไป, ถ้า reply ไปแล้วก็ followUp
    const errorMsg =
      "❌ เกิดข้อผิดพลาดในการประมวลผลคำสั่ง กรุณาลองใหม่อีกครั้ง";
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: errorMsg,
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: errorMsg,
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (_) {}
  }
};
