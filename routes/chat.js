import express from "express";
import axios from "axios";
import pool from "../db.js";

const router = express.Router();

router.post("/", async (req, res)=>{
    const {message} = req.body;
    const userId = req.user.id;
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
    const transactions = result.rows;
    const financeData = transactions
    .map(t =>
        `${t.created_at.toISOString().split("T")[0]} | ${t.type} | ${t.category} | ${t.amount} | ${t.description || ""}`
    )
    .join("\n");
    try{
        const response = await axios.post("https://openrouter.ai/api/v1/chat/completions",{
            model: process.env.OPENROUTER_MODEL,
            messages: [{role: "system", content: 
                `You are BudgetTracker AI.
                You help users understand their finances.
                You only answer using the financial data provided below.
                You are friendly, concise, and professional.
                If the answer cannot be determined from the data, say so instead of making it up.
                Do not invent transactions or numbers.
                Financial data:
                ${financeData}`
            }, {role: "user", content: message}]
        }, {
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "BudgetTracker"
                }
            });
    const reply = response.data.choices[0].message.content;
    res.json({reply});
    } catch (err){
        console.error(err.response?.data || err);
        res.status(500).json({reply: "Sorry, something went wrong. Please try again later."});
    }
})

export default router;

