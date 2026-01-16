import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export const verifyToken = (req, res, next) => {
	// 1. On recupere le token dans les cookies
	const token = req.cookies.token;

	if (!token)
		return res.status(401).json({ error: "Unauthorized: No token provided" });

	try {
		// 2. Verifier la signature du token
		const decoded = jwt.verify(token, JWT_SECRET);

		// 3. Stocker les infos du user dans req pour les routes suivantes
		req.user = decoded;

		next();
	
	} catch (err) {
		return res.status(401).json({ error: "Unauthorized: Invalid token"});
	}
};
