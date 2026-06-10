// บังคับให้ใช้ ffmpeg.exe จากโฟลเดอร์ปัจจุบันเสมอ (แก้ปัญหาหาไฟล์ไม่เจอตอนแพ็กเป็น .exe)
process.env.FFMPEG_PATH = require("path").join(process.cwd(), "ffmpeg.exe");

const nodeFetch = require("node-fetch");
global.fetch = nodeFetch;
global.Headers = nodeFetch.Headers;
global.Request = nodeFetch.Request;
global.Response = nodeFetch.Response;

const { ReadableStream } = require("node:stream/web");
global.ReadableStream = ReadableStream;
try {
  global.FormData = require("undici").FormData;
} catch (e) {}

if (typeof global.DOMException === "undefined") {
  global.DOMException = class DOMException extends Error {
    constructor(message, name) {
      super(message);
      this.name = name || "DOMException";
    }
  };
}
if (typeof global.Blob === "undefined") {
  try {
    global.Blob = require("fetch-blob");
  } catch (e) {
    try {
      global.Blob = require("buffer").Blob;
    } catch (e) {}
  }
}

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const readline = require("readline");

const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
  StringSelectMenuBuilder,
  EmbedBuilder,
  REST,
  Routes,
} = require("discord.js");

const commands = require("./deploy-commands");

const { google } = require("googleapis");

google.options({
  fetchImplementation: nodeFetch,
});
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ] 
});

const fs = require("fs");

// ตั้งค่า Google Sheets
const credentialsPath = path.join(__dirname, "credentials.json");
let authOptions = {
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
};

if (fs.existsSync(credentialsPath)) {
  authOptions.keyFile = credentialsPath;
} else {
  authOptions.credentials = {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };
}

const auth = new google.auth.GoogleAuth(authOptions);
const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

client.once("ready", async () => {
  console.log(`[READY] Connected as ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log("[SYSTEM] Registering slash commands for all joined guilds...");
    for (const [guildId, guild] of client.guilds.cache) {
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, guildId),
        { body: commands }
      );
      console.log(`[SYSTEM] Registered commands for guild: ${guild.name} (${guildId})`);
    }
  } catch (error) {
    console.error("[SYSTEM] Error registering commands:", error);
  }
});

client.on("guildCreate", async (guild) => {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, guild.id),
      { body: commands }
    );
    console.log(`[SYSTEM] Registered commands for new guild: ${guild.name} (${guild.id})`);
  } catch (error) {
    console.error(`[SYSTEM] Error registering commands for new guild: ${guild.name}`, error);
  }
});

// โหลดโมดูลคำสั่งต่างๆ จากโฟลเดอร์ features
const assignFeature = require("./features/assign");
const taskFeature = require("./features/task");
const summaryFeature = require("./features/summary");
const musicFeature = require("./features/music");

// ระบบจัดการ Interaction (Slash Commands & Buttons)
client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "assign") {
      await assignFeature(interaction, sheets, SPREADSHEET_ID);
    } else if (interaction.commandName === "task") {
      await taskFeature(interaction, sheets, SPREADSHEET_ID);
    } else if (interaction.commandName === "summary") {
      await summaryFeature(interaction, sheets, SPREADSHEET_ID);
    } else if (interaction.commandName === "help") {
      const helpEmbed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("🤖 คู่มือการใช้งานบอท")
        .setDescription("นี่คือรายการคำสั่งทั้งหมดที่คุณสามารถใช้งานได้ครับ")
        .addFields(
          { 
            name: "🎵 คำสั่งฟังเพลง (พิมพ์ปกติ)", 
            value: "`!play <ชื่อเพลง/ลิงก์>` - ค้นหาและเล่นเพลงจาก YouTube\n`!list` - ดูรายชื่อเพลงที่อยู่ในคิว\n`!next` - ข้ามไปเล่นเพลงถัดไปในคิว\n`!stop` - หยุดเพลง ล้างคิว และเตะบอทออกจากห้อง" 
          },
          { 
            name: "📋 คำสั่งจัดการงาน (Slash Commands)", 
            value: "`/assign` - มอบหมายงานให้สมาชิกและบันทึกลง Google Sheets\n`/task` - ดูงานที่ค้างอยู่ของคุณและอัปเดตสถานะเป็นเสร็จสิ้น\n`/summary` - ดูสรุปรายการงานทั้งหมดของคุณ\n`/help` - เรียกดูคู่มือคำสั่งทั้งหมดของบอท" 
          }
        )
        .setFooter({ text: "ใช้งาน Slash Commands ได้โดยการพิมพ์ / ในช่องแชท" });
      
      await interaction.reply({ embeds: [helpEmbed] });
    }
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const prefix = "!";
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (["play", "stop", "next", "list"].includes(command)) {
    await musicFeature(message, command, args);
  }
});

// ป้องกันระบบ Process หลักดับกลางคันเมื่อเกิด Error ที่คาดไม่ถึง
process.on("unhandledRejection", (error) => {
  console.error("[FATAL ERROR] Unhandled Promise Rejection:", error);
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question(
  "🔒 กรุณาใส่รหัสผ่าน (Access Key) เพื่อเปิดใช้งาน Bot: ",
  async (answer) => {
    try {
      console.log("⏳ กำลังตรวจสอบรหัสผ่านกับ Google Sheets...");
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Key!A:Z",
      });
      
      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        console.error("❌ ไม่พบข้อมูลในแผ่นงาน (Sheet) ชื่อ 'Key'");
        process.exit(1);
      }

      // หา index ของคอลัมน์ "key-access" ในแถวแรก (Header)
      const headers = rows[0];
      const keyColumnIndex = headers.findIndex(header => header.trim() === "key-access");
      
      if (keyColumnIndex === -1) {
        console.error("❌ ไม่พบคอลัมน์ชื่อ 'key-access' ในแผ่นงาน 'Key'");
        process.exit(1);
      }

      // ดึงข้อมูลคีย์ทั้งหมดจากคอลัมน์นั้น (ไม่รวม header)
      const validKeys = rows.slice(1).map(row => row[keyColumnIndex]).filter(key => key);

      if (validKeys.includes(answer)) {
        console.log(
          "✅ ยืนยันรหัสผ่านสำเร็จ กำลังเชื่อมต่อเข้าสู่เซิร์ฟเวอร์...",
        );
        client.login(process.env.DISCORD_TOKEN);
      } else {
        console.error("❌ รหัสผ่านไม่ถูกต้อง! โปรแกรมจะปิดการทำงาน");
        process.exit(1);
      }
    } catch (error) {
      console.error("❌ เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google Sheets:", error.message);
      process.exit(1);
    }
    rl.close();
  },
);
