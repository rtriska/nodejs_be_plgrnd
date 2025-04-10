import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { initializeDatabase } from './database/config';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import router from './routes/index';

// Load environment variables
config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Taken from Ruby project
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://0.0.0.0:3001",
  "http://0.0.0.0:3002",
  "http://0.0.0.0:4200",
  "http://localhost:4200",
  "http://127.0.0.1:4200"
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Debug routes
app.use((req, res, next) => {
  console.log(`Request received: ${req.method} ${req.url}`);
  next();
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Routes
app.use(router);

// Initialize database and start server
initializeDatabase()
  .then(() => {
    console.log('Database connection established successfully');

    // Start server
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log(`API Documentation: http://localhost:${port}/api-docs`);
      console.log(`Articles endpoint: http://localhost:${port}/articles`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });
