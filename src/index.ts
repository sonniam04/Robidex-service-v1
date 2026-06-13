import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import { connectDB } from "./db"
import authRoutes from "./routes/auth"
import gamesRoutes from "./routes/games"
import categoriesRoutes from "./routes/categories"
import codesRoutes from "./routes/codes"
import articlesRoutes from "./routes/articles"

dotenv.config()

const app = express()
const PORT = process.env.PORT ?? 8000

app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:3000" }))
app.use(express.json())

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
})

app.use("/auth", authRoutes)
app.use("/games", gamesRoutes)
app.use("/categories", categoriesRoutes)
app.use("/codes", codesRoutes)
app.use("/articles", articlesRoutes)

async function bootstrap() {
  await connectDB()
  app.listen(PORT, () => {
    console.log(`🚀 Backend running at http://localhost:${PORT}`)
  })
}

bootstrap().catch(console.error)
