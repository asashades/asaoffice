# Roadmap Asa Office

Catatan arah pengembangan dan progresnya. Satu PR per fitur, squash merge setelah disetujui. Perbarui file ini di PR yang menyelesaikan atau menggeser sebuah butir.

Status: ✅ selesai · 🚧 dikerjakan · ⬜ belum · 💤 ditunda

## Tujuan

Bikin pengalaman coding dengan Claude Code di Mac terasa hidup lewat kantor: terlihat apa yang dikerjakan, bisa dijawab dari satu tempat, dan aman. Coding berat tetap enak di Claude Code Mac; kantor jadi tempat memantau, memberi izin, dan menyuruh tugas yang jelas batasnya.

## Selesai

| | Fitur | PR |
|---|---|---|
| ✅ | Lampu malam per ruangan (nyala kalau ada orang, bocor lewat pintu, lampu meja) | #36, #37 |
| ✅ | Surat Downloads lewat jeda batalkan dan kurir Shades | #38 |
| ✅ | Daftar folder Chat baru diambil ulang tiap ditampilkan | #39 |
| ✅ | Sesi memakai folder awal, bukan folder terakhir | #40 |
| ✅ | Log izin: Salin, Abaikan, Abaikan semua, tab Izin di HUD | #41 |
| ✅ | "Izinkan persis…" (konfirmasi perintah lengkap, satu aturan per potongan) | #42 |
| ✅ | Pembaca `.xlsx` bawaan (baca-saja) | #43 |
| ✅ | Kotak surat membaca Markdown | #44 |
| ✅ | Pesan masuk dari Claude Code: popup lalu pesawat kertas ke kotak surat | #45 |
| ✅ | Rapat untuk tugas panjang (≥45 detik), staf bekerja selama sesi jalan | #46 |
| ✅ | Perintah baca-saja (`ls`, `cat`, `head`, `wc`, `file`, `unzip -l`…) selalu boleh | #47 |
| ✅ | Lampu malam: pintu dan dinding ikut kena cahaya | #48 |
| ✅ | Tab Izin di HUD tidak lagi terpotong | #49 |
| ✅ | Mode izin seperti Claude Code (tanya dulu, terima edit, auto, bypass, ketat) dengan kartu Izinkan/Tolak | #50 |
| ✅ | Notifikasi macOS dari server (izin, rencana siap, selesai, gagal) dan ROADMAP.md | #51 |
| ✅ | Tugas kotak surat di git worktree sendiri (Cabang terpisah: lihat perubahan, gabung, PR, buang) | #52 |
| ✅ | Batas biaya per tugas dan per hari (💰), berhenti otomatis dan notifikasi 80% | #53 |
| ✅ | Rapat sungguhan (🗣 Rapat dulu): Shades memanggil staf, dua putaran tanya jawab antar agent, rencana final; ditampilkan di surat dan di meja rapat | #54 |

## Rencana (urutan prioritas)

Butir 1 (notifikasi macOS) sudah selesai (#51); nomor lainnya dibiarkan agar rujukannya tetap sama. Butir 2 (cabang terpisah, #52) dan 3 (batas biaya, #53) juga selesai. Rapat sungguhan (#54) juga selesai. Berikutnya: butir 4, atau butir 11 (jiwa agent).

| | # | Butir | Catatan |
|---|---|---|---|
| ⬜ | 11 | **"Jiwa" per agent**: berkas kepribadian dan gaya bicara, plus memori kecil yang bertambah setelah tiap tugas (bisa dibaca dan diedit) | Lapis 1 dari ide agent dengan jiwa. Rapat sungguhan (lapis 2) sudah jadi, jadi mereka tinggal diberi karakter dan ingatan. |
| 🚧 | 12 | **Malam gaya Stardew** (`&nightStyle=stardew`, default; `classic` untuk yang lama): gelap lewat multiply (warna tetap pekat), ruangan menyala hangat, kosong ungu tua, cahaya dari benda | Menunggu penilaian tampilan; angka ada di `addon/daynight.js` (`MULS`, `AMBIENT`). |
| ⬜ | 4 | **Pembaca PDF dan Word bawaan** (baca-saja) | Seperti pembaca Excel; bahan kuliah di Downloads banyak PDF dan docx. |
| ⬜ | 5 | **Templat tugas** (satu tombol) dan jadwal dengan model pilihan | |
| ⬜ | 6 | **Cari lintas semua sesi dan surat** | Termasuk transkrip Claude Code, bukan hanya judul surat. |
| ⬜ | 7 | **Villager ikut sibuk** saat tugas "Claude (umum)"; **deteksi Claude Cowork** | Cowork: cek apakah menyimpan `.jsonl` di `~/Library/Application Support/Claude/…`. |
| ⬜ | 8 | **Kas dan rapat lebih bermakna** | Mis. kas naik hanya untuk tugas yang selesai tanpa error. |
| ⬜ | 9 | **Tes otomatis** | Belum ada tes. Prioritas: filter izin, `exactRules`, protokol izin (`control_request`), pembaca xlsx. |
| 💤 | 10 | **App Mac native (PR #18, Swift)** | Belum pernah dikompilasi; tes dengan `npm run app`. Notifikasi bawaan app (dengan tombol langsung) paling pas dikerjakan di sini. |

Opsional: jam hunian villager yang bisa diatur; jawab izin dari HP (perlu PIN kedua, karena sekarang sengaja hanya dari Mac ini); cadangan otomatis `~/.pixel-agents/` (kas, toko, surat, nama).

## Catatan

**1. Notifikasi macOS (selesai, #51).** Server memakai `terminal-notifier` kalau terpasang (klik membuka kantor), kalau tidak `osascript display notification` (klik membuka Script Editor, itu batasan macOS; pasang `brew install terminal-notifier` biar klik membuka kantor). Halaman kantor mengirim denyut tiap 5 detik; kalau jendelanya sedang di depan, notifikasi macOS ditahan (toast dan bunyi di halaman cukup). Notifikasi halaman (Web Notification) untuk villager milik surat dimatikan supaya tidak dobel; untuk sesi Claude Code biasa tetap jalan.

## Batasan yang diketahui
- Render hook ganda (diperbaiki): `npm run overlay` versi lama menyimpan cadangan bundle yang sudah berisi hook lama, jadi setelah upgrade hook terpasang dua kali, seluruh kantor digambar dua kali per frame dan tint malam diterapkan dua kali (terlihat seperti kabut). Overlay sekarang selalu membuang semua hook lama sebelum memasang satu, dan `core.js` menolak panggilan kedua di frame yang sama.

- Perintah yang menyentuh path di luar folder tugas, atau folder sistem seperti `/etc`, bisa tetap ditolak Claude Code sendiri.
- Surat 📥 Downloads sengaja baca-saja, tanpa tombol izin.
- Kalau Shades tidak mengambil surat di Mac: cek `matchMedia('(prefers-reduced-motion: reduce)').matches`. Kalau `true`, kurirnya mati otomatis.
- Dua proses `office.mjs` sekaligus (port 3100/3101) bikin "tugas tidak bisa mulai". Matikan yang lama dulu.
- Memverifikasi aturan izin dengan Claude Code asli memakai kuota API.
