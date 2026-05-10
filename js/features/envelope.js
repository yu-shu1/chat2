let envelopeData = { outbox: [], inbox: [] }; 
let currentEnvTab = 'outbox';
let editingEnvId = null; 
let editingEnvSection = null; 
let autoMessageBoardTimer = null;      // 主动留言定时器
let replyCheckInterval = null;
window._replyParentId = null;

async function loadEnvelopeData() {
    const saved = await localforage.getItem(getStorageKey('envelopeData'));
    if (saved) envelopeData = saved;
    const oldPending = await localforage.getItem(getStorageKey('pending_envelope'));
    if (oldPending && envelopeData.outbox.length === 0) {
        envelopeData.outbox.push({
            id: 'legacy_' + Date.now(),
            content: '（历史留言）',
            sentTime: oldPending.sentTime,
            replyTime: oldPending.replyTime,
            status: 'pending'
        });
        await localforage.removeItem(getStorageKey('pending_envelope'));
        saveEnvelopeData();
    }
}

function saveEnvelopeData() {
    localforage.setItem(getStorageKey('envelopeData'), envelopeData);
}

// 生成回复内容：从 customReplies 中随机选取 3~6 句话
function generateEnvelopeReplyText() {
    const sourcePool = [...customReplies];
    if (!sourcePool.length) return '（对方暂无可用的字卡库）';
    const sentenceCount = Math.floor(Math.random() * (6 - 3 + 1)) + 3;
    let replyContent = "";
    for (let i = 0; i < sentenceCount; i++) {
        const randomSentence = sourcePool[Math.floor(Math.random() * sourcePool.length)];
        const punctuation = Math.random() < 0.2 ? "！" : (Math.random() < 0.2 ? "..." : "。");
        replyContent += randomSentence + punctuation;
    }
    
    // 30% 概率混入 1~3 个表情
    if (customEmojis && customEmojis.length > 0 && Math.random() < 0.3) {
        const emojiCount = Math.floor(Math.random() * 3) + 1;
        const selected = [];
        for (let i = 0; i < emojiCount; i++) {
            selected.push(customEmojis[Math.floor(Math.random() * customEmojis.length)]);
        }
        const emojiStr = selected.join(' ');
        if (Math.random() < 0.5) replyContent = emojiStr + ' ' + replyContent;
        else replyContent = replyContent + ' ' + emojiStr;
    }
    return replyContent;
}

async function checkEnvelopeStatus() {
    await loadEnvelopeData();
    const now = Date.now();
    let changed = false;
    let newReplyLetter = null;
    
    envelopeData.outbox.forEach(letter => {
        if (letter.status === 'pending' && now >= letter.replyTime) {
            letter.status = 'replied';
            const replyContent = generateEnvelopeReplyText();
            const replyId = 'reply_' + Date.now() + '_' + Math.random().toString(36).substr(2,4);
            const inboxLetter = {
                id: replyId,
                refId: letter.id,
                parentId: letter.id,            // 指向被回复的 outbox 留言
                originalContent: letter.content,
                content: replyContent,
                receivedTime: Date.now(),
                isNew: true,
                createdAt: Date.now(),
                replies: []
            };
            envelopeData.inbox.push(inboxLetter);
            
            // 将回复 id 添加到 outbox 的 replies 数组
            letter.replies = letter.replies || [];
            letter.replies.push(replyId);
            
            newReplyLetter = inboxLetter;
            changed = true;
            playSound('message');
        }
    });
    
    if (changed) {
        saveEnvelopeData();
        if (newReplyLetter) showEnvelopeReplyPopup(newReplyLetter);
    }
}


function showEnvelopeReplyPopup(letter) {
    const existing = document.getElementById('envelope-reply-popup');
    if (existing) existing.remove();
    const popup = document.createElement('div');
    popup.id = 'envelope-reply-popup';
    popup.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--secondary-bg);border:1px solid var(--border-color);border-radius:20px;padding:18px 20px;z-index:8000;max-width:320px;width:88%;box-shadow:0 8px 32px rgba(0,0,0,0.18);display:flex;flex-direction:column;gap:12px;animation:slideUpNotif 0.4s cubic-bezier(0.22,1,0.36,1);';
    popup.innerHTML = `
        <style>@keyframes slideUpNotif{from{opacity:0;transform:translateX(-50%) translateY(24px) scale(0.9)}60%{transform:translateX(-50%) translateY(-4px) scale(1.02)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}</style>
        <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:26px;">💬</span>
            <div>
                <div style="font-size:14px;font-weight:700;color:var(--text-primary);">收到了一条留言</div>
                <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;opacity:0.8;">Ta 给你写了留言，快去看看吧~</div>
            </div>
        </div>
        <div style="display:flex;gap:8px;">
            <button onclick="document.getElementById('envelope-reply-popup').remove();" style="flex:1;padding:8px 0;border-radius:12px;border:1px solid var(--border-color);background:var(--primary-bg);color:var(--text-secondary);font-size:13px;cursor:pointer;">稍后查看</button>
            <button onclick="openEnvelopeAndViewReply('${letter.id}');" style="flex:2;padding:8px 0;border-radius:12px;border:none;background:var(--accent-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;">立即阅读 ✉</button>
        </div>`;
    document.body.appendChild(popup);
    setTimeout(() => { if (popup.parentNode) popup.remove(); }, 8000);
}

window.openEnvelopeAndViewReply = function(replyId) {
    const popup = document.getElementById('envelope-reply-popup');
    if (popup) popup.remove();
    const envelopeModal = document.getElementById('envelope-modal');
    showModal(envelopeModal);
    setTimeout(() => {
        switchEnvTab('inbox');
        viewEnvLetter('inbox', replyId);
    }, 200);
};

window.switchEnvTab = function(tab) {
    currentEnvTab = tab;
    document.getElementById('env-tab-outbox').classList.toggle('active', tab === 'outbox');
    document.getElementById('env-tab-inbox').classList.toggle('active', tab === 'inbox');
    document.getElementById('env-outbox-section').style.display = tab === 'outbox' ? 'block' : 'none';
    document.getElementById('env-inbox-section').style.display = tab === 'inbox' ? 'block' : 'none';
    document.getElementById('env-compose-form').style.display = 'none';
    document.getElementById('env-main-close-btn').style.display = 'flex';
    renderEnvelopeLists();
};

function renderEnvelopeLists() {
    renderOutboxList();
    renderInboxList();
    const pendingCount = envelopeData.outbox.filter(l => l.status === 'pending').length;
    const newInboxCount = envelopeData.inbox.filter(l => l.isNew).length;
    const outboxBadge = document.getElementById('env-outbox-badge');
    const inboxBadge = document.getElementById('env-inbox-badge');
    if (outboxBadge) { outboxBadge.textContent = pendingCount; outboxBadge.style.display = pendingCount > 0 ? 'inline-block' : 'none'; }
    if (inboxBadge) { inboxBadge.textContent = newInboxCount; inboxBadge.style.display = newInboxCount > 0 ? 'inline-block' : 'none'; }
    const envelopeEntryBadge = document.getElementById('env-entry-badge');
    if (envelopeEntryBadge) { envelopeEntryBadge.style.display = newInboxCount > 0 ? 'inline-block' : 'none'; }
}

function renderOutboxList() {
    const list = document.getElementById('env-outbox-list');
    if (!list) return;
    if (envelopeData.outbox.length === 0) {
    list.innerHTML = `<div class="env-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/></svg>
            <div style="font-size:14px;font-weight:500;margin-top:4px;">还没有发送留言</div>
            <div style="font-size:12px;margin-top:6px;opacity:0.6;">提笔写下给Ta的留言吧~</div>
        </div>`;
        return;
    }
    list.innerHTML = envelopeData.outbox.slice().reverse().map(letter => {
        const date = new Date(letter.sentTime).toLocaleString('zh-CN', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        const isPending = letter.status === 'pending';
        const replyTime = isPending ? new Date(letter.replyTime).toLocaleString('zh-CN', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }) : '';
        const statusIcon = isPending ? '⏳' : '✅';
        const statusText = isPending ? `预计 ${replyTime} 回复` : '已收到回复';
        const preview = letter.content.length > 38 ? letter.content.substring(0, 38) + '…' : letter.content;
        
        return `
        <div class="env-letter-item" data-id="${letter.id}" onclick="viewEnvLetter('outbox','${letter.id}')">
            <div class="env-letter-header">
                <div class="env-letter-header-from">
                    <i class="fas fa-pen"></i> 留言 · ${date}
                </div>
                <div class="env-stamp">📮</div>
            </div>
            <div class="env-letter-body">
                <div class="env-letter-preview">${preview}</div>
                <div class="env-letter-status">${statusIcon} ${statusText}</div>
            </div>
        </div>`;
    }).join('');
}

function renderInboxList() {
    const list = document.getElementById('env-inbox-list');
    if (!list) return;
    if (envelopeData.inbox.length === 0) {
    list.innerHTML = `<div class="env-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/><polyline points="22 13 12 13"/><path d="M19 16l-5-3-5 3"/></svg>
            <div style="font-size:14px;font-weight:500;margin-top:4px;">还没有收到留言</div>
            <div style="font-size:12px;margin-top:6px;opacity:0.6;">对方正在认真回复中，请稍候~</div>
        </div>`;
        return;
    }
    list.innerHTML = envelopeData.inbox.slice().reverse().map(letter => {
        const date = new Date(letter.receivedTime).toLocaleString('zh-CN', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        const preview = letter.content.length > 50 ? letter.content.substring(0, 50) + '…' : letter.content;
        const isNew = letter.isNew;
        const origPreview = letter.originalContent ? (letter.originalContent.length > 32 ? letter.originalContent.substring(0,32)+'…' : letter.originalContent) : '';
        
        return `
        <div class="env-letter-item reply ${isNew ? 'env-letter-new' : ''}" data-id="${letter.id}" onclick="viewEnvLetter('inbox','${letter.id}')">
            <div class="env-letter-header">
                <div class="env-letter-header-from">
                    <i class="fas fa-inbox"></i> 收到 · ${date}
                    ${isNew ? '<span class="new-badge">新</span>' : ''}
                </div>
                <div class="env-stamp">💌</div>
            </div>
            ${origPreview ? `<div class="orig-preview">你的留言: ${origPreview}</div>` : ''}
            <div class="env-letter-body">
                <div class="env-letter-preview">${preview}</div>
            </div>
        </div>`;
    }).join('');
}

window.viewEnvLetter = function(section, id) {
    const letters = section === 'outbox' ? envelopeData.outbox : envelopeData.inbox;
    const letter = letters.find(l => l.id === id);
    if (!letter) return;
    if (section === 'inbox' && letter.isNew) {
        letter.isNew = false;
        saveEnvelopeData();
        renderEnvelopeLists();
    }
    editingEnvId = id;
    editingEnvSection = section;

    document.getElementById('env-view-title').textContent = section === 'outbox' ? '我的留言' : '收到的留言';

    const dateObj = section === 'outbox' 
        ? new Date(letter.sentTime) 
        : new Date(letter.receivedTime);
    const y = dateObj.getFullYear();
    const mo = String(dateObj.getMonth()+1).padStart(2,'0');
    const d = String(dateObj.getDate()).padStart(2,'0');
    const dateStr = `${y}/${mo}/${d}`;
    const weekdays = ['日','一','二','三','四','五','六'];
    const fullDateStr = dateStr + ' 星期' + weekdays[dateObj.getDay()];

    const stampEl = document.getElementById('env-view-stamp-date');
    if (stampEl) stampEl.textContent = `${mo}/${d}`;

    const dateLine = document.getElementById('env-view-date-line');
    if (dateLine) dateLine.textContent = fullDateStr;

    const toLine = document.getElementById('env-view-to-line');
    const greetingLine = document.getElementById('env-view-greeting-line');
    if (section === 'outbox') {
        const partnerName = (typeof settings !== 'undefined' && settings.partnerName) || '亲爱的';
        if (toLine) toLine.textContent = `给 ${partnerName} 的留言：`;
        if (greetingLine) greetingLine.textContent = '见字如面，望君安好。';
    } else {
        const myName = (typeof settings !== 'undefined' && settings.myName) || '你';
        if (toLine) toLine.textContent = `给 ${myName} 的留言：`;
        if (greetingLine) greetingLine.textContent = '见字如面，一切皆好。';
    }

    const textEl = document.getElementById('env-view-text');
    if (textEl) textEl.textContent = letter.content;

    const signDateEl = document.getElementById('env-view-sign-date');
    const signNameEl = document.getElementById('env-view-sign-name');
    if (signDateEl) signDateEl.textContent = fullDateStr;
    if (section === 'outbox') {
        const myName = (typeof settings !== 'undefined' && settings.myName) || '你';
        if (signNameEl) signNameEl.textContent = myName;
    } else {
        const partnerName = (typeof settings !== 'undefined' && settings.partnerName) || '对方';
        if (signNameEl) signNameEl.textContent = partnerName;
    }

    document.getElementById('env-edit-input').value = letter.content;
    document.getElementById('env-view-content').style.display = 'block';
    document.getElementById('env-view-edit').style.display = 'none';
    document.getElementById('env-view-edit-btn').style.display = 'inline-flex';
    document.getElementById('env-view-save-btn').style.display = 'none';
    const origCtx = document.getElementById('env-view-original-ctx');
    const origText = document.getElementById('env-view-original-text');
    const origExpand = document.getElementById('env-view-original-expand');
    if (origCtx && origText) {
        if (section === 'inbox' && letter.originalContent) {
            origText.textContent = letter.originalContent;
            origText.style.maxHeight = '80px';
            origCtx.style.display = 'block';
            if (origExpand) {
                origExpand.style.display = letter.originalContent.length > 120 ? 'block' : 'none';
                origExpand.textContent = '展开查看全文';
            }
        } else {
            origCtx.style.display = 'none';
        }
    }
    
    // 获取按钮
    const replyBtn = document.getElementById('env-view-reply-btn');
    const deleteBtn = document.getElementById('env-view-delete-btn');
    
    // 显示按钮
    if (replyBtn) replyBtn.style.display = '';
    if (deleteBtn) deleteBtn.style.display = '';
    
    // 绑定回复事件（始终允许回复任何留言）
    if (replyBtn) {
        replyBtn.onclick = () => {
            // 关闭当前详情窗，打开追加回复表单
            closeEnvViewModal();
            openReplyForm(id, section);
        };
    }
    
    // 绑定删除事件
    if (deleteBtn) {
        deleteBtn.onclick = () => {
            const confirmed = confirm('确定要删除这条留言及其所有回复吗？');
            if (confirmed) {
                deleteEnvLetter(null, section, id);
                closeEnvViewModal();
                renderEnvelopeLists();
            }
        };
    }    
    
    showModal(document.getElementById('envelope-view-modal'));
};

window.toggleEnvEdit = function() {
    const contentEl = document.getElementById('env-view-content');
    const editEl = document.getElementById('env-view-edit');
    const editBtn = document.getElementById('env-view-edit-btn');
    const saveBtn = document.getElementById('env-view-save-btn');
    const isEditing = editEl.style.display !== 'none';
    if (isEditing) {
        contentEl.style.display = 'block';
        editEl.style.display = 'none';
        editBtn.textContent = '编辑';
        saveBtn.style.display = 'none';
    } else {
        contentEl.style.display = 'none';
        editEl.style.display = 'block';
        editBtn.textContent = '取消';
        saveBtn.style.display = 'inline-flex';
    }
};

window.saveEnvEdit = function() {
    const newContent = document.getElementById('env-edit-input').value.trim();
    if (!newContent) { showNotification('内容不能为空', 'warning'); return; }
    const letters = editingEnvSection === 'outbox' ? envelopeData.outbox : envelopeData.inbox;
    const letter = letters.find(l => l.id === editingEnvId);
    if (letter) {
        letter.content = newContent;
        saveEnvelopeData();
        const textEl = document.getElementById('env-view-text');
        if (textEl) textEl.textContent = newContent;
        showNotification('已保存修改', 'success');
        toggleEnvEdit();
    }
};

window.closeEnvViewModal = function() {
    hideModal(document.getElementById('envelope-view-modal'));
};

    window.deleteEnvLetter = function(event, section, id) {
    if (event) event.stopPropagation();
    if (!confirm('确定要删除这条留言及其所有回复吗？')) return;

    // 递归删除函数
    function deleteWithChildren(parentId) {
    // 尝试从 outbox 删除
    let index = envelopeData.outbox.findIndex(m => m.id === parentId);
    if (index !== -1) {
        const msg = envelopeData.outbox[index];
        if (msg.replies && msg.replies.length) {
            msg.replies.forEach(childId => deleteWithChildren(childId));
        }
        envelopeData.outbox.splice(index, 1);
        return;
    }
    // 尝试从 inbox 删除
    index = envelopeData.inbox.findIndex(m => m.id === parentId);
    if (index !== -1) {
        const msg = envelopeData.inbox[index];
        if (msg.replies && msg.replies.length) {
            msg.replies.forEach(childId => deleteWithChildren(childId));
        }
        envelopeData.inbox.splice(index, 1);
        return;
    }
}
// 调用时只传 id，不再需要 section 参数
deleteWithChildren(id);
    
    // 同时需要从父级的 replies 数组中移除该 id（避免悬空引用）
    // 遍历 outbox 和 inbox 清除任何包含此 id 的 replies
    envelopeData.outbox.forEach(msg => {
        if (msg.replies && msg.replies.includes(id)) {
            msg.replies = msg.replies.filter(rid => rid !== id);
        }
    });
    envelopeData.inbox.forEach(msg => {
        if (msg.replies && msg.replies.includes(id)) {
            msg.replies = msg.replies.filter(rid => rid !== id);
        }
    });
    
    saveEnvelopeData();
    renderEnvelopeLists();
    showNotification('已删除留言及所有回复', 'success');
};

window.openNewEnvelopeForm = function() {
    document.getElementById('env-outbox-section').style.display = 'none';
    document.getElementById('env-inbox-section').style.display = 'none';
    document.getElementById('env-main-close-btn').style.display = 'none';
    document.getElementById('env-compose-title').textContent = '写留言';
    document.getElementById('envelope-input').value = '';
    document.getElementById('env-send-to-chat').checked = false;
    document.getElementById('env-compose-form').style.display = 'block';
};

window.cancelEnvelopeCompose = function() {
    document.getElementById('env-compose-form').style.display = 'none';
    document.getElementById('env-main-close-btn').style.display = 'flex';
    if (currentEnvTab === 'outbox') {
        document.getElementById('env-outbox-section').style.display = 'block';
    } else {
        document.getElementById('env-inbox-section').style.display = 'block';
    }
    // 重置回复状态
    window._replyParentId = null;
    const sendBtn = document.getElementById('send-envelope');
    sendBtn.onclick = () => handleSendEnvelope(null);
};

// 改造发送函数，接受 parentId 参数
function handleSendEnvelope(parentId = null) {
    const text = document.getElementById('envelope-input').value.trim();
    if (!text) { showNotification('留言内容不能为空', 'warning'); return; }

    const sendToChat = document.getElementById('env-send-to-chat').checked;
    if (sendToChat) {
        addMessage({ id: Date.now(), sender: 'user', text: `【留言板】\n${text}`, timestamp: new Date(), status: 'sent', type: 'normal' });
    }

    // 测试用：1~2 分钟
    const minMinutes = 1, maxMinutes = 2;
    const randomMinutes = Math.random() * (maxMinutes - minMinutes) + minMinutes;
    const replyTime = Date.now() + randomMinutes * 60 * 1000;
    const newId = 'env_' + Date.now() + '_' + Math.random().toString(36).substr(2,4);
    
    const newMessage = {
        id: newId,
        content: text,
        sentTime: Date.now(),
        replyTime: replyTime,
        status: 'pending',
        parentId: parentId,
        createdAt: Date.now(),
        replies: []      // 存储子回复的 id
    };
    envelopeData.outbox.push(newMessage);
    
    // 如果有父级，将当前消息 id 添加到父级的 replies 数组
    if (parentId) {
    let parent = envelopeData.outbox.find(m => m.id === parentId);
    if (!parent) parent = envelopeData.inbox.find(m => m.id === parentId);
    if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(newId);
    }
    }
    saveEnvelopeData();

    cancelEnvelopeCompose();
    switchEnvTab('outbox');
    showNotification(`留言已发送，预计 ${Math.floor(randomHours)} 小时后收到回复 ✉️`, 'success');
}

// ========== 主动留言板 ==========
function initAutoMessageBoard() {
    const enabled = (settings && settings.messageBoardAutoEnabled === true);
    if (enabled && !autoMessageBoardTimer) {
        scheduleAutoMessageBoard();
    } else if (!enabled && autoMessageBoardTimer) {
        clearTimeout(autoMessageBoardTimer);
        autoMessageBoardTimer = null;
    }
}

function scheduleAutoMessageBoard() {
    if (!settings || settings.messageBoardAutoEnabled !== true) return;
    const minDelay = 1 * 60 * 1000;   // 4小时
    const maxDelay = 2 * 60 * 1000;   // 6小时
    const delay = minDelay + Math.random() * (maxDelay - minDelay);
    autoMessageBoardTimer = setTimeout(async () => {
        if (settings.messageBoardAutoEnabled === true && Math.random() < 0.8) { // 30% 概率
            await addAutoMessageBoardEntry();
        }
        scheduleAutoMessageBoard();
    }, delay);
}

async function addAutoMessageBoardEntry() {
    const replyContent = generateEnvelopeReplyText();
    const newId = 'auto_' + Date.now() + '_' + Math.random().toString(36).substr(2,4);
    const inboxLetter = {
        id: newId,
        refId: null,
        parentId: null,
        originalContent: null,
        content: replyContent,
        receivedTime: Date.now(),
        isNew: true,
        isAuto: true,
        createdAt: Date.now(),
        replies: []
    };
    envelopeData.inbox.push(inboxLetter);
    await saveEnvelopeData();
    showEnvelopeReplyPopup(inboxLetter);
    if (typeof playSound === 'function') playSound('message');
}

window.setMessageBoardAuto = function(enabled) {
    if (settings) settings.messageBoardAutoEnabled = enabled;
    if (typeof throttledSaveData === 'function') throttledSaveData();
    if (enabled) {
        if (!autoMessageBoardTimer) scheduleAutoMessageBoard();
    } else {
        if (autoMessageBoardTimer) clearTimeout(autoMessageBoardTimer);
        autoMessageBoardTimer = null;
    }
};

// 导出函数供外部调用
window.handleSendEnvelope = handleSendEnvelope;
window.generateEnvelopeReplyText = generateEnvelopeReplyText;

// envelope.js 末尾添加
window.initMessageBoard = function() {
    if (settings && settings.messageBoardAutoEnabled === true && !autoMessageBoardTimer) {
        scheduleAutoMessageBoard();
    }
};

window.addEventListener('beforeunload', function() {
    stopReplyCheck();
});

window.openReplyForm = function(parentId, sourceSection) {
    // 隐藏当前列表，显示写留言表单
    document.getElementById('env-outbox-section').style.display = 'none';
    document.getElementById('env-inbox-section').style.display = 'none';
    document.getElementById('env-main-close-btn').style.display = 'none';
    document.getElementById('env-compose-title').textContent = '追加回复';
    document.getElementById('envelope-input').value = '';
    document.getElementById('env-send-to-chat').checked = false;
    document.getElementById('env-compose-form').style.display = 'block';
    
    // 存储父级ID到全局，发送时使用
    window._replyParentId = parentId;
    
    // 临时覆盖发送按钮行为
    const sendBtn = document.getElementById('send-envelope');
    const originalClick = sendBtn.onclick;
    sendBtn.onclick = () => {
        handleSendEnvelope(window._replyParentId);
        // 恢复原来的发送行为（普通留言）
        sendBtn.onclick = originalClick;
        window._replyParentId = null;
        // 重新显示列表
        cancelEnvelopeCompose();
    };
};

function startReplyCheck() {
    if (replyCheckInterval) clearInterval(replyCheckInterval);
    // 每 10 分钟检查一次是否有待回复的留言
    replyCheckInterval = setInterval(() => {
        checkEnvelopeStatus();
    }, 10 * 60 * 1000);
}

function stopReplyCheck() {
    if (replyCheckInterval) {
        clearInterval(replyCheckInterval);
        replyCheckInterval = null;
    }
}

