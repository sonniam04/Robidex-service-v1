import { Router } from "express"
import { z } from "zod"
import { pool } from "../db"
import { authenticate } from "../middleware/authenticate"

const router = Router()

router.get("/games/:gameId", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM articles WHERE game_id = $1", [req.params.gameId])
  if (!rows[0]) { res.status(404).json({ message: "Article not found" }); return }
  const { rows: sections } = await pool.query(
    "SELECT * FROM article_sections WHERE article_id = $1 ORDER BY sort_order",
    [rows[0].id]
  )
  res.json({ ...rows[0], sections })
})

const articleSchema = z.object({ game_id: z.string().uuid(), title: z.string().min(1) })

router.post("/", authenticate, async (req, res) => {
  const result = articleSchema.safeParse(req.body)
  if (!result.success) { res.status(400).json({ message: "Invalid input" }); return }
  const { rows } = await pool.query(
    "INSERT INTO articles (game_id, title) VALUES ($1,$2) RETURNING *",
    [result.data.game_id, result.data.title]
  )
  res.status(201).json(rows[0])
})

const sectionSchema = z.object({
  article_id: z.string().uuid(),
  sort_order: z.number().int(),
  heading: z.string().optional(),
  body: z.string().optional(),
  image_url: z.string().optional(),
})

router.post("/sections", authenticate, async (req, res) => {
  const result = sectionSchema.safeParse(req.body)
  if (!result.success) { res.status(400).json({ message: "Invalid input" }); return }
  const { article_id, sort_order, heading, body, image_url } = result.data
  const { rows } = await pool.query(
    "INSERT INTO article_sections (article_id, sort_order, heading, body, image_url) VALUES ($1,$2,$3,$4,$5) RETURNING *",
    [article_id, sort_order, heading ?? null, body ?? null, image_url ?? null]
  )
  res.status(201).json(rows[0])
})

router.patch("/sections/:id", authenticate, async (req, res) => {
  const update = z.object({
    sort_order: z.number().optional(),
    heading: z.string().optional(),
    body: z.string().optional(),
    image_url: z.string().optional(),
  }).safeParse(req.body)
  if (!update.success) { res.status(400).json({ message: "Invalid input" }); return }
  const fields = Object.entries(update.data)
  if (!fields.length) { res.status(400).json({ message: "Nothing to update" }); return }
  const sets = fields.map(([k], i) => `${k} = $${i + 2}`).join(", ")
  const { rows } = await pool.query(
    `UPDATE article_sections SET ${sets} WHERE id = $1 RETURNING *`,
    [req.params.id, ...fields.map(([, v]) => v)]
  )
  if (!rows[0]) { res.status(404).json({ message: "Section not found" }); return }
  res.json(rows[0])
})

router.delete("/sections/:id", authenticate, async (req, res) => {
  await pool.query("DELETE FROM article_sections WHERE id = $1", [req.params.id])
  res.status(204).send()
})

export default router
