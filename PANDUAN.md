# Panduan Pemula 🌻

Panduan ini ngajarin kamu nyalain kantor pixel ala Stardew buat Claude Code, terus nontonnya dari HP. Semua perintah di
bawah diketik di aplikasi **Terminal** Mac (tekan ⌘ Spasi, ketik `Terminal`, lalu Enter). Cara pakainya: copy satu
perintah, paste di Terminal (⌘V), terus tekan **Enter**.

## Sekali aja: instalasi

1. Install **Node.js** versi LTS dari <https://nodejs.org>. Cek hasilnya dengan `node -v`. Kalau muncul `v20` atau
   lebih tinggi, aman.
2. Download proyek ini, lalu siapin semuanya:
   ```
   git clone -b main https://github.com/asashades/asaoffice.git ~/asaoffice
   cd ~/asaoffice
   npm install
   npm run setup
   ```
   Kalau di akhir muncul tulisan `Installed layouts/stardew-office.json → …`, berarti setup-nya beres ✅
3. Buat nonton dari HP, install **cloudflared**. Perintah ini butuh Homebrew; cek dulu pakai `brew -v`:
   ```
   brew install cloudflared
   ```

## Tiap hari: 3 tab Terminal

Buka tab baru di Terminal pakai **⌘T**. Semua tab-nya harus tetap kebuka selama kamu pakai.

| Tab | Buat apa | Perintah |
| --- | --- | --- |
| 1 | Nyalain kantor | `cd ~/asaoffice` lalu `npm --prefix ~/asaoffice run office` |
| 2 | Ngobrol sama Claude | `cd ~/asaoffice` lalu `claude` |
| 3 | Nonton dari HP (opsional) | `npm --prefix ~/asaoffice run tunnel`, terus scan QR-nya pakai kamera HP |

Waktu pertama kali buka link kantor di browser, klik **Install Hooks**. Cukup sekali aja seumur hidup.

Buat matiin salah satu tab, klik tab-nya lalu tekan **Control + C**.

## Pakai Claude Desktop (tab Code)

1. Pastiin tab 1 lagi jalan (kantornya nyala).
2. Di browser kantor, buka **Settings**, lalu nyalain **Watch All Sessions**.
3. Buka tab **Code** di Claude Desktop. Pastiin sesinya jalan **lokal di Mac**, bukan mode cloud.
4. Kasih Claude tugas yang bikin dia baca atau edit file. Nanti karakternya muncul di kantor.

Chat biasa di Claude Desktop dan sesi cloud gak bakal muncul di kantor.

## Kalau ada masalah

| Masalah | Solusi |
| --- | --- |
| `npm error enoent … package.json` | Kamu belum ada di folder proyek. Jalanin `cd ~/asaoffice` dulu. |
| Karakter gak muncul | Buka **Settings**, pastiin **Instant Detection (Hooks)** dan **Watch All Sessions** udah ON. Terus di tab Claude ketik `/exit`, jalanin `claude` lagi, dan kasih dia tugas baca file. |
| `Stop hook error: … SuperIsland …` | Ini dari aplikasi lain, bukan dari kantor pixel, dan gak ganggu apa-apa. Cara ngilanginnya: minta Claude hapus hook SuperIsland di `~/.claude/settings.json` (suruh dia backup file-nya dulu). |
| Link di HP gak kebuka lagi | Link-nya ganti tiap kali tunnel dinyalain ulang. Jalanin lagi tab 3, lalu scan QR yang baru. |
| Tampilannya balik ke kantor abu-abu | Abis `npm install`, jalanin `npm run overlay`, terus restart tab 1. |

## Aturan penting 🔒

- Link atau QR dari tab 3 itu **kayak password**. Siapa pun yang pegang link-nya bisa ngubah pengaturan hook Claude
  kamu, jadi jangan dikirim ke siapa pun atau ke grup mana pun.
- Laptop harus nyala dan Terminal-nya tetap kebuka biar kantornya bisa ditonton dari HP.
- Mau ngerapihin kantor (geser meja, nambah furnitur, ganti warna lantai)? Klik **Layout** di browser.
