const { generateWithFallback, limitDiscordText } = require("./utils");

/**
 * จัดการคำสั่ง !chat
 */
async function handleChatCommand(message, args) {
  if (args.length === 0)
    return message.reply(
      "⚠️ กรุณาระบุข้อความที่ต้องการคุยด้วยครับ (เช่น `!chat สวัสดี`)",
    );

  const query = args.join(" ");
  const tempMsg = await message.reply("⏳ กำลังคิดคำตอบ...");

  try {
    const responseText = await generateWithFallback(query, false);
    await tempMsg.edit(limitDiscordText(responseText));
  } catch (error) {
    console.error("AI Chat Error:", error);
    if (error.status === 503) {
      await tempMsg.edit(
        "❌ เซิร์ฟเวอร์หลักของ Google กำลังมีคนใช้งานทั่วโลกพร้อมกันเป็นจำนวนมากเกินกว่าที่ระบบจะรับไหวในวินาทีนั้น",
      );
    } else {
      await tempMsg.edit("❌ ขออภัย เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI ครับ");
    }
  }
}

module.exports = handleChatCommand;
