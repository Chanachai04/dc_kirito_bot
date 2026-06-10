/**
 * ดึงงานที่ยังไม่เสร็จสิ้นของผู้ใช้คนนั้น
 */
async function getUserPendingTasks(sheets, spreadsheetId, userDisplayName, userName) {
  const doc = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = doc.data.sheets.find((s) => s.properties.title === "Sheet1") || doc.data.sheets[0];
  const sheetName = sheet.properties.title;
  const sheetId = sheet.properties.sheetId;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:D`,
  });
  const rows = response.data.values || [];

  const userTasks = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowName = (row[0] || "").toLowerCase();
    const rowStatus = (row[3] || "").toLowerCase();

    if (rowName === "ผู้รับผิดชอบงาน" || rowName === "ผู้รับมอบหมาย" || rowName === "ชื่อ") continue;

    if ((rowName === userDisplayName || rowName === userName) && rowStatus !== "true") {
      userTasks.push({
        rowIndex: i + 1,
        task: row[1] || "ไม่มีรายละเอียด",
        deadline: row[2] || "ไม่มีกำหนดส่ง",
      });
    }
  }

  return { userTasks, sheetName, sheetId };
}

/**
 * อัปเดตสถานะงานเป็นเสร็จสิ้น และเปลี่ยนสีพื้นหลังเป็นสีเขียวพาสเทล
 */
async function markTaskAsComplete(sheets, spreadsheetId, targetRowIndex, sheetName, sheetId) {
  // 1. แก้ไข column status ใน Google Sheet เป็น true
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!D${targetRowIndex}`,
    valueInputOption: "USER_ENTERED",
    resource: { values: [[true]] },
  });

  // 2. เปลี่ยนพื้นหลังแถวข้อมูลของงานนั้นเป็นสีเขียวพาสเทล
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: {
      requests: [
        {
          updateCells: {
            range: {
              sheetId: sheetId,
              startRowIndex: targetRowIndex - 1, // 0-based
              endRowIndex: targetRowIndex,
              startColumnIndex: 0,
              endColumnIndex: 4,
            },
            rows: [
              {
                values: [
                  { userEnteredFormat: { backgroundColor: { red: 0.85, green: 0.95, blue: 0.85 } } },
                  { userEnteredFormat: { backgroundColor: { red: 0.85, green: 0.95, blue: 0.85 } } },
                  { userEnteredFormat: { backgroundColor: { red: 0.85, green: 0.95, blue: 0.85 } } },
                  { userEnteredFormat: { backgroundColor: { red: 0.85, green: 0.95, blue: 0.85 } } },
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

module.exports = {
  getUserPendingTasks,
  markTaskAsComplete,
};
