const handleTaskCommand = require("./commands");

module.exports = async (interaction, sheets, SPREADSHEET_ID) => {
  await handleTaskCommand(interaction, sheets, SPREADSHEET_ID);
};
