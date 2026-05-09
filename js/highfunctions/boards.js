/** * board-v2.js - 双向线程留言板 (无导出功能版) */
(function() {
'use strict';

const STORAGE_KEY = 'boardDataV2';
let currentView = 'me';
let currentThreadId = null;
let currentComposeMode = null;
let currentComposeType = null;
let selectedImage = null;

let boardData = {
  myThreads: [],
  partnerThreads: [],
  boardReplyPool: [],
  unreadPartnerCount: 0,
  settings: { autoPostEnabled: true, nextAutoPostTime: 0 }   // ← 改为 true
};

function genId() { return 'v2_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6); }
function formatTime(ts) { return new Date(ts).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
function getUniqueShuffled(arr, count) {
  if (!arr || arr.length === 0) return [];
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  const unique = [], seen = new Set();
  for(const s of shuffled) { if(!seen.has(s)) { unique.push(s); seen.add(s); } if(unique.length >= count) break; }
  return unique;
}

function syncReplyPool() {
  if (typeof customReplies !== 'undefined') {
    boardData.boardReplyPool = [...customReplies];
    saveData();
  }
}

async function loadData() {
    try {
        const saved = await localforage.getItem(STORAGE_KEY);
        if (saved) boardData = { ...boardData, ...saved };
        if (boardData.myThreads.length === 0 && boardData.partnerThreads.length === 0) {
            await migrateOldBoardData();
        }
        if (boardData.boardReplyPool.length === 0 && typeof customReplies !== 'undefined' && customReplies.length > 0) {
            boardData.boardReplyPool = JSON.parse(JSON.stringify(customReplies));
            await saveData();
        }
        window.boardDataV2 = boardData;
    } catch(e) { console.warn('BoardV2 load error', e); }
}

async function migrateOldBoardData() {
    try {
        const keys = await localforage.keys();
        const oldKey = keys.find(k => k.includes('envelopeData'));
        if (!oldKey) return 0;
        const oldData = await localforage.getItem(oldKey);
        if (!oldData) return 0;
        const outbox = (oldData.outbox || []).filter(l => l.content);
        if (outbox.length === 0) return 0;
        outbox.forEach(letter => {
            const newThread = {
                id: letter.id || genId(),
                starter: 'me',
                createdAt: letter.sentTime || Date.now(),
                replies: [{
                    id: 'old_m_' + (letter.id || genId()),
                    sender: 'me',
                    text: letter.content,
                    image: null,
                    sticker: null,
                    timestamp: letter.sentTime || Date.now()
                }]
            };
            const matchedReply = (oldData.inbox || []).find(r => r.refId === letter.id);
            if (matchedReply) {
                newThread.replies.push({
                    id: 'old_p_' + (matchedReply.id || genId()),
                    sender: 'partner',
                    text: matchedReply.content,
                    image: null,
                    sticker: null,
                    timestamp: matchedReply.receivedTime || Date.now()
                });
                if (matchedReply.isNew) newThread.unread = true;
            } else if (letter.status === 'pending' && letter.replyTime) {
                newThread.expectedReplyTime = letter.replyTime;
            }
            boardData.myThreads.push(newThread);
        });
        await saveData();
        return outbox.length;
    } catch (e) { return 0; }
}

async function saveData() { try { await localforage.setItem(STORAGE_KEY, boardData); window.boardDataV2 = boardData; } catch(e) { console.warn('BoardV2 save error', e); } }

function checkStatus() {
      const now = Date.now();
      syncReplyPool();
      const processReplies = (threads) => {
        threads.forEach(thread => {
          if (!thread.expectedReplyTime && thread.replies.length > 0) {
            const last = thread.replies[thread.replies.length - 1];
            if (last.sender === 'me') {
              thread.expectedReplyTime = last.timestamp + ((6 + Math.random() * 6) * 3600 * 1000);
              saveData();
            }
          }
          if (thread.expectedReplyTime && now >= thread.expectedReplyTime) {
            const myLastReply = [...thread.replies].reverse().find(r => r.sender === 'me');
            if (myLastReply && !myLastReply.liked && Math.random() < 0.35) {
              myLastReply.liked = true;
            }
            const reply = generatePartnerReply();
            if (reply) {
              thread.replies.push(...reply); delete thread.expectedReplyTime; thread.unread = true;
              saveData();
              if (currentThreadId === thread.id) setTimeout(() => openDetail(thread.id, currentView), 1000);
            }
          }
        });
      };
      processReplies(boardData.myThreads);
      processReplies(boardData.partnerThreads);

// 主动发帖条件：boardData.settings.autoPostEnabled 必须为 true，且用户设置的 settings.boardPartnerWriteEnabled 也为 true
const autoPostAllowed = boardData.settings.autoPostEnabled === true && 
    (typeof settings !== 'undefined' && settings.boardPartnerWriteEnabled === true);

if (autoPostAllowed) {
    if (!boardData.settings.nextAutoPostTime || now >= boardData.settings.nextAutoPostTime) {
        boardData.settings.nextAutoPostTime = now + (4 * 3600 * 1000);
        saveData();
        // 随机概率 20% 真正生成新留言
        if (Math.random() < 0.2) {
            const reply = generatePartnerReply();
            if (reply) {
                boardData.partnerThreads.push({
                    id: genId(),
                    starter: 'partner',
                    createdAt: now,
                    replies: reply,
                    unread: true
                });
                if (typeof showNotification === 'function') {
                    const partnerName = (typeof settings !== 'undefined' && settings.partnerName) || '对方';
                    showNotification(partnerName + '在留言板写了新内容', 'info', 2000);
                }
                saveData();
                // 如果当前正在查看对方留言板，刷新列表
                if (currentView === 'partner') switchTab('partner');
            }
        }
    }
}

function generatePartnerReply() {
    const pool = boardData.boardReplyPool;
    const stickers = (typeof stickerLibrary !== 'undefined' && stickerLibrary.length > 0) ? [...stickerLibrary] : [];
    if (pool.length === 0 && stickers.length === 0) return null;
    const count = 8 + Math.floor(Math.random() * 5);
    const uniquePool = getUniqueShuffled(pool, count);
    const punctuations = ['。', '！', '…', '～', '，', '、'];
    const rawSentences = uniquePool.map(s => s + punctuations[Math.floor(Math.random() * punctuations.length)]);
    let pickedStickers = [];
    if (stickers.length > 0 && Math.random() < 0.35) {
        const stickerCount = Math.random() < 0.5 ? 1 : 2;
        pickedStickers = getUniqueShuffled(stickers, stickerCount);
    }
    let finalText = '';
    const hasStickers = pickedStickers.length > 0;
    const maxEmoji = hasStickers ? 1 : 3;
    let usedEmoji = 0;
    const emojis = (typeof customEmojis !== 'undefined' && customEmojis.length > 0) ? [...customEmojis] : [];
    if (emojis.length > 0 && Math.random() < 0.7) {
        rawSentences.forEach((sentence) => {
            finalText += sentence;
            if (usedEmoji < maxEmoji && Math.random() < 0.35) {
                const emoji = emojis[Math.floor(Math.random() * emojis.length)];
                finalText += emoji;
                usedEmoji++;
            }
        });
    } else {
        finalText = rawSentences.join('');
    }
    const replyObj = {
        id: genId(),
        sender: 'partner',
        text: finalText,
        image: null,
        sticker: null,
        stickers: pickedStickers,
        timestamp: Date.now()
    };
    return [replyObj];
}

function initModals() { bindStaticEvents(); }

function bindStaticEvents() {
  document.getElementById('board-list-close-btn').onclick = () => hideModal(document.getElementById('envelope-board-modal'));
  document.getElementById('board-new-post-btn').onclick = () => window._bv2_openCompose('new', null, 'me');
  document.getElementById('board-detail-back-btn').onclick = () => {
    hideModal(document.getElementById('board-detail-modal'));
    showModal(document.getElementById('envelope-board-modal'));
  };
  document.getElementById('board-global-edit-btn').onclick = () => window._bv2_toggleGlobalEdit();
  document.getElementById('board-delete-thread-btn').onclick = () => {
    if (currentThreadId) window._bv2_deleteThread(currentThreadId, currentView);
  };
  document.getElementById('board-edit-cancel-btn').onclick = () => window._bv2_cancelGlobalEdit();
  document.getElementById('board-edit-save-btn').onclick = () => window._bv2_saveGlobalEdit();
  document.getElementById('board-compose-close-btn').onclick = () => {
      hideModal(document.getElementById('board-compose-modal'));
      if (!window._bv2_composeFromDetail) showModal(document.getElementById('envelope-board-modal'));
      else showModal(document.getElementById('board-detail-modal'));
  };
  document.getElementById('board-compose-cancel-btn').onclick = () => {
      hideModal(document.getElementById('board-compose-modal'));
      if (!window._bv2_composeFromDetail) showModal(document.getElementById('envelope-board-modal'));
      else showModal(document.getElementById('board-detail-modal'));
  };
  document.getElementById('board-compose-send-btn').onclick = () => window._bv2_submitPost();
  document.getElementById('bv2-compose-img-input').onchange = (e) => window._bv2_handleImgSelect(e);
  document.getElementById('board-img-action-cancel').onclick = () => hideModal(document.getElementById('board-img-action-modal'));
  document.getElementById('board-img-replace-action').onclick = () => {
    hideModal(document.getElementById('board-img-action-modal'));
    if (window._bv2_pendingImgId) document.getElementById('bv2-detail-img-input').click();
  };
  document.getElementById('board-img-delete-action').onclick = () => {
    hideModal(document.getElementById('board-img-action-modal'));
    if (window._bv2_pendingImgId && confirm('确定要删除这张图片吗？')) {
      if (!window._bv2_imgEdits) window._bv2_imgEdits = {};
      window._bv2_imgEdits[window._bv2_pendingImgId] = { action: 'delete' };
      const imgEl = document.getElementById(`bv2-img-${window._bv2_pendingImgId}`);
      if (imgEl) imgEl.style.display = 'none';
      window._bv2_pendingImgId = null;
    }
  };
  document.getElementById('bv2-detail-img-input').onchange = async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    let base64 = '';
    if (typeof optimizeImage === 'function') base64 = await optimizeImage(file);
    else base64 = await new Promise(resolve => { const r = new FileReader(); r.onload = ev => resolve(ev.target.result); r.readAsDataURL(file); });
    if (window._bv2_pendingImgId) {
      if (!window._bv2_imgEdits) window._bv2_imgEdits = {};
      window._bv2_imgEdits[window._bv2_pendingImgId] = { action: 'replace', data: base64 };
      const imgEl = document.querySelector(`#bv2-img-${window._bv2_pendingImgId} img`);
      if (imgEl) imgEl.src = base64;
      window._bv2_pendingImgId = null;
    }
    e.target.value = '';
  };
}

window.renderEnvelopeBoard = async function() {
    await loadData();
    syncReplyPool();
    initModals();
    if (!(typeof settings !== 'undefined' && settings.boardPartnerWriteEnabled) && currentView === 'partner') currentView = 'me';
    switchTab(currentView);
    const modal = document.getElementById('envelope-board-modal');
    if (modal && typeof showModal === 'function') showModal(modal);
};

function switchTab(type) {
    currentView = type;
    const isMe = type === 'me';
    const threads = isMe ? boardData.myThreads : boardData.partnerThreads;
    const myName = (typeof settings !== 'undefined' && settings.myName) || '我';
    const partnerName = (typeof settings !== 'undefined' && settings.partnerName) || '对方';
    const tabArea = document.getElementById('board-tab-area');
    // 在 switchTab 函数内，找到 tabArea.innerHTML 的部分，修改如下：
    tabArea.innerHTML = `
    <div style="display:flex; gap:8px; align-items:center;">
        <button class="board-tab-btn ${isMe ? 'active' : ''}" data-tab="me" style="padding:6px 14px; border-radius:20px; border:1px solid var(--border-color); background:${isMe ? 'var(--accent-color)' : 'transparent'}; color:${isMe ? '#fff' : 'var(--text-secondary)'}; font-size:12px; font-weight:600; cursor:pointer; position:relative;">
            <i class="fas fa-comment" style="margin-right:4px;"></i> 我的留言
        </button>
        <button class="board-tab-btn ${!isMe ? 'active' : ''}" data-tab="partner" style="padding:6px 14px; border-radius:20px; border:1px solid var(--border-color); background:${!isMe ? 'var(--accent-color)' : 'transparent'}; color:${!isMe ? '#fff' : 'var(--text-secondary)'}; font-size:12px; font-weight:600; cursor:pointer; position:relative;">
            <i class="fas fa-reply-all" style="margin-right:4px;"></i> 收到的留言
        </button>
    </div>`;
    tabArea.querySelectorAll('[data-tab]').forEach(btn => {
        btn.onclick = () => switchTab(btn.dataset.tab);
    });

    const listBody = document.getElementById('board-list-body');
    if (threads.length === 0) {
        const emptyText = isMe ? '还没有留言' : '还没有收到留言';
        listBody.innerHTML = `<div class="board-empty"><i class="fas fa-sticky-note"></i><p>${emptyText}</p></div>`;
    } else {
        // ... 原有渲染逻辑
      listBody.innerHTML = threads.slice().reverse().map(t => {
        const last = t.replies[t.replies.length - 1];
        let statusText = '等待回复', statusClass = 'pending';
        if (last && ((isMe && last.sender === 'partner') || (!isMe && last.sender === 'me'))) {
          statusText = '已回复'; statusClass = 'replied';
        }
        const preview = t.replies[0] ? (t.replies[0].image ? '🖼 图片留言' : escapeHtml((t.replies[0].text || '').substring(0, 40))) : '';
        const unreadStar = t.unread ? '<span style="position:absolute;top:12px;right:12px;font-size:14px;z-index:2;">✨</span>' : '';
        return `<div class="board-card" data-thread-id="${t.id}" style="position:relative;cursor:pointer;">${unreadStar}<div class="board-card-top-line"></div><div class="board-card-body"><div class="board-card-preview">${preview}</div><div class="board-card-meta"><span class="board-card-date">${formatTime(t.createdAt)}</span><span class="board-card-status ${statusClass}">${statusText}</span></div></div></div>`;
      }).join('');
      listBody.querySelectorAll('[data-thread-id]').forEach(card => {
          card.onclick = () => openDetail(card.dataset.threadId, currentView);
      });
    }
    document.getElementById('board-new-post-btn').style.display = isMe ? 'flex' : 'none';
}

function openDetail(threadId, type) {
    currentThreadId = threadId;
    const threads = type === 'me' ? boardData.myThreads : boardData.partnerThreads;
    const thread = threads.find(t => t.id === threadId);
    if (!thread) return;
    if (thread.unread) {
      thread.unread = false; saveData();
      if (document.getElementById('envelope-board-modal')?.style.display !== 'none') switchTab(currentView);
    }
    const myName = (typeof settings !== 'undefined' && settings.myName) || '我';
    const partnerName = (typeof settings !== 'undefined' && settings.partnerName) || '对方';
    const isMe = type === 'me';
    restoreDetailViewUI();
    let bodyHtml = '';
    thread.replies.forEach((r, idx) => {
      const isSenderMe = r.sender === 'me';
      const isStarter = idx === 0;
      let cHtml = '';
      if (r.text) cHtml += `<div class="${isSenderMe ? 'board-user-text' : 'board-reply-text'}" id="bv2-text-${r.id}">${escapeHtml(r.text)}</div>`;
      if (r.image) cHtml += `<div id="bv2-img-${r.id}" class="${isSenderMe ? 'board-user-text' : 'board-reply-text'}" style="display:inline-block; position:relative; margin-bottom:8px;"><img src="${r.image}" style="max-width:150px;border-radius:8px;display:block;cursor:pointer;" onclick="viewImage('${r.image}')"></div>`;
      if (r.stickers && r.stickers.length > 0) {
          cHtml += `<div style="position:relative; display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;margin-bottom:8px; padding-left:40px;">`;
          r.stickers.forEach(st => { cHtml += `<img src="${st}" style="max-width:120px; max-height:120px; border-radius:8px; object-fit:contain;">`; });
          cHtml += '</div>';
      }
      const sectionClass = isStarter ? 'board-user-section' : 'board-reply-section';
      const labelClass = isStarter ? 'board-user-label' : 'board-reply-label';
      const labelText = isStarter ? ' 的留言' : ' 的回复';
      const senderName = isSenderMe ? myName : partnerName;
      bodyHtml += `<div class="${sectionClass}" id="bv2-section-${r.id}"><div class="${labelClass}">${senderName}${labelText}</div>${cHtml}</div>`;
      const isLast = idx === thread.replies.length - 1;
      const nextIsPartner = thread.replies[idx + 1]?.sender === 'partner';
      if (!isMe && isLast && r.sender === 'partner' && r.liked) bodyHtml += `<div class="board-system-hint">${myName} 赞了 ${partnerName} 的留言</div>`;
      else if (!isMe && !isLast && r.sender === 'partner' && r.liked && thread.replies[idx + 1]?.sender === 'me') bodyHtml += `<div class="board-system-hint">${myName} 赞了 ${partnerName} 的留言</div>`;
      else if (r.sender === 'me' && r.liked && nextIsPartner) bodyHtml += `<div class="board-system-hint">${partnerName} 赞了 ${myName} 的留言</div>`;
    });
    const last = thread.replies[thread.replies.length - 1];
    let actionHtml = '';
    if (last) {
      if (!isMe && last.sender === 'partner') {
        actionHtml = `
        <div style="display:flex; align-items:center; gap:12px; margin-top:16px;">
          <button class="board-add-btn" id="board-reply-btn"><i class="fas fa-reply"></i> 回复</button>
          <button class="board-like-btn ${last.liked ? 'liked' : ''}" id="board-like-btn">
            <i class="${last.liked ? 'fas' : 'far'} fa-thumbs-up"></i>
          </button>
        </div>`;
      } else if (isMe && last.sender === 'partner') {
        actionHtml = `<button class="board-add-btn" style="margin-top:16px;" id="board-continue-btn"><i class="fas fa-pen"></i> 继续留言</button>`;
      } else {
        actionHtml = `<div class="board-waiting-reply" style="margin-top:16px;"><i class="fas fa-hourglass-half"></i> 等待回复中...</div>`;
      }
    }
    document.getElementById('board-detail-body').innerHTML = bodyHtml + actionHtml;
    document.getElementById('board-detail-date').textContent = new Date(thread.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    const continueBtn = document.getElementById('board-continue-btn');
    const replyBtn = document.getElementById('board-reply-btn');
    if (continueBtn) continueBtn.onclick = () => window._bv2_openCompose('continue', threadId, 'me');
    if (replyBtn) replyBtn.onclick = () => window._bv2_openCompose('reply', threadId, 'partner');
    const likeBtn = document.getElementById('board-like-btn');
    if (likeBtn) {
      likeBtn.onclick = async () => {
        last.liked = !last.liked;
        openDetail(threadId, type);
        if (last.liked && typeof showNotification === 'function') showNotification('已点赞', 'success', 1500);
        if (typeof window.setBoardDataV2 === 'function') window.setBoardDataV2(boardData);
      };
    }
    hideModal(document.getElementById('envelope-board-modal'));
    setTimeout(() => {
      showModal(document.getElementById('board-detail-modal'));
      const p = document.querySelector('.board-paper');
      if (p) p.scrollTop = p.scrollHeight;
    }, 100);
}

function openCompose(mode, threadId, type) {
  currentComposeMode = mode;
  currentThreadId = threadId;
  currentComposeType = type;
  window._bv2_composeFromDetail = (mode !== 'new');
  selectedImage = null;
  const titleMap = { new: '写新留言', continue: '继续留言', reply: '回复Ta' };
  document.getElementById('board-compose-title-text').textContent = titleMap[mode] || '写新留言';
  document.getElementById('bv2-compose-text').value = '';
  document.getElementById('bv2-img-hint').style.display = 'none';
  document.getElementById('bv2-compose-img-input').value = '';
  hideModal(document.getElementById('board-detail-modal'));
  setTimeout(() => {
    showModal(document.getElementById('board-compose-modal'));
    document.getElementById('bv2-compose-text')?.focus();
  }, 100);
}

function handleImgSelect(e) {
  const file = e.target.files[0]; if (!file) return;
  if (typeof optimizeImage === 'function') { optimizeImage(file).then(b => { selectedImage = b; document.getElementById('bv2-img-hint').style.display = 'inline'; }); }
  else { const r = new FileReader(); r.onload = ev => { selectedImage = ev.target.result; document.getElementById('bv2-img-hint').style.display = 'inline'; }; r.readAsDataURL(file); }
}

async function submitPost() {
  const text = document.getElementById('bv2-compose-text')?.value.trim() || '';
  if (!text && !selectedImage) {
    if(typeof showNotification === 'function') showNotification('内容不能为空', 'warning');
    return;
  }
  const newReply = { id: genId(), sender: 'me', text, image: selectedImage || null, sticker: null, timestamp: Date.now() };
  if (currentComposeMode === 'new') {
    boardData.myThreads.push({ id: genId(), starter: 'me', createdAt: Date.now(), replies: [newReply] });
  } else {
    const t = (currentComposeType === 'me' ? boardData.myThreads : boardData.partnerThreads).find(t => t.id === currentThreadId);
    if(t) { t.replies.push(newReply); delete t.expectedReplyTime; }
  }
  await saveData();
  checkStatus();
  hideModal(document.getElementById('board-compose-modal'));
  if(typeof showNotification === 'function') showNotification('发布成功', 'success');
  if (currentComposeMode === 'new') {
    switchTab(currentComposeType);
    showModal(document.getElementById('envelope-board-modal'));
  } else {
    setTimeout(() => openDetail(currentThreadId, currentComposeType), 100);
  }
}

function findReplyById(id) {
    for (let t of boardData.myThreads) { const r = t.replies.find(x => x.id === id); if(r) return r; }
    for (let t of boardData.partnerThreads) { const r = t.replies.find(x => x.id === id); if(r) return r; }
    return null;
}

function editText(replyId) {
    const textEl = document.getElementById(`bv2-text-${replyId}`);
    if (!textEl || textEl.classList.contains('editing')) return;
    const originalText = textEl.textContent;
    textEl.contentEditable = true;
    textEl.classList.add('editing');
    textEl.focus();
    const range = document.createRange();
    range.selectNodeContents(textEl);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    const section = document.getElementById(`bv2-section-${replyId}`);
    if (section && !section.querySelector('.board-edit-actions')) {
      const actions = document.createElement('div');
      actions.className = 'board-edit-actions';
      actions.innerHTML = `<button class="board-edit-btn cancel" onclick="window._bv2_cancelEdit('${replyId}')">取消</button><button class="board-edit-btn save" onclick="window._bv2_saveEdit('${replyId}')">保存</button>`;
      section.appendChild(actions);
    }
    textEl.dataset.originalText = originalText;
}

async function saveEdit(replyId) {
    const textEl = document.getElementById(`bv2-text-${replyId}`);
    if (!textEl) return;
    const newText = textEl.textContent.trim();
    if (!newText) { if(typeof showNotification === 'function') showNotification('内容不能为空', 'warning'); return; }
    const reply = findReplyById(replyId);
    if (reply) { reply.text = newText; await saveData(); if(typeof showNotification === 'function') showNotification('已保存', 'success'); }
    exitEditMode(replyId);
}

function cancelEdit(replyId) {
    const textEl = document.getElementById(`bv2-text-${replyId}`);
    if (!textEl) return;
    textEl.textContent = textEl.dataset.originalText || '';
    exitEditMode(replyId);
}

function exitEditMode(replyId) {
    const textEl = document.getElementById(`bv2-text-${replyId}`);
    if(textEl) { textEl.contentEditable = false; textEl.classList.remove('editing'); delete textEl.dataset.originalText; }
    const section = document.getElementById(`bv2-section-${replyId}`);
    if (section) { const actions = section.querySelector('.board-edit-actions'); if (actions) actions.remove(); }
}

async function deleteThread(id, type) {
  if (!confirm('确定删除这条留言记录吗？')) return;
  if (type === 'me') boardData.myThreads = boardData.myThreads.filter(t => t.id !== id);
  else boardData.partnerThreads = boardData.partnerThreads.filter(t => t.id !== id);
  await saveData();
  hideModal(document.getElementById('board-detail-modal'));
  switchTab(type);
  showModal(document.getElementById('envelope-board-modal'));
  if(typeof showNotification === 'function') showNotification('已删除', 'success');
}

window._bv2_toggleGlobalEdit = function() {
  const threads = currentView === 'me' ? boardData.myThreads : boardData.partnerThreads;
  const thread = threads.find(t => t.id === currentThreadId);
  if (!thread) return;
  const editBar = document.getElementById('board-edit-actions-bar');
  const penBtn = document.getElementById('board-global-edit-btn');
  const deleteBtn = document.getElementById('board-delete-thread-btn');
  if (editBar && editBar.style.display === 'flex') {
    window._bv2_saveGlobalEdit();
    return;
  }
  window._bv2_imgEdits = {};
  const hasImg = thread.replies.some(r => r.image);
  if (hasImg) {
    const hint = document.createElement('div');
    hint.id = 'bv2-img-edit-hint';
    hint.style.cssText = 'font-size:12px; color:var(--text-secondary); margin-bottom:12px; text-align:center;';
    hint.textContent = '点击图片可进行替换或删除';
    editBar.parentElement.insertBefore(hint, editBar);
  }
  thread.replies.forEach(r => {
    if (r.text) {
      const el = document.getElementById(`bv2-text-${r.id}`);
      if (el) {
        el.dataset.originalText = el.textContent;
        el.contentEditable = true;
        el.classList.add('editing');
      }
    }
  });
  thread.replies.forEach(r => {
    if (r.image) {
      const imgWrapper = document.getElementById(`bv2-img-${r.id}`);
      const imgEl = imgWrapper ? imgWrapper.querySelector('img') : null;
      if (imgEl) {
        imgEl.dataset.origOnclick = imgEl.getAttribute('onclick');
        imgEl.removeAttribute('onclick');
        imgEl.style.cursor = 'pointer';
        imgEl.onclick = function(e) {
          e.stopPropagation();
          window._bv2_pendingImgId = r.id;
          document.getElementById('board-img-action-modal').style.display = 'flex';
        };
      }
    }
  });
  if (editBar) editBar.style.display = 'flex';
  if (penBtn) penBtn.style.display = 'none';
  if (deleteBtn) deleteBtn.style.display = 'none';
  const originalActions = document.querySelector('.board-paper-content > .board-add-btn, .board-paper-content > .board-waiting-reply');
  if (originalActions) originalActions.style.display = 'none';
};

window._bv2_saveGlobalEdit = async function() {
  const threads = currentView === 'me' ? boardData.myThreads : boardData.partnerThreads;
  const thread = threads.find(t => t.id === currentThreadId);
  if (!thread) return;
  let needSave = false;
  thread.replies.forEach(r => {
    if (r.text) {
      const el = document.getElementById(`bv2-text-${r.id}`);
      if (el && el.classList.contains('editing')) {
        const newText = el.textContent.trim();
        if (newText && newText !== r.text) { r.text = newText; needSave = true; }
        el.contentEditable = false;
        el.classList.remove('editing');
        delete el.dataset.originalText;
      }
    }
  });
  const edits = window._bv2_imgEdits || {};
  const hadImgChange = Object.keys(edits).length > 0;
  Object.keys(edits).forEach(replyId => {
    const reply = thread.replies.find(x => x.id === replyId);
    if (!reply) return;
    if (edits[replyId].action === 'delete' && reply.image) {
      reply.image = null;
      needSave = true;
    } else if (edits[replyId].action === 'replace' && edits[replyId].data) {
      reply.image = edits[replyId].data;
      needSave = true;
    }
  });
  window._bv2_imgEdits = {};
  if (needSave) {
    await saveData();
    if(typeof showNotification === 'function') showNotification('修改已保存', 'success');
    if (hadImgChange) {
      openDetail(currentThreadId, currentView);
      return;
    }
  }
  restoreDetailViewUI();
};

window._bv2_cancelGlobalEdit = function() {
    const threads = currentView === 'me' ? boardData.myThreads : boardData.partnerThreads;
    const thread = threads.find(t => t.id === currentThreadId);
    if (!thread) return;
    thread.replies.forEach(r => {
        if (r.text) {
            const el = document.getElementById(`bv2-text-${r.id}`);
            if (el && el.classList.contains('editing')) {
                el.textContent = el.dataset.originalText || r.text;
                el.contentEditable = false;
                el.classList.remove('editing');
                delete el.dataset.originalText;
            }
        }
    });
    document.querySelectorAll('.img-edit-overlay').forEach(ov => ov.remove());
    thread.replies.forEach(r => {
        if (r.image) {
            const imgWrapper = document.getElementById(`bv2-img-${r.id}`);
            const imgEl = imgWrapper ? imgWrapper.querySelector('img') : null;
            if (imgEl) {
                if (imgEl.dataset.origOnclick) {
                    imgEl.setAttribute('onclick', imgEl.dataset.origOnclick);
                    delete imgEl.dataset.origOnclick;
                }
                imgEl.onclick = null;
                imgEl.style.opacity = '1';
                imgEl.classList.remove('editing');
                if (imgWrapper) imgWrapper.style.display = 'inline-block';
            }
        }
    });
    window._bv2_imgEdits = {};
    restoreDetailViewUI();
};

function restoreDetailViewUI() {
  const editBar = document.getElementById('board-edit-actions-bar');
  const penBtn = document.querySelector('.board-detail-actions .board-detail-action-btn:not(.delete)');
  const deleteBtn = document.querySelector('.board-detail-actions .board-detail-action-btn.delete');
  const originalActions = document.querySelector('.board-paper-content > .board-add-btn, .board-paper-content > .board-waiting-reply');
  if (editBar) editBar.style.display = 'none';
  if (penBtn) penBtn.style.display = 'flex';
  if (deleteBtn) deleteBtn.style.display = 'flex';
  if (originalActions) originalActions.style.display = '';
  const hint = document.getElementById('bv2-img-edit-hint');
  if (hint) hint.remove();
}

window.loadEnvelopeData = loadData;
window.checkEnvelopeStatus = checkStatus;
window.setBoardDataV2 = function(newData) { boardData = { ...boardData, ...newData }; window.boardDataV2 = boardData; saveData(); };
window._bv2_openCompose = openCompose;
window._bv2_submitPost = submitPost;
window._bv2_handleImgSelect = handleImgSelect;
window._bv2_deleteThread = deleteThread;
window._bv2_saveEdit = saveEdit;
window._bv2_cancelEdit = cancelEdit;
window._bv2_toggleGlobalEdit = window._bv2_toggleGlobalEdit;
window._bv2_saveGlobalEdit = window._bv2_saveGlobalEdit;
window._bv2_cancelGlobalEdit = window._bv2_cancelGlobalEdit;

window.syncBoardReplyPool = function() {
    if (typeof customReplies !== 'undefined') {
        boardData.boardReplyPool = [...customReplies];
        saveData();
        console.log('[Board] 回复池已同步字卡库，共', boardData.boardReplyPool.length, '条');
    }
};

loadData().then(() => { setInterval(checkStatus, 60000); checkStatus(); });
})();