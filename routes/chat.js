import express from "express";
import axios from "axios";
import pool from "../db.js";

const router = express.Router();

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    return res.status(401).json({ reply: "Please log in to use the chatbot." });
}

router.post("/", ensureAuthenticated, async (req, res) => {
    const { message } = req.body;

    if (!message || !message.trim()) {
        return res.status(400).json({ reply: "Please type a question first." });
    }

    const userId = req.user.id;

    try {
        const result = await pool.query(
            `
            SELECT
                type,
                amount,
                category,
                description,
                created_at
            FROM transactions
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 100
            `,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.json({
                reply: "You don't have any transactions yet. Add some income or expenses on the dashboard first."
            });
        }

        const transactionData = JSON.stringify(result.rows, null, 2);

        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: process.env.OPENROUTER_MODEL || "google/gemma-4-31b-it",
                messages: [
                    {
                        role: "system",
                        content: `You are BudgetTracker AI. You help users understand their personal finances using ONLY the transaction JSON they provide.

Rules:
- category is always in the "category" field (description is separate)
- never invent transactions
- if data is missing, say so
- keep answers short, friendly, and easy to read
- use plain text only (no markdown, no asterisks, no hashtags)
- structure answers with short paragraphs and simple dash lists when helpful
- for spending by category, group expense rows by category and sum amounts
- balance = total income minus total expenses
- income = rows where type is "income"
- expenses = rows where type is "expense"
- briefly explain how you got the answer`
                    },
                    {
                        role: "user",
                        content: `Here are my transactions:\n${transactionData}\n\nQuestion: ${message.trim()}`
                    }
                ]
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": "BudgetTracker"
                }
            }
        );

        const reply = response.data.choices[0].message.content;
        res.json({ reply });
    } catch (err) {
        console.error(err.response?.data || err.message || err);
        res.status(500).json({ reply: "Sorry, something went wrong. Please try again later." });
    }
});

export default router;
