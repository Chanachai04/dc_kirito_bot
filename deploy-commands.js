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
].map((command) => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("[SYSTEM] Registering slash commands...");
    // ลงทะเบียนแบบ Guild Command (ระบุ GUILD_ID) เพื่อให้คำสั่งอัปเดตทันที
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID,
      ),
      { body: commands },
    );
    console.log("[SYSTEM] Slash commands registered successfully.");
  } catch (error) {
    console.error(error);
  }
})();
