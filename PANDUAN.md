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
- **Maunya bukan Chrome?** Defaultnya kantor dibuka di jendela Chrome, Edge, atau Brave kalau ada. Mau Safari atau browser bawaan Mac: `npm run browser -- Safari` (atau `npm run browser -- default` untuk browser bawaan, `npm run browser -- auto` untuk balik ke cara awal). `npm run browser` saja menampilkan pilihan sekarang dan browser apa saja yang terpasang. Berlaku di klik aplikasi berikutnya, tidak perlu `npm run app` lagi. Chrome, Edge, dan Brave membuka jendela sendiri; browser lain membuka tab biasa.
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
- **Kantin, toilet, dan kebun**: villager yang santai juga **makan di kantin** (duduk di kursi meja makan), jajan di
  mesin camilan, minum dari dispenser, dan **ke toilet**: dia masuk bilik, terus ada **pintu tertutup dengan tanda
  "terisi"** selama 8–14 detik, dan biasanya abis itu cuci tangan. Kalau siang, mereka juga ngecek petak sayur, lihat
  kolam, timba air di sumur, dan duduk di bangku. **Sekitar jam makan siang (11.45–13.15) hampir semua villager yang
  santai pergi makan**, dan jam 15.00 ada jam ngopi dan camilan.
- **Kebun ikut streak-mu 🌱**: petak sayur tumbuh sesuai **hari beruntun** kamu. Hari ke-1 ditanam tanaman pertama,
  terus tiap hari tumbuh dari tunas sampai matang (wortel, tomat, kol; total 12 tanaman). Streak putus = petaknya
  kosong lagi. Kebunnya juga ikut **musim** tanggal asli: ada rona warna dan kelopak, daun gugur, atau salju yang
  beterbangan. Mau musim tertentu? Tambah `&season=fall` (spring, summer, fall, winter). Mau dimatiin? `&garden=off`.
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
  **Ganti nama:** klik ✏️ di sebelah nama (maksimal 20 huruf; kosongkan = balik ke nama asli; Enter simpan, Esc batal). Villager biasa diganti berdasarkan **wajahnya** (jadi namanya tetap walau sesinya datang dan pergi), staf berdasarkan perannya. **Shades dan asisten sub-agent nggak bisa diganti.** Nama tersimpan di Mac (`~/.pixel-agents/asaoffice-names.json`), jadi laptop dan HP melihat nama yang sama, dan muncul di kartu HUD, bubble, jurnal, dan kotak surat (`@nama`, surat). Tugas juga diberi tahu nama baru staf supaya rencana dan laporan Claude memakainya. File roster dan nama agen Claude Code nggak diubah.
- **Klik kalender di dinding** → kalender bulan ini, lengkap sama acara dari aplikasi **Calendar** di Mac.
  Klik tanggalnya buat lihat agenda hari itu. Angka merah di kalender = jumlah acara hari ini.
- **Rak Buku** (tombol 📚 di kartu hero, atau klik rak buku mana pun) → catatan pribadimu dalam bentuk **vault Obsidian** di
  `~/AsaOffice-Vault` (folder berisi file `.md` biasa: `Ide-TODO.md`, `Laporan/`, `Catatan/`). Mau pakai vault Obsidian yang sudah ada
  (misalnya yang di iCloud)? Klik **⚙ Folder vault** di bawah daftar dan tempel path-nya (boleh hasil salin dari Terminal, termasuk
  yang ada spasi), atau jalanin kantor dengan `OFFICE_VAULT="/path/vault" npm run office`. Di Mac, kalau muncul izin akses folder
  iCloud, izinkan Terminal.
  **Membaca Markdown:** catatan tampil lengkap seperti di Obsidian: properti (front matter, dilipat), judul 1 sampai 6, **tebal**, *miring*, ~~coret~~, ==sorot==, `kode`, blok kode, daftar bertingkat dan bernomor, **tabel**, kutipan, **callout** (`> [!warning] ...`), garis pemisah, link biasa dan otomatis, `#tag`, `[[tautan wiki]]` (klik buat buka catatannya; kalau belum ada, dibuatkan baru), serta **gambar** (`![[foto.png]]` atau `![](Gambar/foto.png)`, dibaca dari vault). Kotak centang di dalam catatan tetap bisa dicentang dari sini. Komentar `%%...%%` disembunyikan.
  **Susunan Rak Buku:** pohon folder di **kiri** (selalu terlihat, bisa dilipat dengan ▸ ▾), isi di **kanan**. Di atas pohon ada pintasan **🕒 Terbaru** (layar awal: catatan terbaru dari folder mana pun, dengan nama folder asalnya) dan **💡 Ide & TODO**. Klik folder di pohon buat melihat **isi folder itu saja** (folder jadi kartu di atas, lalu catatannya), jalur 🏠 Vault / folder di atas bisa diklik, **Esc** naik satu tingkat. **▦ / ☰** hanya mengubah bentuk tampilan (kartu atau baris), bukan isinya. Catatan ditampilkan dengan **nama filenya** (itu yang berubah saat diganti nama). **＋ Catatan** dan **＋ Folder** membuat isi di folder yang sedang dibuka. Tiap kartu atau baris punya **✏️ ganti nama**, **📂 pindahkan** (pilih folder tujuan), dan **🗑 hapus** (klik dua kali; yang dihapus **dipindah ke `.trash`** di vault, bukan hilang, jadi bisa dikembalikan lewat Finder atau Obsidian). Bisa juga **seret** kartu atau baris ke folder di pohon, ke jalur di atas, atau ke kartu folder. Ide-TODO, Catatan, dan Laporan (bawaan Rak Buku) dikunci 🔒. Mencari tetap global dan hasilnya menampilkan folder asal tiap catatan. Di layar sempit pohon disembunyikan: pakai tombol **📁** di sebelah kotak cari.
  **Tombol "Buka di Obsidian":** kalau muncul error *Unable to find a vault for the URL*, artinya Obsidian belum mengenal folder vault ini. Klik tombolnya lagi di Rak Buku: kantor menawarkan **Daftarkan ke Obsidian** (menambahkan vault ke daftar Obsidian dengan cadangan `obsidian.json.asaoffice-backup`; **tutup Obsidian dulu**, ⌘Q, karena Obsidian menulis ulang daftarnya saat jalan). Atau manual: di Obsidian pilih **Open folder as vault** dan pilih folder vaultnya (ada tombol **Salin path vault**). Sesudah dikenal, notenya langsung terbuka.
  - **Cari dulu:** panel langsung terbuka di kotak cari. ↑↓ buat pilih, Enter buat buka. Ketik nama yang belum ada, lalu pilih
    **📝 Buat catatan** (langsung ke editor, nama file dari baris pertama) atau **💡 Simpan jadi ide/TODO**.
  - **Galeri atau daftar:** tombol ▦ / ☰ di sebelah kotak cari (pilihanmu diingat). Galeri menampilkan kartu: **＋ Catatan baru**, kartu khusus **Ide & TODO** (isinya TODO yang belum selesai), lalu satu kartu per catatan dengan cuplikan isi dan umurnya. ←↑↓→ pindah antar kartu. Laporan tetap daftar yang bisa dilipat di bawah kartu, dan hasil pencarian selalu berupa daftar.
  - Mode daftar: satu kolom, dikelompokkan (Ide & TODO, Catatan, Laporan, Lainnya; tiap kelompok bisa dilipat), tiap baris ada
    pratinjau satu baris dan umurnya. Catatan dibuka selebar panel; **Esc melangkah mundur** (edit → catatan → daftar → tutup).
  - Catatan dibaca dulu; klik **Ubah**, klik dua kali, lalu simpan dengan **Ctrl/⌘+Enter**. Centang TODO langsung di tempat, dan
    **→ Shades** mengubah ide jadi tugas. **📜 Tulis laporan hari ini** bikin laporan harian di `Laporan/`.
  - **Catat cepat tanpa buka apa-apa:** tombol 💡 di kartu hero (atau tekan **N**), ketik, Enter. Masuk ke `Ide-TODO.md`.
  - Dua arah: catatan yang ada tulisan `#konteks` ikut dibaca Shades dan tim di setiap tugas. Cuma bisa dibuka dari Mac yang
    jalanin kantor.
- **Klik papan pengumuman kayu di ruang meeting** → **Jurnal Petani** ala Stardew. Isinya: panen hari ini (jumlah
  tool call) lawan rekor 14 harimu, musim dan tanggal, streak 🔥, "emas" (token hari ini), dan **level keahlian
  berbintang** yang naik sesuai kerja Claude: 🌾 Bertani (nulis dan ngedit file), 🍄 Mencari makan (baca dan cari
  kode), ⛏️ Menambang (jalanin command), 🎣 Memancing (cari di web), ⚔️ Bertarung (manggil sub-agent). Ada juga
  **pesanan khusus** (daftar TodoWrite sesi terbaru), grafik 14 hari dan jam kerja, plus **buku pencapaian**
  (panen pertama, 1.000 dan 10.000 tool call, streak 7 dan 14 hari, 5 tugas kotak surat, dan lain-lain).

Pertama kali nyalain kantor, Mac bakal nanya **"Asa Office ingin mengakses kalender"** (atau "Terminal", kalau
kamu nyalain lewat Terminal). Klik **Izinkan** biar acara kamu muncul. Kelewat? Buka **System Settings → Privasi &
Keamanan → Kalender**, nyalain Asa Office (atau Terminal), terus matiin dan nyalain lagi kantornya.

Kantor kamu belum berubah setelah update? Jalanin `npm run layout` (layout lama otomatis di-backup).

## Kantor yang lebih luas 🏡

Kantornya sekarang memanjang (33×24 petak, denah lanskap) dan ada halamannya:
- **Baris atas:** **area kerja terbuka** dengan 6 meja dalam 3 divisi (Teknis, Operasional, Administrasi; **tanpa dinding pemisah**, bedanya cuma warna lantai dan tata mejanya), **ruang meeting** (meja panjang, khusus buat rapat; dindingnya penuh papan pengumuman, papan tugas, kotak surat, kalender), dan **ruang direktur** (meja Shades, pojok privat, jendela lebar).
- **Baris bawah:** **pantry** dan **toilet** yang kecil di kiri, **pojok santai** (sofa hijau, satu meja bundar, papan tulis) di tengah dengan **pintu depan** di bawahnya, dan **lounge tamu** dengan perapian di kanan.
- **Jendela** cuma di dinding luar, gak ada lagi di dinding tengah.
- **Luar:** jalan setapak batu, petak sayur dengan orang-orangan sawah, sumur, kolam, bangku, pohon apel, semak, bunga, dan pagar kayu. Kucing Oyen dan ayam Clucky boleh jalan-jalan sampai keluar.
- Karena petanya lebih besar, karakter kelihatan lebih kecil. Pakai tombol zoom **+** atau klik villager biar kamera ngikutin dia.

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
  **Notifikasi Mac dari kantor sendiri:** buat tugas dari kotak surat, server kantor juga memunculkan notifikasi Mac asli
  (Claude minta izin, rencana siap, tugas selesai atau gagal), jadi tetap sampai walau browser ditutup. Kalau jendela kantor
  lagi di depan, notifikasi Mac ditahan (cukup pesan kecil dan bunyi di kantor). Klik 🔕 buat mematikannya juga. Klik notifikasinya
  baru membuka kantor kalau kamu memasang `terminal-notifier` (`brew install terminal-notifier`); tanpa itu, klik membuka Script
  Editor (batasan macOS), tapi notifikasinya tetap muncul.
- **Papan tugas** (papan gabus di sebelah kalender): klik buat lihat tiap sesi Claude 24 jam terakhir: judulnya,
  permintaan terakhirmu, proyeknya, berapa tool dan file hari ini, dan villager mana yang lagi ngerjain. Angka hijau
  di papannya = jumlah villager yang lagi kerja.
- **Siang-malam**: kantornya ikut jam kamu. Sore jadi oranye, magrib ungu, malam gelap dengan bintang di jendela,
  lentera dan perapian nyala. Mau matiin? Tambahin `&dayNight=off` di ujung link kantor.
  **Lampu ruangan:** tiap ruangan (area kerja, ruang rapat, ruang direktur, toilet, pantry, breakout, lounge) punya
  lampu langit-langit dengan warna sendiri (toilet putih dingin, lounge oranye), menyala satu-satu pelan-pelan pas
  senja, **cuma nyala kalau ada orang di dalamnya**, dan padam sekitar dua menit setelah orang terakhir keluar.
  Ruangan kosong lebih gelap dari yang terang, cahayanya bocor lewat pintu (pintu depan menerangi jalan setapak), dan
  villager yang lagi ngetik dapat **lampu meja** kuning kecil di mejanya. Pintu dan lorong antar ruangan ikut kena cahaya dari ruangan yang menyala di sebelahnya, dan dinding di sekeliling ruangan yang menyala kebagian sedikit terang, jadi nggak ada celah gelap di antara dua ruangan terang. Mau matiin lampu ruangan aja? Tambahin `&roomLights=off`. **Kotak surat yang lebih rapi:** daftar chat bisa dilipat dengan tombol **«** di pojok kirinya (ingat pilihanmu), jadi percakapan memakai seluruh panel dan yang tersisa hanya tombol *Chat baru* (dengan jumlah surat belum dibaca) dan tombol **»** untuk membukanya lagi. Alat-alat yang dulu berupa deretan tombol tanpa tulisan sekarang satu menu **☰ Alat** dengan nama dan keterangan: *Jadwal tugas*, *Batas biaya*, dan *Rapikan Downloads*. Lima tombol filter status jadi satu menu kecil di sebelah kotak cari.

**Ikon pixel art:** emoji yang dipakai sebagai ikon (📮 📚 💡 💰 ⏰ 🧹 🔔 ✅ ⛔ 🔐 📝 dan lain-lain) sekarang diganti ikon pixel berwarna penuh 16×16 dengan palet kantor. Ada 68 ikon. Yang tidak ikut diganti: tooltip, kotak isian, isi dropdown (dropdown tidak bisa memuat gambar), kode, dan jawaban agent (emoji di situ tetap emoji asli). Mau emoji lagi? Tambahin `&pixelIcons=off`. Mau lihat semua ikonnya? Di console ketik `__asaoffice.iconSheet()`.

**Gaya malam:** default-nya gaya Stardew, yang pencahayaannya meniru Stardew sendiri: gambar dikalikan dengan peta cahaya ungu-magenta tua, jadi lantai kayu berubah jadi merah anggur dan bayangan jadi ungu, bukan pudar kebiruan. Ruangan berpenghuni menyala merah-hangat, makin oranye dekat lampu, lentera, perapian, dan jendela; ruangan kosong ungu tua; pinggiran gambar sedikit lebih gelap. Warnanya sudah dicocokkan dengan screenshot Stardew malam hari. Villager digambar sekali lagi di atas gambar malam, jadi mereka tetap jelas dan nggak kelihatan berkabut. Mau gaya lama? Tambahin `&nightStyle=classic`.

Papan tugas belum ada di kantor kamu? Jalanin `npm run layout`, atau klik **Layout**, cari **Task Board**, tempel di dinding.

## HUD: ringkasan kantor di layar 🧭

Di sekeliling kantor ada **HUD** (papan ringkasan) yang selalu kelihatan:
- **Kartu hero (kiri atas):** kartu kotak dengan **langit pixel yang ikut jam dan musim** (fajar, siang, senja, malam; matahari atau bulan berjalan di busur kayak jam Stardew, plus awan, bintang, dan bukit yang warnanya ikut musim). Isinya jam, tanggal, musim, satu kalimat tentang apa yang lagi terjadi ("Lagi kerja: Shades · 2 asisten ikut bantu"), dan dua tombol: **📮 Kotak Surat** (ada angka merah kalau ada surat belum dibaca) dan **📚 Rak Buku**. Keduanya terbuka sebagai panel yang melebar dari kartu dan melayang di atas kantor tanpa menggelapkan layar, jadi kantor tetap kelihatan dan bisa diklik (di HP memenuhi layar). Di kanan atas ada status koneksi data dan angka: sesi yang lagi kerja, asisten, dan subagent hari ini.
- **Jawaban tampil sebagai Markdown:** di kotak surat, jawaban dan laporan Claude dirender, jadi `**sari**` tampil **tebal** (begitu juga *miring*, daftar, `kode`, blok kode, tabel, judul, dan link). Gambar dari internet diganti link supaya jawaban nggak bisa memuat URL sendiri. Pesanmu sendiri tetap teks biasa.
- **Pesan masuk dari Claude Code:** tiap kali kamu mengetik prompt di Claude Code mana pun di Mac ini (Terminal, app, VS Code), muncul popup **✉️ Pesan masuk** di atas kantor (nama proyek + potongan prompt-nya), lalu melipat jadi **pesawat kertas** yang terbang ke kotak surat di dinding, dengan bunyi dan hentakan yang sama seperti kirim dari kotak surat. Jadi sesi coding biasa pun terasa hidup di kantor. Tugas yang dikirim dari kotak surat sendiri nggak ikut (sudah ada kurirnya), prompt lama yang masuk waktu tab ditinggal nggak dianimasikan, dan kalau banyak sekaligus cuma 3 terakhir yang tampil. Mau dimatikan? Tambahin `&claudeMail=off` di alamat kantor (diingat sampai kamu pasang `&claudeMail=on`).
  **Tugas panjang dapat rapat:** kalau sesinya masih bekerja sekitar **45 detik** setelah prompt masuk, Shades manggil staf ke **meja rapat** (dia bacain potongan prompt-nya, staf nyaut), lalu staf duduk dan ngetik di meja masing-masing selama sesi itu masih jalan (maksimal 10 menit), terus bubar. Tugas kecil yang selesai cepat nggak dapat rapat, cuma popup dan pesawat. Rapat dilewati kalau Shades lagi ngerjain tugas kotak surat atau lagi rapat lain. Mau pesawatnya tetap tapi tanpa rapat? `&claudeMeeting=off`.
- **Rencana yang menunggu:** di bawah kartu hero muncul kartu untuk tiap rencana yang menunggu persetujuanmu (maksimal 3), dengan tombol **✅ Setujui**, **❌ Tolak**, dan **Buka**. Jadi kamu bisa menyetujui tanpa membuka kotak surat. Tab **Izin** di panel samping menampilkan langkah yang ditolak otomatis.
- **Pendapatan kemarin, cair tiap pagi (ala Stardew):** kerjaan hari ini **dibayar besok pagi**. Pas pertama kali kantor dibuka di hari baru, muncul kartu **Selamat pagi** berisi kerjaan **kemarin** jadi "barang terkirim": 🌾 file diedit ×12g, 🍄 file dibaca ×3g, ⛏️ command ×8g, 🎣 pencarian web ×6g, ⚔️ sub-agent ×25g, dan 🧾 tugas kotak surat selesai ×100g. Barisnya muncul satu per satu sambil "ting", **koin pixel berjatuhan**, total menghitung naik dan **menyala keemasan** (klik buat melewati animasi; mode kurangi gerakan tampil langsung tanpa koin), dibandingkan dengan hari sebelumnya, plus penghargaan (🏆 hari tersibuk, 🔥 streak, 🧾 tugas selesai). Uangnya masuk ke **Kas kantor** (`~/.pixel-agents/asaoffice-ledger.json`, dicatat di Mac): cair **sekali saja**, jadi tab kedua atau HP nggak bisa membayar hari yang sama dua kali, dan hari-hari saat kantor nggak dibuka dicairkan bareng sebagai baris "hari sebelumnya yang belum cair" (sampai dua minggu ke belakang). **Gaji tim:** tiap anggota tim punya gaji harian (`salary` di `staff/roster.json`: Shades 120, Wren 50, Pip 50, Sari 40, Gus 55, Iris 50, Bayu 60), ditambah **bonus rajin 30%** buat yang ngerjain tugas kotak surat hari itu. Kartunya menampilkan gaji, lalu **laba bersih** (pendapatan − gaji), dan itulah yang mengubah Kas. Hari sepi bisa **rugi**, tapi Kas **nggak pernah di bawah 0**. Gaji dihitung untuk kemarin dan hari-hari sebelumnya yang belum cair **hanya kalau hari itu ada kerjaan** (jadi pergi lama nggak menguras kas). Kas juga muncul sebagai chip 💰 di kartu hero. Di bawahnya: yang sudah terkumpul hari ini ("cair besok pagi") dan yang menunggu hari ini (rencana yang perlu disetujui, langkah ditolak, surat belum dibaca, TODO di Rak Buku, acara kalender; masing-masing bisa diklik). Tombol **🌙** di kartu hero memutar ulang kartunya tanpa membayar lagi, dan berdenyut sampai kamu melihat pembayaran pagi ini. `&brief=off` mematikan kartu otomatisnya. Semua angkanya dari data yang sudah ada, jadi nggak makan token.

**📥 Downloads (satu mode untuk tanya dan merapikan):** di Chat baru pilih folder **📥 Downloads**, atau klik tombol **🧹** di samping "Jadwal" (kotak tulisnya sudah terisi "Rapikan file lepas di Downloads", tinggal Enter atau ubah dulu). Tulis apa saja soal isinya: **tanya** ("cari invoice bulan lalu", "ringkas PDF terbaru") atau **minta dirapikan** ("rapikan file PDF"). Claude cuma bisa membaca (nggak punya akses terminal). Kalau cuma bertanya, kamu langsung dapat jawaban. Kalau minta merapikan, muncul **rencana** berupa daftar "file → folder" dengan kotak centang: hilangkan centang file yang mau dibiarkan, lalu **✅ Setujui**. Baru setelah itu kantor sendiri yang memindahkan file ke folder yang **sudah kamu susun** di dalam Downloads (kalau jelas cocok) atau ke **Arsip**. **Nggak ada yang dihapus atau ditimpa** (nama kembar jadi "nama (2)"); file yang barusan diunduh (kurang dari 3 menit), unduhan yang belum selesai, file tersembunyi, dan shortcut dilewati. Tombol **↩️ Kembalikan semua** mengembalikan pemindahan terakhir. Obrolannya bisa dilanjut di surat yang sama (tanya dulu, lalu minta dirapikan). Seperti tugas biasa, surat Downloads baru juga punya jeda batalkan dan **diambil Shades dari kotak surat** dulu sebelum dikerjakan (balasan di surat yang sama langsung jalan). Pertama kali, Mac akan nanya apakah Terminal boleh mengakses folder Downloads: pilih **Izinkan**.

**📊 Baca file Excel:** Claude tidak bisa membuka `.xlsx` dengan Read, jadi kantor menyediakan pembaca bawaan (tanpa Python, hanya baca). Cukup tulis tugasnya, misalnya "baca jadwal kuliah di Downloads/jadwal.xlsx", dan Claude otomatis memakainya, juga di mode 📥 Downloads. Mau coba sendiri di Terminal: `node tools/xlsx-read.mjs file.xlsx` (tambah `--list` untuk daftar sheet, `--sheet 2` untuk satu sheet, `--max-rows 500` untuk lebih banyak baris). Yang didukung `.xlsx` dan `.xlsm`; `.xls` lama belum.

**🧠 Pilih model:** di Chat baru ada chip **🧠 Model default / Opus / Sonnet / Haiku** (juga untuk Downloads). "Default" berarti mengikuti pengaturan Claude Code di Mac kamu (`/model`). Pilihan diingat, dan modelnya dipakai juga untuk balasan di surat itu. Modelnya tampil di kepala surat ("🧠 Haiku 4.5", dibaca dari model yang sungguh dipakai). Untuk sesi 💬 dari luar kantor, chip-nya otomatis di **"Sesi asli (Opus 5.5)"** (model yang terakhir menjawab sesi itu), jadi lanjutannya pakai model yang sama; boleh diganti. Haiku paling hemat untuk tugas ringan, Opus untuk yang berat. Tugas terjadwal masih memakai default.

**🗄 Arsip chat:** tombol **🗄** di sebuah chat memindahkannya dari daftar utama ke filter **🗄 Arsip** (tersimpan, bukan dihapus). Dari sana, **↩️** mengeluarkannya lagi, dan **🗑** menghapus permanen (klik dua kali untuk konfirmasi). Chat yang diarsipkan nggak dihitung sebagai belum dibaca atau rencana yang menunggu. **Semua jenis chat bisa diarsipkan:** surat kotak surat, sesi Claude Code dari luar kantor (ikon 💬, yang menumpuk dari Terminal atau Desktop), dan Laporan harian. Tombol **🗄** muncul di pojok kanan setiap baris saat kursor di atasnya (di layar sentuh selalu terlihat), jadi nggak perlu membuka chatnya dulu; ada juga di kepala chat. Kalau ada banyak sesi dari luar, tombol **🗄 Arsipkan N sesi dari luar kantor** di atas daftar mengarsipkan semuanya sekaligus (klik dua kali; sesi yang sedang jalan dilewati). Daftar arsip disimpan di `~/.pixel-agents/asaoffice-archive.json` supaya semua tampilan sama. Yang sedang berjalan harus dihentikan (⏹) dulu.

**🏠 Penghuni kantor:** tim (Wren, Pip, Sari, Gus, Iris, Bayu) sekarang **tinggal di kantor**: selama jam kerja mereka selalu ada walau nggak ada sesi Claude Code. Mereka masuk lewat pintu depan antara jam 07.00 sampai 08.15 dan **pulang** antara jam 18.00 sampai 20.00 (bergantian, mengikuti jam kantor), dan di sela-selanya mereka ngopi, nyiram tanaman, baca buku, makan siang di kantin, ngobrol, dan sesekali duduk di meja kerja (cuma kalau masih ada minimal tiga meja kosong, dan meja dilepas kalau ada sesi yang butuh). **Lembur:** kalau ada sesi asli yang bekerja di luar jam itu (misalnya malam), **dua** dari mereka (pasangannya ganti tiap malam) menemanimu: tetap di kantor atau masuk lagi lewat pintu, lalu pulang sekitar sepuluh menit setelah sesinya sepi. Tanpa sesi, kantor tetap kosong di malam hari. Kalau ada tugas asli yang memakai anggota tim itu (tugas dari kotak surat atau sub-agent), penghuninya **minggir** dan balik lagi setelah selesai. Mereka cuma pemandangan: nggak memakai token, dan nggak dihitung di HUD, penghitung sesi, atau notifikasi. Klik salah satu buat lihat kartunya ("Penghuni kantor"). `&residents=off` mematikannya (diingat).

**🛒 Toko (belanja pakai Kas):** klik chip **💰** di kartu hero. Isinya dua tab:
- **🌳 Dekorasi:** taman (bangku 200g, lentera 150g, pohon apel 400g, semak 80g, bunga 60g, orang-orangan sawah 250g, tong 120g, peti 70g, keranjang 90g, sumur 600g, kolam 900g) dan dinding (lukisan 350g, jam 200g, rak buku 450g). Barangnya **dipasang otomatis** di tempat kosong yang aman (jalan masuk dan jalur jalan villager nggak pernah ditutup) lalu berkilau sebentar. Kalau nggak ada tempat, nggak ditagih. Tutup editor Layout dulu sebelum belanja.
- **👗 Penampilan:** pilih villager (wajah 0–11, Shades nggak), lalu beli **warna baju** (200g) atau **gelar** (150g: Dr., Sir, Chef...). Yang sudah dibeli bisa dipakai dan dilepas gratis, dan kelihatan di semua tampilan.
Catatan: `npm run layout` mereset layout, tapi dekorasi yang sudah dibeli dipasang balik otomatis.
- **Kartu di bawah:** satu kartu per villager (Shades, sesi, asisten, karyawan yang lagi "akting" bantu Shades). Isinya status (Bekerja, Santai, Selesai, Nunggu kamu, Butuh izin), proyek atau tugasnya, dan apa yang lagi dikerjain. **Klik kartu** buat ngikutin villager itu.
- **Panel samping** dengan tiga tab: **Aktivitas** (feed langsung: tool yang dipakai, asisten datang dan pergi), **Riwayat** (subagent 24 jam terakhir), dan **Tugas** (daftar TodoWrite sesi terbaru). Panelnya bisa diperkecil pakai tombol ▾.
- Mau lihat kantor tanpa HUD? Tekan **H** atau klik tombol 🧭 di bawah tombol zoom. Di HP panelnya mulai dalam keadaan kecil. Mau dimatiin permanen? Tambah `&hud=off` di ujung link kantor (`&hud=on` buat nyalain lagi).

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

## 13 villager, asisten, dan karyawan kantor 👥

- **13 villager beda**: Asa, Rowan, Clem, Theo, Mabel, Juno, Wren, Pip, Sari, Gus, Iris, Bayu, dan **Shades** si
  direktur (yang ini khusus, sesi biasa gak bakal dapet mukanya). Tiap sesi Claude dapet
  muka sendiri. Kalau sesinya lebih banyak dari muka yang ada, muka yang sama dipakai lagi tapi warnanya beda dan
  namanya dikasih nomor ("Asa 2"), jadi gak ada kembaran persis.
- **Asisten (sub-agent)**: pas Claude manggil sub-agent, muncul villager kecil yang mirip induknya tapi warnanya beda,
  namanya misalnya **"Asa · Asisten"**. Balon induknya bilang "Nunggu asisten", dan balon si asisten nunjukin tugasnya.
- **Karyawan kantor** (opsional, kayak "karyawan" di Hermes): 7 persona dengan jobdesc masing-masing. Pasang sekali:
  ```
  cd ~/asaoffice
  npm run staff
  ```
  | Villager | Jabatan | Tugasnya |
  | --- | --- | --- |
  | Shades | Direktur (CEO) | Nerima tugas dari kamu (Komisaris), bikin rencana, ngatur tim, terus lapor |
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

1. Klik **kotak surat** di dinding (sebelah kalender). Bisa juga lewat tombol **✉️ Kirim tugas baru** di papan tugas.
   Tampilannya **chat**: Shades udah jadi penerima bawaan.
2. Ketik tugasnya (contoh: *"jalanin semua test terus kasih tahu yang gagal"*), terus tekan **Enter** (Shift+Enter buat
   baris baru). Di bawah kotak ada **chip pilihan**: siapa yang ngerjain, proyek, cara kerja (Rencana dulu / Langsung
   jalan / Cuma laporan), dan gaya kerja Shades (Hemat / Delegasi). Pilihanmu **diingat**, jadi biasanya tinggal ketik
   lalu Enter. Ada juga 3 saran tugas buat mulai.
3. **Kirimnya seru:** ada bunyi "wusss", **pesawat kertas terbang ke kotak surat** di dinding, suratnya jatuh ke dalam
   ("tok!"), terus **Shades bangun, ngambil surat dari kotak surat, dan nganterin ke yang ngerjain** (ke rapat di meja meeting
   kalau tugas buat dia sendiri, atau ke ruang kerja kalau buat karyawan). Selama 3 detik setelah kirim ada tombol **↩ Batalkan** kalau salah kirim (tugasnya belum mulai, jadi aman). Panelnya nutup biar kamu bisa lihat. Tugasnya
   baru mulai jalan pas Shades nyerahin suratnya (paling lama 30 detik), jadi kerjaannya gak ketunda lama. Bunyinya bisa
   dimatiin lewat tombol 🔕.
   Ada dua bonus: ketik **@nama** (misalnya `@Wren`) di chat baru buat milih siapa yang ngerjain (pakai panah + Enter,
   atau klik). Dan **draf tulisanmu tersimpan** per chat, jadi gak hilang walau panelnya ketutup atau halamannya di-refresh.
4. Villager-nya kerja seperti biasa. Kalau yang kamu pilih karyawan, yang datang villager dia sendiri (misalnya Wren).
5. Di chat kelihatan gelembung "lagi ngetik" dengan progres langsung. Kalau udah selesai, bunyi "ting" dan ada **angka
   merah di kotak surat**. Rencana, laporan, dan error muncul sebagai gelembung chat. Rencana punya tombol **✅ Setujui**
   dan **❌ Tolak** tepat di bawahnya (mau revisi? tulis di kotak bawah).
6. Mau lanjut? Tulis di kotak chat, dia nerusin kerjaan yang sama. Ada tombol **⏹** (kalau masih jalan), **📋** (salin
   perintah Terminal) dan **🗄** (arsipkan).
7. Tiap pagi ada **laporan harian** dari kantor: kemarin ada berapa sesi, tool, file diedit, token, dan streak 🔥.

**Kirim gambar ke Claude:** di kotak tulis (chat baru, balasan, atau lanjutin sesi luar) tempel gambar (Ctrl/⌘+V), seret ke kotak tulis, atau klik tombol 📎. Maksimal 4 gambar (png, jpg, gif, webp), masing-masing 8 MB, tampil sebagai thumbnail dengan tombol ✕ buat membatalkan, dan ikut tampil di pesan terkirim. Gambarnya disimpan di `~/.pixel-agents/asaoffice-uploads/` (dihapus otomatis setelah 14 hari). Claude diberi tahu lokasinya dan boleh membaca folder itu saja, lalu membukanya lewat tool Read. Cocok buat "ini tampilannya error, benerin" atau "tiru desain ini".

**Screenshot di jawaban:** kalau jawaban Claude menyebut file gambar (png, jpg, gif, webp), misalnya screenshot yang dia ambil, gambarnya tampil sebagai thumbnail di bawah pesan. Klik buat memperbesar, Esc buat menutup. Cuma file gambar di folder proyek yang dipakai Claude (atau folder temp), maksimal 8 MB dan 4 gambar per pesan. File yang nggak ada nggak ditampilkan. Dari HP (lewat tunnel) gambarnya nggak muncul. Tips: minta Claude "ambil screenshot hasilnya" kalau tugasnya cocok.

**Perintah baca-saja selalu boleh:** semua tugas (Downloads dan fase rencana atau laporan juga) boleh menjalankan `ls`, `cat`, `head`, `tail`, `wc`, `file`, `stat`, `pwd`, `diff`, `cut`, `echo`, dan `unzip -l`, jadi nggak muncul lagi sebagai langkah yang ditolak. Rangkaian dengan pipa atau `;` lolos kalau tiap potongannya salah satu dari itu. Redirect (`>`), `rm`, `curl`, `git push`, dan folder sistem seperti `/etc` tetap ditolak.

**Laporan harian di Jurnal Obsidian (📜):** laporan "hari ini mengerjakan apa" masuk ke catatan harian di vault-mu, di folder **`1-Fleeting Journal`**, dengan nama seperti yang dibuat plugin obsidian-journal (`2026-10-5, Mon`: tanpa nol di depan, hari dalam bahasa Inggris). Laporannya **tidak ditulis otomatis**: kantor menyiapkan draf, kamu yang menentukan isinya.
- **Cara buka:** tombol **📜 Tulis laporan** di Rak Buku, atau toast "Mau tulis laporan hari ini?" yang muncul sekali setelah jam 17.00 kalau hari itu ada pekerjaan dan laporannya belum disimpan.
- **Isi halamannya:** daftar pekerjaan hari itu (tugas kotak surat dan sesi Claude Code), dikelompokkan per proyek, tiap baris sudah berisi kalimat draf (diambil dari jawaban tugasnya). Ubah kalimat yang kurang pas, **hilangkan centang** pekerjaan yang tidak mau dicatat (tugas gagal atau belum selesai awalnya tidak dicentang), lalu tulis **highlight penting** hari itu. **Baris kosong** memulai callout baru, sedangkan Enter biasa melanjutkan isi callout yang sama. Baris pertama boleh `Judul: isinya` biar callout-nya punya judul sendiri. Bisa juga memilih hari sebelumnya (sampai 14 hari ke belakang) dengan tombol ‹ ›.
- **Hasilnya di Obsidian:** `Total pekerjaan hari ini: 5`, highlight sebagai callout (`> [!tip] Judul` lalu `> isi`; ingat tandanya `[!tip]`, tanda seru di depan), lalu `Pekerjaan hari ini` per proyek dengan nama yang mengerjakan, dan total token hari itu. (Tidak ada lagi baris "Diperbarui"; yang tersisa hanya penanda tak terlihat `asaoffice:begin` dan `asaoffice:end`, jangan dihapus.) Simpan lagi kapan saja untuk memperbarui; yang tertimpa hanya blok di antara penanda `asaoffice:begin` dan `asaoffice:end`, tulisanmu di luar blok itu aman.
- Kalau vault belum bisa dibaca, halamannya memberi tahu; beri aplikasi Asa Office izin Akses Penuh ke Disk.

**Data karyawan, jiwa, dan ingatan staf (👥):** tiap staf punya *jiwa*: kepribadian, gaya bicara, dan nilai-nilainya (Gus teliti dan realistis, Wren skeptis sampai terbukti, Pip tajam tapi sopan, Sari rapi dan hangat, dan seterusnya). Jiwa itu ikut dibaca setiap kali mereka mengerjakan tugas atau ikut rapat, jadi cara mereka menjawab terasa khas. Jiwa dan ingatan tiap staf disimpan sebagai **satu catatan di vault Obsidian-mu**, di folder `Staf` (misalnya `Staf/Gus.md`, dengan bagian *Jiwa* dan daftar *Ingatan*). Jadi kamu bisa membacanya, mengubahnya (ubah kepribadian, tambah butir ingatan, hapus yang tidak cocok), menautkannya ke catatan lain, dan ikut tersinkron lewat iCloud; perubahan di Obsidian dipakai di tugas berikutnya. Semuanya ada di halaman **Data Karyawan**, yang dibuka dari tombol **👥** di kartu atas (sebelah rak buku) atau tombol **Data karyawan** di kartu staf. Halaman itu bukan bagian dari kotak surat. Tiap karyawan punya profil (foto, jabatan, tugas, gaji per hari, apa yang boleh dikerjakan, jumlah surat yang dikerjakan) di atas jiwa dan ingatannya. Kalau vault sedang tidak bisa dibaca (iCloud belum selesai sinkron), agent bekerja tanpa ingatan dan tidak menulis apa pun sampai vault kembali. Selain itu tiap staf punya **ingatan** kecil: di akhir tugas, agent boleh menulis satu pelajaran satu kalimat (misalnya "Komisaris suka rencana maksimal lima langkah"). Surat menampilkannya sebagai "🧠 Gus mengingat: …", dan ingatan itu dibaca lagi di tugas berikutnya. Maksimal 20 per agent, yang paling lama dilupakan duluan. Demi keamanan: tugas yang membaca web atau folder Downloads **tidak menulis ingatan**, ingatan dianggap catatan pribadi (permintaanmu tetap menang), dan kamu bisa melihat, menghapus, menambah, atau mematikan ingatan otomatis di halaman Data Karyawan. Peserta rapat membaca jiwa dan ingatannya tapi tidak menulis. **Nama catatan staf:** kantor mengenali catatan staf lewat baris `agent: …` di bagian atas catatan, bukan lewat nama filenya. Jadi kalau kamu mengganti nama file di Obsidian, kantor tetap memakai file itu dan tidak membuat catatan baru dengan nama lama. Kalau kamu mengganti nama karyawan **di kantor** (✏️), file dan judul catatannya ikut berganti (kecuali sudah ada catatan lain dengan nama baru itu); mengosongkan nama mengembalikan nama aslinya. Kalau ada dua catatan untuk karyawan yang sama (akibat versi lama), yang bernama sama dengan nama sekarang dipakai; yang satunya boleh kamu hapus.

**Rapat sungguhan (🗣 Rapat dulu):** kalau kamu menyuruh **Shades**, pilihan mode punya **🗣 Rapat dulu**. Shades membuka rapat: dia memilih 2 sampai 3 staf yang paling berguna untuk tugasmu dan memberi masing-masing satu pertanyaan. Tiap staf menjawab **sebagai dirinya sendiri** (Gus soal rencana, Iris soal referensi, Wren soal pengujian, dan seterusnya) dan boleh membaca kode dulu. Di putaran kedua mereka saling menanggapi: setuju, tidak setuju (sebut namanya), atau bertanya ke rekan. Terakhir Shades menulis **rencana final** dari isi rapat, dengan catatan siapa mengusulkan apa dan perbedaan pendapatnya, lalu menunggu persetujuanmu seperti *Rencana dulu*. Seluruh percakapan tampil di surat (wajah dan nama tiap pembicara), dan di kantor Shades dan staf yang dipanggil duduk di meja rapat dengan balon bicara yang isinya ucapan asli mereka ("…" kalau lagi mikir). Rapat butuh beberapa menit dan beberapa panggilan Claude (sekitar $0,25 dengan Haiku), ikut batas 💰, dan staf cuma membaca: tidak mengubah apa pun. Tombol Hentikan membatalkan rapat.

**Batas token (💰):** karena kamu memakai langganan (tidak ditagih per tugas), batasnya sekarang dalam **token**, bukan dolar. Tombol **💰** di kotak surat mengatur dua batas: **per tugas** (satu kali jalan: tiap pesan yang kamu kirim memulai satu kali jalan; default 500 ribu token) dan **per hari** untuk seluruh kantor (default 3 juta token). Masing-masing bisa dimatikan ("Tanpa batas"), minimal 50 ribu; angkanya diisi dalam ribuan. Satu token di sini = masukan baru + keluaran + cache yang ditulis (membaca ulang cache tidak dihitung); gambarannya, satu tugas biasa sekitar 100 sampai 400 ribu token. Claude dihentikan kalau pemakaiannya melewati sisa dari batas yang lebih kecil; surat menjelaskan alasannya, dan setelah batasnya kamu naikkan, balas surat itu buat lanjut. Kalau batas hari ini habis, tugas baru (termasuk jadwal) tidak dimulai sampai besok atau sampai batasnya kamu naikkan. Di 80% batas harian kamu dapat satu notifikasi Mac. Batas dicek di antara langkah Claude, jadi bisa terlewati sedikit. Tiap surat menampilkan token yang dipakainya. Panel 💰 juga menampilkan pemakaian hari ini. (Batas dolar lama otomatis kembali ke default token.)

**Login Claude Code kedaluwarsa (🔐):** kalau sebuah tugas atau rapat gagal dengan pesan "OAuth session expired" atau "Failed to authenticate", surat menampilkan kartu **Login Claude Code kedaluwarsa** dengan tombol **Salin perintah**. Buka Terminal, jalankan `claude auth login`, selesaikan masuknya di browser, lalu balas surat itu. Kantor tidak perlu di-restart. Semua tugas kotak surat memakai login Claude Code di Mac ini, jadi kalau satu gagal karena ini, yang lain juga.

**Cabang terpisah (🌿):** di *Chat baru* ada pilihan **📂 Langsung di folder** (default) atau **🌿 Cabang terpisah**. Dengan cabang terpisah, Claude bekerja di cabang git sendiri (folder salinan dari commit terakhir, disimpan di `~/.pixel-agents/asaoffice-worktrees/`), jadi nggak bentrok dengan yang lagi kamu kerjakan di folder aslinya. Perubahan yang belum kamu commit nggak ikut, dan file yang nggak dilacak git (misalnya `node_modules`) nggak ada di salinan itu. Setelah tugas selesai, surat menampilkan kartu **🌿 Hasil di cabang…**: jumlah file dan baris yang berubah, tombol **Lihat perubahan** (isi diff), **Gabung ke <branch>** (digabung ke branch yang lagi aktif di folder aslinya; kalau ada konflik atau folder aslinya kotor, nggak ada yang berubah), **Buka PR** (mendorong cabang ke GitHub, minta klik dua kali), dan **Buang** (hasilnya hilang, minta klik dua kali). Setelah salah satunya, obrolan lanjut di sesi baru di folder asli. Menghapus chat nggak menghilangkan pekerjaan: yang belum ter-commit disimpan dulu ke cabangnya. Folder harus repo git.

**Izin seperti Claude Code Mac (🔐):** di *Chat baru* (dan di kotak balasan) ada pilihan cara izin, sama seperti mode di Claude Code: **🔐 Tanya dulu** (default; tiap langkah di luar daftar izin kamu jawab), **✏️ Terima edit** (edit file langsung jalan, sisanya tanya), **🤖 Auto** (Claude menilai sendiri dan tanya kalau ragu), **⚡ Bypass izin** (tanpa tanya sama sekali), dan **🔒 Ketat** (cara lama: yang di luar daftar ditolak otomatis). Rencana dulu tetap lewat pilihan *Rencana dulu*. Waktu Claude butuh izin, tugas berhenti sebentar dan muncul kartu **🔐 Claude minta izin** di surat (dengan **perintah lengkapnya**) serta di bawah kartu hero HUD, dengan tombol **Izinkan**, **Izinkan terus di obrolan ini** (disimpan untuk obrolan itu saja, nggak ditulis ke pengaturan proyekmu), dan **Tolak**. Begitu kamu jawab, tugas lanjut tanpa mengulang dari awal. Nggak dijawab 10 menit = ditolak otomatis. **Bypass** mati sampai kamu menyalakannya: pilih ⚡ lalu klik **Aktifkan** pada peringatannya. Tugas di 📥 Downloads, fase rencana/laporan, dan tugas terjadwal tetap baca-saja otomatis. Jawabannya hanya bisa dari Mac ini (HP lewat tunnel cuma bisa melihat).

**Ganti orang, cara, dan model di tengah chat (🔁):** di kotak balasan sebuah chat, pilihan **👤 siapa**, **cara kerja** (Rencana dulu, Langsung jalan, Cuma laporan), **🧠 model**, gaya Shades, dan cara izin bisa diubah antar balasan. Balasan berikutnya jalan dengan pilihan baru dan sesinya tetap sama (riwayatnya ikut), lalu muncul catatan kecil "🔁 …" di percakapan. Yang tetap terkunci: **📁 folder** (satu sesi tinggal di satu folder; buat chat baru untuk folder lain) dan **🗣 Rapat dulu** (hanya untuk membuka chat baru). Chat Downloads tidak bisa dialihkan. Kartu "sedang bekerja" sekarang satu baris kecil, dan kotak surat mengisi hampir seluruh tinggi layar. Toast "selesai" yang diklik membuka **obrolan tugas atau sesinya** di kotak surat (untuk tugas dari kotak surat, satu toast saja, dari kotak surat); kartu karyawan di bawah layar sekarang dua baris (nama + status, lalu tugasnya; tool terakhir ada di tooltip).

**Langkah yang ditolak otomatis dan "Izinkan sekali":** kalau tugas mencoba sesuatu di luar izinnya (misalnya `git commit` tanpa centang, atau edit yang tidak boleh dilakukan stafnya), Claude menolaknya dan melaporkannya. Surat menampilkan daftarnya di bawah jawaban (⛔ N langkah ditolak otomatis), dan tab **Izin** di panel HUD menyimpan yang terbaru. Tiap langkah bisa dibuka **sekali** lewat tombol **Izinkan sekali**: kantor menurunkan aturannya dari yang ditolak (misalnya `Bash(git commit:*)`), menjalankan satu lanjutan untuk surat itu, dan mengingatkan Claude untuk tidak `git push`. Perintah berisiko (`push`, `rm`, `sudo`, pipa, redirect, `curl`, menjalankan shell...) tidak pernah ditawarkan; jalankan sendiri di Terminal. Perintah shell biasa (termasuk gabungan `&&`, `;`, atau pipa, dan yang diawali `cd …`) sekarang bisa dibuka lewat **Izinkan persis…**: kantor menampilkan **perintah lengkapnya** dulu (kayak dialog izin di Claude Code Mac), dan kalau kamu klik **Ya, izinkan sekali**, yang dibuka hanya perintah **persis sama** (satu aturan per potongan, bukan awalan lebar seperti `python3:*`). `cd …` di depan dibuang karena tugas sudah jalan di foldernya. Tetap tidak pernah ditawarkan: redirect (`>`), wildcard `*`, substitusi `$(…)`, `sudo`, shell, `curl`/`wget`, `ssh`, `git push`, `rm -r`. Folder 📥 Downloads tetap baca-saja (labelnya sekarang jelas: "Downloads baca-saja"). Perintah yang menyentuh file di luar folder tugas masih bisa ditolak oleh Claude Code sendiri. Untuk yang tak bisa dibuka, surat menampilkan tombol **Salin** (menyalin perintahnya supaya tinggal ditempel di Terminal) dan **✖ Abaikan** (menghapusnya dari daftar), plus **Abaikan semua** di kepala daftar. Di tab **Izin** HUD, baris yang tak bisa dibuka diberi label **jalankan sendiri**, dan tombol **Abaikan semua** membersihkan seluruh log (angka di tab ikut turun). Klik barisnya untuk membuka suratnya.

**Tugas terjadwal (⏰ Jadwal):** tombol **⏰ Jadwal** di sebelah *Chat baru* di kotak surat membuka daftar tugas yang jalan sendiri: tugasnya, siapa yang ngerjain, proyeknya, jam, dan hari (default Sen–Jum). Jadwal **cuma membaca**: **Cuma laporan** (default) atau **Rencana dulu** (rencana baca-saja yang nunggu persetujuanmu); nggak pernah ngedit atau commit sendiri, dan mode "langsung jalan" memang nggak ditawarin. Tiap jalan, hasilnya datang sebagai **surat ⏰** di kotak surat (dan rencananya muncul sebagai kartu di HUD). Tiap jadwal bisa dimatiin, diubah, dijalankan sekarang, atau dihapus (maksimal 20). Kantor ngecek jadwal tiap 30 detik, jadi **kantornya harus nyala pas jamnya**. Kalau jadwalnya terlewat karena kantor mati atau Mac tidur, dijalankan **sekali** pas kantor nyala lagi, asal terlewatnya belum 12 jam (yang lebih lama dilewati, jadi tugas kuno nggak tiba-tiba jalan). Jadwal yang baru dibuat setelah jamnya hari ini baru jalan di kesempatan berikutnya. Disimpan di `~/.pixel-agents/asaoffice-schedules.json`, dan kartu pagi mencantumkan jadwal hari ini. Mengatur jadwal cuma bisa dari Mac yang menjalankan kantor.

**Ngikutin progres:** selama tugas jalan, suratnya nunjukin apa yang lagi dikerjain ("⏳ Baca app.js", "⏳ Jalanin: npm test"). Di tiap surat ada tombol **📋 Salin perintah Terminal**: tempel di Terminal buat lanjut ngobrol di sesi yang sama. Tugas dari kotak surat jalan di belakang layar, jadi **gak muncul di daftar sesi Claude Desktop**. Ngikutinnya lewat kantor dan kotak surat. Pakai jatah akun `claude` di Mac kamu (Pro), kecuali ada `ANTHROPIC_API_KEY` yang aktif. Cek: `echo $ANTHROPIC_API_KEY` (kosong = aman).

**Biar gak bingung sesi yang mana:**
- Tiap surat dapet **judul otomatis** dari kalimat pertama tugasmu. Mau ganti? Ketik langsung di kotak judul dalam surat.
- Di kiri kotak surat ada **satu daftar chat**, kayak sidebar Claude: tombol **＋ Chat baru** di atas, kotak cari, filter status, lalu semua chat dikelompokin per hari (Hari ini, Kemarin, 7 hari terakhir, Lebih lama). Isinya chat dari kotak surat **dan** semua sesi Claude Code di Mac ini 30 hari terakhir (Terminal dan Desktop juga, ditandai 💬). Klik salah satu buat buka chat-nya. Kalau itu sesi dari luar kantor, tulis lanjutannya di bawah dan Claude meneruskan sesi yang sama (nggak bisa kalau sesinya lagi aktif di tempat lain, "● lagi jalan"). Ada tombol **📋 Salin perintah Terminal** juga. Tulisan di kotak surat pakai font biasa biar gampang dibaca.
- **Daftar proyek** di form tugas diambil dari folder yang dipakai Claude Code di Mac kamu dalam 45 hari terakhir (maksimal 15, plus folder workspace kantor), sekarang lengkap sama path-nya.

**Boleh commit (opsional):** di form tugas ada centang **🔀 Boleh commit** (default mati). Kalau dicentang, tugas itu boleh `git add` dan `git commit` waktu mengerjakan (bukan di tahap rencana atau mode cuma laporan). **`git push` tetap nggak pernah boleh**, jadi kamu yang push dari Terminal. Tanpa centang itu, commit ditolak otomatis karena tugas dari kotak surat jalan tanpa layar izin.

**Batasan biar aman:**
- Tugas cuma boleh ngelakuin hal sesuai jabatannya. Pip dan Gus cuma baca. Wren dan Bayu boleh ngedit dan jalanin
  test. Command lain ditolak otomatis, jadi Claude gak bakal nanya-nanya izin di tengah jalan.
- Kirim tugas **cuma bisa dari Mac** yang nyalain kantor. Dari HP (lewat tunnel) kamu tetap bisa baca surat, tapi gak
  bisa ngirim tugas.
- Maksimal 3 tugas jalan barengan, dan tiap tugas otomatis dihentikan setelah 30 menit.
- Tugas ini pakai akun Claude Code kamu yang biasa, jadi ikut kepake kuotanya.
- Kotak suratnya belum ada di dinding? Jalanin `npm run layout`, atau klik **Layout**, cari **Mailbox**, terus
  tempel di dinding.

**Cara kerja** (pilih pas ngirim tugas, mirip mode di Claude Code):

| Pilihan | Artinya |
| --- | --- |
| 📝 **Rencana dulu** | Dia cuma baca-baca dulu terus nulis rencana. Suratnya nunggu kamu: **✅ Setujui** (baru dia kerjain), **✏️ Revisi** (tulis apa yang mau diubah, dia bikin rencana baru), atau **❌ Tolak**. Default buat Shades. |
| ⚡ **Langsung jalan** | Langsung dikerjain. Default buat karyawan lain. |
| 👀 **Cuma laporan** | Cuma baca dan ngecek, gak ngubah apa pun. |

## Shades, direktur kantor 🕶️

Shades (kacamata item, jas biru tua, dasi merah) **selalu ada di kantor**, walaupun lagi gak ada sesi Claude sama
sekali. Ruangannya di pojok kanan atas: meja direktur, kursi merah, lantai parket. Kalau lagi gak ada tugas, dia
kerja di mejanya, baca-baca, sesekali jalan-jalan dan ngobrol sama yang lain.

**Cara nyuruh Shades:**
1. Pastiin karyawan udah dipasang (`npm run staff`), terus restart kantor.
2. Buka **kotak surat → ✉️ Tugas baru**. Shades udah kepilih otomatis.
3. Pilih **Cara kerja** (default *Rencana dulu*) dan **Gaya kerja Shades**:
   - **💰 Hemat** (default): Shades kerja sendirian di **satu** sesi, jadi kuotanya irit. Tapi kantornya tetap rame:
     pas mulai ada **rapat singkat di meja meeting** sama tim yang dibutuhin, terus tiap Shades baca kode, Iris (atau Gus pas
     lagi bikin rencana) ikut duduk di meja baca-baca; pas ngetes Wren yang sibuk, pas ngecek git Pip, pas nulis
     dokumen Sari, pas ngedit kode Bayu. Balon Shades bilang lagi "Ngarahin Wren" dan seterusnya. Timnya pulang
     sendiri sekitar setengah menit setelah tugas beres.
   - **👥 Delegasi beneran**: Shades beneran manggil karyawan sebagai subagent, satu-satu. Lebih "asli", tapi kuotanya
     lebih boros.
4. Kalau rencananya udah siap, Shades bilang **"Rencana siap — cek surat"** dan ada angka merah di kotak surat. Baca,
   terus klik **✅ Setujui**, **✏️ Revisi**, atau **❌ Tolak**.
5. Hasil akhirnya datang sebagai surat **📜 Laporan untuk Komisaris** (kamu komisarisnya 😎): ringkasan, siapa ngerjain
   apa, hasil dan buktinya, hal yang perlu kamu putusin, dan langkah berikutnya.

Catatan: Shades ngerjain satu tugas sekali waktu. Kalau dia lagi sibuk, tunggu tugasnya beres dulu. Ruang direkturnya
gak muncul di kantor lama? Jalanin `npm run layout` (layout lama dibackup dulu).

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
