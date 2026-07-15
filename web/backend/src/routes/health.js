import { Router } from 'express';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'estadias-urbanas-backend',
    at: new Date().toISOString()
  });
});

export default router;
