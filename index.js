// Fix for pkg node18 fetch "Invalid host defined options" bug
const nodeFetch = require("node-fetch");
global.fetch = nodeFetch;
global.Headers = nodeFetch.Headers;
global.Request = nodeFetch.Request;
global.Response = nodeFetch.Response;

// Polyfill ReadableStream & FormData for Node 16 pkg target (undici requires it)
const { ReadableStream } = require("node:stream/web");
global.ReadableStream = ReadableStream;
try {
  global.FormData = require("undici").FormData;
} catch (e) {
  // Ignore if not found
}

// Polyfill DOMException and Blob for Node 16 pkg target (gaxios requires it for error handling)
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
} = require("discord.js");

const { google } = require("googleapis");

google.options({
  fetchImplementation: nodeFetch,
});
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ตั้งค่า Google Sheets
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, "credentials.json"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

client.once("ready", () => {
  console.log(`[READY] Connected as ${client.user.tag}`);
});

// โหลดโมดูลคำสั่งต่างๆ จากโฟลเดอร์ features
const assignFeature = require("./features/assign");
const taskFeature = require("./features/task");
const summaryFeature = require("./features/summary");

// ระบบจัดการ Interaction (Slash Commands & Buttons)
client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "assign") {
      await assignFeature(interaction, sheets, SPREADSHEET_ID);
    } else if (interaction.commandName === "task") {
      await taskFeature(interaction, sheets, SPREADSHEET_ID);
    } else if (interaction.commandName === "summary") {
      await summaryFeature(interaction, sheets, SPREADSHEET_ID);
    }
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
  (answer) => {
    if (answer === process.env.KEY_ACCESS) {
      console.log(
        "✅ ยืนยันรหัสผ่านสำเร็จ กำลังเชื่อมต่อเข้าสู่เซิร์ฟเวอร์...",
      );
      client.login(process.env.DISCORD_TOKEN);
    } else {
      console.error("❌ รหัสผ่านไม่ถูกต้อง! โปรแกรมจะปิดการทำงาน");
      process.exit(1);
    }
    rl.close();
  },
);
