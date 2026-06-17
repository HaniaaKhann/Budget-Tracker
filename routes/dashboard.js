import express from "express";
import pool from "../db.js";
import axios from "axios";

const router = express.Router();

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}

router.get("/dashboard", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const month = req.query.month;

    let query = `
      SELECT * FROM transactions
      WHERE user_id = $1
    `;

    let values = [userId];

    if (month) {
      query += ` AND EXTRACT(MONTH FROM created_at) = $2`;
      values.push(month);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, values);
    const transactions = result.rows;

    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(t => {
      if (t.type === "income") totalIncome += Number(t.amount);
      if (t.type === "expense") totalExpense += Number(t.amount);
    });

    const balance = totalIncome - totalExpense;
    let weather = null;
    try {
      const weatherRes = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=Karachi&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`);
      weather = {
        city: weatherRes.data.name,
        temp: weatherRes.data.main.temp,
        condition: weatherRes.data.weather[0].description,
        icon: weatherRes.data.weather[0].icon
      };
    } catch (err) {
      console.error("Weather API error:", err);
    }

    res.render("pages/dashboard", {
      user: req.user,
      transactions,
      totalIncome,
      totalExpense,
      balance,
      weather,
      activePage: "dashboard"
    });

  } catch (err) {
    console.error(err);
    res.send("Error loading dashboard");
  }
});

router.post("/add-income", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const amount = Number(req.body.amount);
    if(!amount || amount <= 0 || isNaN(amount)) {
      return res.status(400).send("Invalid amount. Must be a positive number.");
    }
    const category = (req.body.category || "").trim().slice(0,100);
    const description =(req.body.description || "").trim().slice(0,125);

    await pool.query(
      "INSERT INTO transactions (user_id, type, category, description, amount) VALUES ($1, $2, $3, $4, $5)",
      [userId, "income", category, description, amount]
    );

    res.redirect("/dashboard");

  } catch (err) {
    console.error(err);
    res.send("Error adding income");
  }
});


router.post("/add-expense", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const amount = Number(req.body.amount);
    if(!amount || amount <= 0 || isNaN(amount)) {
      return res.status(400).send("Invalid amount. Must be a positive number.");
    }
    const category = (req.body.category || "").trim().slice(0,100);
    const description =(req.body.description || "").trim().slice(0,125);

    await pool.query(
      "INSERT INTO transactions (user_id, type, category, description, amount) VALUES ($1, $2, $3, $4, $5)",
      [userId, "expense", category, description, amount]);

    res.redirect("/dashboard");

  } catch (err) {
    console.error(err);
    res.send("Error adding expense");
  }
});


router.post("/delete-transaction/:id", ensureAuthenticated, async (req, res) => {
  try {

    const transactionId = req.params.id;
    const userId = req.user.id;

    await pool.query(
      "DELETE FROM transactions WHERE id = $1 AND user_id = $2",
      [transactionId, userId]
    );

    res.redirect("/dashboard");

  } catch (err) {
    console.error(err);
    res.send("Error deleting transaction");
  }
});

router.post("/edit-transaction/:id", ensureAuthenticated, async (req, res) => {
  try{
    const amount = Number(req.body.amount);
    if (!amount || amount <=0 || isNaN(amount)){
      return res.status(400).send("Invalid amount.");
    }
  
    const { category, description } = req.body;
    const transactionId = req.params.id;
    const userId = req.user.id;

    await pool.query(
      `UPDATE transactions
      SET amount=$1, category=$2, description=$3
      WHERE id=$4 AND user_id=$5`,
      [amount, category?.trim(), description?.trim(), transactionId, userId]
    );

    res.redirect("/dashboard");
  }catch (err){
    console.error(err);
    res.send("Error updating transaction");
  }
});

export default router;