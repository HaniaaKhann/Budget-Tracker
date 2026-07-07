import express from "express";
import pool from "../db.js";
import axios from "axios";

const router = express.Router();


function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}

function appendDateSearchFilters(query, values, month, yearQuery, search) {
  if (month && yearQuery) {
    query += ` AND EXTRACT(MONTH FROM created_at) = $${values.length + 1} AND EXTRACT(YEAR FROM created_at) = $${values.length + 2}`;
    values.push(month, Number(yearQuery));
  } else if (month) {
    query += ` AND EXTRACT(MONTH FROM created_at) = $${values.length + 1}`;
    values.push(month);
  } else if (yearQuery) {
    query += ` AND EXTRACT(YEAR FROM created_at) = $${values.length + 1}`;
    values.push(Number(yearQuery));
  }

  if (search) {
    const searchIndex = values.length + 1;
    query += ` AND (category ILIKE $${searchIndex} OR description ILIKE $${searchIndex})`;
    values.push(`%${search}%`);
  }

  return query;
}

router.get("/dashboard", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const month = req.query.month || "";
    const yearQuery = req.query.year;
    const filterSubmitted = "month" in req.query || "year" in req.query || "search" in req.query;
    const search = req.query.search?.trim() || "";
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;

    let listQuery = `SELECT * FROM transactions WHERE user_id = $1`;
    let listValues = [userId];
    listQuery = appendDateSearchFilters(listQuery, listValues, month, yearQuery, search);
    listQuery += ` ORDER BY created_at DESC LIMIT $${listValues.length + 1} OFFSET $${listValues.length + 2}`;
    listValues.push(limit, offset);

    let countQuery = `SELECT COUNT(*) FROM transactions WHERE user_id = $1`;
    let countValues = [userId];
    countQuery = appendDateSearchFilters(countQuery, countValues, month, yearQuery, search);

    let summaryQuery = `
      SELECT type, SUM(amount) AS total
      FROM transactions
      WHERE user_id = $1
    `;
    let summaryValues = [userId];
    summaryQuery = appendDateSearchFilters(summaryQuery, summaryValues, month, yearQuery, search);
    summaryQuery += ` GROUP BY type`;

    let pieQuery = `
      SELECT category, SUM(amount) AS total
      FROM transactions
      WHERE user_id = $1 AND type = 'expense'
    `;
    let pieValues = [userId];
    pieQuery = appendDateSearchFilters(pieQuery, pieValues, month, yearQuery, search);
    pieQuery += ` GROUP BY category ORDER BY total DESC`;

    const [countResult, summaryResult, categoryChart, monthlyChart, listResult] = await Promise.all([
      pool.query(countQuery, countValues),
      pool.query(summaryQuery, summaryValues),
      pool.query(pieQuery, pieValues),
      pool.query(
        `SELECT
          EXTRACT(YEAR FROM created_at) AS year,
          EXTRACT(MONTH FROM created_at) AS month,
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
        FROM transactions
        WHERE user_id = $1
        GROUP BY year, month
        ORDER BY year DESC, month DESC
        LIMIT 12`,
        [userId]
      ),
      pool.query(listQuery, listValues),
    ]);

    const totalRows = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.max(1, Math.ceil(totalRows / limit) || 1);
    const transactions = listResult.rows;

    const allTime = await pool.query(
      "SELECT type, SUM(amount) AS total FROM transactions WHERE user_id = $1 GROUP BY type",
      [userId]
    );

    let totalIncomeAllTime = 0;
    let totalExpenseAllTime = 0;

    allTime.rows.forEach((t) => {
      if (t.type === "income") totalIncomeAllTime += Number(t.total);
      if (t.type === "expense") totalExpenseAllTime += Number(t.total);
    });
    const balanceAllTime = totalIncomeAllTime - totalExpenseAllTime;

    let totalIncome = 0;
    let totalExpense = 0;

    summaryResult.rows.forEach((t) => {
      if (t.type === "income") totalIncome += Number(t.total);
      if (t.type === "expense") totalExpense += Number(t.total);
    });

    const balance = totalIncome - totalExpense;
    const isFiltered = filterSubmitted && Boolean(month || yearQuery || search);
    const filterType = month && yearQuery ? "month-year" : month ? "month" : yearQuery ? "year" : search ? "search" : "all";

    const monthNames = [
      "", "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    let periodLabel = "(All time)";
    if (filterType === "month-year") {
      periodLabel = `(${monthNames[Number(month)]} ${Number(yearQuery)})`;
    } else if (filterType === "year") {
      periodLabel = `(${Number(yearQuery)})`;
    } else if (filterType === "month") {
      periodLabel = `(${monthNames[Number(month)]})`;
    } else if (filterType === "search") {
      periodLabel = `(Search: ${search})`;
    }

    const categoryLabels = categoryChart.rows.map((r) => r.category || "Uncategorized");
    const categoryTotals = categoryChart.rows.map((r) => Number(r.total));

    const rows = monthlyChart.rows.reverse();
    const chartLabels = rows.map((r) => `${monthNames[r.month]} ${r.year}`);
    const incomeData = rows.map((r) => Number(r.income));
    const expenseData = rows.map((r) => Number(r.expense));

    let weather = null;
    try {
      const city = req.user.weather_city || "Karachi";
      const weatherRes = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`
      );
      weather = {
        city: weatherRes.data.name,
        temp: weatherRes.data.main.temp,
        condition: weatherRes.data.weather[0].description,
        icon: weatherRes.data.weather[0].icon,
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
      activePage: "dashboard",
      flash: req.query.msg || null,
      selectedMonth: month,
      selectedYear: yearQuery ? Number(yearQuery) : "",
      isFiltered,
      filterType,
      periodLabel,
      filterSubmitted,
      totalExpenseAllTime,
      totalIncomeAllTime,
      balanceAllTime,
      search,
      categoryLabels,
      categoryTotals,
      chartLabels,
      incomeData,
      expenseData,
      page,
      totalPages,
      totalRows,
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
    if (!amount || amount <= 0 || isNaN(amount)) {
      return res.status(400).send("Invalid amount. Must be a positive number.");
    }

    let category = (req.body.category || "").trim();
    if (category === "__other__") {
      category = (req.body.customCategory || "").trim();
    }
    if (!category) {
      return res.status(400).send("Category is required.");
    }

    category = category.slice(0, 100);
    const description = (req.body.description || "").trim().slice(0, 125);

    await pool.query(
      "INSERT INTO transactions (user_id, type, category, description, amount) VALUES ($1, $2, $3, $4, $5)",
      [userId, "income", category, description, amount]
    );

    res.redirect("/dashboard?msg=added");
  } catch (err) {
    console.error(err);
    res.redirect("/dashboard?msg=error");
  }
});

router.post("/add-expense", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0 || isNaN(amount)) {
      return res.status(400).send("Invalid amount. Must be a positive number.");
    }

    let category = (req.body.category || "").trim();
    if (category === "__other__") {
      category = (req.body.customCategory || "").trim();
    }
    if (!category) {
      return res.status(400).send("Category is required.");
    }

    category = category.slice(0, 100);
    const description = (req.body.description || "").trim().slice(0, 125);

    await pool.query(
      "INSERT INTO transactions (user_id, type, category, description, amount) VALUES ($1, $2, $3, $4, $5)",
      [userId, "expense", category, description, amount]
    );

    res.redirect("/dashboard?msg=added");
  } catch (err) {
    console.error(err);
    res.redirect("/dashboard?msg=error");
  }
});

router.post("/delete-transaction/:id", ensureAuthenticated, async (req, res) => {
  try {
    const transactionId = req.params.id;
    const userId = req.user.id;

    await pool.query("DELETE FROM transactions WHERE id = $1 AND user_id = $2", [
      transactionId,
      userId,
    ]);

    res.redirect("/dashboard?msg=deleted");
  } catch (err) {
    console.error(err);
    res.redirect("/dashboard?msg=error");
  }
});

router.post("/edit-transaction/:id", ensureAuthenticated, async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0 || isNaN(amount)) {
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

    res.redirect("/dashboard?msg=updated");
  } catch (err) {
    console.error(err);
    res.redirect("/dashboard?msg=error");
  }
});

router.get("/profile", ensureAuthenticated, (req, res) => {
  res.render("pages/profile", {
    user: req.user,
    activePage: "profile",
    flash: req.query.msg || null,
  });
});

router.post("/profile", ensureAuthenticated, async (req, res) => {
  try {
    const name = (req.body.name || "").trim().slice(0, 100);
    const weather_city = (req.body.weather_city || "").trim().slice(0, 100);

    await pool.query("UPDATE users SET name = $1, weather_city = $2 WHERE id = $3", [
      name || null,
      weather_city || "Karachi",
      req.user.id,
    ]);

    res.redirect("/profile?msg=saved");
  } catch (err) {
    console.error(err);
    res.redirect("/profile?msg=error");
  }
});

export default router;
