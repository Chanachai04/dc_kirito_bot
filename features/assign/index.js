const handleAssignCommand = require("./commands");

module.exports = async (interaction, sheets, SPREADSHEET_ID) => {
  await handleAssignCommand(interaction, sheets, SPREADSHEET_ID);
};
