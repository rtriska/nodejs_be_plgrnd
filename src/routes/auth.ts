import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../database/config';
import { users, jwtDenylist } from '../database/schema';
import { eq } from 'drizzle-orm';
import ms from 'ms';
import { UUID, randomUUID as uuidv4 } from 'node:crypto';

const router = express.Router();

type IncomingJWT = {
	userId: number;
	email: string;
	jti: UUID;
	iat: number;
	exp: number;
};

/**
 * @swagger
 * /auth/sign_in:
 *   post:
 *     summary: Login to the application
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       description: The email and password of the user
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 description: The email of the user
 *               password:
 *                 type: string
 *                 description: The password of the user
 *     responses:
 *       200:
 *         description: User logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: number
 *                     email:
 *                       type: string
 *                 token:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post('/sign_in', async (req: Request, res: Response): Promise<void> => {
	// if you spam to this endpoint, it will create a lot of tokens
	// adding a .userId to "jwtDenylist" table might be a good idea
	try {
		const { email, password } = req.body;
		const db = getDatabase();

		// Find user
		const [user] = await db.select().from(users).where(eq(users.email, email));

		if (!user) {
			res.status(401).json({ error: 'Who are you?' });
			return;
		}

		// Check password
		const isPasswordValid = await bcrypt.compare(password, user.encryptedPassword);

		if (!isPasswordValid) {
			res.status(401).json({ error: 'Invalid credentials' });
			return;
		}

		// Generate JWT token
		const expiresIn = Date.now() + ms('24h');
		const jwtId = uuidv4();
		const secretKey = process.env.JWT_SECRET || 'your-secret-key';
		const token = jwt.sign(
			{
				userId: user.id,
				email: user.email,
				jti: jwtId,
			},
			secretKey,
			{ expiresIn },
		);

		// save token to db
		await db.insert(jwtDenylist).values({
			jti: jwtId,
			exp: new Date(expiresIn),
		});

		res.json({
			user: {
				id: user.id,
				email: user.email,
			},
			token,
		});
	} catch (error) {
		console.error('Login error:', error);
		res.status(500).json({ error: 'Failed to login' });
	}
});

/**
 * @swagger
 * /auth/sign_out:
 *   delete:
 *     summary: Logout from the application
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: User logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Already signed out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.delete('/sign_out', async (req: Request, res: Response): Promise<void> => {
	const requestToken = req.headers.authorization?.split(' ')[1];

	if (!requestToken) {
		res.status(401).json({ error: 'Already signed out' });
		return;
	}

	const secretKey = process.env.JWT_SECRET || 'your-secret-key';
	const decodedToken = jwt.verify(requestToken, secretKey) as IncomingJWT;

	// check if token is in db
	const db = getDatabase();
	const [token] = await db
		.select()
		.from(jwtDenylist)
		.where(eq(jwtDenylist.jti, decodedToken.jti));

	if (!token) {
		res.status(401).json({ error: 'Malformed token' });
	}

	// delete token from db
	await db.delete(jwtDenylist).where(eq(jwtDenylist.jti, decodedToken.jti));

	res.status(200).json({ message: 'Signed out successfully' });
});

export default router;
