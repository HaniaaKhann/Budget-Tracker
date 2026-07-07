import express from "express";
import bcrypt from "bcrypt";
import passport from "../config/passport.js";
import db from "../db.js";

const router = express.Router();
const saltRounds = 10;

router.get("/login", (req, res) => {
  let error;

  if (req.query.error === "google") {
    error = "Google sign-in failed. Please try again.";
  }

  res.render("pages/login", { error });
});

router.post("/login", (req, res, next) => {
  const email = req.body.email?.trim();

  passport.authenticate("local", async (err, user) => {
    if (err) return next(err);

    if (!user) {
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);

        if (result.rows.length === 0) {
          return res.render("pages/login", {
            error: "No account found with this email.",
            errorLink: { text: "Create an account", href: "/register" },
            email,
          });
        }

        if (!result.rows[0].password) {
          return res.render("pages/login", {
            error: "This account uses Google sign-in. Please use the Google button below.",
            email,
          });
        }

        return res.render("pages/login", {
          error: "Incorrect password. Please try again.",
          email,
        });
      } catch (dbErr) {
        return next(dbErr);
      }
    }

    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      req.session.save((saveErr) => {
        if (saveErr) return next(saveErr);
        return res.redirect("/dashboard");
      });
    });
  })(req, res, next);
});

router.get("/register", (req, res) => {
  res.render("pages/register");
});

router.post("/register", async (req, res, next) => {
  const email = req.body.email?.trim();
  const password = req.body.password;

  if (!email || !password) {
    return res.render("pages/register", {
      error: "Email and password are required.",
      email,
    });
  }

  if (password.length < 8) {
    return res.render("pages/register", {
      error: "Password must be at least 8 characters.",
      email,
    });
  }

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);

    if (checkResult.rows.length > 0) {
      return res.render("pages/register", {
        error: "An account with this email already exists.",
        errorLink: { text: "Log in instead", href: "/login" },
        email,
      });
    }

    bcrypt.hash(password, saltRounds, async (hashErr, hash) => {
      if (hashErr) {
        console.error("Error hashing password:", hashErr);
        return res.render("pages/register", {
          error: "Something went wrong. Please try again.",
          email,
        });
      }

      try {
        const result = await db.query(
          "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
          [email, hash]
        );
        const user = result.rows[0];

        req.login(user, (loginErr) => {
          if (loginErr) return next(loginErr);
          req.session.save((saveErr) => {
            if (saveErr) return next(saveErr);
            res.redirect("/dashboard");
          });
        });
      } catch (insertErr) {
        return next(insertErr);
      }
    });
  } catch (err) {
    return next(err);
  }
});

router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get("/auth/google/callback", (req, res, next) => {
  passport.authenticate("google", (err, user) => {
    if (err) return next(err);

    if (!user) {
      return res.redirect("/login?error=google");
    }

    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      req.session.save((saveErr) => {
        if (saveErr) return next(saveErr);
        res.redirect("/dashboard");
      });
    });
  })(req, res, next);
});

router.get("/logout", (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.redirect("/login");
  });
});

export default router;
