import express from 'express';
import authRoutes from './auth';
import articleRoutes from './articles';
import userRoutes from './users';

const router = express.Router();

// Mount route groups
router.use('/auth', authRoutes);
router.use('/articles', articleRoutes);
router.use('/users', userRoutes);

export default router;
