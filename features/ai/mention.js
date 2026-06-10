const { generateWithFallback, limitDiscordText } = require("./utils");

/**
 * จัดการเมื่อมีคน @mention หาบอท
 */
async function handleMention(message, client) {
  try {
    // ลบส่วนที่แท็กชื่อบอทออก เพื่อเอาแค่ข้อความคำถาม
    const text = message.content.replace(`<@${client.user.id}>`, "").trim();

    if (!text) {
      await message.reply(
        "มีอะไรให้ผมช่วยไหมครับ? สามารถพิมพ์ถามต่อท้ายมาได้เลยนะ!",
      );
      return;
    }

    const responseText = await generateWithFallback(text, false);
    await message.reply(limitDiscordText(responseText));
  } catch (error) {
    console.error("AI Mention Error:", error);
    if (error.status === 503) {
      await message.reply(
        "❌ เซิร์ฟเวอร์หลักของ Google กำลังมีคนใช้งานทั่วโลกพร้อมกันเป็นจำนวนมากเกินกว่าที่ระบบจะรับไหวในวินาทีนั้น",
      );
    } else {
      await message.reply(
        "❌ ตอนนี้ระบบ AI ขัดข้องนิดหน่อยครับ ลองทักมาใหม่นะครับ",
      );
    }
  }
}

module.exports = handleMention;
