const { generateWithFallback } = require("./utils");
const fetch = require("node-fetch"); // fallback if needed, but index.js globally exposes fetch

/**
 * จัดการคำสั่ง !image (สร้างรูปภาพด้วย Hugging Face)
 */
async function handleImageCommand(message, args) {
  if (args.length === 0)
    return message.reply(
      "⚠️ กรุณาระบุคำอธิบายรูปภาพด้วยครับ (เช่น `!image แมวกำลังเดินเล่น`)",
    );

  const query = args.join(" ");
  const tempMsg = await message.reply(
    "🎨 กำลังใช้เวทมนตร์สร้างรูปภาพให้คุณ กรุณารอสักครู่...",
  );

  try {
    const hfToken = process.env.HF_TOKEN;
    if (!hfToken) {
      return await tempMsg.edit(
        "❌ ไม่พบรหัส `HF_TOKEN` ในไฟล์ `.env` ครับ\nกรุณาไปสมัครสมาชิกที่ https://huggingface.co/settings/tokens เพื่อรับ Token ฟรี แล้วนำมาใส่ในไฟล์ `.env` ครับ",
      );
    }

    // --- ส่วนของล่ามแปลภาษา (Gemini) ---
    await tempMsg.edit("⏳ **กำลังร่ายมนต์คำสั่งให้สวยงาม...** (1/2)");
    let finalPrompt = query;
    try {
      const translationPrompt = `You are an expert image generation prompt engineer.
The user wants an image of: "${query}"
Translate this into a highly descriptive English prompt optimized for AI image generators like FLUX.
Include details like lighting, art style, camera angle, and quality tags if appropriate.
ONLY return the final English prompt, with no intro, no outro, and no quotation marks.`;

      // ใช้ generateWithFallback ซึ่งรองรับ gemini-2.5-flash -> gemini-2.5-flash-lite อยู่แล้ว
      const aiResult = await generateWithFallback(translationPrompt, false);
      if (aiResult && aiResult.trim()) {
        finalPrompt = aiResult.trim();
      }
    } catch (translateError) {
      console.warn("Gemini translation failed, using original prompt:", translateError);
    }

    await tempMsg.edit(`⏳ **กำลังเสกรูปภาพ...** (2/2)`);

    // ใช้โมเดลฟรีคุณภาพสูงจาก Hugging Face (เช่น FLUX.1-schnell หรือ Stable Diffusion)
    const model = "black-forest-labs/FLUX.1-schnell";
    const url = `https://router.huggingface.co/hf-inference/models/${model}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: finalPrompt }),
    });

    if (!response.ok) {
      if (response.status === 503) {
        throw new Error("Model is loading"); // Hugging Face models might need time to load
      }
      throw new Error(`Hugging Face API Error ${response.status}`);
    }

    // Hugging Face จะคืนค่ากลับมาเป็น Image stream
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { AttachmentBuilder } = require("discord.js");
    const attachment = new AttachmentBuilder(buffer, { name: "hf_image.jpg" });

    await tempMsg.edit({
      content: `🖼️ **รูปภาพสำหรับ:** "${query}"`,
      files: [attachment],
    });
  } catch (error) {
    console.error("AI Image Error:", error);
    if (error.message === "Model is loading") {
      await tempMsg.edit(
        "⏳ โมเดลกำลังเปิดเครื่อง (Cold Start) ในเซิร์ฟเวอร์ของ Hugging Face ครับ รบกวนรอสัก 1-2 นาทีแล้วลองพิมพ์คำสั่งใหม่อีกครั้งนะครับ",
      );
    } else {
      await tempMsg.edit(
        "❌ ขออภัย เกิดข้อผิดพลาดในการสร้างรูปภาพครับ (เซิร์ฟเวอร์อาจจะโหลดช้าหรือมีปัญหา) กรุณาลองใหม่อีกครั้ง",
      );
    }
  }
}

module.exports = handleImageCommand;
