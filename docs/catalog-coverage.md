# Catalog coverage

Snapshot seed 28 October 2026 berasal dari `ao-data/ao-bin-dumps`, ekstraksi resep equipment `vkorne-web/albion-market`, dan panduan refining resmi Albion. `manifest.json` menyimpan versi schema, waktu impor, identitas snapshot, dan jumlah record. Kontrak metadata lengkap (`enchantment`, metadata resep, dan `returnEligible` per ingredient) menggunakan `schemaVersion: "3"`.

## Status material

- `terminal`: ID raw standar `T2`–`T8`, raw enchanted non-Rock yang terverifikasi, serta artifact equipment-component ber-tier dengan keluarga ID `MAIN/2H/OFF/HEAD/ARMOR/SHOES`. Hanya status ini dipetakan ke `purchasable: true`.
- `requires_recipe`: item ditandai memiliki crafting atau refining recipe oleh snapshot.
- `unsupported`: token/special serta enchanted Rock alternatif yang memerlukan mekanisme belum tercakup.
- `unknown`: tidak cocok dengan aturan terverifikasi, termasuk artifact dengan keluarga ID yang belum diaudit; tetap `purchasable: false`.

## Laporan coverage

Command import menghasilkan `coverage.json` berisi total item, jumlah crafting/refining recipe, flag recipe yang belum memiliki row, label hilang, terminal terverifikasi, unknown, unsupported, dan dangling reference:

```sh
pnpm run import -- ./snapshot ./output snapshot-2026-10-28
```

Importer menolak referensi ID yang tidak ada. Flag resep tanpa recipe row tidak dianggap terminal dan dilaporkan melalui `missingCraftingRecipes`/`missingRefiningRecipes`. Hasil nol pada fixture kecil bukan bukti bahwa snapshot penuh sudah lengkap.

## Fixture dan known gaps

Fixture mencakup rantai penuh `T6_ARMOR_CLOTH_SET1` dan `T5_SHOES_PLATE_SET1` sampai raw Fiber/Ore. Resep equipment ditautkan ke commit upstream; refining memakai rasio seed bersumber panduan resmi. `test/fixtures/expected-plan.json` menyimpan golden result independen untuk Scholar Robe T6 ×100 dan Soldier Boots T5 ×20 agar Calculator Issue #2 dapat menguji hasil end-to-end.

Belum didukung: enchanted Stone/Rock dengan hasil alternatif, faction token, artifact dengan keluarga ID di luar whitelist terverifikasi, special recipe yang tidak tersedia, dan kategori di luar seed. Tidak ada resep atau status terminal yang ditebak. Regenerasi dilakukan dengan mengekspor tiga tab sumber sebagai CSV lalu menjalankan command import dengan identitas snapshot baru.
