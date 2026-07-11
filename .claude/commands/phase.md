---
description: Kerjakan satu fase project sesuai PRD.md dan CLAUDE.md
argument-hint: [nomor-fase]
---

Baca file `PRD.md` dan `CLAUDE.md` di root project ini sebelum melakukan apa pun.

Kerjakan **Phase $ARGUMENTS** sesuai definisi di `PRD.md`:

1. Cari section "Phase $ARGUMENTS" di `PRD.md`, ambil semua item di checklist Tasks-nya.
2. Di `CLAUDE.md`, ubah status Phase $ARGUMENTS di tabel "Phase Tracking" menjadi `In Progress`.
3. Implementasikan task-task tersebut, mengikuti prinsip arsitektur, konvensi kode, dan Do's/Don'ts yang ada di `CLAUDE.md`. Jangan mengerjakan task dari fase lain.
4. Tulis dan jalankan test yang relevan untuk memverifikasi setiap _Acceptance Criteria_ fase ini benar-benar terpenuhi — jangan asumsikan, jalankan pengecekannya.
5. Jika ada keputusan desain yang tidak dijelaskan PRD, ambil keputusan paling sederhana yang konsisten dengan Clean Architecture, dan catat asumsinya secara singkat.
6. Setelah semua Acceptance Criteria lolos: update status Phase $ARGUMENTS di `CLAUDE.md` menjadi `Done`.
7. Buat commit git dengan pesan format `feat(phaseX): <ringkasan perubahan>` (ganti X dengan nomor fase).
8. Tutup dengan ringkasan singkat: apa yang selesai, apa yang masih perlu direview manusia, dan apakah ada blocker untuk fase berikutnya.
