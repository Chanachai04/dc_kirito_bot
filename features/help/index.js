const { createHelpEmbed } = require("./embeds");

module.exports = async (interaction) => {
  const helpEmbed = createHelpEmbed();
  await interaction.reply({ embeds: [helpEmbed] });
};
