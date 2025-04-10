import express, { Request, Response } from 'express';
import { getDatabase } from '../database/config';
import { articles } from '../database/schema';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

/**
 * @swagger
 * /articles:
 *   get:
 *     summary: Returns all articles
 *     tags: [Articles]
 *     responses:
 *       200:
 *         description: The list of articles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Article'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDatabase();
    const result = await db.select().from(articles);
    res.json(result);
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

/**
 * @swagger
 * /articles/{articleId}:
 *   get:
 *     summary: Get an article by ID
 *     tags: [Articles]
 *     parameters:
 *       - in: path
 *         name: articleId
 *         schema:
 *           type: integer
 *         required: true
 *         description: The article ID
 *     responses:
 *       200:
 *         description: The article details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Article'
 *       404:
 *         description: The article was not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:articleId', async (req: Request, res: Response): Promise<void> => {
  try {
    const articleId = Number(req.params.articleId);
    const db = getDatabase();
    const [article] = await db.select().from(articles).where(eq(articles.id, articleId));

    if (!article) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    res.json(article);
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

/**
 * @swagger
 * /articles:
 *   post:
 *     summary: Create a new article
 *     tags: [Articles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 description: The article title
 *               shortDescription:
 *                 type: string
 *                 description: A short description of the article
 *               description:
 *                 type: string
 *                 description: The full article content
 *               image:
 *                 type: string
 *                 description: Base64 encoded image data
 *               imageAlt:
 *                 type: string
 *                 description: Alternative text for the image
 *     responses:
 *       201:
 *         description: The article was successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Article'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, shortDescription, description, image, imageAlt } = req.body;
    const db = getDatabase();

    const [result] = await db.insert(articles).values({
      title,
      shortDescription,
      description,
      image,
      imageAlt,
    });

    const [article] = await db.select().from(articles).where(eq(articles.id, result.insertId));
    res.status(201).json(article);
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({ error: 'Failed to create article' });
  }
});

/**
 * @swagger
 * /articles/{articleId}:
 *   patch:
 *     summary: Update parts of an article
 *     tags: [Articles]
 *     parameters:
 *       - in: path
 *         name: articleId
 *         schema:
 *           type: integer
 *         required: true
 *         description: The article ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: The article title
 *               shortDescription:
 *                 type: string
 *                 description: A short description of the article
 *               description:
 *                 type: string
 *                 description: The full article content
 *               image:
 *                 type: string
 *                 description: Base64 encoded image data
 *               imageAlt:
 *                 type: string
 *                 description: Alternative text for the image
 *     responses:
 *       200:
 *         description: The article was updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Article'
 *       404:
 *         description: The article was not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:articleId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const articleId = Number(req.params.articleId);
    const { title, shortDescription, description, image, imageAlt } = req.body;
    const db = getDatabase();

    const [result] = await db
      .update(articles)
      .set({
        title,
        shortDescription,
        description,
        image,
        imageAlt,
      })
      .where(eq(articles.id, articleId));

    if (!result.affectedRows) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    const [article] = await db.select().from(articles).where(eq(articles.id, articleId));
    res.json(article);
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({ error: 'Failed to update article' });
  }
});

/**
 * @swagger
 * /articles/{articleId}:
 *   delete:
 *     summary: Delete an article
 *     tags: [Articles]
 *     parameters:
 *       - in: path
 *         name: articleId
 *         schema:
 *           type: integer
 *         required: true
 *         description: The article ID
 *     responses:
 *       204:
 *         description: The article was deleted
 *       404:
 *         description: The article was not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:articleId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const articleId = Number(req.params.articleId);
    const db = getDatabase();

    const [result] = await db.delete(articles).where(eq(articles.id, articleId));

    if (!result.affectedRows) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    res.status(204).end();
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

export default router;
