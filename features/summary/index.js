const handleSummaryCommand = require("./commands");

module.exports = async (interaction, sheets, SPREADSHEET_ID) => {
  await handleSummaryCommand(interaction, sheets, SPREADSHEET_ID);
};
