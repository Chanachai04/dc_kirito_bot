const { generateWithFallback, limitDiscordText } = require("./utils");

/**
 * จัดการคำสั่ง /chat
 */
async function handleChatCommand(interaction) {
  const query = interaction.options.getString("message");
  await interaction.deferReply();

  try {
    const responseText = await generateWithFallback(query, false);
    await interaction.editReply(limitDiscordText(responseText));
  } catch (error) {
    console.error("AI Chat Error:", error);
    if (error.status === 503) {
      await interaction.editReply(
        "❌ เซิร์ฟเวอร์หลักของ Google กำลังมีคนใช้งานทั่วโลกพร้อมกันเป็นจำนวนมากเกินกว่าที่ระบบจะรับไหวในวินาทีนั้น",
      );
    } else {
      await interaction.editReply("❌ ขออภัย เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI ครับ");
    }
  }
}

module.exports = handleChatCommand;
