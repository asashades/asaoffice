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

## Paling gampang: app Asa Office 🏡

Sekali aja, bikin app-nya:
```
cd ~/asaoffice
npm run app
```
Terus buka **Asa Office** lewat Spotlight (⌘ Spasi, ketik `Asa Office`). Biar gampang, klik kanan ikonnya di Dock →
**Options → Keep in Dock**.

- **Klik ikonnya** → kantor nyala sendiri di background, terus kebuka di jendela sendiri. Gak perlu Terminal,
  gak perlu copy link.
- Jendelanya ketutup? Klik lagi ikon Asa Office di Dock.
- **Mau matiin kantor?** Klik kanan ikon Asa Office di Dock → **Quit** (atau ⌘Q).
- Pertama kali, Mac bakal nanya **"Asa Office ingin mengakses kalender"**. Klik **Izinkan**.
- Pindahin folder `asaoffice` atau update Node.js? Jalanin `npm run app` lagi.

Tab 2 (ngobrol sama Claude) tetap pakai Terminal atau Claude Desktop seperti biasa.

## Cara manual: 3 tab Terminal

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

## Villager ngobrol pas lagi santai 💬

Kalau ada dua sesi Claude yang lagi nganggur (gak ada tugas) minimal 10 detik, villager-nya bisa jalan saling
nyamperin terus ngobrol pakai balon teks. Obrolannya nyambung sama kerjaan mereka, misalnya tool yang barusan dipakai,
nama proyeknya, atau context yang udah hampir penuh. Begitu salah satunya dapet tugas, dia pamit dan balik ke meja.

- Udah nyala otomatis setelah `npm run overlay` (termasuk di `npm run setup`). Abis `git pull`, jalanin
  `npm run overlay` lagi, terus refresh browser.
- Mau obrolannya pakai bahasa Inggris? Tambahin `&chatLang=en` di ujung link kantor.
- Mau dimatiin? Tambahin `&idleChat=off` di ujung link kantor. Nyalain lagi pakai `&idleChat=on`.

## Villager makin hidup 🛋️

- **Pas santai**, villager gak cuma ngobrol: kadang rehat ngopi, duduk baca buku di sofa, lihat-lihat rak buku,
  menghangatkan diri di perapian (lebih sering pas sore/malam), memandang ke jendela, nyiram tanaman, atau ngelus
  Clucky. Ada ikon kecil oranye di atas kepalanya. Begitu dapet tugas, dia langsung balik ke meja.
- **Ekspresi**:
  - 💤 **zzz** = context-nya udah 80% penuh. Saatnya `/compact`.
  - 💧 **keringetan** = udah kerja 15 menit nonstop, atau nungguin izinmu lebih dari 1 menit.
  - ✨ **lompat senang** = baru selesai ngerjain tugas.
- Mau dimatiin? Tambahin `&idleActivities=off` atau `&expressions=off` di ujung link kantor.

## Kartu villager, kalender, dan Holo-board 🗓️

- **Klik villager** → muncul kartu di pojok kanan atas: namanya, lagi ngapain (kerja pakai tool apa, nunggu
  izin, ngobrol sama siapa, atau santai), proyeknya, tool terakhir, dan isi context-nya. Klik lagi buat nutup.
- **Klik kalender di dinding** → kalender bulan ini, lengkap sama acara dari aplikasi **Calendar** di Mac.
  Klik tanggalnya buat lihat agenda hari itu. Angka merah di kalender = jumlah acara hari ini.
- **Klik layar hologram di atas perapian (Holo-board)** → dashboard kerja Claude hari ini: jumlah tool call,
  file yang diedit, command, sesi, pemakaian token dan model, jam tersibuk, grafik 14 hari, dan streak harian 🔥.

Pertama kali nyalain kantor, Mac bakal nanya **"Asa Office ingin mengakses kalender"** (atau "Terminal", kalau
kamu nyalain lewat Terminal). Klik **Izinkan** biar acara kamu muncul. Kelewat? Buka **System Settings → Privasi &
Keamanan → Kalender**, nyalain Asa Office (atau Terminal), terus matiin dan nyalain lagi kantornya.

Kalau Holo-board belum ada di kantor kamu, jalanin `npm run layout` (layout lama otomatis di-backup), atau klik
**Layout**, cari **Holo-board**, terus tempel di dinding mana aja.

## Kamera, notifikasi, papan tugas, dan siang-malam 🌙

- **Simbol kecil di atas villager**: label besar di atas kepala villager udah diganti simbol mungil biar kantor gak
  penuh: ✎ lagi edit, 🔍 lagi baca/cari, >_ jalanin command, 🌐 buka web, 👥 pakai sub-agent, ⚙ lainnya, dan "…" biru
  kalau dia nungguin balasanmu. **Klik villager-nya** buat lihat detail, termasuk dia lagi ngerjain apa dan
  permintaan terakhirmu. Kangen label lama? Tambahin `&labels=full` di ujung link kantor.

- **🔒 Kunci kamera** (di bawah tombol + / −, nyala dari awal): tampilan kantor diam di tengah. Klik villager cuma
  buka kartunya, kameranya gak ikut lari. Scroll trackpad juga gak geser kantor. Zoom tetap bisa pakai + / −.
  Mau bebas lagi? Klik 🔒 sampai jadi 🔓.
- **🔔 Notifikasi**: pas villager butuh izin atau selesai kerja, muncul pesan kecil di atas kantor (klik buat langsung
  milih villager-nya), bunyi "ting", notifikasi Mac kalau jendelanya lagi ketutup, dan HP bergetar. Waktu pertama
  diklik, browser nanya izin notifikasi: klik **Izinkan**. Klik lagi jadi 🔕 buat diem.
- **Papan tugas** (papan gabus di sebelah kalender): klik buat lihat tiap sesi Claude 24 jam terakhir: judulnya,
  permintaan terakhirmu, proyeknya, berapa tool dan file hari ini, dan villager mana yang lagi ngerjain. Angka hijau
  di papannya = jumlah villager yang lagi kerja.
- **Siang-malam**: kantornya ikut jam kamu. Sore jadi oranye, magrib ungu, malam gelap dengan bintang di jendela,
  lentera dan perapian nyala. Mau matiin? Tambahin `&dayNight=off` di ujung link kantor.

Papan tugas belum ada di kantor kamu? Jalanin `npm run layout`, atau klik **Layout**, cari **Task Board**, tempel di dinding.

## Pomodoro 🍅

- **Klik jam dinding** (jam bandul di sebelah jendela), terus klik **▶ Mulai fokus**. Timer 25 menit jalan, dan
  sisa waktunya muncul di label kecil di bawah jam: merah = fokus, hijau = istirahat.
- Pas fokus selesai, bunyi "ting" + muncul pesan, terus **istirahat 5 menit** mulai otomatis (tiap ronde ke-4 jadi
  15 menit). Selama istirahat, villager yang lagi santai **ngumpul di lounge** dekat meja teh, ada ikon kopi di atas
  kepalanya, dan kadang ngobrol. Villager yang lagi kerja tetap kerja.
- Istirahat kelar, bunyi lagi. Klik jam buat mulai ronde berikutnya kapan pun kamu siap.
- Di panel jam ada tombol **Jeda**, **Istirahat sekarang**, **Lewati**, **Berhenti**, dan pilihan durasi **25/5** atau **50/10**.
- Timer-nya disimpan di browser, jadi refresh halaman gak bikin ilang. Tapi timer di Mac dan di HP jalan sendiri-sendiri.
- Bunyinya ikut tombol 🔔. Mau Pomodoro dimatiin? Tambahin `&pomodoro=off` di ujung link kantor.

## Kalau ada masalah

| Masalah | Solusi |
| --- | --- |
| `npm error enoent … package.json` | Kamu belum ada di folder proyek. Jalanin `cd ~/asaoffice` dulu. |
| Karakter gak muncul | Buka **Settings**, pastiin **Instant Detection (Hooks)** dan **Watch All Sessions** udah ON. Terus di tab Claude ketik `/exit`, jalanin `claude` lagi, dan kasih dia tugas baca file. |
| `Stop hook error: … SuperIsland …` | Ini dari aplikasi lain, bukan dari kantor pixel, dan gak ganggu apa-apa. Cara ngilanginnya: minta Claude hapus hook SuperIsland di `~/.claude/settings.json` (suruh dia backup file-nya dulu). |
| Abis restart kantor, karakternya ilang | Normal. Karakter baru muncul lagi setelah sesi Claude-nya ngapa-ngapain. Kasih tugas atau kirim pesan di sesi itu. Jangan lupa buka link **baru** dari tab 1, soalnya token-nya ganti tiap restart. |
| Kalender atau Holo-board kosong | Kantornya harus dinyalain pakai app Asa Office atau `npm --prefix ~/asaoffice run office` (tab 1). Tunggu semenit, terus klik lagi. Pesan di panel kalender bakal ngasih tahu kalau izin Kalender belum dikasih. |
| App Asa Office gak mau kebuka | Lihat catatannya di `~/Library/Logs/asaoffice/office.log`, atau jalanin `npm run app` lagi. |
| Link di HP gak kebuka lagi | Link-nya ganti tiap kali tunnel dinyalain ulang. Jalanin lagi tab 3, lalu scan QR yang baru. |
| Tampilannya balik ke kantor abu-abu | Abis `npm install`, jalanin `npm run overlay`, terus restart tab 1. |

## Aturan penting 🔒

- Link atau QR dari tab 3 itu **kayak password**. Siapa pun yang pegang link-nya bisa ngubah pengaturan hook Claude
  kamu, jadi jangan dikirim ke siapa pun atau ke grup mana pun.
- Laptop harus nyala dan Terminal-nya tetap kebuka biar kantornya bisa ditonton dari HP.
- Mau ngerapihin kantor (geser meja, nambah furnitur, ganti warna lantai)? Klik **Layout** di browser.
