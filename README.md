# Albion Item Catalog

> Master data item dan resep Albion Online untuk kebutuhan **Albion Market Lab**. Status: **importer CSV, klasifikasi terminal eksplisit, dan coverage report tersedia**.

## Import snapshot CSV

Siapkan direktori dengan `items.csv`, `craft-recipes.csv`, dan `refining-recipes.csv` sesuai kontrak tab di bawah, lalu jalankan:

```sh
pnpm install
pnpm run import -- ./snapshot ./output snapshot-2026-10-28
```

Importer menghasilkan `output/catalog.json`, `output/manifest.json`, dan `output/coverage.json`. Argumen ketiga adalah identitas versi/sumber snapshot. Hanya raw resource standar yang terverifikasi berstatus `terminal` dan `purchasable: true`; item `unknown`/`unsupported` tidak dianggap bahan buy order. Detail aturan, sumber, dan known gaps ada di [catalog coverage](docs/catalog-coverage.md).

Validasi pengembangan:

```sh
pnpm test
pnpm typecheck
pnpm build
```

Repositori ini menyimpan **data game yang relatif statis** (katalog item, crafting recipe, refining recipe), **bukan harga pasar**. Harga market yang berubah setiap scan disimpan oleh [market receiver](https://github.com/albion-market-lab/albion-market-receiver) di Google Sheets.

## Tujuan
- Mendukung katalog equipment yang dapat dibuat, termasuk berbagai tier, enchantment, jenis armor/weapon, dan material khusus bila ada.
- Menyediakan hubungan resep yang bisa ditelusuri mundur: output craft → refined material → bahan dasar.
- Memakai **item ID asli dan stabil**, bukan nama tampilan sebagai primary key.
- Memisahkan data sumber game dari format terstandardisasi yang dipakai calculator.

## Rencana sumber data
- Kandidat data dump komunitas: [ao-data/ao-bin-dumps](https://github.com/ao-data/ao-bin-dumps).
- **Verifikasi struktur dan kelengkapan resep dari versi data yang diunduh** sebelum menentukan parser. Jangan mengasumsikan semua field sudah tersedia atau semua item memiliki resep.
- Simpan informasi versi/build game serta waktu impor agar perubahan resep dapat dilacak.

## Kontrak data yang ditargetkan

Contoh bentuk logis (ilustrasi, **bukan** resep Albion yang sudah diverifikasi):

```ts
type CatalogItem = {
  itemId: string;              // ID game kanonis, termasuk enchantment bila relevan
  displayName: string;
  tier?: number;
  category?: string;
  purchasable: boolean;        // true hanya untuk terminal terverifikasi
  terminalStatus: "terminal" | "requires_recipe" | "unknown" | "unsupported";
};

type Recipe = {
  outputItemId: string;
  outputQuantity: number;       // hasil per satu craft/refine
  ingredients: Array<{
    itemId: string;
    quantity: number;
  }>;
  recipeType: "crafting" | "refining";
  sourceUrl: string;
};
```

Kontrak saat ini adalah `schemaVersion: "2"`; consumer harus memeriksa versi manifest sebelum memuat katalog.

Aturan:
- Kebutuhan artifact, Wood, Stone, material khusus, serta tier sebelumnya **harus dipertahankan**, tidak boleh disamakan dengan Ore/Hide/Fiber.
- Item yang tidak punya resep hanya ditandai terminal/purchasable bila cocok dengan aturan raw resource terverifikasi; sisanya `unknown` atau `unsupported`.
- Resep atau hasil impor yang belum lengkap ditandai secara eksplisit agar calculator bisa menampilkan **data resep belum tersedia**.

## Scope awal
1. Import dan normalisasi ID serta nama item.
2. Ekstraksi resep crafting dan refining yang terverifikasi.
3. Validasi referensi bahan, kuantitas, dan resep bertingkat.
4. Ekspor JSON ber-versi untuk dikonsumsi [calculator](https://github.com/albion-market-lab/albion-crafting-calculator) dan [web](https://github.com/albion-market-lab/albion-crafting-web).

Cakupan katalog **tidak dibatasi** tiga jenis resource. Implementasi boleh memprioritaskan equipment non-artifact T4–T8 pada tahap awal tanpa membuat desain datanya tertutup untuk item lain.

## Selesai jika
- Satu item craftable dapat ditemukan berdasarkan ID dan dikembalikan bersama resepnya.
- Resep refining dapat dirunut hingga material terminal tanpa mengarang kebutuhan bahan.
- Referensi item/resep yang tidak valid terdeteksi otomatis.
- Dataset hasil impor memiliki versi yang jelas.

## Dataset seed yang sudah tersedia (28 Oktober 2026)

Google Sheets milik proyek telah diisi dengan **11.223 ID item** pada tab `Items`, **6.847 resep equipment** (15.325 ingredient rows) pada `Craft Recipes`, dan **115 resep refining standar** (225 ingredient rows) pada `Refining Recipes`. Tab `Market Prices` **sengaja kosong** sampai collector pribadi berjalan. Importer tersedia; full export tetap memerlukan CSV privat dari snapshot tersebut.

Sumber seed dan status kualitas:
- Upstream data game: [ao-data/ao-bin-dumps](https://github.com/ao-data/ao-bin-dumps).
- Nama item: [vkorne-web/albion-market — items_raw.txt](https://github.com/vkorne-web/albion-market/blob/main/items_raw.txt), turunan dump game.
- Resep equipment: [vkorne-web/albion-market — recipes.json](https://github.com/vkorne-web/albion-market/blob/main/recipes.json), ekstraksi sekunder dari dump. **Belum mencakup semua kategori crafting** dan perlu revalidasi ketika patch game.
- Rasio refining standar: [panduan resmi Albion](https://albiononline.com/news/guide-refining). Enchanted Rock → Stone Block dengan hasil alternatif, resep faction token dan beberapa resep khusus **belum diimpor**.
- **45 item** hanya memiliki ID karena tidak ada label nama pada snapshot; nilai `name_status=name_missing` berarti jangan tampilkan nama hasil tebakan.

### Kontrak tab saat ini
- `Items`: `item_id, display_name_en, tier, enchantment, category, has_crafting_recipe, has_refining_recipe, name_status, source_url`.
- `Craft Recipes`: satu baris **per bahan**; `recipe_id, output_item_id, output_quantity, ingredient_item_id, ingredient_quantity, return_eligible, craft_bonus_city, validation_status, source_url`.
- `Refining Recipes`: satu baris **per bahan**; `recipe_id, output_item_id, output_quantity, ingredient_item_id, ingredient_quantity, validation_status, notes, source_url`.
- `Market Prices`: tabel harga **yang dikelola receiver**, bukan milik catalog. Skema ada di README [market receiver](https://github.com/albion-market-lab/albion-market-receiver).

Akses/ID spreadsheet tidak dicantumkan di repositori publik. Untuk tahap berikutnya, buat importer yang bisa regenerasi master JSON ber-versi dari sumber game, audit perubahan, dan menandai resep yang tidak didukung.

**Sumber harga tetap private-only:** tidak mengambil harga dari API komunitas dan tidak mengunggah hasil scan pribadi ke komunitas. Sheet harga masih kosong hingga receiver diimplementasikan.

## Ekosistem repositori

| Repositori | Tanggung jawab |
| --- | --- |
| [albion-item-catalog](https://github.com/albion-market-lab/albion-item-catalog) | Master data item dan resep crafting/refining |
| [albion-market-receiver](https://github.com/albion-market-lab/albion-market-receiver) | Menerima scan market pribadi dan menyimpan harga ke Google Sheets |
| [albion-crafting-calculator](https://github.com/albion-market-lab/albion-crafting-calculator) | Menghitung kebutuhan bahan, estimasi modal, dan rekomendasi kota BO |
| [albion-crafting-web](https://github.com/albion-market-lab/albion-crafting-web) | Antarmuka untuk merencanakan banyak target crafting |

**Alur:** Albion Online → collector lokal → receiver → Google Sheets → web UI + calculator. Katalog resep berasal dari data game, **bukan** dari Google Sheets.

## Di luar scope
Collector network, Google Sheets, harga market, UI, dan perhitungan rekomendasi buy order.
