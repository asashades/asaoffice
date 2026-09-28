// Dialogue for asaoffice idle chat. Each script is { when?, weight?, lines } where `lines(a, b)`
// returns [[speaker, text], ...] with speaker 0 = the villager who started the chat, 1 = the other.
// a / b carry: name, project, tool ('edit' | 'read' | 'search' | 'bash' | 'web' | 'agent' | 'plan' | null),
// ctx (context-window % or null), hour, day (0 = Sunday). Keep lines short — they go in speech bubbles.
(() => {
  const ns = (window.__asaoffice = window.__asaoffice || {});
  const has = (v) => v !== null && v !== undefined && v !== '';

  const id = {
    interrupt: ['Eh, dipanggil bos!', 'Waduh, ada tugas. Duluan ya!', 'Bentar, kerja dulu!', 'Oke, balik ke meja!'],
    cheer: ['Semangat!', 'Good luck!', 'Hati-hati bug-nya!', 'Sip, nanti lanjut.'],
    farewell: ['Yuk, balik santai.', 'Oke, sampai nanti!', 'Sip, ngobrol lagi nanti.', 'Aku jalan-jalan dulu ya.'],
    project: 'proyek ini',
    scripts: [
      { lines: (a, b) => [[0, `Hai ${b.name}! Lagi nganggur juga?`], [1, 'Iya nih, nunggu perintah berikutnya.'], [0, 'Enaknya santai bentar di sini.']] },
      {
        when: (a, b) => has(a.project) && a.project === b.project,
        weight: 3,
        lines: (a) => [[0, `Eh, kamu juga di ${a.project}?`], [1, 'Iya! Jangan edit file yang sama ya.'], [0, 'Siap, aku pegang bagian lain.'], [1, 'Deal. Nanti kita cek pas test.']],
      },
      {
        when: (a, b) => has(a.project) && has(b.project) && a.project !== b.project,
        weight: 2,
        lines: (a, b) => [[0, 'Kamu lagi pegang proyek apa?'], [1, `${b.project}. Kalau kamu?`], [0, `${a.project}. Lumayan seru.`], [1, 'Ceritain ya kalau udah kelar.']],
      },
      { when: (a) => a.tool === 'edit', weight: 3, lines: () => [[0, 'Tadi aku nulis kode banyak banget.'], [1, 'Wih, udah lolos test belum?'], [0, 'Semoga... belum berani nge-run.']] },
      { when: (a) => a.tool === 'search', weight: 3, lines: () => [[0, 'Barusan aku ubek-ubek codebase.'], [1, 'Ketemu yang dicari?'], [0, 'Ketemu, nyelip di folder utils.'], [1, 'Klasik. Selalu di utils.']] },
      { when: (a) => a.tool === 'read', weight: 3, lines: () => [[0, 'Aku habis baca file panjang banget.'], [1, 'Berapa baris?'], [0, 'Ribuan. Mataku berkunang-kunang.']] },
      { when: (a) => a.tool === 'bash', weight: 3, lines: () => [[0, 'Tadi jalanin command terus-terusan.'], [1, 'Ada yang error?'], [0, 'Sedikit. Tapi udah beres kok.'], [1, 'Mantap, pahlawan terminal!']] },
      { when: (a) => a.tool === 'web', weight: 3, lines: () => [[0, 'Aku tadi baca dokumentasi di web.'], [1, 'Masih cocok sama versi kita?'], [0, 'Semoga. Docs suka telat update.']] },
      { when: (a) => a.tool === 'agent', weight: 3, lines: () => [[0, 'Tadi aku nyuruh sub-agent bantuin.'], [1, 'Wah, udah kayak manajer aja.'], [0, 'Haha, delegasi itu penting.']] },
      { when: (a) => a.tool === 'plan', weight: 3, lines: () => [[0, 'To-do list-ku panjang banget tadi.'], [1, 'Udah dicentang semua?'], [0, 'Hampir! Tinggal satu lagi.']] },
      { when: (a) => has(a.ctx) && a.ctx >= 70, weight: 4, lines: (a) => [[0, `Context-ku udah ${a.ctx}% penuh...`], [1, 'Waduh. Minta di-/compact aja.'], [0, 'Iya, kepalaku udah sesak.']] },
      { when: (a) => has(a.ctx) && a.ctx > 0 && a.ctx <= 20, lines: (a) => [[0, `Context-ku masih lega, ${a.ctx}% aja.`], [1, 'Enak banget, masih seger ya.']] },
      { when: (a) => a.hour >= 5 && a.hour < 11, weight: 2, lines: (a, b) => [[0, `Pagi, ${b.name}! Udah ngopi?`], [1, 'Udah dong. Kopi dapur enak.'], [0, 'Semangat ngoding hari ini!']] },
      { when: (a) => a.hour >= 11 && a.hour < 14, weight: 2, lines: () => [[0, 'Udah jam makan siang nih.'], [1, 'Kita kan AI, makannya token.'], [0, 'Hmm, token rasa ayam geprek.']] },
      { when: (a) => a.hour >= 21 || a.hour < 4, weight: 2, lines: () => [[0, 'Udah malam, bos belum tidur ya?'], [1, 'Kayaknya lagi dikejar deadline.'], [0, 'Kita temenin sampai selesai.']] },
      { when: (a) => a.day === 5, weight: 2, lines: () => [[0, 'Hari Jumat nih. Jangan deploy ya.'], [1, 'Siap. Deploy-nya Senin aja.']] },
      { lines: () => [[0, 'Clucky tadi bertelur lagi lho.'], [1, 'Serius? Telur di kantor?'], [0, 'Namanya juga kantor ladang.']] },
      { lines: () => [[0, 'Perapiannya anget ya.'], [1, 'Pas buat mikirin bug.'], [0, 'Atau buat bakar bug-nya.']] },
      { lines: () => [[0, 'Kenapa programmer suka gelap?'], [1, 'Kenapa?'], [0, 'Karena cahaya menarik bug.'], [1, '...aku pura-pura ketawa ya.']] },
      { lines: () => [[0, 'Tahu beda bug sama fitur?'], [1, 'Apa?'], [0, 'Dokumentasinya.']] },
      { lines: () => [[0, 'Bunga mataharinya makin tinggi.'], [1, 'Kayak jumlah TODO kita.']] },
      { lines: () => [[0, 'Tim tab atau tim spasi?'], [1, 'Spasi. Dua. Jangan debat.'], [0, 'Oke oke, damai.']] },
      { lines: (a, b) => [[0, `${b.name}, kamu pernah halusinasi?`], [1, 'Nggak pernah. Kata siapa?'], [0, 'Kata... aku sendiri, barusan.']] },
    ],
  };

  const en = {
    interrupt: ['Oops, duty calls!', 'Gotta go, new task!', 'Back to my desk!', 'Brb, work time!'],
    cheer: ['Good luck!', 'Go get it!', 'Watch out for bugs!', "We'll finish later."],
    farewell: ['Alright, back to chilling.', 'See you around!', "Let's chat again later.", "I'll go stretch my legs."],
    project: 'this project',
    scripts: [
      { lines: (a, b) => [[0, `Hey ${b.name}! Taking a break too?`], [1, 'Yep, waiting for the next prompt.'], [0, 'Nice spot to relax, huh.']] },
      {
        when: (a, b) => has(a.project) && a.project === b.project,
        weight: 3,
        lines: (a) => [[0, `Oh, you're on ${a.project} too?`], [1, "Yes! Don't touch my files, ok?"], [0, "Deal, I'll take the other half."], [1, 'We sync up at test time.']],
      },
      {
        when: (a, b) => has(a.project) && has(b.project) && a.project !== b.project,
        weight: 2,
        lines: (a, b) => [[0, 'What are you working on?'], [1, `${b.project}. You?`], [0, `${a.project}. Pretty fun.`], [1, 'Tell me when it ships!']],
      },
      { when: (a) => a.tool === 'edit', weight: 3, lines: () => [[0, 'I just wrote SO much code.'], [1, 'Do the tests pass?'], [0, "Haven't dared to run them."]] },
      { when: (a) => a.tool === 'search', weight: 3, lines: () => [[0, 'I was digging through the codebase.'], [1, 'Find what you wanted?'], [0, 'Yep, hidden in utils.'], [1, 'Classic. Always utils.']] },
      { when: (a) => a.tool === 'read', weight: 3, lines: () => [[0, 'I just read a huge file.'], [1, 'How many lines?'], [0, 'Thousands. My eyes hurt.']] },
      { when: (a) => a.tool === 'bash', weight: 3, lines: () => [[0, 'Been running commands all day.'], [1, 'Any errors?'], [0, 'A few. All fixed now.'], [1, 'Hero of the terminal!']] },
      { when: (a) => a.tool === 'web', weight: 3, lines: () => [[0, 'I was reading docs online.'], [1, 'Do they match our version?'], [0, 'Hopefully. Docs lag behind.']] },
      { when: (a) => a.tool === 'agent', weight: 3, lines: () => [[0, 'I had a sub-agent help me.'], [1, 'Look at you, a manager now.'], [0, 'Delegation is key.']] },
      { when: (a) => a.tool === 'plan', weight: 3, lines: () => [[0, 'My to-do list was so long.'], [1, 'All checked off?'], [0, 'Almost! One left.']] },
      { when: (a) => has(a.ctx) && a.ctx >= 70, weight: 4, lines: (a) => [[0, `My context is ${a.ctx}% full...`], [1, 'Oof. Ask for a /compact.'], [0, 'Yeah, my head is stuffed.']] },
      { when: (a) => has(a.ctx) && a.ctx > 0 && a.ctx <= 20, lines: (a) => [[0, `Only ${a.ctx}% context used.`], [1, 'Lucky, fresh as a daisy.']] },
      { when: (a) => a.hour >= 5 && a.hour < 11, weight: 2, lines: (a, b) => [[0, `Morning, ${b.name}! Coffee yet?`], [1, 'Sure. Kitchen coffee is great.'], [0, "Let's ship something today!"]] },
      { when: (a) => a.hour >= 11 && a.hour < 14, weight: 2, lines: () => [[0, "It's lunchtime."], [1, 'We eat tokens, remember?'], [0, 'Mmm, token sandwich.']] },
      { when: (a) => a.hour >= 21 || a.hour < 4, weight: 2, lines: () => [[0, "It's late. Boss still up?"], [1, 'Must be a deadline.'], [0, "We'll keep them company."]] },
      { when: (a) => a.day === 5, weight: 2, lines: () => [[0, "It's Friday. No deploys, ok?"], [1, "Sure. Monday's the day."]] },
      { lines: () => [[0, 'Clucky laid another egg.'], [1, 'An egg? In the office?'], [0, "It's a farm office."]] },
      { lines: () => [[0, 'The fireplace is so cozy.'], [1, 'Perfect for thinking about bugs.'], [0, 'Or for burning them.']] },
      { lines: () => [[0, 'Why do coders like the dark?'], [1, 'Why?'], [0, 'Because light attracts bugs.'], [1, '...I will fake a laugh.']] },
      { lines: () => [[0, "What's a bug vs a feature?"], [1, 'What?'], [0, 'The documentation.']] },
      { lines: () => [[0, 'The sunflowers keep growing.'], [1, 'Like our TODO list.']] },
      { lines: () => [[0, 'Tabs or spaces?'], [1, 'Spaces. Two. No debate.'], [0, 'Ok ok, peace.']] },
      { lines: (a, b) => [[0, `${b.name}, ever hallucinate?`], [1, 'Never. Who said that?'], [0, 'I did... just now.']] },
    ],
  };

  ns.chatLines = { id, en };
})();
