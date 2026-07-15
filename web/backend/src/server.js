import express from 'express';
import cors from 'cors';

import { config } from './config.js';
import healthRoutes from './routes/health.js';
import cityRoutes from './routes/cities.js';
import propertyRoutes from './routes/properties.js';
import { errorHandler } from './middleware/error.js';

const app = express();

app.use(
  cors({
    origin: config.frontendOrigin === '*' ? true : config.frontendOrigin
  })
);
app.use(express.json({ limit: '1mb' }));

app.use('/api', healthRoutes);
app.use('/api', cityRoutes);
app.use('/api', propertyRoutes);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Backend escuchando en http://localhost:${config.port}`);
});
