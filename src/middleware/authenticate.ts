import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET ?? "robidex_secret_change_me"

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET)
    ;(req as Request & { admin: unknown }).admin = payload
    next()
  } catch {
    res.status(401).json({ message: "Invalid token" })
  }
}
