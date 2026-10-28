# Catalog coverage

Snapshot seed 28 October 2026 berasal dari `ao-data/ao-bin-dumps`, ekstraksi resep equipment `vkorne-web/albion-market`, dan panduan refining resmi Albion. `manifest.json` menyimpan versi schema, waktu impor, identitas snapshot, dan jumlah record; perubahan kontrak terminal pada issue #2 menaikkan `schemaVersion` menjadi `2`.

## Status material

- `terminal`: ID raw standar `T2`–`T8` untuk Ore, Hide, Fiber, Wood, dan Rock tanpa enchantment. Hanya status ini dipetakan ke `purchasable: true`.
- `requires_recipe`: item ditandai memiliki crafting atau refining recipe oleh snapshot.
- `unsupported`: artifact/token/special serta enchanted Rock alternatif yang belum tercakup.
- `unknown`: tidak cocok dengan aturan terverifikasi; tetap `purchasable: false`.

## Laporan coverage

Command import menghasilkan `coverage.json` berisi total item, item craftable, resep resolved, label hilang, terminal unknown, kategori unsupported, dan dangling reference:

```sh
pnpm run import -- ./snapshot ./output snapshot-2026-10-28
```

Importer menolak referensi ID yang tidak ada. Flag resep tanpa recipe row tidak dianggap terminal dan tetap terlihat melalui selisih `craftableItems` terhadap recipe coverage.

## Fixture dan known gaps

Fixture mencakup rantai penuh `T6_ARMOR_CLOTH_SET1` dan `T5_SHOES_PLATE_SET1` sampai raw Fiber/Ore. Resep equipment ditautkan ke commit upstream; refining memakai rasio seed bersumber panduan resmi.

Belum didukung: enchanted Stone/Rock dengan hasil alternatif, faction token, artifact/special recipe yang tidak tersedia, dan kategori di luar seed. Tidak ada resep yang ditebak. Regenerasi dilakukan dengan mengekspor tiga tab sumber sebagai CSV lalu menjalankan command import dengan identitas snapshot baru.
