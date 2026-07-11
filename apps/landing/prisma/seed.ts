import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const kecamatanMedan = [
  { city: "Medan", district: "Medan Amplas", latitude: 3.5556, longitude: 98.7167, regionLevel: "kecamatan" },
  { city: "Medan", district: "Medan Area", latitude: 3.5833, longitude: 98.6833, regionLevel: "kecamatan" },
  { city: "Medan", district: "Medan Barat", latitude: 3.5958, longitude: 98.6722, regionLevel: "kecamatan" },
  { city: "Medan", district: "Medan Baru", latitude: 3.5833, longitude: 98.6583, regionLevel: "kecamatan" },
  { city: "Medan", district: "Medan Belawan", latitude: 3.7667, longitude: 98.6833, regionLevel: "kecamatan" },
  { city: "Medan", district: "Medan Deli", latitude: 3.6833, longitude: 98.6667, regionLevel: "kecamatan" },
  { city: "Medan", district: "Medan Denai", latitude: 3.5833, longitude: 98.7167, regionLevel: "kecamatan" },
  { city: "Medan", district: "Medan Helvetia", latitude: 3.6167, longitude: 98.6500, regionLevel: "kecamatan" },
  { city: "Medan", district: "Medan Johor", latitude: 3.5500, longitude: 98.6500, regionLevel: "kecamatan" },
  { city: "Medan", district: "Medan Kota", latitude: 3.5958, longitude: 98.6750, regionLevel: "kecamatan" },
  { city: "Medan", district: "Medan Labuhan", latitude: 3.7167, longitude: 98.6667, regionLevel: "kecamatan" },
  { city: "Medan", district: "Medan Maimun", latitude: 3.5833, longitude: 98.6833, regionLevel: "kecamatan" },
  { city: "Medan", district: "Medan Marelan", latitude: 3.7167, longitude: 98.6500, regionLevel: "kecamatan" },
  { city: "Medan", district: "Medan Perjuangan", latitude: 3.6000, longitude: 98.7000, regionLevel: "kecamatan" },
  { city: "Medan", district: "Medan Petisah", latitude: 3.5917, longitude: 98.6667, regionLevel: "kecamatan" },
  { city: "Medan", district: "Medan Polonia", latitude: 3.5667, longitude: 98.6500, regionLevel: "kecamatan" },
  { city: "Medan", district: "Medan Selayang", latitude: 3.5667, longitude: 98.6333, regionLevel: "kecamatan" },
  { city: "Medan", district: "Medan Sunggal", latitude: 3.6167, longitude: 98.6167, regionLevel: "kecamatan" },
  { city: "Medan", district: "Medan Tembung", latitude: 3.6167, longitude: 98.7167, regionLevel: "kecamatan" },
  { city: "Medan", district: "Medan Tuntungan", latitude: 3.5333, longitude: 98.6167, regionLevel: "kecamatan" },
  { city: "Medan", district: "Medan Timur", latitude: 3.6000, longitude: 98.6833, regionLevel: "kecamatan" },
];

async function main() {
  for (const loc of kecamatanMedan) {
    await prisma.dimLocation.upsert({
      where: { city_district: { city: loc.city, district: loc.district } },
      update: { latitude: loc.latitude, longitude: loc.longitude, regionLevel: loc.regionLevel },
      create: loc,
    });
  }

  const count = await prisma.dimLocation.count();
  console.log(`dim_location seeded: ${count} rows`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
