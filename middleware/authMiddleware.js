import User from "../db/models/user.js"

const authMiddleware = async (req, res, next) => {
  const userId = req.headers['x-user-id']

  if (!userId) {
    return res.status(401).json({ error: 'Not authorized' })
  }

  const user = await User.findById(userId)

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  const expiresIn = user.tokenExpiresAt
  if (new Date() > expiresIn) {
    return res.status(401).json({ error: 'Not authorized' })
  }

  req.user = user
  next()
}

export default authMiddleware
