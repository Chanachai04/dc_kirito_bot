const { generateWithFallback, limitDiscordText } = require("./utils");

/**
 * จัดการคำสั่ง !search
 */
async function handleSearchCommand(message, args) {
  if (args.length === 0)
    return message.reply(
      "⚠️ กรุณาระบุคำที่ต้องการค้นหาด้วยครับ (เช่น `!search สภาพอากาศวันนี้`)",
    );

  const query = args.join(" ");
  const tempMsg = await message.reply("🔍 กำลังค้นหาข้อมูล...");

  try {
    const prompt =
      `กรุณาค้นหาข้อมูลเกี่ยวกับสิ่งต่อไปนี้: "${query}"\n` +
      `จากนั้นให้สรุปเนื้อหาเป็นภาษาไทยให้อ่านเข้าใจง่าย พร้อมทั้งระบุแหล่งที่มาหรือลิงก์อ้างอิงของข้อมูลด้วยครับ อ้างอิงให้แนบเป็นลิงก์ที่สามารถคลิกได้ (รูปแบบ Markdown: [ข้อความ](URL))`;

    const responseText = await generateWithFallback(prompt, true);
    const replyMessage = `**ค้นหา:** ${query}\n\n**ผลลัพธ์:** ${responseText}`;

    await tempMsg.edit(limitDiscordText(replyMessage));
  } catch (error) {
    console.error("AI Search Error:", error);
    if (error.status === 503) {
      await tempMsg.edit(
        "❌ เซิร์ฟเวอร์หลักของ Google กำลังมีคนใช้งานทั่วโลกพร้อมกันเป็นจำนวนมากเกินกว่าที่ระบบจะรับไหวในวินาทีนั้น",
      );
    } else {
      await tempMsg.edit("❌ ขออภัย เกิดข้อผิดพลาดในการค้นหาข้อมูลครับ");
    }
  }
}

module.exports = handleSearchCommand;
