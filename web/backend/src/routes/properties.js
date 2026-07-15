import { Router } from 'express';

const router = Router();

const properties = [
  {
    id: 'agustinas-plaza',
    title: 'Apart Hotel Agustinas Plaza',
    city: 'Santiago',
    country: 'Chile',
    location: 'Santiago Centro',
    price: 70,
    type: 'Departamento equipado',
    image: '/fotos agustinas plaza/fotos generales/WhatsApp Image 2026-02-05 at 17.40.29.jpeg',
    amenities: ['WiFi gratis', 'Cocina equipada', 'Check-in flexible']
  }
];

router.get('/properties', (_req, res) => {
  return res.json({ ok: true, count: properties.length, properties });
});

export default router;
