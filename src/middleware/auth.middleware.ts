import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../database/config';
import { jwtDenylist } from '../database/schema';
import { eq } from 'drizzle-orm';

interface JWTPayload extends jwt.JwtPayload {
	userId: number;
	email: string;
	jti: string;
}

export const authMiddleware = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const authHeader = req.headers.authorization;

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			res.status(401).json({ error: 'No token provided' });
			return;
		}

		const token = authHeader.split(' ')[1];
		const secretKey = Buffer.from(process.env.JWT_SECRET || 'your-secret-key', 'utf8');
		const decodedToken = jwt.verify(token, secretKey) as JWTPayload;

		if (!decodedToken.jti) {
			res.status(401).json({ error: 'Invalid token format' });
			return;
		}

		// Check if token is in denylist
		const db = getDatabase();
		const [deniedToken] = await db
			.select()
			.from(jwtDenylist)
			.where(eq(jwtDenylist.jti, decodedToken.jti));

		if (deniedToken) {
			res.status(401).json({ error: 'Token has been revoked' });
			return;
		}

		// Add user info to request
		req.user = decodedToken;
		next();
	} catch (error) {
		res.status(401).json({ error: 'Invalid token' });
	}
};
