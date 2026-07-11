-- Seed dim_location with 21 kecamatan Kota Medan
-- Koordinat: approximasi centroid tiap kecamatan

INSERT INTO dim_location (city, district, latitude, longitude, region_level)
VALUES
    ('Medan', 'Medan Amplas',       3.5556, 98.7167, 'kecamatan'),
    ('Medan', 'Medan Area',         3.5833, 98.6833, 'kecamatan'),
    ('Medan', 'Medan Barat',        3.5958, 98.6722, 'kecamatan'),
    ('Medan', 'Medan Baru',         3.5833, 98.6583, 'kecamatan'),
    ('Medan', 'Medan Belawan',      3.7667, 98.6833, 'kecamatan'),
    ('Medan', 'Medan Deli',         3.6833, 98.6667, 'kecamatan'),
    ('Medan', 'Medan Denai',        3.5833, 98.7167, 'kecamatan'),
    ('Medan', 'Medan Helvetia',     3.6167, 98.6500, 'kecamatan'),
    ('Medan', 'Medan Johor',        3.5500, 98.6500, 'kecamatan'),
    ('Medan', 'Medan Kota',         3.5958, 98.6750, 'kecamatan'),
    ('Medan', 'Medan Labuhan',      3.7167, 98.6667, 'kecamatan'),
    ('Medan', 'Medan Maimun',       3.5833, 98.6833, 'kecamatan'),
    ('Medan', 'Medan Marelan',      3.7167, 98.6500, 'kecamatan'),
    ('Medan', 'Medan Perjuangan',   3.6000, 98.7000, 'kecamatan'),
    ('Medan', 'Medan Petisah',      3.5917, 98.6667, 'kecamatan'),
    ('Medan', 'Medan Polonia',      3.5667, 98.6500, 'kecamatan'),
    ('Medan', 'Medan Selayang',     3.5667, 98.6333, 'kecamatan'),
    ('Medan', 'Medan Sunggal',      3.6167, 98.6167, 'kecamatan'),
    ('Medan', 'Medan Tembung',      3.6167, 98.7167, 'kecamatan'),
    ('Medan', 'Medan Tuntungan',    3.5333, 98.6167, 'kecamatan'),
    ('Medan', 'Medan Timur',        3.6000, 98.6833, 'kecamatan')
ON CONFLICT DO NOTHING;
