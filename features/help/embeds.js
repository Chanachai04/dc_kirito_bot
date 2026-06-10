const { EmbedBuilder } = require("discord.js");

/**
 * สร้าง Embed สำหรับคู่มือการใช้งาน
 */
function createHelpEmbed() {
  const helpEmbed = new EmbedBuilder()
    .setColor("#0099ff")
    .setTitle("🤖 คู่มือการใช้งานบอท")
    .setDescription("นี่คือรายการคำสั่งทั้งหมดที่คุณสามารถใช้งานได้ครับ")
    .addFields(
      {
        name: "🎵 คำสั่งฟังเพลง (พิมพ์ปกติ)",
        value:
          "`!play <ชื่อเพลง/ลิงก์>` - ค้นหาและเล่นเพลงจาก YouTube\n`!volume <1-100>` - ปรับระดับเสียง\n`!list` - ดูรายชื่อเพลงที่อยู่ในคิว\n`!next` - ข้ามไปเล่นเพลงถัดไป\n`!stop` - หยุดเพลง ล้างคิว และเตะบอทออกจากห้อง",
      },
      {
        name: "📋 คำสั่งจัดการงาน (Slash Commands)",
        value:
          "`/assign` - มอบหมายงานและบันทึกลง Google Sheets\n`/task` - ดูงานที่ค้างอยู่ของคุณและส่งงาน\n`/summary` - ดูสรุปรายการงานทั้งหมดของคุณ",
      },
      {
        name: "🧠 ระบบ AI Assistant",
        value:
          "`!chat <ข้อความ>` - พูดคุยทั่วไปกับ AI\n`!search <คำค้นหา>` - ให้ AI ค้นหาและสรุปข้อมูลจาก Google\n`!image <คำอธิบายรูป>` - สร้างรูปภาพด้วย AI (FLUX.1 - ฟรี)\n**พิมพ์ @Kirito-Bot** ตามด้วยคำถาม เพื่อคุยกับบอทได้ทันที",
      },
    )
    .setFooter({
      text: "ใช้งาน Slash Commands ได้โดยการพิมพ์ / ในช่องแชท",
    });

  return helpEmbed;
}

module.exports = {
  createHelpEmbed,
};
