import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import bcrypt from "bcrypt";
import db from "../db.js";

passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const result = await db.query(
          "SELECT * FROM users WHERE email = $1",
          [email]
        );

        if (result.rows.length === 0) {
          return done(null, false);
        }

        const user = result.rows[0];

        if (!user.password) {
          return done(null, false);
        }

        const match = await bcrypt.compare(password, user.password);

        if (match) {
          return done(null, user);
        } else {
          return done(null, false);
        }
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const result = await db.query(
          "SELECT * FROM users WHERE google_id = $1",
          [profile.id]
        );

        if (result.rows.length === 0) {
          const newUser = await db.query(
            "INSERT INTO users (google_id, email) VALUES ($1, $2) RETURNING *",
            [profile.id, profile.email]
          );
          return done(null, newUser.rows[0]);
        }

        return done(null, result.rows[0]);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    done(null, result.rows[0]);
  } catch (err) {
    done(err);
  }
});

export default passport;