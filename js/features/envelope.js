let envelopeData = { outbox: [], inbox: [] }; 
let currentEnvTab = 'outbox';
let editingEnvId = null; 
let editingEnvSection = null; 

async function loadEnvelopeData() {
    const saved = await localforage.getItem(getStorageKey('envelopeData'));
    if (saved) envelopeData = saved;
    const oldPending = await localforage.getItem(getStorageKey('pending_envelope'));
    if (oldPending && envelopeData.outbox.length === 0) {
        envelopeData.outbox.push({
            id: 'legacy_' + Date.now(),
            content: '（历史寄出的留言）',
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

async function checkEnvelopeStatus() {
    await loadEnvelopeData();
    const now = Date.now();
    let changed = false;
    let newReplyLetter = null;
    envelopeData.outbox.forEach(letter => {
        if (letter.status === 'pending' && now >= letter.replyTime) {
            letter.status = 'replied';
            const replyContent = generateEnvelopeReplyText();
            letter.replyContent = replyContent;
            const replyId = 'reply_' + Date.now() + '_' + Math.random().toString(36).substr(2,4);
            const inboxLetter = {
                id: replyId,
                refId: letter.id,
                originalContent: letter.content,
                content: replyContent,
                receivedTime: Date.now(),
                isNew: true
            };
            envelopeData.inbox.push(inboxLetter);
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
            <span style="font-size:26px;">💌</span>
            <div>
                <div style="font-size:14px;font-weight:700;color:var(--text-primary);">收到了一条回复</div>
                <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;opacity:0.8;">Ta 给你写了回复，快去看看吧~</div>
            </div>
        </div>
        <div style="display:flex;gap:8px;">
            <button onclick="document.getElementById('envelope-reply-popup').remove();" style="flex:1;padding:8px 0;border-radius:12px;border:1px solid var(--border-color);background:var(--primary-bg);color:var(--text-secondary);font-size:13px;cursor:pointer;">稍后查看</button>
            <button onclick="openEnvelopeAndViewReply('${letter.id}');" style="flex:2;padding:8px 0;border-radius:12px;border:none;background:var(--accent-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;">立即阅读 ✉</button>
        </div>`;
    document.body.appendChild(popup);
    setTimeout(() => { if (popup.parentNode) popup.remove(); }, 8000);
}

const APPEARANCE_PANEL_TITLES = {
    'theme': '主题配色', 'font': '字体设置', 'background': '聊天背景',
    'bubble': '气泡样式', 'avatar': '聊天头像', 'css': '自定义CSS',
    'font-bg': '背景 & 字体', 'bubble-css': '气泡 & CSS'
};

window.showAppearancePanel = function(panel) {
    const panelMap = {
        'font-bg': ['font', 'background'],
        'bubble-css': ['bubble', 'css']
    };
    document.getElementById('appearance-nav-grid').style.display = 'none';
    var unBtn = document.getElementById('update-notice-btn');
    if (unBtn) unBtn.style.display = 'none';
    var galleryBanner = document.getElementById('gallery-banner-entry');
    if (galleryBanner) galleryBanner.style.display = 'none';
    document.getElementById('appearance-panel-container').style.display = 'block';
    document.getElementById('appearance-panel-title').textContent = APPEARANCE_PANEL_TITLES[panel] || panel;
    document.querySelectorAll('.appearance-sub-panel').forEach(p => p.style.display = 'none');
    if (panelMap[panel]) {
        panelMap[panel].forEach(sub => {
            const target = document.getElementById('appearance-panel-' + sub);
            if (target) target.style.display = 'block';
        });
    } else {
        const target = document.getElementById('appearance-panel-' + panel);
        if (target) target.style.display = 'block';
    }
    if (panel === 'bubble' || panel === 'bubble-css') { setTimeout(() => { if (typeof window.updateBubblePreviewFn === 'function') window.updateBubblePreviewFn(); }, 50); }
};

window.hideAppearancePanel = function() {
    document.getElementById('appearance-nav-grid').style.display = 'grid';
    document.getElementById('appearance-panel-container').style.display = 'none';
    document.querySelectorAll('.appearance-sub-panel').forEach(p => p.style.display = 'none');
    var unBtn = document.getElementById('update-notice-btn');
    if (unBtn) unBtn.style.display = 'flex';
    var galleryBanner = document.getElementById('gallery-banner-entry');
    if (galleryBanner) galleryBanner.style.display = 'flex';
};

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

function generateEnvelopeReplyText() {
    const sourcePool = [...customReplies];
    const sentenceCount = Math.floor(Math.random() * (12 - 8 + 1)) + 8;
    let replyContent = "";
    for (let i = 0; i < sentenceCount; i++) {
        const randomSentence = sourcePool[Math.floor(Math.random() * sourcePool.length)];
        const punctuation = Math.random() < 0.2 ? "！" : (Math.random() < 0.2 ? "..." : "。");
        replyContent += randomSentence + punctuation;
    }
    return replyContent;
}

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
        const date = new Date(letter.sentTime).toLocaleDateString('zh-CN', {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'});
        const isPending = letter.status === 'pending';
        const replyTime = isPending ? new Date(letter.replyTime).toLocaleDateString('zh-CN', {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'}) : '';
        const statusIcon = isPending
            ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`
            : `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
        const statusText = isPending ? `${statusIcon} 预计 ${replyTime} 回复` : `${statusIcon} 已收到回复`;
        const preview = letter.content.length > 38 ? letter.content.substring(0, 38) + '…' : letter.content;
        return `
        <div class="env-letter-item" onclick="viewEnvLetter('outbox','${letter.id}')">
            <div class="env-letter-header">
                <div class="env-letter-header-from">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;margin-right:3px;"><path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/></svg>
                    寄出 · ${date}
                </div>
                <div class="env-stamp">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </div>
            </div>
            <div class="env-letter-body">
                <div class="env-letter-preview">${preview}</div>
                <div class="env-letter-status">${statusText}</div>
            </div>
            <button class="env-letter-delete-btn" onclick="deleteEnvLetter(event,'outbox','${letter.id}')">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
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
        const date = new Date(letter.receivedTime).toLocaleDateString('zh-CN', {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'});
        const preview = letter.content.length > 50 ? letter.content.substring(0, 50) + '…' : letter.content;
        const isNew = letter.isNew;
        const origPreview = letter.originalContent ? (letter.originalContent.length > 32 ? letter.originalContent.substring(0, 32) + '…' : letter.originalContent) : '';
        return `
        <div class="env-letter-item reply ${isNew ? 'env-letter-new' : ''}" onclick="viewEnvLetter('inbox','${letter.id}')">
            <div class="env-letter-header">
                <div class="env-letter-header-from">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;margin-right:3px;"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/></svg>
                    收到 · ${date}
                    ${isNew ? '<span style="background:rgba(255,255,255,0.3);color:#fff;font-size:9px;padding:1px 5px;border-radius:6px;margin-left:6px;">新</span>' : ''}
                </div>
                <div class="env-stamp">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </div>
            </div>
            ${origPreview ? `<div style="padding:6px 12px 0;display:flex;align-items:flex-start;gap:6px;"><div style="width:2px;border-radius:2px;background:rgba(var(--accent-color-rgb),0.4);flex-shrink:0;align-self:stretch;min-height:14px;margin-top:1px;"></div><div style="font-size:11px;color:var(--text-secondary);font-style:italic;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:calc(100% - 14px);opacity:0.75;">原留言: ${origPreview}</div></div>` : ''}
            <div class="env-letter-body">
                <div class="env-letter-preview">${preview}</div>
            </div>
            <button class="env-letter-delete-btn" onclick="deleteEnvLetter(event,'inbox','${letter.id}')">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
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
    
    const dateObj = letter.timestamp ? new Date(letter.timestamp) : new Date(letter.sentTime || letter.receivedTime);
    const y = dateObj.getFullYear();
    const mo = String(dateObj.getMonth()+1).padStart(2,'0');
    const d = String(dateObj.getDate()).padStart(2,'0');
    const dateStr = `${y}/${mo}/${d}`;
    const weekdays = ['日','一','二','三','四','五','六'];
    const fullDateStr = dateStr + ' 星期' + weekdays[dateObj.getDay()];
    
    document.getElementById('board-detail-date').textContent = fullDateStr;
    
    const myName = (typeof settings !== 'undefined' && settings.myName) || '我';
    const partnerName = (typeof settings !== 'undefined' && settings.partnerName) || '对方';
    
    let bodyHtml = '';
    
    // 原留言部分
    if (section === 'outbox') {
        bodyHtml += `
            <div class="board-user-section">
                <div class="board-user-label">${myName} 的留言</div>
                <div class="board-user-text">${escapeHtml(letter.content)}</div>
            </div>
        `;
    } else {
        // 收到的留言显示原信
        if (letter.originalContent) {
            bodyHtml += `
                <div class="board-user-section">
                    <div class="board-user-label">${myName} 的原留言</div>
                    <div class="board-user-text">${escapeHtml(letter.originalContent)}</div>
                </div>
                <hr class="board-divider">
            `;
        }
        bodyHtml += `
            <div class="board-reply-section">
                <div class="board-reply-label">${partnerName} 的回复</div>
                <div class="board-reply-text">${escapeHtml(letter.content)}</div>
            </div>
        `;
    }
    
    // 等待回复提示
    if (section === 'outbox' && letter.status === 'pending') {
        bodyHtml += `
            <div class="board-waiting-reply">
                <i class="fas fa-hourglass-half"></i>
                等待回复中...
            </div>
        `;
    }
    
    if (letter.replyTo) {
        const original = envelopeData.outbox.find(l => l.id === letter.replyTo);
        if (original) {
            bodyHtml = `<div style="background:var(--primary-bg); padding:6px 10px; font-size:11px; color:var(--text-secondary); margin-bottom:8px;">
                ↳ 回复：${escapeHtml(original.content.substring(0,40))}...
            </div>` + bodyHtml;
        }
    }
    
    document.getElementById('board-detail-body').innerHTML = bodyHtml;
    document.getElementById('board-edit-input').value = letter.content;
    
    // 隐藏编辑状态
    document.getElementById('board-edit-actions-bar').style.display = 'none';
    
    // 显示/隐藏继续留言按钮
    const continueBtn = document.getElementById('continue-reply-btn');
    if (section === 'outbox' && letter.status === 'replied') {
        continueBtn.style.display = 'inline-flex';
    } else {
        continueBtn.style.display = 'none';
    }
    
    hideModal(document.getElementById('envelope-modal'));
    showModal(document.getElementById('board-detail-modal'));
};

window.toggleEnvEdit = function () {
    const contentEl = document.getElementById('board-detail-body');
    const editEl   = document.getElementById('board-edit-input');
    const editBar   = document.getElementById('board-edit-actions-bar');

    if (!editEl || !contentEl) return;

    const isEditing = editEl.style.display !== 'none';
    if (isEditing) {
        editEl.style.display = 'none';
        contentEl.style.display = '';
        editBar.style.display = 'none';
        document.getElementById('board-global-edit-btn').innerHTML = '<i class="fas fa-pen"></i>';
    } else {
        // 填入当前内容
        const origText = contentEl.innerText.trim();
        editEl.value = origText;
        editEl.style.display = 'block';
        contentEl.style.display = 'none';
        editBar.style.display = 'flex';
        document.getElementById('board-global-edit-btn').innerHTML = '<i class="fas fa-times"></i>';
    }
};

window.saveEnvEdit = function () {
    const editEl = document.getElementById('board-edit-input');
    const newContent = editEl ? editEl.value.trim() : '';
    if (!newContent) { showNotification('内容不能为空', 'warning'); return; }

    const letters = editingEnvSection === 'outbox' ? envelopeData.outbox : envelopeData.inbox;
    const letter = letters.find(l => l.id == editingEnvId);
    if (letter) {
        letter.content = newContent;
        saveEnvelopeData();
        // 直接更新详情页显示内容
        document.getElementById('board-detail-body').innerHTML = escapeHtml(newContent);
        showNotification('已保存修改', 'success');
        toggleEnvEdit();  // 退出编辑态
    }
};

window.closeEnvViewModal = function() {
    hideModal(document.getElementById('envelope-view-modal'));
};

window.deleteEnvLetter = function(event, section, id) {
    event.stopPropagation();
    if (!confirm('确定要删除这条留言吗？')) return;
    if (section === 'outbox') {
        envelopeData.outbox = envelopeData.outbox.filter(l => l.id !== id);
        // 同时删除对应的收件箱消息
        envelopeData.inbox = envelopeData.inbox.filter(l => l.refId !== id);
    } else {
        envelopeData.inbox = envelopeData.inbox.filter(l => l.id !== id);
    }
    saveEnvelopeData();
    renderEnvelopeLists();
    showNotification('已删除', 'success');
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
};

function handleSendEnvelope() {
    const text = document.getElementById('envelope-input').value.trim();
    if (!text) { showNotification('留言内容不能为空', 'warning'); return; }
    const sendToChat = document.getElementById('env-send-to-chat').checked;
    if (sendToChat) {
        addMessage({ id: Date.now(), sender: 'user', text: `【寄出的留言】\n${text}`, timestamp: new Date(), status: 'sent', type: 'normal' });
    }
    const minHours = 10, maxHours = 24;
    const randomHours = Math.random() * (maxHours - minHours) + minHours;
    const replyTime = Date.now() + randomHours * 60 * 60 * 1000;
    const newId = 'env_' + Date.now() + '_' + Math.random().toString(36).substr(2,4);
const newLetter = {
    id: newId,
    content: text,
    sentTime: Date.now(),
    replyTime: replyTime,
    status: 'pending',
    replyTo: window._continueReplyRef || null   // 关联原信
};
envelopeData.outbox.push(newLetter);
// 用完后清除临时引用
window._continueReplyRef = null;

    saveEnvelopeData();
    cancelEnvelopeCompose();
    switchEnvTab('outbox');
    showNotification(`留言已发送，预计 ${Math.floor(randomHours)} 小时后收到回复 ✉️`, 'success');
}

// 继续留言功能
window.openContinueReplyForm = function() {
    const reply = prompt('请输入你的回复：');
    if (reply && reply.trim()) {
        // 发送新的留言
        const minHours = 10, maxHours = 24;
        const randomHours = Math.random() * (maxHours - minHours) + minHours;
        const replyTime = Date.now() + randomHours * 60 * 60 * 1000;
        const newId = 'env_' + Date.now() + '_' + Math.random().toString(36).substr(2,4);
        
        envelopeData.outbox.push({
            id: newId, 
            content: reply.trim(),
            sentTime: Date.now(), 
            replyTime,
            status: 'pending'
        });
        
        saveEnvelopeData();
        closeEnvViewModal();
        switchEnvTab('outbox');
        showNotification(`留言已发送，预计 ${Math.floor(randomHours)} 小时后收到回复 ✉️`, 'success');
    }
};

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    // 绑定发送按钮事件
    const sendBtn = document.getElementById('send-envelope');
    if (sendBtn) {
        sendBtn.addEventListener('click', handleSendEnvelope);
    }
});

// 绑定留言详情页事件
document.addEventListener('DOMContentLoaded', function() {
    // 返回按钮
    document.getElementById('board-detail-back-btn').addEventListener('click', function() {
        hideModal(document.getElementById('board-detail-modal'));
        showModal(document.getElementById('envelope-modal'));
    });
    
    // 编辑按钮
    document.getElementById('board-global-edit-btn').addEventListener('click', function() {
        toggleEnvEdit();
    });
    
    // 删除按钮
    document.getElementById('board-delete-thread-btn').addEventListener('click', function() {
        if (confirm('确定要删除这条留言吗？')) {
            deleteEnvLetter(event, editingEnvSection, editingEnvId);
            closeEnvViewModal();
        }
    });
    
    // 取消编辑
    document.getElementById('board-edit-cancel-btn').addEventListener('click', function() {
        toggleEnvEdit();
    });
    
    // 保存编辑
    document.getElementById('board-edit-save-btn').addEventListener('click', function() {
        saveEnvEdit();
    });
});

// 继续留言功能
window.openContinueReplyForm = function () {
    // 保留当前正在查看的信件 ID
    const currentId = editingEnvId;
    openNewEnvelopeForm();
    document.getElementById('env-compose-title').textContent = '继续留言';
    
    // 将原信件 ID 存入一个临时变量，供 handleSendEnvelope 使用
    window._continueReplyRef = currentId;
};

// 关闭详情页
window.closeEnvViewModal = function() {
    hideModal(document.getElementById('board-detail-modal'));
};

// 切换编辑状态
window.toggleEnvEdit = function() {
    const editBar = document.getElementById('board-edit-actions-bar');
    const isEditing = editBar.style.display === 'flex';
    
    if (isEditing) {
        editBar.style.display = 'none';
        document.getElementById('board-global-edit-btn').innerHTML = '<i class="fas fa-pen"></i>';
    } else {
        editBar.style.display = 'flex';
        document.getElementById('board-global-edit-btn').innerHTML = '<i class="fas fa-times"></i>';
    }
};

// 工具函数：转义HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

