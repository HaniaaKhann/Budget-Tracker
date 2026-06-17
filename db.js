import pg from "pg";
import env from "dotenv";


env.config();

const db = new pg.Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect()
  .then(() => console.log("Connected to PostgreSQL"))
  .catch((err) => console.error("DB connection error:", err));

export default db;
