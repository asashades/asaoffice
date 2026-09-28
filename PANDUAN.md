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
  Oyen si kucing oren 🐱. Ada balon kecil di atas kepalanya yang bilang dia lagi ngapain. Begitu dapet tugas, dia
  langsung balik ke meja.
- **Ekspresi**:
  - 💤 **zzz** = context-nya udah 80% penuh. Saatnya `/compact`.
  - 💧 **keringetan** = udah kerja 15 menit nonstop, atau nungguin izinmu lebih dari 1 menit.
  - ✨ **lompat senang** = baru selesai ngerjain tugas.
- Mau dimatiin? Tambahin `&idleActivities=off` atau `&expressions=off` di ujung link kantor.
- **Pet kantor** sekarang **Oyen si kucing oren** 🐱. Kantor lama yang dulu ada ayamnya otomatis jadi Oyen setelah
  `git pull`, `npm run overlay`, dan kantornya di-restart. Clucky si ayam masih ada: klik **Layout**, pilih alat pet, terus
  tambahin dia kalau kangen.

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

- **Balon status di atas villager** 💬: villager yang lagi kerja punya balon chat kecil di atas kepalanya (gak nutupin
  muka) yang bilang dia lagi ngapain, misalnya "Ngedit app.ts", "Jalanin: npm test", "Nyari kode", atau
  "Subtugas: …". Kalau dia lagi mikir (gak pakai tool), balonnya bilang "Mikir…". Kalau sesinya lebih banyak dari meja,
  sisanya kerja dari sofa pakai ikon laptop 💻 ("Dari sofa: …"). Kalau dia lagi nungguin balasanmu, balonnya biru:
  "Nunggu balasanmu".
  Biar kantor tetap bersih, **balonnya cuma muncul sebentar** (sekitar 4 detik) tiap ada yang berubah, misalnya pas
  ganti tool atau mulai aktivitas baru, terus ngilang pelan-pelan. Mau lihat lagi? Arahin kursor ke villager-nya,
  atau klik dia. Lebih suka balon yang selalu kelihatan? Tambahin `&bubbles=always` di ujung link kantor. Balik ke
  mode sebentar pakai `&bubbles=brief`. **Klik villager-nya** buat
  lihat detail, termasuk permintaan terakhirmu. Lebih suka ikon aja? Tambahin `&labels=icons` di ujung link kantor.
  Kangen label lama? Pakai `&labels=full`. Balik ke balon pakai `&labels=bubbles`.

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
  15 menit). Selama istirahat, villager yang lagi santai **ngumpul di lounge** dekat meja teh, ada balon "Istirahat" di atas
  kepalanya, dan kadang ngobrol. Villager yang lagi kerja tetap kerja.
- Istirahat kelar, bunyi lagi. Klik jam buat mulai ronde berikutnya kapan pun kamu siap.
- Di panel jam ada tombol **Jeda**, **Istirahat sekarang**, **Lewati**, **Berhenti**, dan pilihan durasi **25/5** atau **50/10**.
- Timer-nya disimpan di browser, jadi refresh halaman gak bikin ilang. Tapi timer di Mac dan di HP jalan sendiri-sendiri.
- Bunyinya ikut tombol 🔔. Mau Pomodoro dimatiin? Tambahin `&pomodoro=off` di ujung link kantor.

## 12 villager, asisten, dan karyawan kantor 👥

- **12 villager beda**: Asa, Rowan, Clem, Theo, Mabel, Juno, Wren, Pip, Sari, Gus, Iris, dan Bayu. Tiap sesi Claude dapet
  muka sendiri. Kalau sesinya lebih banyak dari muka yang ada, muka yang sama dipakai lagi tapi warnanya beda dan
  namanya dikasih nomor ("Asa 2"), jadi gak ada kembaran persis.
- **Asisten (sub-agent)**: pas Claude manggil sub-agent, muncul villager kecil yang mirip induknya tapi warnanya beda,
  namanya misalnya **"Asa · Asisten"**. Balon induknya bilang "Nunggu asisten", dan balon si asisten nunjukin tugasnya.
- **Karyawan kantor** (opsional, kayak "karyawan" di Hermes): 6 persona dengan jobdesc masing-masing. Pasang sekali:
  ```
  cd ~/asaoffice
  npm run staff
  ```
  | Villager | Jabatan | Tugasnya |
  | --- | --- | --- |
  | Wren | Tester (QA) | Jalanin test, nulis test yang kurang, ngelaporin bug |
  | Pip | Reviewer kode | Meriksa perubahan kode, gak ngedit, cuma ngasih catatan |
  | Sari | Penulis dokumentasi | Nulis dan ngerapihin README, panduan, changelog |
  | Gus | Perencana | Mecah kerjaan besar jadi langkah-langkah, gak ngedit kode |
  | Iris | Peneliti | Nyari info di web dan kode, ngerangkum pakai sumber |
  | Bayu | Pemburu bug | Nyari akar masalah, benerin, terus buktiin udah beres |

  Abis itu restart kantor, terus buka sesi `claude` baru. Cara nyuruhnya tinggal ngomong biasa ke Claude, misalnya
  *"minta Wren ngetes perubahan ini"* atau *"suruh Pip review diff-nya"*. Claude juga bisa manggil mereka sendiri
  kalau tugasnya cocok. Pas dipanggil, villager-nya muncul di kantor, dan kartunya nunjukin jabatan, jobdesc, dan
  siapa yang manggil.
- Mereka gak kerja sendiri 24 jam: mereka kerja pas dipanggil sama kamu, Claude, Dispatch, atau jadwal Routine.
- Mau ubah jobdesc? Edit file di `staff/agents/`, terus jalanin `npm run staff` lagi. Mau copot semua?
  `npm run staff -- --remove`.

## Kotak surat: kirim tugas dari kantor 📮

Sekarang kamu bisa **nyuruh Claude langsung dari kantor**, gak perlu buka Terminal.

1. Klik **kotak surat** di dinding (sebelah kalender), terus klik **✉️ Tugas baru**. Bisa juga lewat tombol
   **✉️ Kirim tugas baru** di papan tugas.
2. Pilih **siapa** yang ngerjain (Claude biasa, atau karyawan kayak Wren/Pip), **proyeknya**, terus tulis **tugasnya**.
   Contoh: *"jalanin semua test terus kasih tahu yang gagal"*. Klik **Kirim tugas**.
3. Villager-nya jalan ke meja dan mulai kerja. Kalau yang kamu pilih karyawan, yang datang villager dia sendiri
   (misalnya Wren).
4. Kalau udah selesai, bunyi "ting", terus ada **angka merah di kotak surat**. Buka buat baca hasilnya dalam bentuk surat.
5. Mau lanjut? Tulis di kotak **Balas**, nanti dia nerusin kerjaan yang sama. Ada juga tombol **Hentikan** (kalau
   masih jalan) dan **Arsipkan**.
6. Tiap pagi ada **surat laporan harian** dari kantor: kemarin ada berapa sesi, tool, file diedit, token, dan streak 🔥.

**Batasan biar aman:**
- Tugas cuma boleh ngelakuin hal sesuai jabatannya. Pip dan Gus cuma baca. Wren dan Bayu boleh ngedit dan jalanin
  test. Command lain ditolak otomatis, jadi Claude gak bakal nanya-nanya izin di tengah jalan.
- Kirim tugas **cuma bisa dari Mac** yang nyalain kantor. Dari HP (lewat tunnel) kamu tetap bisa baca surat, tapi gak
  bisa ngirim tugas.
- Maksimal 3 tugas jalan barengan, dan tiap tugas otomatis dihentikan setelah 30 menit.
- Tugas ini pakai akun Claude Code kamu yang biasa, jadi ikut kepake kuotanya.
- Kotak suratnya belum ada di dinding? Jalanin `npm run layout`, atau klik **Layout**, cari **Mailbox**, terus
  tempel di dinding.

## Kalau ada masalah

| Masalah | Solusi |
| --- | --- |
| `npm error enoent … package.json` | Kamu belum ada di folder proyek. Jalanin `cd ~/asaoffice` dulu. |
| Karakter gak muncul | Buka **Settings**, pastiin **Instant Detection (Hooks)** dan **Watch All Sessions** udah ON. Terus di tab Claude ketik `/exit`, jalanin `claude` lagi, dan kasih dia tugas baca file. |
| `Stop hook error: … SuperIsland …` | Ini dari aplikasi lain, bukan dari kantor pixel, dan gak ganggu apa-apa. Cara ngilanginnya: minta Claude hapus hook SuperIsland di `~/.claude/settings.json` (suruh dia backup file-nya dulu). |
| Abis restart kantor, karakternya ilang | Normal. Karakter baru muncul lagi setelah sesi Claude-nya ngapa-ngapain. Kasih tugas atau kirim pesan di sesi itu. Jangan lupa buka link **baru** dari tab 1, soalnya token-nya ganti tiap restart. |
| Kalender atau Holo-board kosong | Kantornya harus dinyalain pakai app Asa Office atau `npm --prefix ~/asaoffice run office` (tab 1). Tunggu semenit, terus klik lagi. Pesan di panel kalender bakal ngasih tahu kalau izin Kalender belum dikasih. |
| App Asa Office gak mau kebuka | Lihat catatannya di `~/Library/Logs/asaoffice/office.log`, atau jalanin `npm run app` lagi. |
| Kotak surat bilang "Kirim tugas cuma bisa dari Mac…" | Buka kantornya di Mac (bukan HP), lewat app Asa Office atau `npm run office`. Kalau muncul "`claude` gak ketemu", pastiin Claude Code bisa dijalanin dari Terminal (`claude --version`). |
| Link di HP gak kebuka lagi | Link-nya ganti tiap kali tunnel dinyalain ulang. Jalanin lagi tab 3, lalu scan QR yang baru. |
| Tampilannya balik ke kantor abu-abu | Abis `npm install`, jalanin `npm run overlay`, terus restart tab 1. |

## Aturan penting 🔒

- Link atau QR dari tab 3 itu **kayak password**. Siapa pun yang pegang link-nya bisa ngubah pengaturan hook Claude
  kamu, jadi jangan dikirim ke siapa pun atau ke grup mana pun.
- Laptop harus nyala dan Terminal-nya tetap kebuka biar kantornya bisa ditonton dari HP.
- Mau ngerapihin kantor (geser meja, nambah furnitur, ganti warna lantai)? Klik **Layout** di browser.
