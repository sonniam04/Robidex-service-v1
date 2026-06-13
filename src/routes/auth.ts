import { Router } from "express"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { z } from "zod"
import { pool } from "../db"

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET ?? "robidex_secret_change_me"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

router.post("/admin/login", async (req, res) => {
  const result = loginSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ message: "Invalid input", errors: result.error.flatten() })
    return
  }
  const { email, password } = result.data
  const { rows } = await pool.query("SELECT * FROM admins WHERE email = $1", [email])
  const admin = rows[0]
  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
    res.status(401).json({ message: "Invalid credentials" })
    return
  }
  const token = jwt.sign({ id: admin.id, email: admin.email }, JWT_SECRET, { expiresIn: "7d" })
  res.json({ token })
})

export default router
