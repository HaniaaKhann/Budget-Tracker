import express from "express";
import bcrypt from "bcrypt";
import passport from "../config/passport.js";
import db from "../db.js";

const router = express.Router();
const saltRounds = 10;


// GET login page
router.get("/login", (req, res) => {
  res.render("pages/login");
});

// POST login form with custom callback
router.post("/login", (req, res, next) => {
  passport.authenticate("local", async (err, user) => {
    if (err) return next(err);

    if (!user) {
      const email = req.body.email;
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (result.rows.length === 0) {
          return res.redirect("/register"); 
        } else {
          return res.render("pages/login", { error: "Incorrect password" });
        }
      } catch (err) {
        return next(err);
      }
    }

    req.login(user, (err) => {
      if (err) return next(err);
      req.session.save((saveErr) => {
        if (saveErr) return next(saveErr);
        return res.redirect("/dashboard");
      });
    });
  })(req, res, next);
});

// GET register page
router.get("/register", (req, res) => {
  res.render("pages/register");
});

// POST register form
router.post("/register", async(req, res, next) => {
    const email = req.body.email?.trim();
    const password = req.body.password;

    if (!email || !password) {
      return res.render("pages/register", { error: "Email and password are required."});
    }
    if (password.length <8) {
      return res.render("pages/register", { error: "Password must be at least 8 characters."});
    }
    try{
        const checkResult = await db.query("SELECT * FROM users WHERE email = $1",[email]);

        if (checkResult.rows.length>0){
            res.redirect("/login");
        }else{
            bcrypt.hash(password, saltRounds, async(err, hash) => {
                if (err){
                    console.error("Error Hashing password: ", err);
                }else{
                    const result = await db.query(
                        "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *", [email,hash]
                    );
                    const user = result.rows[0];
                    req.login(user, (err) => {
                      if (err) return next(err);
                      req.session.save((saveErr) => {
                        if (saveErr) return next(saveErr);
                        res.redirect("/dashboard");
                      });
                    });
                }
            });
        }
    } catch (err) {
        console.log(err);
    }
});



router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
  })
);


router.get('/logout', function(req, res, next) {
  req.session.destroy(function(err) {
    if (err) {
      return next(err);
    } else {
      return res.redirect('/login'); 
    }
  });
});

export default router;