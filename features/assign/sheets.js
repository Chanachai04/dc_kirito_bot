/**
 * ยิงข้อมูลมอบหมายงานใหม่เข้า Google Sheets
 * @returns {number|null} rowIndex แถวที่เพิ่ม
 */
async function appendTaskToSheet(sheets, spreadsheetId, discordName, task, deadline) {
  const range = "Sheet1!A:D";
  const values = [[discordName, task, deadline, false]];

  const appendResult = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    resource: { values },
  });

  const updatedRange = appendResult.data.updates.updatedRange;
  const rangePart = updatedRange.includes("!") ? updatedRange.split("!")[1] : updatedRange;
  const match = rangePart.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

/**
 * เปลี่ยนสีพื้นหลังของแถวที่เพิ่งเพิ่มเป็นสีแดงพาสเทล
 */
async function formatRowAsAssigned(sheets, spreadsheetId, rowIndex) {
  const doc = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = doc.data.sheets.find((s) => s.properties.title === "Sheet1") || doc.data.sheets[0];
  const sheetId = sheet.properties.sheetId;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: {
      requests: [
        {
          updateCells: {
            range: {
              sheetId: sheetId,
              startRowIndex: rowIndex - 1,
              endRowIndex: rowIndex,
              startColumnIndex: 0,
              endColumnIndex: 4,
            },
            rows: [
              {
                values: [
                  { userEnteredFormat: { backgroundColor: { red: 0.98, green: 0.85, blue: 0.85 } } },
                  { userEnteredFormat: { backgroundColor: { red: 0.98, green: 0.85, blue: 0.85 } } },
                  { userEnteredFormat: { backgroundColor: { red: 0.98, green: 0.85, blue: 0.85 } } },
                  { userEnteredFormat: { backgroundColor: { red: 0.98, green: 0.85, blue: 0.85 } } },
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
  appendTaskToSheet,
  formatRowAsAssigned,
};
