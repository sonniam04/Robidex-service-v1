import bcrypt from "bcrypt"
import { pool } from "../db"

const BCRYPT_ROUNDS = 12

function validatePassword(password: string): string | null {
  if (password.length < 12) return "Password must be at least 12 characters"
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter"
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter"
  if (!/[0-9]/.test(password)) return "Password must contain at least one number"
  return null
}

async function setupAdmin() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    console.error("❌  Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables before running this script.")
    console.error("    Example: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=StrongPass123 npm run setup-admin")
    process.exit(1)
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("❌  Invalid email format:", email)
    process.exit(1)
  }

  const passwordError = validatePassword(password)
  if (passwordError) {
    console.error("❌  Weak password —", passwordError)
    process.exit(1)
  }

  console.log("⏳  Hashing password (bcrypt rounds:", BCRYPT_ROUNDS, ")...")
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS)

  await pool.query(
    `INSERT INTO admins (email, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [email, hash]
  )

  console.log("✅  Admin account ready:", email)
  console.log("    Login at /admin/login")
  await pool.end()
}

setupAdmin().catch((err: Error) => {
  console.error("❌  Unexpected error:", err.message)
  process.exit(1)
})
