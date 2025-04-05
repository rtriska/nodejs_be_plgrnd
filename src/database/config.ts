import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

let db: ReturnType<typeof drizzle>;

// Initialize database connection
export const initializeDatabase = async () => {
	try {
		// Create the connection
		if (!process.env.DATABASE_URL) {
			throw new Error('DATABASE_URL is not set');
		}
		const connection = await mysql.createConnection(process.env.DATABASE_URL);

		// Create the database instance
		db = drizzle(connection, { schema, mode: 'default' });

		// Test the connection
		await connection.ping();
		console.log('Database connection established successfully');
	} catch (error) {
		console.error('Failed to connect to database:', error);
		throw error;
	}
};

// Get database instance
export const getDatabase = () => {
	if (!db) {
		throw new Error('Database not initialized. Call initializeDatabase first.');
	}
	return db;
};
