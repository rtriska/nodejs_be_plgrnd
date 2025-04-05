import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default {
	schema: './src/database/schema.ts',
	out: './src/database/migrations',
	driver: 'mysql2',
	dbCredentials: {
		host: process.env.DB_HOST || 'localhost',
		user: process.env.DB_USER || 'user',
		password: process.env.DB_PASSWORD || 'password',
		database: process.env.DB_NAME || 'nodejs_be_plgrnd',
	},
	verbose: true,
	strict: true,
} satisfies Config;
