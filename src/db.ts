import { Pool } from "pg"
import dotenv from "dotenv"

dotenv.config()

export const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      }
)

export async function connectDB() {
  const client = await pool.connect()
  client.release()
  console.log("✅ PostgreSQL connected")
}
