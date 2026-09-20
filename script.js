/* ==========================================================================
   情報量と誤り検出を体験しよう ― アプリケーションロジック
   ========================================================================== */

/* ------------------------------------------------------------------------
   ユーティリティ関数（ビット操作）
   ------------------------------------------------------------------------ */

// n個のランダムな0/1のビット列を生成する
function randomBits(n) {
  const bits = [];
  for (let i = 0; i < n; i++) {
    bits.push(Math.random() < 0.5 ? 0 : 1);
  }
  return bits;
}

// ビット列の中の「1」の個数を数える
function countOnes(bits) {
  return bits.reduce((sum, b) => sum + b, 0);
}

// 指定した範囲からランダムな整数インデックスを1つ選ぶ（除外リストあり）
function pickRandomIndex(length, excludeIndices = []) {
  const excludeSet = new Set(excludeIndices);
  let index;
  do {
    index = Math.floor(Math.random() * length);
  } while (excludeSet.has(index));
  return index;
}

// ビット列のうち1か所だけをランダムに反転させたコピーを返す
function flipOneRandomBit(bits) {
  const result = bits.slice();
  const index = pickRandomIndex(result.length);
  result[index] = result[index] === 1 ? 0 : 1;
  return { result, index };
}

// ビット列のうち異なる2か所をランダムに反転させたコピーを返す
function flipTwoRandomBits(bits) {
  const result = bits.slice();
  const index1 = pickRandomIndex(result.length);
  const index2 = pickRandomIndex(result.length, [index1]);
  result[index1] = result[index1] === 1 ? 0 : 1;
  result[index2] = result[index2] === 1 ? 0 : 1;
  return { result, indices: [index1, index2].sort((a, b) => a - b) };
}

// 「1」の数が偶数になるように、確認用の1bitを求める（偶数なら0、奇数なら1）
function computeCheckBit(bits) {
  return countOnes(bits) % 2 === 0 ? 0 : 1;
}

// 経過時間（ミリ秒）を「◯.◯秒」の文字列に変換する
function formatSeconds(ms) {
  return (ms / 1000).toFixed(1);
}

/* ------------------------------------------------------------------------
   DOM生成ヘルパー
   ------------------------------------------------------------------------ */

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// ビット列を表示する行を作る
// options: clickable, onBitClick, highlightOnes, correctIndex,
//          flippedIndices, addedIndexOffset(追加bitの位置), animateAdded
function buildBitRow(bits, options = {}) {
  const row = el('div', 'bitrow');
  bits.forEach((value, index) => {
    const isClickable = !!options.clickable;
    const cell = document.createElement(isClickable ? 'button' : 'div');
    cell.className = 'bit';
    if (isClickable) cell.type = 'button';
    cell.dataset.value = String(value);
    cell.dataset.index = String(index);
    cell.textContent = String(value);
    cell.setAttribute('aria-label', `${index + 1}番目のbit：${value}`);

    if (options.highlightOnes && value === 1) {
      cell.classList.add('is-highlight-one');
    }
    if (options.correctIndex === index) {
      cell.classList.add('is-correct');
    }
    if (options.flippedIndices && options.flippedIndices.includes(index)) {
      cell.classList.add('is-flipped');
    }
    if (options.addedIndexOffset !== undefined && index === options.addedIndexOffset) {
      cell.classList.add('is-added');
      if (options.animateAdded) cell.classList.add('bit-pop-in');
    }
    if (isClickable) {
      cell.addEventListener('click', () => options.onBitClick(index, cell));
    }
    row.appendChild(cell);
  });
  return row;
}

function buildInfoLine(label, value) {
  const wrap = el('span', 'info-line');
  wrap.appendChild(el('span', 'info-line__key', label + '：'));
  wrap.appendChild(el('span', 'info-line__value', String(value)));
  return wrap;
}

function buildMessage(text, kind, mark) {
  const box = el('div', `message message--${kind}`);
  if (mark) box.appendChild(el('span', 'message__mark', mark));
  const p = el('div');
  p.textContent = text;
  box.appendChild(p);
  return box;
}

/* ------------------------------------------------------------------------
   画面遷移の管理
   ------------------------------------------------------------------------ */

const appEl = document.getElementById('app');
const progressEl = document.getElementById('progress');
const backBtn = document.getElementById('btn-back');
const restartBtn = document.getElementById('btn-restart');

const nav = {
  history: [],
  index: -1,
};

// 新しい画面に進む（stageは進行状況バーで使うSTAGE番号 1〜4、まとめ画面は5）
function goTo(renderFn, data, stage) {
  nav.history = nav.history.slice(0, nav.index + 1);
  nav.history.push({ renderFn, data, stage });
  nav.index++;
  renderCurrent();
}

// 前の画面に戻る
function goBack() {
  if (nav.index > 0) {
    nav.index--;
    renderCurrent();
  }
}

// 最初からやり直す
function restartApp() {
  nav.history = [];
  nav.index = -1;
  goTo(screenStage1Compare, makeStage1Data(32, false), 1);
}

function renderCurrent() {
  const entry = nav.history[nav.index];
  appEl.innerHTML = '';
  const screen = el('div', 'screen');
  appEl.appendChild(screen);
  entry.renderFn(screen, entry.data);
  updateProgressBar(entry.stage);
  backBtn.disabled = nav.index === 0;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateProgressBar(currentStage) {
  const steps = progressEl.querySelectorAll('.progress__step');
  steps.forEach((step) => {
    const stageNum = Number(step.dataset.stage);
    step.classList.toggle('is-current', stageNum === currentStage);
    step.classList.toggle('is-done', stageNum < currentStage);
  });
}

backBtn.addEventListener('click', goBack);
restartBtn.addEventListener('click', restartApp);

/* ==========================================================================
   STAGE 1　目視比較
   ========================================================================== */

function makeStage1Data(bitLength, isSecondRound) {
  const before = randomBits(bitLength);
  const { result: after, index: flipIndex } = flipOneRandomBit(before);
  return { bitLength, before, after, flipIndex, isSecondRound };
}

function screenStage1Compare(container, data) {
  const { bitLength, before, after, flipIndex, isSecondRound } = data;
  const startTime = performance.now();
  let solved = false;

  container.appendChild(el('p', 'screen__eyebrow', 'STAGE 1'));
  container.appendChild(el('h2', 'screen__title', '大量のbitから違いを探してみよう'));

  const lead = el('p', 'screen__lead',
    '送信前と受信後で、1か所だけ違うbitがあります。違うと思うbitをクリックしてください。');
  container.appendChild(lead);

  const card = el('div', 'card');
  container.appendChild(card);

  const infoRow = el('div', 'info-row');
  infoRow.appendChild(buildInfoLine('データ量', `${bitLength} bit`));
  card.appendChild(infoRow);

  const beforeBlock = el('div', 'bitblock');
  beforeBlock.appendChild(el('p', 'bitblock__label', '【送信前】'));
  beforeBlock.appendChild(buildBitRow(before, {}));
  card.appendChild(beforeBlock);

  const afterBlock = el('div', 'bitblock');
  afterBlock.appendChild(el('p', 'bitblock__label', '【受信後】（違うと思うbitをクリック）'));
  card.appendChild(afterBlock);

  const messageSlot = el('div');
  container.appendChild(messageSlot);

  const nextSlot = el('div');
  container.appendChild(nextSlot);

  function onBitClick(index, cellEl) {
    if (solved) return;
    if (index === flipIndex) {
      solved = true;
      messageSlot.innerHTML = '';
      messageSlot.appendChild(
        buildMessage('正解！このbitが通信中に反転していました。', 'success', '◎')
      );

      // 送信前・受信後の該当bitを強調する
      const beforeCell = beforeBlock.querySelector(`.bit[data-index="${index}"]`);
      if (beforeCell) beforeCell.classList.add('is-correct');
      cellEl.classList.remove('is-wrong-try');
      cellEl.classList.add('is-correct');

      afterBlock.querySelectorAll('button.bit').forEach((b) => {
        b.disabled = true;
      });

      if (bitLength === 256) {
        const elapsed = formatSeconds(performance.now() - startTime);
        const timerLine = el('p', 'screen__lead');
        const span = el('span', 'timer', `かかった時間：${elapsed}秒`);
        timerLine.appendChild(span);
        messageSlot.appendChild(timerLine);
      }

      renderNextStep();
    } else {
      cellEl.classList.remove('is-wrong-try');
      // 再描画してアニメーションを再トリガーする
      void cellEl.offsetWidth;
      cellEl.classList.add('is-wrong-try');
      messageSlot.innerHTML = '';
      messageSlot.appendChild(
        buildMessage('ここではありません。もう一度探してみよう。', 'error', '×')
      );
    }
  }

  const afterRow = buildBitRow(after, { clickable: true, onBitClick });
  afterBlock.appendChild(afterRow);

  function renderNextStep() {
    nextSlot.innerHTML = '';
    if (!isSecondRound) {
      // 32bit正解後：256bitへ
      const p1 = el('p', 'screen__lead',
        '32bitの中から1か所の違いを見つけられました。');
      nextSlot.appendChild(p1);
      const btnRow = el('div', 'btn-row');
      const nextBtn = el('button', 'btn', '次はデータ量を増やします。');
      nextBtn.type = 'button';
      nextBtn.addEventListener('click', () => {
        goTo(screenStage1Compare, makeStage1Data(256, true), 1);
      });
      btnRow.appendChild(nextBtn);
      nextSlot.appendChild(btnRow);
    } else {
      // 256bit正解後：STAGE1のまとめ
      const wrap = el('div', 'card');
      wrap.appendChild(el('p', 'screen__lead',
        '256bitの中から1か所の違いを探すのはどうでしたか？'));
      wrap.appendChild(el('p', 'screen__lead',
        'データがもっと多くなったら、毎回すべてのbitを比較するのは大変そうですね。'));
      const question = el('p', 'screen__lead',
        '全部を送信前のデータと見比べなくても、誤りに気付く方法はないだろうか？');
      question.style.fontWeight = '700';
      question.style.color = 'var(--ink)';
      wrap.appendChild(question);
      nextSlot.appendChild(wrap);

      const btnRow = el('div', 'btn-row');
      const nextBtn = el('button', 'btn', 'STAGE 2へ');
      nextBtn.type = 'button';
      nextBtn.addEventListener('click', () => {
        goTo(screenStage2Round, makeStage2RoundData(1, null), 2);
      });
      btnRow.appendChild(nextBtn);
      nextSlot.appendChild(btnRow);
    }
  }
}

/* ==========================================================================
   STAGE 2　規則をつくる
   ========================================================================== */

// roundNumberが2のときは、1回目と偶奇が異なるデータを用意する（両パターン体験のため）
function makeStage2RoundData(roundNumber, prevParity) {
  let bits;
  if (roundNumber === 2 && prevParity !== null) {
    do {
      bits = randomBits(7);
    } while (countOnes(bits) % 2 === prevParity);
  } else {
    bits = randomBits(7);
  }
  return { roundNumber, bits };
}

function screenStage2Round(container, data) {
  const { roundNumber, bits } = data;
  const checkBit = computeCheckBit(bits);
  const currentOnes = countOnes(bits);
  const currentParity = currentOnes % 2;

  container.appendChild(el('p', 'screen__eyebrow', `STAGE 2 ／ ${roundNumber}回目`));
  container.appendChild(el('h2', 'screen__title', '「1」の数を偶数にしてみよう'));

  if (roundNumber === 1) {
    container.appendChild(el('p', 'screen__lead',
      'このデータには「1」がいくつあるでしょう？'));
  }

  const card = el('div', 'card');
  container.appendChild(card);

  const infoRow = el('div', 'info-row');
  infoRow.appendChild(buildInfoLine('元のデータ量', '7 bit'));
  card.appendChild(infoRow);

  const bitBlock = el('div', 'bitblock');
  const rowWrap = buildBitRow(bits, {});
  bitBlock.appendChild(rowWrap);
  card.appendChild(bitBlock);

  const actionSlot = el('div');
  container.appendChild(actionSlot);

  const countBtn = el('button', 'btn', 'bitの中の「1」の数を数える');
  countBtn.type = 'button';
  actionSlot.appendChild(countBtn);

  const resultSlot = el('div');
  container.appendChild(resultSlot);

  countBtn.addEventListener('click', () => {
    countBtn.disabled = true;
    rowWrap.querySelectorAll('.bit').forEach((cell) => {
      if (cell.dataset.value === '1') cell.classList.add('is-highlight-one');
    });

    resultSlot.innerHTML = '';
    const countLine = el('p', 'screen__lead');
    countLine.appendChild(buildInfoLine('「1」の数', `${currentOnes}個`));
    resultSlot.appendChild(countLine);

    const addBtn = el('button', 'btn', '「1」の数が常に偶数になるように、最後に1bitを追加する');
    addBtn.type = 'button';
    resultSlot.appendChild(addBtn);

    addBtn.addEventListener('click', () => {
      addBtn.disabled = true;
      const fullBits = bits.concat(checkBit);
      bitBlock.innerHTML = '';
      bitBlock.appendChild(buildBitRow(fullBits, {
        addedIndexOffset: 7,
        animateAdded: true,
        highlightOnes: false,
      }));

      const msgText = currentParity === 0
        ? `「1」は${currentOnes}個なので、0を追加しました。「1」の数は偶数のままです。`
        : `「1」は${currentOnes}個なので、1を追加しました。全体の「1」は${currentOnes + 1}個になりました。`;
      resultSlot.appendChild(buildMessage(msgText, 'success', '＋'));

      const infoRow2 = el('div', 'info-row');
      infoRow2.appendChild(buildInfoLine('元のデータ量', '7 bit'));
      infoRow2.appendChild(el('span', 'info-row__arrow', '→'));
      infoRow2.appendChild(buildInfoLine('送信するデータ量', '8 bit'));
      resultSlot.appendChild(infoRow2);

      const btnRow = el('div', 'btn-row');
      if (roundNumber === 1) {
        const tryAgainBtn = el('button', 'btn', '別のデータで試す');
        tryAgainBtn.type = 'button';
        tryAgainBtn.addEventListener('click', () => {
          goTo(screenStage2Round, makeStage2RoundData(2, currentParity), 2);
        });
        btnRow.appendChild(tryAgainBtn);
      } else {
        const toPredictBtn = el('button', 'btn', '予想問題にすすむ');
        toPredictBtn.type = 'button';
        toPredictBtn.addEventListener('click', () => {
          goTo(screenStage2Predict, { bits: randomBits(7) }, 2);
        });
        btnRow.appendChild(toPredictBtn);
      }
      resultSlot.appendChild(btnRow);
    });
  });
}

function screenStage2Predict(container, data) {
  const { bits } = data;
  const ones = countOnes(bits);
  const correctBit = computeCheckBit(bits);

  container.appendChild(el('p', 'screen__eyebrow', 'STAGE 2 ／ 予想問題'));
  container.appendChild(el('h2', 'screen__title', '最後に追加されるbitはどちらだと思いますか？'));

  const card = el('div', 'card');
  container.appendChild(card);
  card.appendChild(buildInfoLine('元のデータ量', '7 bit'));
  const bitBlock = el('div', 'bitblock');
  bitBlock.appendChild(buildBitRow(bits, {}));
  card.appendChild(bitBlock);
  const countLine = el('p', 'screen__lead');
  countLine.appendChild(buildInfoLine('「1」の数', `${ones}個`));
  card.appendChild(countLine);

  const choiceRow = el('div', 'choice-row');
  container.appendChild(choiceRow);
  const resultSlot = el('div');
  container.appendChild(resultSlot);

  [0, 1].forEach((choice) => {
    const btn = el('button', 'choice-btn', String(choice));
    btn.type = 'button';
    choiceRow.appendChild(btn);
    btn.addEventListener('click', () => {
      choiceRow.querySelectorAll('.choice-btn').forEach((b) => (b.disabled = true));
      const isRight = choice === correctBit;
      btn.classList.add(isRight ? 'is-selected-correct' : 'is-selected-wrong');
      if (!isRight) {
        const correctBtn = [...choiceRow.querySelectorAll('.choice-btn')]
          .find((b) => b.textContent === String(correctBit));
        if (correctBtn) correctBtn.classList.add('is-selected-correct');
      }

      resultSlot.innerHTML = '';
      resultSlot.appendChild(buildMessage(
        isRight ? '正解です！' : `残念、正解は「${correctBit}」でした。`,
        isRight ? 'success' : 'error',
        isRight ? '◎' : '×'
      ));

      const fullBits = bits.concat(correctBit);
      bitBlock.innerHTML = '';
      bitBlock.appendChild(buildBitRow(fullBits, {
        addedIndexOffset: 7,
        animateAdded: true,
      }));
      resultSlot.appendChild(buildMessage('全体の「1」の数が偶数になりました。', 'neutral'));

      const btnRow = el('div', 'btn-row');
      const nextBtn = el('button', 'btn', 'STAGE 2のまとめへ');
      nextBtn.type = 'button';
      nextBtn.addEventListener('click', () => {
        goTo(screenStage2Summary, {}, 2);
      });
      btnRow.appendChild(nextBtn);
      resultSlot.appendChild(btnRow);
    });
  });
}

function screenStage2Summary(container) {
  container.appendChild(el('p', 'screen__eyebrow', 'STAGE 2 ／ まとめ'));
  container.appendChild(el('h2', 'screen__title',
    'どんなデータでも、最後に1bitを追加することで「1」の数を偶数にすることができました。'));

  const card = el('div', 'card');
  container.appendChild(card);
  const infoRow = el('div', 'info-row');
  infoRow.appendChild(buildInfoLine('元のデータ量', '7 bit'));
  infoRow.appendChild(el('span', 'info-row__arrow', '→'));
  infoRow.appendChild(buildInfoLine('送信するデータ量', '8 bit'));
  card.appendChild(infoRow);

  const question = el('p', 'screen__lead',
    'でも、なぜわざわざ1bit追加して、「1」の数を偶数にするのでしょう？');
  question.style.fontWeight = '700';
  question.style.color = 'var(--ink)';
  container.appendChild(question);

  const btnRow = el('div', 'btn-row');
  const nextBtn = el('button', 'btn', 'STAGE 3で確かめる');
  nextBtn.type = 'button';
  nextBtn.addEventListener('click', () => {
    goTo(screenStage3, makeParityPacketData(), 3);
  });
  btnRow.appendChild(nextBtn);
  container.appendChild(btnRow);
}

/* ==========================================================================
   共通：確認用ビット付き8bitパケットを作る（STAGE 3・4で使用）
   ========================================================================== */

function makeParityPacketData() {
  const original = randomBits(7);
  const checkBit = computeCheckBit(original);
  const sent = original.concat(checkBit);
  return { original, checkBit, sent };
}

/* ==========================================================================
   STAGE 3　1bit反転
   ========================================================================== */

function screenStage3(container, data) {
  const { sent } = data;

  container.appendChild(el('p', 'screen__eyebrow', 'STAGE 3'));
  container.appendChild(el('h2', 'screen__title', '1bitが変わったら？'));

  const sendCard = el('div', 'card');
  container.appendChild(sendCard);
  sendCard.appendChild(el('p', 'bitblock__label', '【送信するデータ】'));
  sendCard.appendChild(buildBitRow(sent, { addedIndexOffset: 7 }));

  const countLine = el('p', 'screen__lead');
  countLine.appendChild(buildInfoLine('「1」の数', `${countOnes(sent)}個`));
  sendCard.appendChild(countLine);

  const infoRow = el('div', 'info-row');
  infoRow.appendChild(buildInfoLine('元のデータ', '7 bit'));
  infoRow.appendChild(buildInfoLine('確認用に追加', '1 bit'));
  infoRow.appendChild(buildInfoLine('送信するデータ', '8 bit'));
  sendCard.appendChild(infoRow);

  const flowSlot = el('div');
  container.appendChild(flowSlot);

  const btnRow = el('div', 'btn-row');
  const sendBtn = el('button', 'btn', '送信する');
  sendBtn.type = 'button';
  btnRow.appendChild(sendBtn);
  container.appendChild(btnRow);

  sendBtn.addEventListener('click', () => {
    sendBtn.disabled = true;
    runTransmitAnimation(flowSlot, () => {
      showStage3Received(container, flowSlot, sent);
    });
  });
}

// 送信側→通信中→受信側のアニメーションを表示し、終了後にcallbackを呼ぶ
function runTransmitAnimation(container, callback) {
  container.innerHTML = '';
  const track = el('div', 'transmit');
  const nodeSend = el('div', 'transmit__node', '送信側');
  const track1 = el('div', 'transmit__track');
  const nodeMid = el('div', 'transmit__node', '通信中');
  const track2 = el('div', 'transmit__track');
  const nodeRecv = el('div', 'transmit__node', '受信側');
  [nodeSend, track1, nodeMid, track2, nodeRecv].forEach((n) => track.appendChild(n));
  container.appendChild(track);

  const nodes = [nodeSend, nodeMid, nodeRecv];
  let step = 0;
  function tick() {
    nodes.forEach((n) => n.classList.remove('is-active'));
    if (step < nodes.length) {
      nodes[step].classList.add('is-active');
      step++;
      setTimeout(tick, 380);
    } else {
      setTimeout(callback, 200);
    }
  }
  tick();
}

function showStage3Received(container, flowSlot, sent) {
  const { result: received, index: flipIndex } = flipOneRandomBit(sent);

  flowSlot.innerHTML = '';

  const card = el('div', 'card');
  flowSlot.appendChild(card);
  card.appendChild(el('p', 'screen__lead', '受信したデータに誤りがあるか調べてみよう。'));
  const bitBlock = el('div', 'bitblock');
  const row = buildBitRow(received, {});
  bitBlock.appendChild(row);
  card.appendChild(bitBlock);

  const countBtn = el('button', 'btn', 'bitの中の「1」の数を数える');
  countBtn.type = 'button';
  card.appendChild(countBtn);

  const resultSlot = el('div');
  flowSlot.appendChild(resultSlot);

  countBtn.addEventListener('click', () => {
    countBtn.disabled = true;
    row.querySelectorAll('.bit').forEach((cell) => {
      if (cell.dataset.value === '1') cell.classList.add('is-highlight-one');
    });
    const receivedOnes = countOnes(received);

    resultSlot.innerHTML = '';
    const countLine = el('p', 'screen__lead');
    countLine.appendChild(buildInfoLine('「1」の数', `${receivedOnes}個`));
    resultSlot.appendChild(countLine);

    resultSlot.appendChild(buildMessage(
      '送信するとき、「1」の数は偶数でした。受信したデータでは奇数になっています。',
      'neutral'
    ));
    resultSlot.appendChild(buildMessage('誤りを検出できました！', 'success', '◎'));
    resultSlot.appendChild(buildMessage(
      '送信前と受信後のデータをすべて見比べなくても、「1」の数の規則が崩れたことから、誤りが起きたことに気付けました。',
      'neutral'
    ));

    const revealBtn = el('button', 'btn btn--secondary', 'どのbitが反転していたか確認する');
    revealBtn.type = 'button';
    resultSlot.appendChild(revealBtn);

    const revealSlot = el('div');
    flowSlot.appendChild(revealSlot);

    revealBtn.addEventListener('click', () => {
      revealBtn.disabled = true;
      revealSlot.innerHTML = '';

      const compareCard = el('div', 'card');
      revealSlot.appendChild(compareCard);
      const beforeBlock = el('div', 'bitblock');
      beforeBlock.appendChild(el('p', 'bitblock__label', '【送信前】'));
      beforeBlock.appendChild(buildBitRow(sent, { flippedIndices: [flipIndex] }));
      compareCard.appendChild(beforeBlock);
      const afterBlock = el('div', 'bitblock');
      afterBlock.appendChild(el('p', 'bitblock__label', '【受信後】'));
      afterBlock.appendChild(buildBitRow(received, { flippedIndices: [flipIndex] }));
      compareCard.appendChild(afterBlock);

      const note = el('p', 'screen__lead',
        '※送信前データと受信後データを見比べて、答え合わせをしました。「1」の数の規則だけでは、どのbitが反転したかまでは分かりません。');
      compareCard.appendChild(note);

      const question = el('p', 'screen__lead', 'では、2bitが同時に反転したらどうなるでしょう？');
      question.style.fontWeight = '700';
      question.style.color = 'var(--ink)';
      revealSlot.appendChild(question);

      const btnRow = el('div', 'btn-row');
      const nextBtn = el('button', 'btn', 'STAGE 4へ');
      nextBtn.type = 'button';
      nextBtn.addEventListener('click', () => {
        goTo(screenStage4, makeParityPacketData(), 4);
      });
      btnRow.appendChild(nextBtn);
      revealSlot.appendChild(btnRow);
    });
  });
}

/* ==========================================================================
   STAGE 4　2bit反転
   ========================================================================== */

function screenStage4(container, data) {
  const { sent } = data;

  container.appendChild(el('p', 'screen__eyebrow', 'STAGE 4'));
  container.appendChild(el('h2', 'screen__title', '2bitが変わったら？'));

  const sendCard = el('div', 'card');
  container.appendChild(sendCard);
  sendCard.appendChild(el('p', 'bitblock__label', '【送信するデータ】'));
  sendCard.appendChild(buildBitRow(sent, { addedIndexOffset: 7 }));

  const infoRow = el('div', 'info-row');
  infoRow.appendChild(buildInfoLine('元のデータ', '7 bit'));
  infoRow.appendChild(buildInfoLine('確認用に追加', '1 bit'));
  infoRow.appendChild(buildInfoLine('送信するデータ', '8 bit'));
  sendCard.appendChild(infoRow);

  const flowSlot = el('div');
  container.appendChild(flowSlot);

  const btnRow = el('div', 'btn-row');
  const sendBtn = el('button', 'btn', '送信する');
  sendBtn.type = 'button';
  btnRow.appendChild(sendBtn);
  container.appendChild(btnRow);

  sendBtn.addEventListener('click', () => {
    sendBtn.disabled = true;
    runTransmitAnimation(flowSlot, () => {
      showStage4Received(container, flowSlot, sent);
    });
  });
}

function showStage4Received(container, flowSlot, sent) {
  const { result: received, indices: flipIndices } = flipTwoRandomBits(sent);

  flowSlot.innerHTML = '';

  const card = el('div', 'card');
  flowSlot.appendChild(card);
  card.appendChild(el('p', 'screen__lead', '受信したデータに誤りがあるか調べてみよう。'));
  const bitBlock = el('div', 'bitblock');
  const row = buildBitRow(received, {});
  bitBlock.appendChild(row);
  card.appendChild(bitBlock);

  const countBtn = el('button', 'btn', 'bitの中の「1」の数を数える');
  countBtn.type = 'button';
  card.appendChild(countBtn);

  const resultSlot = el('div');
  flowSlot.appendChild(resultSlot);

  countBtn.addEventListener('click', () => {
    countBtn.disabled = true;
    row.querySelectorAll('.bit').forEach((cell) => {
      if (cell.dataset.value === '1') cell.classList.add('is-highlight-one');
    });
    const receivedOnes = countOnes(received);

    resultSlot.innerHTML = '';
    const countLine = el('p', 'screen__lead');
    countLine.appendChild(buildInfoLine('「1」の数', `${receivedOnes}個（偶数）`));
    resultSlot.appendChild(countLine);

    resultSlot.appendChild(buildMessage('この規則だけを見ると、正常に見えます。', 'neutral'));

    const question = el('p', 'screen__lead', '本当にデータは変わっていないでしょうか？');
    question.style.fontWeight = '700';
    question.style.color = 'var(--ink)';
    resultSlot.appendChild(question);

    const compareBtn = el('button', 'btn btn--secondary', '送信前と比べる');
    compareBtn.type = 'button';
    resultSlot.appendChild(compareBtn);

    const revealSlot = el('div');
    flowSlot.appendChild(revealSlot);

    compareBtn.addEventListener('click', () => {
      compareBtn.disabled = true;
      revealSlot.innerHTML = '';

      const compareCard = el('div', 'card');
      revealSlot.appendChild(compareCard);
      const beforeBlock = el('div', 'bitblock');
      beforeBlock.appendChild(el('p', 'bitblock__label', '【送信前】'));
      beforeBlock.appendChild(buildBitRow(sent, { flippedIndices: flipIndices }));
      compareCard.appendChild(beforeBlock);
      const afterBlock = el('div', 'bitblock');
      afterBlock.appendChild(el('p', 'bitblock__label', '【受信後】'));
      afterBlock.appendChild(buildBitRow(received, { flippedIndices: flipIndices }));
      compareCard.appendChild(afterBlock);

      revealSlot.appendChild(buildMessage('実際には2bitが反転していました！', 'error', '！'));
      revealSlot.appendChild(buildMessage(
        '2bitが反転しても、「1」の数は偶数のままでした。そのため、この方法では誤りを検出できませんでした。',
        'error'
      ));

      const btnRow = el('div', 'btn-row');
      const nextBtn = el('button', 'btn', 'まとめを見る');
      nextBtn.type = 'button';
      nextBtn.addEventListener('click', () => {
        goTo(screenFinal, {}, 5);
      });
      btnRow.appendChild(nextBtn);
      revealSlot.appendChild(btnRow);
    });
  });
}

/* ==========================================================================
   最終まとめ画面
   ========================================================================== */

const QUIZ_OPTIONS = [
  { key: 'A', text: 'どんな誤りでも必ず発見できる' },
  { key: 'B', text: '少ない追加情報で、一定の誤りを検出できる' },
  { key: 'C', text: '元のデータを送信しなくてもよくなる' },
];
const QUIZ_CORRECT_KEY = 'B';

function screenFinal(container) {
  container.appendChild(el('p', 'screen__eyebrow', 'まとめ'));
  container.appendChild(el('h2', 'screen__title', '4つのSTAGEで体験したこと'));

  const list = el('ul', 'summary-list');
  const items = [
    'STAGE 1：大量のデータを一つ一つ比較するのは大変',
    'STAGE 2：確認用の1bitを追加して、「1」の数を偶数にすることができた',
    'STAGE 3：1bitが反転すると、「1」の数が奇数になり、誤りを検出できた',
    'STAGE 4：2bitが反転すると、「1」の数が偶数のままとなり、誤りを検出できなかった',
  ];
  items.forEach((text, i) => {
    const li = document.createElement('li');
    li.appendChild(el('span', 'summary-list__num', String(i + 1)));
    li.appendChild(el('span', '', text));
    list.appendChild(li);
  });
  container.appendChild(list);

  // STAGE1との比較
  container.appendChild(el('h2', 'screen__title', 'STAGE 1との比較'));
  const grid = el('div', 'compare-grid');
  container.appendChild(grid);

  const card1 = el('div', 'compare-card');
  card1.appendChild(el('p', 'compare-card__title', 'STAGE 1'));
  const dl1 = document.createElement('dl');
  dl1.appendChild(el('dt', '', '方法'));
  dl1.appendChild(el('dd', '', '送信前と受信後のデータを見比べる'));
  dl1.appendChild(el('dt', '', '特徴'));
  dl1.appendChild(el('dd', '', 'データ量が増えると、すべてを比較するのは大変'));
  card1.appendChild(dl1);
  grid.appendChild(card1);

  const card2 = el('div', 'compare-card');
  card2.appendChild(el('p', 'compare-card__title', 'STAGE 2・3'));
  const dl2 = document.createElement('dl');
  dl2.appendChild(el('dt', '', '方法'));
  dl2.appendChild(el('dd', '', '確認用の1bitを追加し、「1」の数が偶数という規則を利用する'));
  dl2.appendChild(el('dt', '', '特徴'));
  dl2.appendChild(el('dd', '', '少量の確認用情報を追加することで、誤りが起きたことを検出できる'));
  card2.appendChild(dl2);
  grid.appendChild(card2);

  container.appendChild(buildMessage(
    '少量の確認用情報を追加することで、元のデータをもう一度確認用として送らなくても、誤りが起きたことを検出できます。',
    'neutral'
  ));

  // 情報量と誤り検出の関係
  container.appendChild(el('h2', 'screen__title', '情報量と誤り検出の関係'));
  const infoCard = el('div', 'card');
  container.appendChild(infoCard);
  const infoRow = el('div', 'info-row');
  infoRow.appendChild(buildInfoLine('元のデータ', '7 bit'));
  infoRow.appendChild(el('span', 'info-row__arrow', '＋'));
  infoRow.appendChild(buildInfoLine('確認用', '1 bit'));
  infoRow.appendChild(el('span', 'info-row__arrow', '→'));
  infoRow.appendChild(buildInfoLine('送信するデータ', '8 bit'));
  infoCard.appendChild(infoRow);
  infoCard.appendChild(el('p', 'screen__lead',
    '誤りを検出するための情報を追加すると、送信する情報量も増える。'));

  const bigMessage = buildMessage(
    '少ない追加情報で誤りを検出できる一方、すべての誤りを検出できるわけではない。',
    'success', '★'
  );
  bigMessage.classList.add('message--big');
  container.appendChild(bigMessage);

  // 最後の確認問題
  container.appendChild(el('h2', 'screen__title', '最後の確認問題'));
  const quizCard = el('div', 'card');
  container.appendChild(quizCard);
  quizCard.appendChild(el('p', 'screen__lead',
    '確認用の1bitを追加する方法の特徴として、最も適切なものはどれですか？'));

  const quizResult = el('div');

  QUIZ_OPTIONS.forEach((opt) => {
    const btn = el('button', 'quiz-option');
    btn.type = 'button';
    btn.appendChild(el('span', 'quiz-option__key', opt.key));
    btn.appendChild(el('span', '', opt.text));
    quizCard.appendChild(btn);

    btn.addEventListener('click', () => {
      const allBtns = quizCard.querySelectorAll('.quiz-option');
      allBtns.forEach((b) => (b.disabled = true));

      const isRight = opt.key === QUIZ_CORRECT_KEY;
      btn.classList.add(isRight ? 'is-correct-choice' : 'is-wrong-choice');
      if (!isRight) {
        const correctBtn = [...allBtns].find(
          (b) => b.querySelector('.quiz-option__key').textContent === QUIZ_CORRECT_KEY
        );
        if (correctBtn) correctBtn.classList.add('is-correct-choice');
      }

      quizResult.innerHTML = '';
      quizResult.appendChild(buildMessage(
        isRight ? '正解です！' : `不正解です。正解は「${QUIZ_CORRECT_KEY}」でした。`,
        isRight ? 'success' : 'error',
        isRight ? '◎' : '×'
      ));
      quizResult.appendChild(buildMessage(
        '少ない追加情報で誤りを検出できる一方、すべての誤りを検出できるわけではありません。',
        'neutral'
      ));
    });
  });
  container.appendChild(quizResult);
}

/* ------------------------------------------------------------------------
   起動
   ------------------------------------------------------------------------ */

restartApp();
