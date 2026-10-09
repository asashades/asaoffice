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
| ✅ | Malam gaya Stardew: peta cahaya yang dikalikan (lantai merah anggur, ruangan kosong ungu, cahaya dari benda), villager di depan gelap, dan perbaikan render hook ganda (penyebab "kabut") | #55 |
| ✅ | Ikon pixel art berwarna penuh (67 ikon menggantikan emoji di tombol, label, kartu, HUD) dan filter folder sementara di daftar proyek | #56 |
| ✅ | "Jiwa" dan ingatan per agent (kepribadian yang bisa diubah, satu pelajaran di akhir tugas, panel 🧠), disimpan sebagai catatan `Staf/<nama>.md` di vault Obsidian | #57 |
| ✅ | Kotak surat lebih rapi (daftar chat bisa dilipat, menu Alat, filter jadi satu menu) dan halaman Data Karyawan sendiri (👥 di HUD) untuk profil, jiwa, dan ingatan staf | #58 |
| ✅ | Rangkuman harian ditulis ke catatan Jurnal Obsidian (`1-Fleeting Journal/2026-10-5, Mon.md`, plugin obsidian-journal), menggantikan laporan di folder Laporan | #59 |
| ✅ | Ganti orang, cara kerja, dan model di tengah chat (🔁), kartu "sedang bekerja" satu baris, kotak surat lebih tinggi | #60 |
| ✅ | Dekorasi musiman (pengeluaran harian yang tak habis) dan Shades tetap aktif selama rapat | #60 |
| ✅ | Kartu karyawan di bawah layar lebih ringkas (dua baris), dan toast selesai membuka obrolan tugas atau sesinya, bukan karyawannya | (PR berikutnya) |
| ✅ | Batas dan pemakaian dihitung dalam token, bukan dolar (cocok untuk langganan) | (PR berikutnya) |
| ✅ | Laporan harian yang manusiawi: draf dari kantor, kamu ubah kalimatnya dan tulis highlight (callout Obsidian), baru masuk Jurnal; pengingat sore sekali sehari | (PR berikutnya) |
| ✅ | Pesan jelas kalau login Claude Code kedaluwarsa (kartu dengan perintah `claude auth login`); highlight laporan: baris kosong = callout baru; baris "Diperbarui" dihapus | (PR berikutnya) |
| ✅ | Pilihan browser untuk app Asa Office (`npm run browser -- Safari`), tidak harus Chrome | (PR berikutnya) |
| ✅ | Catatan staf di vault dikenali lewat `agent:` (bukan nama file) dan ikut berganti nama saat karyawan di-rename; tidak lagi membuat catatan nama lama | (PR berikutnya) |
| ✅ | Pembaca PDF dan Word bawaan (`tools/doc-read.mjs`): teks per halaman, hemat token, baca-saja, juga di Downloads | (PR berikutnya) |
| ✅ | HUD dirombak: kolom kiri (hero dengan jam, menunggu kamu, meter token, to-do; notifikasi meluncur dari kiri), satu kartu kanan (statistik + tab), kartu orang kecil dengan popup hover; panel dock di sebelah kolom kiri | (PR berikutnya) |

## Rencana (urutan prioritas)

Butir 1 (notifikasi macOS) sudah selesai (#51); nomor lainnya dibiarkan agar rujukannya tetap sama. Butir 2 (cabang terpisah, #52) dan 3 (batas biaya, #53) juga selesai. Rapat sungguhan (#54) juga selesai. Jiwa agent (butir 11, #57) juga selesai. Pembaca PDF dan Word (butir 4) juga selesai. Berikutnya: butir 5 (templat tugas).

| | # | Butir | Catatan |
|---|---|---|---|
| ✅ | 4 | **Pembaca PDF dan Word bawaan** (baca-saja) | Selesai: `tools/doc-read.mjs` (PDFKit untuk PDF, `textutil` untuk Word). PDF scan belum dibaca (butuh OCR). |
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
