import { Router } from "express"
import { z } from "zod"
import { pool } from "../db"
import { authenticate } from "../middleware/authenticate"

const router = Router()

router.get("/", async (req, res) => {
  const { search, category, sort } = req.query as Record<string, string>
  let query = `
    SELECT g.*, c.name AS category_name, c.slug AS category_slug,
           COUNT(DISTINCT co.id) FILTER (WHERE co.status != 'expired') AS active_code_count
    FROM games g
    LEFT JOIN categories c ON g.category_id = c.id
    LEFT JOIN codes co ON co.game_id = g.id
  `
  const params: unknown[] = []
  const where: string[] = []
  if (search) { params.push(`%${search}%`); where.push(`g.title ILIKE $${params.length}`) }
  if (category) { params.push(category); where.push(`c.slug = $${params.length}`) }
  if (where.length) query += " WHERE " + where.join(" AND ")
  query += " GROUP BY g.id, c.name, c.slug"
  query += sort === "title" ? " ORDER BY g.title" : " ORDER BY g.created_at DESC"
  const { rows } = await pool.query(query, params)
  res.json(rows)
})

router.get("/:slug", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT g.*, c.name AS category_name FROM games g LEFT JOIN categories c ON g.category_id = c.id WHERE g.slug = $1`,
    [req.params.slug]
  )
  if (!rows[0]) { res.status(404).json({ message: "Game not found" }); return }
  const game = rows[0]
  const { rows: codes } = await pool.query(
    `SELECT co.*, json_agg(cc ORDER BY cc.created_at) FILTER (WHERE cc.id IS NOT NULL) AS comments
     FROM codes co LEFT JOIN code_comments cc ON cc.code_id = co.id
     WHERE co.game_id = $1 GROUP BY co.id ORDER BY co.created_at DESC`,
    [game.id]
  )
  const { rows: links } = await pool.query("SELECT * FROM game_links WHERE game_id = $1", [game.id])
  res.json({ ...game, codes, links })
})

const gameSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  cover_url: z.string().optional(),
  redeem_image_url: z.string().optional(),
  category_id: z.string().uuid().optional(),
  is_featured: z.boolean().optional(),
})

router.post("/", authenticate, async (req, res) => {
  const result = gameSchema.safeParse(req.body)
  if (!result.success) { res.status(400).json({ message: "Invalid input", errors: result.error.flatten() }); return }
  const { slug, title, description, cover_url, redeem_image_url, category_id, is_featured } = result.data
  const { rows } = await pool.query(
    `INSERT INTO games (slug, title, description, cover_url, redeem_image_url, category_id, is_featured)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [slug, title, description ?? null, cover_url ?? null, redeem_image_url ?? null, category_id ?? null, is_featured ?? false]
  )
  res.status(201).json(rows[0])
})

router.patch("/:id", authenticate, async (req, res) => {
  const update = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    cover_url: z.string().optional(),
    redeem_image_url: z.string().optional(),
    category_id: z.string().uuid().optional(),
    is_featured: z.boolean().optional(),
  }).safeParse(req.body)
  if (!update.success) { res.status(400).json({ message: "Invalid input" }); return }
  const fields = Object.entries(update.data)
  if (!fields.length) { res.status(400).json({ message: "Nothing to update" }); return }
  const sets = fields.map(([k], i) => `${k} = $${i + 2}`).join(", ")
  const { rows } = await pool.query(
    `UPDATE games SET ${sets} WHERE id = $1 RETURNING *`,
    [req.params.id, ...fields.map(([, v]) => v)]
  )
  if (!rows[0]) { res.status(404).json({ message: "Game not found" }); return }
  res.json(rows[0])
})

router.delete("/:id", authenticate, async (req, res) => {
  await pool.query("DELETE FROM games WHERE id = $1", [req.params.id])
  res.status(204).send()
})

// Game links management
const linkSchema = z.object({ label: z.string().min(1), url: z.string().min(1), icon: z.string().optional() })

router.post("/:id/links", authenticate, async (req, res) => {
  const result = linkSchema.safeParse(req.body)
  if (!result.success) { res.status(400).json({ message: "Invalid input" }); return }
  const { rows } = await pool.query(
    "INSERT INTO game_links (game_id, label, url, icon) VALUES ($1,$2,$3,$4) RETURNING *",
    [req.params.id, result.data.label, result.data.url, result.data.icon ?? null]
  )
  res.status(201).json(rows[0])
})

router.delete("/:id/links/:linkId", authenticate, async (req, res) => {
  await pool.query("DELETE FROM game_links WHERE id = $1 AND game_id = $2", [req.params.linkId, req.params.id])
  res.status(204).send()
})

export default router
