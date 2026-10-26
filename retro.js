/* KBA Mock Exams: 8-bit extras for the lesson pages
   - "Back to camp" link to the title screen
   - Animated pixel-art banner on the results screen (the only art on lesson pages) */
(function () {
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function onReady(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  onReady(function () {
    // ---------- back to camp link ----------
    var wrap = document.querySelector('.wrap');
    var strip = document.querySelector('.top-strip');
    if (wrap && strip && !document.querySelector('.back-camp')) {
      var a = document.createElement('a');
      a.className = 'back-camp';
      a.href = 'index.html';
      a.textContent = '◀ BACK TO CAMP';
      wrap.insertBefore(a, strip);
    }

    // ---------- answer key button + confirm pop-up ----------
    var startScreen = document.getElementById('screen-start');
    var reshuffle = document.getElementById('btn-reshuffle');
    if (startScreen && reshuffle && typeof window.kbaAnswerKey === 'function' && !document.getElementById('btn-answer-key')) {
      var keyBtn = document.createElement('button');
      keyBtn.type = 'button';
      keyBtn.id = 'btn-answer-key';
      keyBtn.className = 'btn-key';
      keyBtn.textContent = '🔑 SHOW ALL ANSWERS';
      reshuffle.insertAdjacentElement('afterend', keyBtn);

      var modal = document.createElement('div');
      modal.className = 'key-modal hidden';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'key-modal-title');
      modal.innerHTML =
        '<div class="key-box">' +
          '<p class="key-title" id="key-modal-title">🔑 SHOW ALL ANSWERS?</p>' +
          '<p class="key-text">This will complete the quiz and show you all the answers, then take you to the end. It won\'t count as a real score.</p>' +
          '<div class="key-actions">' +
            '<button type="button" class="key-cancel">CANCEL</button>' +
            '<button type="button" class="key-yes">YES, SHOW ME</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);
      var yes = modal.querySelector('.key-yes'), no = modal.querySelector('.key-cancel');
      var openModal = function () { modal.classList.remove('hidden'); no.focus(); };
      var closeModal = function () { modal.classList.add('hidden'); keyBtn.focus(); };
      keyBtn.addEventListener('click', openModal);
      no.addEventListener('click', closeModal);
      modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
      document.addEventListener('keydown', function (e) {
        if (modal.classList.contains('hidden')) return;
        if (e.key === 'Escape') closeModal();
        if (e.key === 'Tab') { e.preventDefault(); (document.activeElement === no ? yes : no).focus(); }
      });
      yes.addEventListener('click', function () {
        modal.classList.add('hidden');
        window.kbaAnswerKey();
        window.scrollTo(0, 0);
      });
    }

    // leaving answer key mode when they retake
    var retake = document.getElementById('btn-retake');
    if (retake) retake.addEventListener('click', function () {
      window.kbaKeyMode = false;
      document.body.classList.remove('answer-key');
    });

    function applyKeyMode() {
      document.body.classList.add('answer-key');
      var n = document.getElementById('score-num'); if (n) n.textContent = 'ANSWER KEY';
      var v = document.getElementById('score-verdict'); if (v) v.textContent = 'All 20 answers and explanations are below. Study them, then retake the quiz for a real score.';
      var rb = document.getElementById('btn-retake'); if (rb) rb.textContent = '▶ NOW TRY FOR REAL';
    }

    // ---------- results banner ----------
    var results = document.getElementById('screen-results');
    var scoreWrap = results && results.querySelector('.score-wrap');
    if (!results || !scoreWrap) return;
    var running = false;
    new MutationObserver(function () {
      var shown = !results.classList.contains('hidden');
      if (shown && !running) showBanner();
      if (!shown) running = false;
    }).observe(results, { attributes: true, attributeFilter: ['class'] });

    function showBanner() {
      var pctEl = document.getElementById('score-pct');
      var pct = parseInt((pctEl && pctEl.textContent) || '0', 10) || 0;
      var rbtn = document.getElementById('btn-retake'); if (rbtn && !window.kbaKeyMode) rbtn.textContent = '\uD83D\uDD01 CONTINUE? RETAKE';
      var mood = window.kbaKeyMode ? 'key' : pct >= 70 ? 'pass' : pct >= 50 ? 'mid' : 'fail';

      var old = scoreWrap.querySelector('.result-banner'); if (old) old.remove();
      var oldT = scoreWrap.querySelector('.stage-title'); if (oldT) oldT.remove();
      var emoji = document.getElementById('score-emoji'); if (emoji) emoji.style.display = 'none';

      var cv = document.createElement('canvas');
      cv.className = 'result-banner';
      cv.width = 160; cv.height = 56;
      cv.setAttribute('aria-hidden', 'true');
      scoreWrap.insertBefore(cv, scoreWrap.firstChild);

      var title = document.createElement('p');
      title.className = 'stage-title ' + mood;
      title.textContent = mood === 'key' ? '\uD83D\uDD11 ANSWER KEY MODE' : mood === 'pass' ? '★ STAGE CLEAR ★' : mood === 'mid' ? 'CHECKPOINT REACHED' : 'GAME OVER... CONTINUE?';
      if (mood === 'key') applyKeyMode();
      cv.insertAdjacentElement('afterend', title);
      addCredits(mood);
      addShareButton();

      running = true;
      animate(cv.getContext('2d'), mood);
    }

    // ---------- share my results (score card image) ----------
    var LESSONS = {
      'lesson1-5': ['Lessons 1-5', 'Configuration, Object Manager, Sales & Marketing'],
      'lesson6': ['Lesson 6', 'Data Security & User Management'],
      'lesson7-9': ['Lessons 7-9', 'Object Manager & App Builder, Productivity & Collaboration'],
      'lesson603': ['Lesson 603', 'Reports, Dashboards & Forecasting, Data Management'],
      'lesson604': ['Lesson 604', 'Flows, Order of Execution & Approval Processes']
    };
    var SITE = 'https://clarrent.github.io/per-scholas-kba-mock-exam-salesforce-adminstrator-course-2026/';
    var page = (location.pathname.split('/').pop() || '').replace('.html', '');
    var lessonInfo = LESSONS[page] || ['KBA Practice', 'Salesforce Admin'];

/* Score card image (1080x1350) for sharing on LinkedIn / Instagram.
       drawScoreCard(canvas, data, bannerImage) -> draws the card. */
    function drawScoreCard(cv, d, banner) {
      var W = 1080, H = 1350;
      cv.width = W; cv.height = H;
      var c = cv.getContext('2d');
      c.imageSmoothingEnabled = false;
      var PIX = '"Press Start 2P", monospace', SANS = 'Manrope, "Segoe UI", sans-serif';
      var ink = '#F5EDE0', soft = '#B9A8C8', gold = '#FFD23F', orange = '#FF8A1F', purple = '#A86BFF', green = '#7FDB5A', red = '#FF6B6B';
    
      // background
      var g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0A0716'); g.addColorStop(1, '#1D1640');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      // pixel frame
      c.fillStyle = '#000'; c.fillRect(36, 36, W - 72, H - 72);
      c.fillStyle = ink; c.fillRect(42, 42, W - 84, H - 84);
      c.fillStyle = '#0E0918'; c.fillRect(50, 50, W - 100, H - 100);
    
      // campfire banner (pixel art, scaled up crisply)
      var bx = 50, by = 50, bw = W - 100, bh = Math.round(bw * 56 / 160);
      if (banner) c.drawImage(banner, bx, by, bw, bh);
      c.fillStyle = ink; c.fillRect(bx, by + bh, bw, 6);
    
      var y = by + bh + 70;
      c.textAlign = 'center';
      // label
      c.fillStyle = purple; c.font = '22px ' + PIX;
      c.fillText('PRACTICE EXAM RESULT', W / 2, y);
      // score
      y += 130;
      c.font = '110px ' + PIX;
      c.fillStyle = '#6A2A00'; c.fillText(d.pct + '%', W / 2 + 8, y + 8);
      c.fillStyle = d.pct >= 70 ? gold : orange; c.fillText(d.pct + '%', W / 2, y);
      y += 60;
      c.fillStyle = ink; c.font = '700 34px ' + SANS;
      c.fillText(d.correct + ' of ' + d.total + ' correct' + (d.pct >= 70 ? '  ·  Passed' : ''), W / 2, y);
    
      // name (optional)
      if (d.name) {
        y += 70;
        c.fillStyle = orange; c.font = '26px ' + PIX;
        c.fillText(d.name.toUpperCase(), W / 2, y);
      }
    
      // lesson + topics
      y += 80;
      c.fillStyle = ink; c.font = '800 38px ' + SANS;
      c.fillText(d.lesson, W / 2, y);
      y += 46;
      c.fillStyle = soft; c.font = '600 28px ' + SANS;
      wrap(c, d.topics, W / 2, y, W - 220, 36).forEach(function (line, i) { c.fillText(line, W / 2, y + i * 36); });
      y += 36 * wrap(c, d.topics, W / 2, y, W - 220, 36).length;
    
      // topic bars
      y += 30;
      c.textAlign = 'left';
      var left = 140, barW = W - 280;
      d.domains.forEach(function (dm) {
        c.fillStyle = ink; c.font = '600 26px ' + SANS;
        c.fillText(dm.name, left, y);
        c.textAlign = 'right'; c.font = '20px ' + PIX; c.fillStyle = soft;
        c.fillText(dm.right + '/' + dm.total, left + barW, y);
        c.textAlign = 'left';
        y += 16;
        c.fillStyle = '#000'; c.fillRect(left, y, barW, 22);
        c.fillStyle = '#4A3A63'; c.fillRect(left, y, barW, 3);
        var p = dm.right / dm.total, col = p >= 0.8 ? green : p >= 0.6 ? orange : red;
        var segs = Math.round(p * 40);
        for (var i = 0; i < segs; i++) { c.fillStyle = col; c.fillRect(left + 4 + i * (barW - 8) / 40, y + 5, (barW - 8) / 40 - 4, 13); }
        y += 58;
      });
    
      // footer
      c.textAlign = 'center';
      var fy = H - 150;
      c.fillStyle = '#4A3A63'; c.fillRect(140, fy - 50, W - 280, 3);
      c.fillStyle = ink; c.font = '700 28px ' + SANS;
      c.fillText('Salesforce Admin Bootcamp Training', W / 2, fy);
      c.fillStyle = soft; c.font = '600 24px ' + SANS;
      c.fillText(d.date + '  ·  Practice exam, not an official KBA score', W / 2, fy + 40);
      c.fillStyle = orange; c.font = '16px ' + PIX;
      c.fillText('PRACTICE AT CLARRENT.GITHUB.IO', W / 2, fy + 84);
    
      function wrap(ctx, text, x, yy, maxW) {
        var words = text.split(' '), lines = [], line = '';
        words.forEach(function (w) {
          var t = line ? line + ' ' + w : w;
          if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
        });
        if (line) lines.push(line);
        return lines;
      }
    }

    function readResults() {
      var nums = (document.getElementById('score-num').textContent.match(/\d+/g) || [0, 20]).map(Number);
      var pct = parseInt(document.getElementById('score-pct').textContent, 10) || 0;
      var domains = Array.prototype.map.call(document.querySelectorAll('#breakdown-rows .bd-row'), function (row) {
        var nameEl = row.querySelector('.name');
        var name = nameEl ? nameEl.childNodes[0].textContent.replace(/\s*\(.*?\)\s*$/, '').trim() : '';
        var f = (row.querySelector('.frac').textContent.match(/\d+/g) || [0, 1]).map(Number);
        return { name: name, right: f[0], total: f[1] };
      });
      var d = new Date();
      return {
        pct: pct, correct: nums[0], total: nums[1] || 20, lesson: lessonInfo[0], topics: lessonInfo[1], domains: domains,
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      };
    }
    function captionFor(r) {
      if (r.pct >= 70) {
        return 'Putting in the reps for my Salesforce Admin KBA. Scored ' + r.pct + '% (' + r.correct + '/' + r.total + ') on the ' +
          r.lesson + ' practice exam covering ' + r.topics + '. On to the next one! 🐢\n\nPractice here: ' + SITE +
          '\n\n#Salesforce #Trailblazer #SalesforceAdmin';
      }
      return 'Back at the campfire, sharpening up for my Salesforce Admin KBA. Just practiced ' + r.lesson + ' (' + r.topics +
        ') and scored ' + r.pct + '%. Every attempt counts! 🔥\n\nPractice here: ' + SITE + '\n\n#Salesforce #Trailblazer #SalesforceAdmin';
    }

    var shareModal = null, shareFile = null, shareBlobUrl = null;
    function buildShareModal() {
      shareModal = document.createElement('div');
      shareModal.className = 'key-modal share-modal hidden';
      shareModal.setAttribute('role', 'dialog');
      shareModal.setAttribute('aria-modal', 'true');
      shareModal.setAttribute('aria-labelledby', 'share-title');
      shareModal.innerHTML =
        '<div class="key-box share-box">' +
          '<p class="key-title" id="share-title">📸 SHARE MY RESULTS</p>' +
          '<label class="share-label" for="share-name">Your name (optional)</label>' +
          '<input id="share-name" class="share-name" type="text" maxlength="32" autocomplete="name" placeholder="Type your name">' +
          '<canvas class="share-preview" aria-label="Preview of your score card"></canvas>' +
          '<label class="share-label" for="share-caption">Caption (edit if you like)</label>' +
          '<textarea id="share-caption" class="share-caption" rows="5"></textarea>' +
          '<div class="share-actions">' +
            '<button type="button" class="key-yes share-go">📤 SHARE IMAGE</button>' +
            '<button type="button" class="key-cancel share-save">⬇ SAVE IMAGE</button>' +
            '<button type="button" class="key-cancel share-copy">📋 COPY CAPTION</button>' +
          '</div>' +
          '<p class="share-note" aria-live="polite"></p>' +
          '<button type="button" class="share-close">CLOSE</button>' +
        '</div>';
      document.body.appendChild(shareModal);
      var nameIn = shareModal.querySelector('#share-name');
      var cap = shareModal.querySelector('#share-caption');
      var note = shareModal.querySelector('.share-note');
      var close = function () { shareModal.classList.add('hidden'); var b = document.getElementById('btn-share'); if (b) b.focus(); };
      shareModal.querySelector('.share-close').addEventListener('click', close);
      shareModal.addEventListener('click', function (e) { if (e.target === shareModal) close(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !shareModal.classList.contains('hidden')) close(); });
      var timer = null;
      nameIn.addEventListener('input', function () {
        try { localStorage.setItem('kbaShareName', nameIn.value.trim()); } catch (e) {}
        clearTimeout(timer); timer = setTimeout(renderCard, 150);
      });
      function download() {
        if (!shareBlobUrl) return;
        var a = document.createElement('a');
        a.href = shareBlobUrl; a.download = 'kba-practice-' + page + '.png';
        document.body.appendChild(a); a.click(); a.remove();
      }
      shareModal.querySelector('.share-save').addEventListener('click', function () { download(); note.textContent = 'Image saved. Post it with the caption above.'; });
      shareModal.querySelector('.share-go').addEventListener('click', function () {
        var data = { files: shareFile ? [shareFile] : [], text: cap.value, title: 'My KBA practice score' };
        if (shareFile && navigator.canShare && navigator.canShare({ files: [shareFile] })) {
          navigator.share(data).catch(function () {});
          // some apps drop the text, so keep the caption handy too
          copyText(cap.value, true);
        } else {
          download(); copyText(cap.value, true);
          note.textContent = 'Image saved and caption copied. Upload the image to LinkedIn, Instagram, Slack or Teams and paste the caption.';
        }
      });
      shareModal.querySelector('.share-copy').addEventListener('click', function () { copyText(cap.value, false); });
      function copyText(text, quiet) {
        var done = function () { if (!quiet) note.textContent = 'Caption copied.'; };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { fallback(); });
        else fallback();
        function fallback() { cap.select(); try { document.execCommand('copy'); done(); } catch (e) {} }
      }
    }

    var cardCanvas = null, bannerSnap = null;
    function renderCard() {
      var data = readResults();
      var nameIn = shareModal.querySelector('#share-name');
      data.name = nameIn.value.trim();
      if (!cardCanvas) cardCanvas = document.createElement('canvas');
      drawScoreCard(cardCanvas, data, bannerSnap);
      var prev = shareModal.querySelector('.share-preview');
      prev.width = cardCanvas.width; prev.height = cardCanvas.height;
      prev.getContext('2d').drawImage(cardCanvas, 0, 0);
      cardCanvas.toBlob(function (blob) {
        if (!blob) return;
        if (shareBlobUrl) URL.revokeObjectURL(shareBlobUrl);
        shareBlobUrl = URL.createObjectURL(blob);
        try { shareFile = new File([blob], 'kba-practice-' + page + '.png', { type: 'image/png' }); } catch (e) { shareFile = null; }
      }, 'image/png');
    }

    function openShare() {
      if (!shareModal) buildShareModal();
      // freeze the current frame of the campfire banner for the card
      var live = document.querySelector('.result-banner');
      bannerSnap = document.createElement('canvas'); bannerSnap.width = 160; bannerSnap.height = 56;
      if (live) bannerSnap.getContext('2d').drawImage(live, 0, 0);
      var nameIn = shareModal.querySelector('#share-name');
      try { nameIn.value = localStorage.getItem('kbaShareName') || ''; } catch (e) {}
      shareModal.querySelector('#share-caption').value = captionFor(readResults());
      shareModal.querySelector('.share-note').textContent = '';
      shareModal.classList.remove('hidden');
      var go = function () { renderCard(); nameIn.focus(); };
      if (document.fonts && document.fonts.load) {
        Promise.all([document.fonts.load('22px "Press Start 2P"'), document.fonts.load('700 28px Manrope'), document.fonts.load('600 24px Manrope')]).then(go, go);
      } else go();
    }

    function addShareButton() {
      if (document.getElementById('btn-share')) return;
      var row = results.querySelector('.btn-row');
      if (!row) return;
      var b = document.createElement('button');
      b.type = 'button'; b.id = 'btn-share'; b.className = 'btn-share';
      b.textContent = '📸 SHARE MY RESULTS';
      b.addEventListener('click', openShare);
      row.insertAdjacentElement('afterend', b);
    }

    // ---------- credits card ----------
    var PORTRAIT = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAACsklEQVR4nLVWMWgaURj+IpIhOIiEDIcUkSBSQhCHIxSn0EFCKaVTcHDoEMoRQnDIUA4ROTpkkFLKkSmUI0iGEkIowaGEDCGUo4iDFBGREsRBikiQDqXQDva9vjvvfO+sfiDn+////d/3vrt79xaG5Y+/MQViStYx3tQNT31805IHlhYdf27C3LDgxQHSPLC0OLFu+OOnsBPCDrCrBgA5LtGcHJcsYy9OCAkg5CyZ2ejSsdnowmx0pxLBFWAnJ2TsmMAuQgSeHkKWzGnsFpuZgHnAL1IUkZbxrfsdAFA5fMGtTx8cIyIto97iuyHsgL7zWIg8FA4L1REIOUCQPji2jAmRPW6W8/MR4LYye7zf6cxWwOheJpBUdBqr6oqlxp4Tuf8AZyuOKVncvHtJm7OkLKFbrqorSO0eTdyWuQ60W3eo6gptGn6Ww3osbiF1y7Vbd7z23veBznkJl4c7FoFuORFwHYiuPgAAfMg9gXZyjbPbrwCslrMOPX/0kObI3KkFNHWDflCM/a0x4sqnL4hFVixx7eQaAJDaPaI9phZgF0FI3982/xUw/0/zmbG5PAgfSGJKFumNOOrtLk7zGfRavyz5lVU/totlrEUlVD43hA8knjaienv0bm8XywCAtahEY/YaUfgAYNgfgHdt6gY6vXsuWad3j6r2ltuPXH3D/gCBUBAiVycRTuSi/QKh4OgZ4BXZj1bG/hZelW8ssdeZFLJvLi0xETH+ScmkugcAuKhc0aZqQaOEdqxvbEIrqHScTG8CGL0NnhwgK2aJAcA0a5DlBBVhh1ZQaQ2Lp3+FODnid1qxWiyNNfkfXFSuYJo12p91hDqQVPcmEvNWT+DmAttHy+eoCJ8I+SwhywmoxdLouB8KwhcIBbmTJq3IjcQ0a9w66oBIQ68QmSPswLww7A/wB56Ryqr7PsaHAAAAAElFTkSuQmCC';
    var LINKEDIN = 'https://www.linkedin.com/in/clarrent-n-b340b79b/';
    function addCredits(mood) {
      if (document.querySelector('.credit-card')) return;
      var card = document.createElement('section');
      card.className = 'card credit-card';
      card.setAttribute('aria-label', 'Credits');
      card.innerHTML =
        '<p class="cc-head">\u2605 CREDITS \u2605</p>' +
        '<div class="cc-row">' +
          '<img class="cc-portrait" src="' + PORTRAIT + '" alt="8-bit portrait of Clarrent Nguyen" width="96" height="96">' +
          '<div class="cc-text">' +
            '<p class="cc-role">BUILT BY</p>' +
            '<p class="cc-name">CLARRENT NGUYEN</p>' +
            '<p class="cc-body">I built these mock exams for my classmates and every learner in the bootcamp, so studying for the KBA feels a little less scary and a lot more fun.</p>' +
          '</div>' +
        '</div>' +
        '<p class="cc-ask">Enjoying it? A follow or a LinkedIn recommendation would mean a lot. \uD83D\uDC22</p>' +
        '<a class="cc-btn" href="' + LINKEDIN + '" target="_blank" rel="noopener">\u25B6 FOLLOW ON LINKEDIN</a>' +
        '<p class="cc-tip">To leave a recommendation: open my profile, tap <b>More</b>, then <b>Recommend</b>.</p>';
      var host = results.querySelector('.score-wrap');
      host.insertAdjacentElement('afterend', card);
    }

    // ---------- tiny pixel art kit ----------
    function px(c, x, y, col) { c.fillStyle = col; c.fillRect(x | 0, y | 0, 1, 1); }
    function rect(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x | 0, y | 0, w | 0, h | 0); }
    function sprite(w, h, fn, outline) {
      var cv = document.createElement('canvas'); cv.width = w + 2; cv.height = h + 2;
      var c = cv.getContext('2d'), g = [], x, y;
      for (y = 0; y < h; y++) { g[y] = []; for (x = 0; x < w; x++) g[y][x] = fn(x, y); }
      if (outline) for (y = -1; y <= h; y++) for (x = -1; x <= w; x++) {
        if (g[y] && g[y][x]) continue;
        if ((g[y] && (g[y][x - 1] || g[y][x + 1])) || (g[y - 1] && g[y - 1][x]) || (g[y + 1] && g[y + 1][x])) px(c, x + 1, y + 1, outline);
      }
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) if (g[y][x]) px(c, x + 1, y + 1, g[y][x]);
      return cv;
    }
    function turtle(eyesOpen) {
      return sprite(26, 14, function (x, y) {
        var dx = (x - 11) / 10, dy = (y - 8) / 7.2;
        if (y <= 8 && dx * dx + dy * dy <= 1) {
          if (y === 8) return '#D9B36A';
          if (y <= 2 && x > 6 && x < 13) return '#8FD27E';
          return (((x + (Math.floor(y / 3) % 2) * 2) % 5 === 0) || (y % 3 === 0 && y > 1)) ? '#2C5E33' : '#4E9A4C';
        }
        var hx = (x - 21.5) / 3.4, hy = (y - 7.2) / 3.0;
        if (hx * hx + hy * hy <= 1 && x >= 18) {
          if (y === 5 && x >= 19 && x <= 24) return '#FF8A1F';
          if (y === 7 && (eyesOpen ? x === 23 : (x === 22 || x === 23))) return '#1B2B17';
          return y >= 9 ? '#6FB052' : '#8FCF6A';
        }
        if ((x === 17 || x === 18) && (y === 3 || y === 4)) return '#FF8A1F';
        if (y >= 9 && y <= 11 && ((x >= 3 && x <= 6) || (x >= 13 && x <= 16))) return y === 11 ? '#6FB052' : '#8FCF6A';
        if (y === 9 && x <= 2) return '#8FCF6A';
        return null;
      }, '#0E1A10');
    }
    var trophy = sprite(9, 10, function (x, y) {
      if (y <= 4) { if (x >= 1 && x <= 7) return (x === 2 && y < 4) ? '#FFF3A0' : '#FFD23F'; if ((x === 0 || x === 8) && y >= 1 && y <= 2) return '#E0A800'; return null; }
      if (y <= 6 && x >= 3 && x <= 5) return '#E0A800';
      if (y >= 7 && x >= 2 && x <= 6) return y === 9 ? '#8A5A00' : '#FFD23F';
      return null;
    }, '#2A1A00');
    var pumpkin = sprite(9, 7, function (x, y) {
      if (y === 0) return x === 4 ? '#5A7A2A' : null;
      var dx = (x - 4) / 4.5, dy = (y - 4) / 3.1;
      if (dx * dx + dy * dy > 1) return null;
      if ((y === 3 && (x === 2 || x === 6)) || (y === 5 && x >= 2 && x <= 6 && x !== 4)) return '#FFD23F';
      return (x === 1 || x === 4 || x === 7) ? '#C2510A' : '#F07A1A';
    }, '#2A1206');
    var ghost = sprite(9, 10, function (x, y) {
      var dx = (x - 4) / 4.5, dy = (y - 4) / 4.5;
      var body = (y <= 4 && dx * dx + dy * dy <= 1) || (y > 4 && y < 9) || (y === 9 && x % 3 !== 1);
      if (!body) return null;
      if ((y === 4 && (x === 2 || x === 6)) || (y === 6 && x === 4)) return '#2A1636';
      return '#EDE7FF';
    }, null);
    var tSleep = turtle(false), tAwake = turtle(true);

    // mini Clarrent: 16x24 sprite, arms up to cheer or one arm waving
    var CLR = { H: '#261A18', h: '#5C4232', f: '#463430', S: '#DEA47A', s: '#BC805C', G: '#100E10', w: '#FAF4EC', E: '#281A14',
                B: '#36261F', M: '#C88076', J: '#CCC8D0', j: '#9692A0', T: '#484854', t: '#34343E', K: '#1A1012', O: '#2A1A1A' };
    var HEAD = [
      '................', '.......H..H.....', '.....HHHHHHH....', '....HHhHHHhHH...', '....fSSSSSSSf...',
      '....SHHSSHHS....', '...GGGGGGGGGG...', '....GwEGGwEG....', '....SSSssSSS....', '....SBBBBBBS....',
      '.....BMMMMB.....', '......BBBB......'];
    var BODY = [
      '...JJJTTTTJJJ...', '...JJJTTTTJJJ...', '....JJTTTTJJ....', '....JJTTTTJJ....', '....JJJJJJJJ....',
      '....tttttttt....', '....ttt..ttt....', '....ttt..ttt....', '....ttt..ttt....', '....KKK..KKK....', '...KKKK..KKKK...', '................'];
    function clarrent(pose, frame) {
      var rows = HEAD.concat(BODY).map(function (r) { return r.split(''); });
      var set = function (x, y, c) { if (rows[y]) rows[y][x] = c; };
      var openMouth = frame === 1;
      if (openMouth) { set(6, 10, 'O'); set(7, 10, 'O'); set(8, 10, 'O'); set(9, 10, 'O'); }
      function armUp(side, high) {          // side: -1 left, 1 right
        var x = side < 0 ? 2 : 13, x2 = side < 0 ? 3 : 12;
        var top = high ? 2 : 4;
        set(x, top, 'S'); set(x, top + 1, 'S');
        for (var y = top + 2; y <= 11; y++) set(x, y, y % 3 ? 'J' : 'j');
        set(x2, 11, 'J'); set(x2, 12, 'J');
      }
      function armDown(side) {
        var x = side < 0 ? 2 : 13;
        for (var y = 12; y <= 15; y++) set(x, y, 'J');
        set(x, 16, 'S');
      }
      if (pose === 'cheer') { armUp(-1, frame === 0); armUp(1, frame === 1); }
      else { armDown(-1); if (frame === 0) armUp(1, true); else { set(14, 4, 'S'); set(14, 5, 'S'); for (var y = 6; y <= 11; y++) set(13, y, 'J'); set(12, 11, 'J'); set(12, 12, 'J'); } }
      return sprite(16, 24, function (x, y) { var ch = rows[y][x]; return ch === '.' ? null : CLR[ch]; }, '#0E0810');
    }
    var cheerA = clarrent('cheer', 0), cheerB = clarrent('cheer', 1);
    var waveA = clarrent('wave', 0), waveB = clarrent('wave', 1);
    var holdUp = clarrent('cheer', 0);                     // both arms high, for holding the trophy
    function flagSprite(f) {
      return sprite(11, 15, function (x, y) {
        if (x === 0) return '#C08040';                     // pole
        var top = (f && x > 4) ? 1 : 0;                    // flag ripples
        if (y >= top && y <= top + 6 && x >= 1 && x <= 10 - Math.floor(Math.abs(y - top - 3) * 1.2)) {
          return (y - top === 3 && x > 2 && x < 8) ? '#FFD23F' : '#FF8A1F';
        }
        return null;
      }, '#0E0810');
    }
    var flagA = flagSprite(0), flagB = flagSprite(1);

    // 3x5 pixel font for speech bubbles
    var FONT = {
      A: ['.#.', '#.#', '###', '#.#', '#.#'], C: ['.##', '#..', '#..', '#..', '.##'], D: ['##.', '#.#', '#.#', '#.#', '##.'],
      E: ['###', '#..', '##.', '#..', '###'], G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'],
      I: ['###', '.#.', '.#.', '.#.', '###'], L: ['#..', '#..', '#..', '#..', '###'], N: ['##.', '#.#', '#.#', '#.#', '#.#'], R: ['##.', '#.#', '##.', '#.#', '#.#'], P: ['##.', '#.#', '##.', '#..', '#..'],
      O: ['.#.', '#.#', '#.#', '#.#', '.#.'], S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
      U: ['#.#', '#.#', '#.#', '#.#', '.#.'], Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], '!': ['.#.', '.#.', '.#.', '...', '.#.'],
      ' ': ['...', '...', '...', '...', '...']
    };
    function bubble(c, text, cx, bottom) {
      var w = text.length * 4 + 3, h = 9, x0 = Math.round(cx - w / 2), y0 = bottom - h - 3;
      x0 = Math.max(1, Math.min(160 - w - 1, x0));
      rect(c, x0, y0 + 1, w, h - 2, '#FFF6E0'); rect(c, x0 + 1, y0, w - 2, h, '#FFF6E0');
      rect(c, x0 + 1, y0 - 1, w - 2, 1, '#1A1012'); rect(c, x0 + 1, y0 + h, w - 2, 1, '#1A1012');
      rect(c, x0 - 1, y0 + 1, 1, h - 2, '#1A1012'); rect(c, x0 + w, y0 + 1, 1, h - 2, '#1A1012');
      px(c, x0, y0, '#1A1012'); px(c, x0 + w - 1, y0, '#1A1012'); px(c, x0, y0 + h - 1, '#1A1012'); px(c, x0 + w - 1, y0 + h - 1, '#1A1012');
      var tx = Math.round(cx); px(c, tx, y0 + h, '#FFF6E0'); px(c, tx, y0 + h + 1, '#1A1012'); px(c, tx - 1, y0 + h, '#1A1012');
      text.split('').forEach(function (ch, i) {
        var g = FONT[ch] || FONT[' '];
        for (var yy = 0; yy < 5; yy++) for (var xx = 0; xx < 3; xx++) if (g[yy][xx] === '#') px(c, x0 + 2 + i * 4 + xx, y0 + 2 + yy, '#2A1636');
      });
    }

    // Clarrent in the scene: celebrates a pass (a different move each time) or roots them on
    var LINES = { cheer: 'GG!', trophy: 'NICE!', dance: 'LEGEND!', flag: 'YOU DID IT!' };
    function drawClarrent(c, mood, variant, t, fx, fy) {
      var x = fx + 22, base = fy - 25, img, y = base;
      if (variant === 'cheer') {
        y = base - (Math.abs(Math.sin(t * 0.22 + 1)) * 5 | 0);
        img = Math.floor(t / 5) % 2 ? cheerA : cheerB;
      } else if (variant === 'trophy') {
        y = base - (Math.floor(t / 10) % 2);
        img = holdUp;
        c.drawImage(trophy, x + 4, y - 9 + (Math.floor(t / 10) % 2));
      } else if (variant === 'dance') {
        var step = Math.floor(t / 6) % 4;
        x += [0, 2, 0, -2][step]; y = base - (step % 2);
        img = step < 2 ? cheerA : cheerB;
      } else if (variant === 'flag') {
        img = Math.floor(t / 6) % 2 ? waveA : waveB;
        var fw = Math.floor(t / 6) % 2;
        c.drawImage(fw ? flagA : flagB, x + 13 + fw, y - 12);
      } else if (variant === 'study') {
        img = Math.floor(t / 8) % 2 ? waveA : waveB;
      } else {
        // rooting them on: fist pumps
        img = Math.floor(t / 7) % 2 ? cheerA : waveA;
        y = base - (Math.floor(t / 7) % 2);
      }
      c.drawImage(img, x, y);
      var cheers = mood === 'mid' ? ['SO CLOSE!', 'NICE TRY!', 'TRY AGAIN!'] : ['YOU GOT THIS!', 'TRY AGAIN!', 'NICE TRY!'];
      var line = mood === 'key' ? ['STUDY UP!', 'THEN RETRY!'][Math.floor(t / 70) % 2] : mood === 'pass' ? LINES[variant] : cheers[Math.floor(t / 70) % cheers.length];
      if (t % 70 < 58) bubble(c, line, x + 9, variant === 'trophy' ? y - 10 : Math.min(y, base) - 1);
    }

    var PASS_MOVES = ['cheer', 'trophy', 'dance', 'flag'];
    function animate(c, mood) {
      var variant = mood === 'pass' ? PASS_MOVES[Math.floor(Math.random() * PASS_MOVES.length)] : mood === 'key' ? 'study' : 'root';
      var W = 160, H = 56, gy = 42, fx = 84, fy = 50, t = 0;
      var seed = 11; function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
      var stars = []; for (var i = 0; i < 40; i++) stars.push({ x: rnd() * W | 0, y: rnd() * (gy - 6) | 0, p: rnd() * 6 });
      var ground = []; for (var j = 0; j < W * (H - gy); j++) ground.push(rnd());
      var bursts = [], embers = [];

      function frame() {
        t++;
        // sky
        var bands = ['#0A0716', '#0E0A20', '#120E2A', '#171236', '#1D1640', '#24194A'];
        for (var y = 0; y < gy; y++) rect(c, 0, y, W, 1, bands[Math.min(5, Math.floor(y / gy * 6))]);
        stars.forEach(function (s) { c.globalAlpha = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 0.08 + s.p)); px(c, s.x, s.y, '#C9C2E8'); });
        c.globalAlpha = 1;
        // moon
        for (var my = -5; my <= 5; my++) for (var mx = -5; mx <= 5; mx++) if (mx * mx + my * my <= 25) px(c, 22 + mx, 11 + my, (mx + my > 3) ? '#E8D9A8' : '#FFF4CF');
        // trees
        for (var tx = 0; tx < W; tx += 9) {
          var th = 8 + ((tx * 7) % 9);
          for (var k = 0; k < th; k++) { var half = Math.floor(k / th * th * 0.35); rect(c, tx - half, gy - th + k, half * 2 + 1, 1, '#0C1A1E'); }
        }
        // ground
        for (var gy2 = gy, n = 0; gy2 < H; gy2++) for (var gx = 0; gx < W; gx++, n++) {
          var r = ground[n]; px(c, gx, gy2, r < 0.5 ? '#1F3A22' : r < 0.8 ? '#23432A' : '#1B331F');
        }
        // fire glow
        var fl = 0.85 + 0.15 * Math.sin(t * 0.33);
        c.globalAlpha = 0.12 * fl; c.fillStyle = '#FF8A1F';
        c.beginPath(); c.ellipse(fx, fy - 2, 22, 9, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
        // logs and flames
        rect(c, fx - 5, fy, 10, 2, '#5C3A1E');
        for (var dx = -4; dx <= 4; dx++) {
          var h = Math.max(1, Math.round(7 - Math.abs(dx) * 1.3 + Math.sin(t * 0.45 + dx * 1.7) * 1.4 + (Math.random() - 0.5)));
          for (var dy = 0; dy < h; dy++) {
            var f = dy / h; if (f > 0.75 && Math.random() < 0.35) continue;
            px(c, fx + dx, fy - 1 - dy, f < 0.25 ? '#FFF6C8' : f < 0.5 ? '#FFD23F' : f < 0.78 ? '#FF8A1F' : '#D43D1A');
          }
        }
        if (Math.random() < 0.3) embers.push({ x: fx + (Math.random() - 0.5) * 6, y: fy - 6, a: 0, l: 40 + Math.random() * 30 });
        embers = embers.filter(function (e) { return e.a < e.l; });
        embers.forEach(function (e) { e.a++; e.y -= 0.3; e.x += Math.sin(e.a * 0.1) * 0.2; c.globalAlpha = 1 - e.a / e.l; px(c, e.x, e.y, '#FFD23F'); });
        c.globalAlpha = 1;
        // pumpkins
        c.drawImage(pumpkin, fx + 12, gy + 2);
        c.drawImage(pumpkin, 136, gy + 5);

        if (mood === 'pass') {
          // turtle awake, hopping next to a trophy, fireworks overhead
          var hop = Math.abs(Math.sin(t * 0.18)) * 4 | 0;
          c.drawImage(tAwake, fx - 36, fy - 13 - hop);
          if (variant !== 'trophy') c.drawImage(trophy, fx - 46, fy - 12 + (Math.sin(t * 0.1) > 0 ? 0 : 1));

          if (t % 22 === 1) bursts.push({ x: 50 + Math.random() * 90, y: 8 + Math.random() * 16, a: 0, col: ['#FF8A1F', '#A86BFF', '#7FDB5A', '#FFD23F'][Math.floor(Math.random() * 4)] });
          bursts = bursts.filter(function (b) { return b.a < 26; });
          bursts.forEach(function (b) {
            b.a++; var r = b.a * 0.45;
            c.globalAlpha = 1 - b.a / 26;
            for (var q = 0; q < 10; q++) { var an = q / 10 * Math.PI * 2; px(c, b.x + Math.cos(an) * r, b.y + Math.sin(an) * r + b.a * 0.05, b.col); }
            c.globalAlpha = 1;
          });
        } else if (mood === 'mid' || mood === 'key') {
          // turtle resting by the fire
          c.drawImage(Math.floor(t / 120) % 6 === 0 ? tAwake : tSleep, fx - 36, fy - 13 + (Math.floor(t / 30) % 2));
        } else {
          // turtle asleep, a ghost floats by, zzz
          c.drawImage(tSleep, fx - 36, fy - 13 + (Math.floor(t / 30) % 2));
          var zt = t % 90;
          c.globalAlpha = Math.max(0, 1 - zt / 90);
          var zx = fx - 12 + zt / 15, zy = fy - 16 - zt / 6;
          rect(c, zx, zy, 4, 1, '#C9C2E8'); px(c, zx + 2, zy + 1, '#C9C2E8'); px(c, zx + 1, zy + 2, '#C9C2E8'); rect(c, zx, zy + 3, 4, 1, '#C9C2E8');
          c.globalAlpha = 0.5 + 0.3 * Math.sin(t * 0.05);
          c.drawImage(ghost, 140 + Math.sin(t * 0.03) * 5, 14 + Math.sin(t * 0.07) * 3);
          c.globalAlpha = 1;
        }
        drawClarrent(c, mood, variant, t, fx, fy);
      }

      var last = 0, fps = reduceMotion ? 3 : 18;
      function loop(now) {
        if (!running) return;
        if (now - last >= 1000 / fps) { last = now; frame(); }
        requestAnimationFrame(loop);
      }
      frame();
      requestAnimationFrame(loop);
    }
  });
})();
