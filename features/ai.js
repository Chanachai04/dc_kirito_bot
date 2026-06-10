const { GoogleGenerativeAI } = require("@google/generative-ai");

// กำหนดค่า genAI ตั้งแต่เริ่มต้น หรือรอให้มีการใช้คำสั่งแล้วค่อยรับค่าเพื่อให้ชัวร์ว่า process.env โหลดแล้ว
const getGenAI = () => new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * ตัดข้อความให้ไม่เกินลิมิต Discord (2000 ตัวอักษร)
 */
function limitDiscordText(text) {
  if (text.length <= 2000) return text;
  return text.substring(0, 1995) + "...";
}

/**
 * จัดการคำสั่ง /chat
 */
async function handleChatCommand(interaction) {
  await interaction.deferReply();
  try {
    const message = interaction.options.getString("message");
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(message);
    const responseText = result.response.text();

    await interaction.editReply(limitDiscordText(responseText));
  } catch (error) {
    console.error("AI Chat Error:", error);
    await interaction.editReply("❌ ขออภัย เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI ครับ");
  }
}

/**
 * จัดการคำสั่ง /search
 */
async function handleSearchCommand(interaction) {
  await interaction.deferReply();
  try {
    const query = interaction.options.getString("query");
    const genAI = getGenAI();
    
    // เปิดการตั้งค่า Google Search Grounding
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      tools: [{ googleSearch: {} }]
    });

    const prompt = `กรุณาค้นหาข้อมูลเกี่ยวกับสิ่งต่อไปนี้: "${query}"\n` +
                   `จากนั้นให้สรุปเนื้อหาเป็นภาษาไทยให้อ่านเข้าใจง่าย พร้อมทั้งระบุแหล่งที่มาหรือลิงก์อ้างอิงของข้อมูลด้วยครับ`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    await interaction.editReply(limitDiscordText(responseText));
  } catch (error) {
    console.error("AI Search Error:", error);
    await interaction.editReply("❌ ขออภัย เกิดข้อผิดพลาดในการค้นหาข้อมูลครับ");
  }
}

/**
 * จัดการเมื่อมีคน @mention หาบอท
 */
async function handleMention(message, client) {
  try {
    // ลบส่วนที่แท็กชื่อบอทออก เพื่อเอาแค่ข้อความคำถาม
    const text = message.content.replace(`<@${client.user.id}>`, '').trim();
    
    if (!text) {
      await message.reply("มีอะไรให้ผมช่วยไหมครับ? สามารถพิมพ์ถามต่อท้ายมาได้เลยนะ!");
      return;
    }

    const genAI = getGenAI();
    // ใช้รุ่น flash ทั่วไปเพื่อให้ตอบกลับได้เร็ว
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(text);
    const responseText = result.response.text();

    await message.reply(limitDiscordText(responseText));
  } catch (error) {
    console.error("AI Mention Error:", error);
    await message.reply("❌ ตอนนี้ระบบ AI ขัดข้องนิดหน่อยครับ ลองทักมาใหม่นะครับ");
  }
}

module.exports = {
  handleChatCommand,
  handleSearchCommand,
  handleMention
};
