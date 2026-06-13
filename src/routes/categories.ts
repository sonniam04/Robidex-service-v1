import { Router } from "express"
import { z } from "zod"
import { pool } from "../db"
import { authenticate } from "../middleware/authenticate"

const router = Router()

router.get("/", async (_req, res) => {
  const { rows } = await pool.query("SELECT * FROM categories ORDER BY name")
  res.json(rows)
})

router.get("/:slug", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM categories WHERE slug = $1", [req.params.slug])
  if (!rows[0]) { res.status(404).json({ message: "Category not found" }); return }
  const { rows: games } = await pool.query(
    "SELECT * FROM games WHERE category_id = $1 ORDER BY title",
    [rows[0].id]
  )
  res.json({ ...rows[0], games })
})

const categorySchema = z.object({ slug: z.string().min(1), name: z.string().min(1) })

router.post("/", authenticate, async (req, res) => {
  const result = categorySchema.safeParse(req.body)
  if (!result.success) { res.status(400).json({ message: "Invalid input" }); return }
  const { rows } = await pool.query(
    "INSERT INTO categories (slug, name) VALUES ($1, $2) RETURNING *",
    [result.data.slug, result.data.name]
  )
  res.status(201).json(rows[0])
})

export default router
