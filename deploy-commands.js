require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("assign")
    .setDescription("มอบหมายงานและบันทึกลง Google Sheet")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("เลือกคนที่ต้องการมอบหมายงาน")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("task")
        .setDescription("รายละเอียดงานที่มอบหมาย")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("deadline")
        .setDescription("กำหนดส่งงาน เช่น DD/MM/YYYY")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("task")
    .setDescription("ดูงานที่ค้างอยู่ของคุณและอัปเดตเป็นเสร็จสิ้น"),
  new SlashCommandBuilder()
    .setName("summary")
    .setDescription("ดูสรุปรายการงานที่ค้างอยู่ทั้งหมดของตัวเอง"),
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("เรียกดูคู่มือคำสั่งทั้งหมดของบอท"),
  new SlashCommandBuilder()
    .setName("chat")
    .setDescription("คุยเล่นหรือถามคำถามกับ AI (Gemini)")
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("ข้อความที่ต้องการคุยกับ AI")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("search")
    .setDescription("ค้นหาข้อมูลบน Google และสรุปโดย AI")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("คำหรือเรื่องที่ต้องการค้นหา")
        .setRequired(true),
    ),
].map((command) => command.toJSON());

module.exports = commands;
