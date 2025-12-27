import jwt from "jsonwebtoken";
import { pool } from "../db/pool.js";
import { hashPassword, comparePassword } from "../utils/hash.js";

export async function register(req, res) {
  try {
    const { email, username, firstName, lastName, password } = req.body;
    const passwordHash = await hashPassword(password);

    const result = await pool.query(
      `INSERT INTO users (email, username, first_name, last_name, password_hash)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, email, username`,
      [email, username, firstName, lastName, passwordHash]
    );

    res.json({ message: "User registered", user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
}

export async function login(req, res) {
  const { username, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE username=$1",
    [username]
  );

  if (!result.rows.length) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const user = result.rows[0];
  const ok = await comparePassword(password, user.password_hash);

  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ message: "Login successful", token });
}
