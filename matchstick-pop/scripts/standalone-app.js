(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var quizList = $('quizList');
  var output = $('output');
  var statusEl = $('status');

  var SIZE_NAMES = Object.keys(PAGE_SIZES);

  function sizeOptionsHtml(selected) {
    var opts = SIZE_NAMES.map(function (n) {
      var wh = PAGE_SIZES[n];
      var sel = n === selected ? ' selected' : '';
      return '<option value="' + n + '"' + sel + '>' + n + '（' + wh[0] + '×' + wh[1] + 'mm）</option>';
    });
    opts.push('<option value="CUSTOM"' + (selected === 'CUSTOM' ? ' selected' : '') + '>カスタム（mmで指定）</option>');
    return opts.join('\n');
  }

  function buildQuizList() {
    quizList.innerHTML = EMBEDDED_QUIZZES.map(function (q) {
      var label = escapeHtml(q.id) + '　' + escapeHtml(q.question.replace(/\n/g, ' ')) + '（' + q.moves + '本）';
      return '<label><input type="checkbox" value="' + escapeHtml(q.id) + '" checked> ' + label + '</label>';
    }).join('\n');
  }

  function selectedQuizIds() {
    return Array.prototype.slice.call(quizList.querySelectorAll('input:checked')).map(function (c) { return c.value; });
  }

  function selectedQuizzes() {
    var ids = selectedQuizIds();
    return EMBEDDED_QUIZZES.filter(function (q) { return ids.indexOf(q.id) !== -1; });
  }

  function pickSize(presetEl, wEl, hEl) {
    var preset = presetEl.value;
    if (preset === 'CUSTOM') {
      var w = wEl.value, h = hEl.value;
      if (!w || !h) throw new Error('カスタムサイズは幅と高さの両方を入力してください。');
      return resolveSize(w + 'x' + h);
    }
    return resolveSize(preset);
  }

  function toggleCustom(presetEl, boxEl) {
    boxEl.style.display = presetEl.value === 'CUSTOM' ? 'flex' : 'none';
  }

  function fitFrames(root) {
    var frames = (root || document).querySelectorAll('.web-frame[data-pw]');
    Array.prototype.forEach.call(frames, function (frame) {
      var pw = Number(frame.dataset.pw);
      var ph = Number(frame.dataset.ph);
      var scale = frame.clientWidth / pw;
      frame.style.height = Math.round(ph * scale) + 'px';
      var scaler = frame.querySelector('.scaler');
      if (scaler) scaler.style.transform = 'scale(' + scale + ')';
    });
  }

  function downloadBlob(filename, html) {
    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function openInNewTab(html) {
    // window.open(''）はポップアップブロックの対象になりやすい。
    // Blob URLへの実リンククリックはブラウザの通常のナビゲーションとして扱われ、
    // ポップアップブロッカーの影響を受けにくい。
    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }

  function showError(message) {
    statusEl.innerHTML = '<div class="error-box">' + escapeHtml(message) + '</div>';
  }

  function showStatus(message) {
    statusEl.textContent = message;
  }

  function currentTileSize(size) {
    if (!$('tileEnabled').checked) return null;
    var tileSize = pickSize($('tilePreset'), $('tileW'), $('tileH'));
    if (tileSize.w >= size.w && tileSize.h >= size.h) {
      throw new Error('分割する用紙（' + tileSize.name + '）は版面サイズ（' + size.name + '）より小さくしてください。');
    }
    return tileSize;
  }

  function renderPreview() {
    try {
      var size = pickSize($('sizePreset'), $('sizeW'), $('sizeH'));
      var tileSize = currentTileSize(size);
      var quizzes = selectedQuizzes();
      if (quizzes.length === 0) throw new Error('出力する問題を1つ以上選んでください。');

      var scale = Math.min(1, PREVIEW_WIDTH_PX / (size.w * MM_TO_PX));
      var pwPx = Math.round(size.w * MM_TO_PX * scale);
      var phPx = Math.round(size.h * MM_TO_PX * scale);

      var blocks = quizzes.map(function (q) {
        var tileBtn = tileSize
          ? '<button type="button" class="tile-btn" data-id="' + escapeHtml(q.id) + '">🧩 分割印刷版を開く</button>'
          : '';
        return (
          '<div class="quiz-block">' +
          '<div class="web-frame" data-pw="' + pwPx + '" data-ph="' + phPx + '" style="max-width:' + pwPx + 'px">' +
          '<div class="scaler" style="transform-origin:top left">' + renderQuizPop(q) + '</div>' +
          '</div>' +
          '<div class="per-quiz-actions">' +
          '<button type="button" class="print-btn" data-id="' + escapeHtml(q.id) + '">🖨 印刷用ページを開く</button>' +
          tileBtn +
          '</div>' +
          '</div>'
        );
      }).join('\n');

      output.innerHTML = '<style>:root{--pw:' + pwPx + 'px;--ph:' + phPx + 'px;}' + POP_CSS + '\n' + WEB_CSS + '</style>' + blocks;
      fitFrames(output);
      window.onresize = function () { fitFrames(output); };

      showStatus(quizzes.length + '問を' + size.name + '（' + size.w + '×' + size.h + 'mm）でプレビューしました。');
    } catch (err) {
      output.innerHTML = '<p class="empty-hint">' + escapeHtml(err.message) + '</p>';
      showError(err.message);
    }
  }

  output.addEventListener('click', function (ev) {
    var printBtn = ev.target.closest ? ev.target.closest('.print-btn') : null;
    var tileBtn = ev.target.closest ? ev.target.closest('.tile-btn') : null;
    if (printBtn) {
      var q1 = EMBEDDED_QUIZZES.filter(function (q) { return q.id === printBtn.dataset.id; })[0];
      var size1 = pickSize($('sizePreset'), $('sizeW'), $('sizeH'));
      openInNewTab(documentHtml({ title: q1.id + ' マッチ棒クイズPOP', size: size1, sections: [renderQuizPop(q1)] }));
    }
    if (tileBtn) {
      try {
        var q2 = EMBEDDED_QUIZZES.filter(function (q) { return q.id === tileBtn.dataset.id; })[0];
        var size2 = pickSize($('sizePreset'), $('sizeW'), $('sizeH'));
        var tileSize2 = currentTileSize(size2);
        var overlap = Number($('tileOverlap').value || 10);
        openInNewTab(tiledDocumentHtml({
          title: q2.id + ' マッチ棒クイズPOP（分割印刷）', size: size2, tileSize: tileSize2, overlap: overlap,
          section: renderQuizPop(q2),
        }));
      } catch (err) {
        showError(err.message);
      }
    }
  });

  $('selectAllBtn').addEventListener('click', function () {
    Array.prototype.forEach.call(quizList.querySelectorAll('input'), function (c) { c.checked = true; });
  });
  $('selectNoneBtn').addEventListener('click', function () {
    Array.prototype.forEach.call(quizList.querySelectorAll('input'), function (c) { c.checked = false; });
  });

  $('sizePreset').addEventListener('change', function () { toggleCustom($('sizePreset'), $('sizeCustomBox')); });
  $('tilePreset').addEventListener('change', function () { toggleCustom($('tilePreset'), $('tileCustomBox')); });
  $('tileEnabled').addEventListener('change', function () {
    $('tileOptions').style.display = $('tileEnabled').checked ? 'block' : 'none';
  });

  $('renderBtn').addEventListener('click', renderPreview);

  $('downloadAllBtn').addEventListener('click', function () {
    try {
      var size = pickSize($('sizePreset'), $('sizeW'), $('sizeH'));
      var quizzes = selectedQuizzes();
      if (quizzes.length === 0) throw new Error('出力する問題を1つ以上選んでください。');
      var html = documentHtml({ title: 'マッチ棒クイズPOP 全ページ', size: size, sections: quizzes.map(renderQuizPop) });
      downloadBlob('all.html', html);
      showStatus('all.html を保存しました（' + quizzes.length + '問）。');
    } catch (err) { showError(err.message); }
  });

  $('downloadWebBtn').addEventListener('click', function () {
    try {
      var size = pickSize($('sizePreset'), $('sizeW'), $('sizeH'));
      var quizzes = selectedQuizzes();
      if (quizzes.length === 0) throw new Error('出力する問題を1つ以上選んでください。');
      var html = webPageHtml({ title: 'マッチ棒クイズPOP', size: size, quizzes: quizzes });
      downloadBlob('web.html', html);
      showStatus('web.html を保存しました（他のサーバーにアップロードして公開できます）。');
    } catch (err) { showError(err.message); }
  });

  $('downloadAnswersBtn').addEventListener('click', function () {
    try {
      var quizzes = selectedQuizzes();
      if (quizzes.length === 0) throw new Error('出力する問題を1つ以上選んでください。');
      downloadBlob('answers.html', answerSheetHtml(quizzes));
      showStatus('answers.html（解答一覧）を保存しました。');
    } catch (err) { showError(err.message); }
  });

  buildQuizList();
  $('sizePreset').innerHTML = sizeOptionsHtml('A3');
  $('tilePreset').innerHTML = sizeOptionsHtml('A3');
  renderPreview();
})();
