/**
 * ค้นหาและคัดกรองงานที่ยังไม่เสร็จที่เป็นของผู้ใช้
 */
async function getUserSummaryTasks(sheets, spreadsheetId, userDisplayName, userName) {
  const doc = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = doc.data.sheets.find((s) => s.properties.title === "Sheet1") || doc.data.sheets[0];
  const sheetName = sheet.properties.title;

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
        task: row[1] || "ไม่มีรายละเอียด",
        deadline: row[2] || "ไม่มีกำหนดส่ง",
      });
    }
  }

  return userTasks;
}

module.exports = {
  getUserSummaryTasks,
};
