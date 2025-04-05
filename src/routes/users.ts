import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../database/config';
import { users } from '../database/schema';
import { eq } from 'drizzle-orm';

const router = express.Router();

/**
 * @swagger
 * /users/registrations:
 *   post:
 *     summary: Register a new user
 *     tags: [User]
 *     requestBody:
 *       description: The email and password of the user
 *       required: true
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
 *         description: User registered successfully
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
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/registrations', async (req: Request, res: Response): Promise<void> => {
	try {
		const { email, password } = req.body;
		const db = getDatabase();

		// Check if user exists
		const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

		if (existingUser.length > 0) {
			res.status(400).json({ error: 'User already exists' });
			return;
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(password, 10);

		// Create user
		const [result] = await db.insert(users).values({
			email,
			encryptedPassword: hashedPassword,
		});

		// Get created user
		const [user] = await db.select().from(users).where(eq(users.id, result.insertId));

		// registration does not send token
		res.status(201).json({
			user: {
				id: user.id,
				email: user.email,
			},
		});
	} catch (error) {
		console.error('Registration error:', error);
		res.status(500).json({ error: 'Failed to register user' });
	}
});

export default router;
