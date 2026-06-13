import { Router } from "express"
import { z } from "zod"
import { pool } from "../db"
import { authenticate } from "../middleware/authenticate"

const router = Router()

const codeSchema = z.object({
  game_id: z.string().uuid(),
  code: z.string().min(1),
  reward: z.string().optional(),
  status: z.enum(["new", "active", "expired"]).default("active"),
  expired_at: z.string().datetime().optional(),
})

router.post("/", authenticate, async (req, res) => {
  const result = codeSchema.safeParse(req.body)
  if (!result.success) { res.status(400).json({ message: "Invalid input", errors: result.error.flatten() }); return }
  const { game_id, code, reward, status, expired_at } = result.data
  const { rows } = await pool.query(
    `INSERT INTO codes (game_id, code, reward, status, expired_at) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [game_id, code, reward ?? null, status, expired_at ?? null]
  )
  res.status(201).json(rows[0])
})

router.patch("/:id", authenticate, async (req, res) => {
  const update = z.object({
    code: z.string().optional(),
    reward: z.string().optional(),
    status: z.enum(["new", "active", "expired"]).optional(),
  }).safeParse(req.body)
  if (!update.success) { res.status(400).json({ message: "Invalid input" }); return }
  const fields = Object.entries(update.data)
  if (!fields.length) { res.status(400).json({ message: "Nothing to update" }); return }
  const sets = fields.map(([k], i) => `${k} = $${i + 2}`).join(", ")
  const { rows } = await pool.query(
    `UPDATE codes SET ${sets} WHERE id = $1 RETURNING *`,
    [req.params.id, ...fields.map(([, v]) => v)]
  )
  if (!rows[0]) { res.status(404).json({ message: "Code not found" }); return }
  res.json(rows[0])
})

router.delete("/:id", authenticate, async (req, res) => {
  await pool.query("DELETE FROM codes WHERE id = $1", [req.params.id])
  res.status(204).send()
})

const commentSchema = z.object({ author: z.string().min(1), body: z.string().min(1) })

router.post("/:id/comments", async (req, res) => {
  const result = commentSchema.safeParse(req.body)
  if (!result.success) { res.status(400).json({ message: "Invalid input" }); return }
  const { rows } = await pool.query(
    "INSERT INTO code_comments (code_id, author, body) VALUES ($1,$2,$3) RETURNING *",
    [req.params.id, result.data.author, result.data.body]
  )
  res.status(201).json(rows[0])
})

// Import codes from parsed .md list  (array of {code, reward, status})
router.post("/import", authenticate, async (req, res) => {
  const schema = z.object({
    game_id: z.string().uuid(),
    codes: z.array(z.object({
      code: z.string().min(1),
      reward: z.string().optional(),
      status: z.enum(["new", "active", "expired"]).default("active"),
    })),
  })
  const result = schema.safeParse(req.body)
  if (!result.success) { res.status(400).json({ message: "Invalid input" }); return }
  const { game_id, codes } = result.data
  const inserted = await Promise.all(
    codes.map((c) =>
      pool.query(
        "INSERT INTO codes (game_id, code, reward, status) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING *",
        [game_id, c.code, c.reward ?? null, c.status]
      )
    )
  )
  res.status(201).json({ imported: inserted.filter((r) => r.rows[0]).length })
})

export default router
