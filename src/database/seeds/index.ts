import { promises as fs } from 'fs';
import path from 'path';
import { initializeDatabase, getDatabase } from '../config';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { saveArticlesSqlFile, ARTICLE_IMAGES } from './utils';
import { Connection } from 'mysql2/promise';

// Load environment variables
dotenv.config();

/**
 * Directly seed articles with images using the Drizzle ORM
 * This is used as a fallback if SQL file execution fails
 */
async function seedArticlesProgrammatically(connection: Connection) {
  console.log('Falling back to programmatic article seeding...');
  
  // Basic article data
  const articles = [
    {
      title: 'The Art of Scoring Goals',
      shortDescription: 'Learn how to score goals like a pro with this comprehensive guide to the art of goal-scoring.',
      description: 'This is the description of the article with title: The Art of Scoring Goals'
    },
    {
      title: 'Mastering the Perfect Serve',
      shortDescription: 'Master the perfect serve with this step-by-step guide to serving in tennis.',
      description: 'This is the description of the article with title: Mastering the Perfect Serve'
    },
    {
      title: 'Unleashing Your Inner Athlete',
      shortDescription: 'Unleash your inner athlete with this guide to becoming the best athlete you can be.',
      description: 'This is the description of the article with title: Unleashing Your Inner Athlete'
    },
    {
      title: 'The Science of Sports Performance',
      shortDescription: 'Discover the science behind sports performance and how to improve your game.',
      description: 'This is the description of the article with title: The Science of Sports Performance'
    },
    {
      title: 'Achieving Victory Through Teamwork',
      shortDescription: 'Achieve victory through teamwork with this guide to working together as a team.',
      description: 'This is the description of the article with title: Achieving Victory Through Teamwork'
    },
    {
      title: 'Exploring the World of Extreme Sports',
      shortDescription: 'Explore the world of extreme sports and learn how to get started with this guide.',
      description: 'This is the description of the article with title: Exploring the World of Extreme Sports'
    }
  ];

  // Insert each article with its image
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const image = ARTICLE_IMAGES[i];
    
    // Insert the article
    const [result] = await connection.query(
      `INSERT INTO articles 
       (title, short_description, description, image, image_alt, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [article.title, article.shortDescription, article.description, image.base64, image.alt]
    );
    
    // Get the inserted article ID
    const articleId = (result as any).insertId;
    
    // Insert a like for this article
    await connection.query(
      `INSERT INTO likes 
       (likes, dislikes, likeable_type, likeable_id, created_at, updated_at) 
       VALUES (?, ?, 'Article', ?, NOW(), NOW())`,
      [Math.floor(Math.random() * 101), Math.floor(Math.random() * 101), articleId]
    );
  }
  
  console.log(`✅ Completed programmatic seeding of ${articles.length} articles with images`);
}

/**
 * Seed database with test data
 */
async function seedDatabase() {
  console.log('Starting database seeding...');
  
  try {
    // First, regenerate the articles SQL file with base64 images
    console.log('Generating articles SQL with image data...');
    await saveArticlesSqlFile();
    
    // Initialize the database connection
    await initializeDatabase();
    const db = getDatabase();
    
    // Get direct MySQL connection to execute raw SQL
    const connection = await mysql.createConnection(process.env.DATABASE_URL || '');
    
    // Set session variables to handle large data
    // await connection.query('SET SESSION max_allowed_packet=67108864'); // 64MB
    await connection.query('SET SESSION net_read_timeout=120'); // 2 minutes
    await connection.query('SET SESSION net_write_timeout=120'); // 2 minutes
    await connection.query('SET SESSION wait_timeout=180'); // 3 minutes
    
    try {
      // Get all SQL files from the seeds directory
      const seedsDir = path.join(__dirname);
      const files = (await fs.readdir(seedsDir))
        .filter(file => file.endsWith('.sql'))
        .sort(); // Sort to ensure correct order (01_, 02_, etc.)
      
      console.log(`Found ${files.length} seed files to execute`);
      
      // Execute each SQL file
      for (const file of files) {
        console.log(`Executing seed file: ${file}`);
        const filePath = path.join(seedsDir, file);
        const sql = await fs.readFile(filePath, 'utf8');
        
        // Skip empty files
        if (!sql.trim()) {
          console.log(`Skipping empty file: ${file}`);
          continue;
        }
        
        // Try to execute the file
        try {
          // Special handling for articles file which may have base64 issues
          if (file === '02_articles_and_likes.sql') {
            try {
              // Try to execute the whole file as a single statement first
              await connection.query({
                sql,
                timeout: 120000 // 2 minute timeout for large query
              });
              console.log(`✅ Completed: ${file} (executed as single query)`);
            } catch (error) {
              console.warn(`Could not execute ${file} as a single query, falling back to programmatic approach`);
              // If running the SQL file fails, use the programmatic approach
              await seedArticlesProgrammatically(connection);
            }
          } else {
            // For other files, use the normal approach with statement splitting
            // Split the SQL by semicolon to handle multiple statements
            // Improved handling to avoid splitting inside base64 content
            const statements: string[] = [];
            let currentStatement = '';
            let inString = false;
            
            for (let i = 0; i < sql.length; i++) {
              const char = sql[i];
              
              // Track if we're inside a string literal
              if (char === "'" && (i === 0 || sql[i - 1] !== '\\')) {
                inString = !inString;
              }
              
              currentStatement += char;
              
              // Only consider semicolons outside of string literals as statement separators
              if (char === ';' && !inString) {
                const trimmedStatement = currentStatement.trim();
                if (trimmedStatement) {
                  statements.push(trimmedStatement);
                }
                currentStatement = '';
              }
            }
            
            // Add the last statement if there is one
            if (currentStatement.trim()) {
              statements.push(currentStatement.trim());
            }
            
            // Execute each statement with appropriate timeout
            for (const statement of statements) {
              if (statement.length > 0) {
                try {
                  await connection.query({
                    sql: statement,
                    timeout: 60000 // 60 second timeout for each query
                  });
                } catch (error) {
                  console.error(`Error executing statement: ${(error as Error).message}`);
                  console.error(`Statement starts with: ${statement.substring(0, 100)}...`);
                  throw error;
                }
              }
            }
            
            console.log(`✅ Completed: ${file}`);
          }
        } catch (error) {
          console.error(`Error processing file ${file}:`, error);
          throw error;
        }
      }
    } catch (sqlError) {
      console.error('Error executing SQL files:', sqlError);
      
      // Fall back to programmatic seeding for articles
      console.log('Falling back to programmatic approach for all seeding...');
      
      // First, reset any partially applied seeds
      try {
        await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
        await connection.query('TRUNCATE TABLE articles;');
        await connection.query('TRUNCATE TABLE likes;');
        await connection.query('TRUNCATE TABLE comments;');
        await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
        
        // Seed users (assuming they were created successfully)
        await seedArticlesProgrammatically(connection);
      } catch (fallbackError) {
        console.error('Error in fallback seeding:', fallbackError);
        throw fallbackError;
      }
    }
    
    console.log('Database seeding completed successfully!');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedDatabase(); 