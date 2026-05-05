const express = require('express');
const router = express.Router();
const Groq = require("groq-sdk");
const requireAuth = require("../middleware/auth");

router.post("/chat", requireAuth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.json({ reply: "Warning: GROQ_API_KEY is not configured in the environment variables. Please add it to use the AI." });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const prompt = `You are SolvIt AI, a helpful civic problem-solving assistant. Keep your answers brief, friendly, and focused on helping the user solve community issues.\n\nUser: ${message}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama3-8b-8192",
      temperature: 0.7,
      max_tokens: 500,
    });

    const reply = chatCompletion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
    res.json({ reply });
  } catch (error) {
    console.error("AI Chatbot error:", error.message);
    res.status(500).json({ error: "Failed to communicate with AI server" });
  }
});

module.exports = router;
