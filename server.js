import express from "express";
import session from "express-session";
import env from "dotenv";
import authRoutes from "./routes/auth.js";
import passport from "./config/passport.js";
import dashboardRoutes from "./routes/dashboard.js";

const app = express();
const port = 3000;
app.set("view engine", "ejs");
env.config();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(passport.initialize());
app.use(passport.session());

app.get("/", (req, res) => {
  if(req.isAuthenticated()) {
    return res.redirect("/dashboard");
  }
  return res.render("pages/index");
});

app.use("/", authRoutes);

app.use("/", dashboardRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
