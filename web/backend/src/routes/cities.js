import { Router } from 'express';

const router = Router();

const cities = [
  {
    id: 'santiago',
    name: 'Santiago',
    country: 'Chile',
    image: '/assets/cities/santiago.jpg',
    popular: true,
    description: 'Centro urbano y corporativo con excelente conectividad.'
  },
  {
    id: 'iquique',
    name: 'Iquique',
    country: 'Chile',
    image: '/assets/cities/iquique.jpg',
    popular: true,
    description: 'Costa, comercio y estadias para viajes de trabajo o descanso.'
  },
  {
    id: 'antofagasta',
    name: 'Antofagasta',
    country: 'Chile',
    image: '/assets/cities/antofagasta.jpg',
    popular: true,
    description: 'Base urbana para mineria, negocios y costa norte.'
  },
  {
    id: 'bogota',
    name: 'Bogota',
    country: 'Colombia',
    image: '/assets/cities/bogota.jpg',
    popular: true,
    description: 'Hub cultural y corporativo de Colombia.'
  }
];

router.get('/cities', (req, res) => {
  const trending = String(req.query.trending || '').toLowerCase() === 'true';
  const result = trending ? cities.filter((city) => city.popular) : cities;
  return res.json({ ok: true, count: result.length, cities: result });
});

export default router;
