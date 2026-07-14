import { Property } from "@/types";

const site = "https://www.estadiasurbanas.com";
const photo = (path: string) => `${site}/${encodeURI(path)}`;

const agustinasGeneral = [
  "fotos agustinas plaza/fotos generales/WhatsApp Image 2026-02-05 at 17.40.29.jpeg",
  "fotos agustinas plaza/fotos generales/WhatsApp Image 2026-02-05 at 17.40.31.jpeg",
  "fotos agustinas plaza/fotos generales/WhatsApp Image 2026-02-05 at 17.40.32.jpeg",
].map(photo);

export const fallbackProperties: Property[] = [
  {
    id: "agustinas-plaza",
    title: "Apart Hotel Agustinas Plaza",
    city: "Santiago",
    country: "Chile",
    location: "Santiago Centro",
    description:
      "Departamentos equipados para 1 a 4 personas, con cocina americana, sala, baño privado y opciones de cama doble o camas single.",
    type: "Departamento equipado",
    priceUsd: 70,
    maxGuests: 4,
    rating: 4.8,
    reviewCount: 436,
    featured: true,
    image: agustinasGeneral[0] ?? "",
    gallery: agustinasGeneral,
    amenities: ["WiFi gratis", "Cocina equipada", "Check-in flexible", "Ubicación central"],
    options: [
      {
        id: "doble",
        title: "Departamento 1 o 2 personas - cama doble",
        occupancy: "1 a 2 personas",
        beds: "1 cama doble",
        rooms: "1 habitación",
        baths: "1 baño",
        priceUsd: 70,
        highlights: ["Cocina americana", "Sala", "Baño privado"],
      },
      {
        id: "twin",
        title: "Departamento 2 personas - dos camas single",
        occupancy: "2 personas",
        beds: "2 camas single",
        rooms: "1 habitación",
        baths: "1 baño",
        priceUsd: 72,
        highlights: ["Cocina americana", "Ideal trabajo", "Baño privado"],
      },
      {
        id: "triple-mixto",
        title: "Departamento 3 personas - cama doble y single",
        occupancy: "3 personas",
        beds: "1 cama doble + 1 single",
        rooms: "2 habitaciones",
        baths: "1 baño",
        priceUsd: 92,
        highlights: ["2 habitaciones", "Cocina americana", "Sala"],
      },
      {
        id: "triple-single",
        title: "Departamento 3 personas - tres camas single",
        occupancy: "3 personas",
        beds: "3 camas single",
        rooms: "2 habitaciones",
        baths: "1 baño",
        priceUsd: 92,
        highlights: ["2 habitaciones", "Flexible para equipos", "Baño privado"],
      },
      {
        id: "cuadruple-mixto",
        title: "Departamento 4 personas - cama doble y dos single",
        occupancy: "4 personas",
        beds: "1 cama doble + 2 single",
        rooms: "2 habitaciones",
        baths: "1 baño",
        priceUsd: 110,
        highlights: ["2 habitaciones", "Familias", "Cocina americana"],
      },
      {
        id: "cuadruple-single",
        title: "Departamento 4 personas - cuatro camas single",
        occupancy: "4 personas",
        beds: "4 camas single",
        rooms: "2 habitaciones",
        baths: "2 baños",
        priceUsd: 118,
        highlights: ["2 baños", "Equipos de trabajo", "Mayor comodidad"],
      },
    ],
  },
  {
    id: "balcones-guatavita",
    title: "Balcones de Guatavita",
    city: "Guatavita",
    country: "Colombia",
    location: "Cundinamarca",
    description: "A pasos de todo, totalmente equipado, ideal para descanso o trabajo.",
    type: "Hospedaje",
    priceUsd: 70,
    maxGuests: 2,
    rating: 4.8,
    reviewCount: 47,
    featured: false,
    image: photo("assets/cities/guatavita1.jpg"),
    gallery: [photo("assets/cities/guatavita1.jpg")],
    amenities: ["WiFi gratis", "Vista natural", "Soporte por WhatsApp"],
    options: [],
  },
];

export function propertyById(id: string): Property | undefined {
  return fallbackProperties.find((property) => property.id === id);
}
