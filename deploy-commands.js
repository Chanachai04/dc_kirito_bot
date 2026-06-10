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
    .setDescription("พูดคุยทั่วไปกับ AI")
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("ข้อความที่ต้องการคุยกับ AI")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("search")
    .setDescription("ค้นหาและสรุปข้อมูลจาก Google ด้วย AI")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("คำที่ต้องการค้นหา")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("image")
    .setDescription("สร้างรูปภาพด้วย AI")
    .addStringOption((option) =>
      option
        .setName("prompt")
        .setDescription("คำอธิบายรูปภาพที่ต้องการ")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("เล่นเพลงจาก YouTube")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("ชื่อเพลงหรือลิงก์ YouTube")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("volume")
    .setDescription("ปรับระดับเสียงเพลง (1-100)")
    .addIntegerOption((option) =>
      option
        .setName("level")
        .setDescription("ระดับเสียงที่ต้องการ")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(false),
    ),
  new SlashCommandBuilder()
    .setName("list")
    .setDescription("ดูรายชื่อเพลงที่อยู่ในคิว"),
  new SlashCommandBuilder()
    .setName("next")
    .setDescription("ข้ามไปเล่นเพลงถัดไป"),
  new SlashCommandBuilder()
    .setName("stop")
    .setDescription("หยุดเพลง ล้างคิว และเตะบอทออกจากห้อง"),
].map((command) => command.toJSON());

module.exports = commands;
