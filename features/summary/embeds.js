const { EmbedBuilder } = require("discord.js");

/**
 * สร้าง Embed สำหรับสรุปงาน
 */
function createSummaryEmbed(interaction, userTasks) {
  const embed = new EmbedBuilder()
    .setTitle("📋 สรุปรายการงานค้าง")
    .setDescription(`รายการงานที่ยังไม่เสร็จสิ้นของ ${interaction.member ? interaction.member : interaction.user}`)
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

  return embed;
}

module.exports = {
  createSummaryEmbed,
};
