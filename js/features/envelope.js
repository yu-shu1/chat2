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
            content: '（历史寄出的信件）',
            sentTime: oldPending.sentTime,
            replyTime: oldPending.replyTime,
            status: 'pending',
            replyContent: null, 
            myReply: null,
            replies: []
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
            // 👇 新增：将回信内容直接写入发件箱的 letter 对象
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
                <div style="font-size:14px;font-weight:700;color:var(--text-primary);">收到了一封回信</div>
                <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;opacity:0.8;">Ta 给你写了回信，快去看看吧~</div>
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
            <div style="font-size:14px;font-weight:500;margin-top:4px;">还没有寄出任何信件</div>
            <div style="font-size:12px;margin-top:6px;opacity:0.6;">提笔写下心意，寄送给Ta吧~</div>
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
        const statusText = isPending ? `${statusIcon} 预计 ${replyTime} 回信` : `${statusIcon} 已收到回信`;
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
            <div style="font-size:14px;font-weight:500;margin-top:4px;">还没有收到回信</div>
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
            ${origPreview ? `<div style="padding:6px 12px 0;display:flex;align-items:flex-start;gap:6px;"><div style="width:2px;border-radius:2px;background:rgba(var(--accent-color-rgb),0.4);flex-shrink:0;align-self:stretch;min-height:14px;margin-top:1px;"></div><div style="font-size:11px;color:var(--text-secondary);font-style:italic;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:calc(100% - 14px);opacity:0.75;">原信: ${origPreview}</div></div>` : ''}
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

    document.getElementById('env-view-title').textContent = section === 'outbox' ? '寄出的信' : '收到的回信';

    const dateObj = letter.timestamp ? new Date(letter.timestamp) : new Date();
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
        if (toLine) toLine.textContent = `致 ${partnerName}：`;
        if (greetingLine) greetingLine.textContent = '见字如面，望君安好。';
    } else {
        const myName = (typeof settings !== 'undefined' && settings.myName) || '你';
        if (toLine) toLine.textContent = `致 ${myName}：`;
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
    document.getElementById('env-view-text').style.display = 'block';   // ← 改
    document.getElementById('env-edit-input').style.display = 'none';   // ← 改
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
    showModal(document.getElementById('envelope-view-modal'));
};

window.toggleEnvEdit = function() {
    const contentEl = document.getElementById('env-view-text');
    const editInput = document.getElementById('env-edit-input');
    const editBtn = document.getElementById('env-view-edit-btn');
    const saveBtn = document.getElementById('env-view-save-btn');
    const isEditing = editInput.style.display !== 'none';
    if (isEditing) {
        contentEl.style.display = 'block';
        editInput.style.display = 'none';
        editBtn.textContent = '编辑';
        saveBtn.style.display = 'none';
    } else {
        contentEl.style.display = 'none';
        editInput.style.display = 'block';
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
    event.stopPropagation();
    if (!confirm('确定要删除这封信吗？')) return;
    if (section === 'outbox') {
        envelopeData.outbox = envelopeData.outbox.filter(l => l.id !== id);
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
    document.getElementById('env-compose-title').textContent = '写一封信';
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
    if (!text) { showNotification('信件内容不能为空', 'warning'); return; }

    const sendToChat = document.getElementById('env-send-to-chat').checked;
    if (sendToChat) {
        addMessage({ id: Date.now(), sender: 'user', text: `【寄出的信】\n${text}`, timestamp: new Date(), status: 'sent', type: 'normal' });
    }

    const minHours = 10, maxHours = 24;
    const randomHours = Math.random() * (maxHours - minHours) + minHours;
    const replyTime = Date.now() + randomHours * 60 * 60 * 1000;
    const newId = 'env_' + Date.now() + '_' + Math.random().toString(36).substr(2,4);
    envelopeData.outbox.push({
        id: newId, content: text,
        sentTime: Date.now(), replyTime,
        status: 'pending',
        replyContent: null, 
        myReply: null, 
        replies: []
    });
    saveEnvelopeData();

    cancelEnvelopeCompose();
    switchEnvTab('outbox');
    showNotification(`信件已寄出，预计 ${Math.floor(randomHours)} 小时后收到回信 ✉️`, 'success');
}

// 将信封数据实时转换为留言板线程格式（临时对象）
function envelopeToThread(letter, section) {
    const thread = {
        id: letter.id,
        starter: section === 'outbox' ? 'me' : 'partner',
        createdAt: letter.sentTime || letter.timestamp || Date.now(),
        replies: []
    };

    // 第一封消息：如果是发件箱，就是用户写的；收件箱则是对方写的
    if (section === 'outbox') {
        thread.replies.push({
            id: 'orig_' + letter.id,
            sender: 'me',
            text: letter.content,
            image: null,
            timestamp: letter.sentTime || Date.now()
        });
        // 修改开始：查找对应的回信
        let replyText = letter.replyContent || '';
        if (!replyText && letter.status === 'replied' && envelopeData.inbox) {
            const replyLetter = envelopeData.inbox.find(l => l.refId === letter.id);
            if (replyLetter) replyText = replyLetter.content;
        }
        if (replyText) {
            thread.replies.push({
                id: 'reply_' + letter.id,
                sender: 'partner',
                text: replyText,
                image: null,
                timestamp: letter.replyTime || Date.now()
            });
        }
        // 修改结束
    } else {
        // 收件箱：对方先发的
        thread.replies.push({
            id: 'orig_' + letter.id,
            sender: 'partner',
            text: letter.content,
            image: null,
            timestamp: letter.receivedTime || Date.now()
        });
        // 如果用户回复过
        if (letter.myReply) {
            const replyText = (typeof letter.myReply === 'string') ? letter.myReply : (letter.myReply.text || '');
            thread.replies.push({
                id: 'myreply_' + letter.id,
                sender: 'me',
                text: replyText,     // ← 提取文本
                image: null,
                timestamp: (typeof letter.myReply === 'object') ? (letter.myReply.timestamp || Date.now()) : Date.now()
            });
        }
    }    
    return thread;
}

// 精简后的详情渲染，基于临时线程
function openThreadDetail(threadId, section) {
    const letters = section === 'outbox' ? envelopeData.outbox : envelopeData.inbox;
    const letter = letters.find(l => l.id === threadId);
    if (!letter) return;
    const thread = envelopeToThread(letter, section);
    currentThreadId = threadId;
    currentView = (section === 'outbox') ? 'me' : 'partner'; // 用于后续操作判断

    const myName = settings?.myName || '我';
    const partnerName = settings?.partnerName || '对方';

    let bodyHtml = '';
    thread.replies.forEach((r, idx) => {
        const isMe = r.sender === 'me';
        const label = idx === 0 ? '的留言' : '的回复';
        const senderName = isMe ? myName : partnerName;
        const sectionClass = idx === 0 ? 'board-user-section' : 'board-reply-section';
        const labelClass = idx === 0 ? 'board-user-label' : 'board-reply-label';

        let contentHtml = '';
        if (r.text) {
            contentHtml += `<div class="${isMe ? 'board-user-text' : 'board-reply-text'}" id="bv2-text-${r.id}">${escapeHtml(r.text)}</div>`;
        }
        if (r.image) {
            contentHtml += `<div id="bv2-img-${r.id}" class="${isMe ? 'board-user-text' : 'board-reply-text'}">
                <img src="${r.image}" style="max-width:150px;border-radius:8px;cursor:pointer;" onclick="viewImage('${r.image}')">
            </div>`;
        }
        bodyHtml += `<div class="${sectionClass}" id="bv2-section-${r.id}">
            <div class="${labelClass}">${senderName}${label}</div>${contentHtml}</div>`;
    });

    // 底部操作按钮：根据最后一条消息的发送者决定显示“回复”还是“继续留言”
    const last = thread.replies[thread.replies.length - 1];
    let actionHtml = '';
    if (last) {
        if (section === 'outbox' && last.sender === 'partner') {
            actionHtml = `<button class="board-add-btn" id="board-continue-btn"><i class="fas fa-pen"></i> 继续留言</button>`;
        } else if (section === 'inbox' && last.sender === 'me') {
            actionHtml = `<button class="board-add-btn" id="board-reply-btn"><i class="fas fa-reply"></i> 回复</button>`;
        } else {
            actionHtml = `<div class="board-waiting-reply" style="margin-top:16px;"><i class="fas fa-hourglass-half"></i> 等待回复中...</div>`;
        }
    }

    document.getElementById('board-detail-body').innerHTML = bodyHtml + actionHtml;
    document.getElementById('board-detail-date').textContent = new Date(thread.createdAt).toLocaleDateString('zh-CN', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
    });

    // 绑定按钮事件
    const continueBtn = document.getElementById('board-continue-btn');
    const replyBtn = document.getElementById('board-reply-btn');
    if (continueBtn) continueBtn.onclick = () => openBoardCompose('continue', threadId, section);
    if (replyBtn) replyBtn.onclick = () => openBoardCompose('reply', threadId, section);

    // 删除线程按钮
    document.getElementById('board-delete-thread-btn').onclick = () => {
        if (confirm('确定删除这条留言记录吗？')) {
            if (section === 'outbox') {
                envelopeData.outbox = envelopeData.outbox.filter(l => l.id !== threadId);
            } else {
                envelopeData.inbox = envelopeData.inbox.filter(l => l.id !== threadId);
            }
            saveEnvelopeData();
            hideModal(document.getElementById('board-detail-modal'));
            showModal(document.getElementById('envelope-modal'));
            renderEnvelopeLists();
            showNotification('已删除', 'success');
        }
    };

    // 跳转显示
    hideModal(document.getElementById('envelope-modal'));
    setTimeout(() => showModal(document.getElementById('board-detail-modal')), 100);
}

// 撰写新留言（用于回复或继续）
function openBoardCompose(mode, threadId, section) {
    currentComposeMode = mode;
    currentThreadId = threadId;
    currentSection = section; // 新增变量追踪
    selectedImage = null;
    document.getElementById('board-compose-title-text').textContent = (mode === 'reply') ? '回复' : '继续留言';
    document.getElementById('bv2-compose-text').value = '';
    document.getElementById('bv2-img-hint').style.display = 'none';
    document.getElementById('bv2-compose-img-input').value = '';

    hideModal(document.getElementById('board-detail-modal'));
    setTimeout(() => showModal(document.getElementById('board-compose-modal')), 100);
}

// 提交新消息
async function submitBoardPost() {
    const text = document.getElementById('bv2-compose-text')?.value.trim() || '';
    if (!text && !selectedImage) {
        showNotification('内容不能为空', 'warning');
        return;
    }
    const newReply = {
        id: 'manual_' + Date.now(),
        sender: 'me',
        text,
        image: selectedImage || null,
        timestamp: Date.now()
    };

    const letters = currentSection === 'outbox' ? envelopeData.outbox : envelopeData.inbox;
    const letter = letters.find(l => l.id === currentThreadId);
    if (!letter) return;

    // ✅ 保存到 letter 的 myReply 字段（保留最近一条）
    letter.myReply = {
        text: text,
        image: selectedImage || null,
        timestamp: Date.now()
    };           // 或者整个对象 letter.myReply = newReply

    // 同时追加到 replies 数组（用于多轮对话）
    if (!letter.replies) letter.replies = [];
    letter.replies.push(newReply);

    await saveEnvelopeData();    
    hideModal(document.getElementById('board-compose-modal'));
    showNotification('发送成功', 'success');
    // 刷新详情
    openThreadDetail(currentThreadId, currentSection);
}

// 图片处理函数（复用第二版的逻辑）
function handleBoardImgSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (typeof optimizeImage === 'function') {
        optimizeImage(file).then(b => { selectedImage = b; document.getElementById('bv2-img-hint').style.display = 'inline'; });
    } else {
        const r = new FileReader();
        r.onload = ev => { selectedImage = ev.target.result; document.getElementById('bv2-img-hint').style.display = 'inline'; };
        r.readAsDataURL(file);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== 追加到 envelope.js 末尾 ==========

// --- 1. 绑定详情页的返回和编辑按钮 ---
document.getElementById('board-detail-back-btn').onclick = function() {
    hideModal(document.getElementById('board-detail-modal'));
    showModal(document.getElementById('envelope-modal')); // 返回信封列表
};

document.getElementById('board-new-thread-btn').onclick = function() {
    // 新建留言时，我们创建一个临时的新信封对象并打开撰写
    const newThreadId = 'manual_new_' + Date.now();
    currentThreadId = newThreadId;
    currentSection = 'outbox'; // 新建留言属于用户自己的发件箱
    openBoardCompose('continue', newThreadId, 'outbox');
    // 同时隐藏总列表
    hideModal(document.getElementById('envelope-board-modal'));
};

document.getElementById('board-list-close-btn').onclick = function() {
    hideModal(document.getElementById('envelope-board-modal'));
};

document.getElementById('board-global-edit-btn').onclick = function() {
    const body = document.getElementById('board-detail-body');
    if (!body) return;
    const editBar = document.getElementById('board-edit-actions-bar');
    const allTexts = body.querySelectorAll('.board-user-text, .board-reply-text');
    let isEditing = false;
    allTexts.forEach(el => {
        if (el.classList.contains('editing')) { isEditing = true; return; }
    });
    if (isEditing) {
        // 退出编辑
        allTexts.forEach(el => el.classList.remove('editing'));
        if (editBar) editBar.style.display = 'none';
    } else {
        // 进入编辑
        allTexts.forEach(el => el.classList.add('editing'));
        if (editBar) editBar.style.display = 'flex';
    }
};

document.getElementById('board-edit-cancel-btn').onclick = function() {
    const body = document.getElementById('board-detail-body');
    if (!body) return;
    body.querySelectorAll('.board-user-text.editing, .board-reply-text.editing').forEach(el => el.classList.remove('editing'));
    const editBar = document.getElementById('board-edit-actions-bar');
    if (editBar) editBar.style.display = 'none';
};

document.getElementById('board-edit-save-btn').onclick = async function() {
    const body = document.getElementById('board-detail-body');
    if (!body || !currentThreadId || !currentSection) return;
    const letters = currentSection === 'outbox' ? envelopeData.outbox : envelopeData.inbox;
    const letter = letters.find(l => l.id === currentThreadId);
    if (!letter) return;

    // 收集编辑内容
    const edits = [];
    body.querySelectorAll('.board-user-text.editing, .board-reply-text.editing').forEach(el => {
        edits.push({ id: el.id.replace('bv2-text-', ''), text: el.textContent.trim() });
    });

    // 保存到 letter
    const thread = envelopeToThread(letter, currentSection);
    edits.forEach(e => {
        const reply = thread.replies.find(r => r.id === e.id);
        if (reply) reply.text = e.text;
    });

    // 重建 letter 的 replies
    if (!letter.replies) letter.replies = [];
    thread.replies.forEach((r, i) => {
        const existing = letter.replies.find(lr => lr.id === r.id);
        if (existing) existing.text = r.text;
        else if (r.sender === 'me' && i > 0) letter.replies.push(r);
    });

    await saveEnvelopeData();
    body.querySelectorAll('.board-user-text.editing, .board-reply-text.editing').forEach(el => el.classList.remove('editing'));
    const editBar = document.getElementById('board-edit-actions-bar');
    if (editBar) editBar.style.display = 'none';
    openThreadDetail(currentThreadId, currentSection);
    showNotification('已保存修改 ✓', 'success');
};

let _boardImgTargetId = null;
let _boardImgTargetEl = null;

// 在详情页中给图片添加点击事件（图片上有 onclick="viewImage('...')" 的情况下，额外添加长按/右键菜单）
document.addEventListener('contextmenu', function(e) {
    const img = e.target.closest('.board-user-text img, .board-reply-text img');
    if (!img) return;
    e.preventDefault();
    _boardImgTargetEl = img;
    _boardImgTargetId = img.closest('[id^="bv2-img-"]')?.id.replace('bv2-img-', '') || null;
    showModal(document.getElementById('board-img-action-modal'));
});

document.getElementById('board-img-replace-action').onclick = function() {
    hideModal(document.getElementById('board-img-action-modal'));
    document.getElementById('bv2-detail-img-input').click();
};

document.getElementById('bv2-detail-img-input').onchange = function(e) {
    const file = e.target.files[0];
    if (!file || !_boardImgTargetEl) return;
    if (typeof optimizeImage === 'function') {
        optimizeImage(file).then(b => {
            _boardImgTargetEl.src = b;
            // 同步更新 letter 中的数据
            syncBoardImgToLetter();
        });
    } else {
        const r = new FileReader();
        r.onload = ev => { _boardImgTargetEl.src = ev.target.result; syncBoardImgToLetter(); };
        r.readAsDataURL(file);
    }
    e.target.value = '';
};

document.getElementById('board-img-delete-action').onclick = function() {
    hideModal(document.getElementById('board-img-action-modal'));
    if (_boardImgTargetEl) {
        _boardImgTargetEl.remove();
        syncBoardImgToLetter();
    }
};

document.getElementById('board-img-action-cancel').onclick = function() {
    hideModal(document.getElementById('board-img-action-modal'));
};

function syncBoardImgToLetter() {
    if (!currentThreadId || !currentSection) return;
    const letters = currentSection === 'outbox' ? envelopeData.outbox : envelopeData.inbox;
    const letter = letters.find(l => l.id === currentThreadId);
    if (!letter || !letter.replies) return;
    // 遍历 replies 更新图片字段
    const body = document.getElementById('board-detail-body');
    if (!body) return;
    letter.replies.forEach(r => {
        const imgEl = body.querySelector('#bv2-img-' + r.id + ' img');
        if (imgEl) r.image = imgEl.src;
    });
    saveEnvelopeData();
}

// --- 2. 绑定撰写页的发送、取消、图片选择 ---
document.getElementById('board-compose-send-btn').onclick = submitBoardPost; // 提交新留言
document.getElementById('bv2-compose-img-input').onchange = handleBoardImgSelect; // 图片选择

document.getElementById('board-compose-close-btn').onclick = function() {
    hideModal(document.getElementById('board-compose-modal'));
    showModal(document.getElementById('board-detail-modal')); // 返回详情页
};
document.getElementById('board-compose-cancel-btn').onclick = function() {
    hideModal(document.getElementById('board-compose-modal'));
    showModal(document.getElementById('board-detail-modal')); // 返回详情页
};

// --- 3. 声明全局变量 (如果还没有的话) ---
// 这些变量在 openThreadDetail 和 submitBoardPost 等函数中会用到
var currentThreadId = null;
var currentSection = null;
var selectedImage = null;
var currentComposeMode = null;

// 渲染留言板总列表
function renderBoardThreads() {
    const listBody = document.getElementById('board-list-body');
    if (!listBody) return;

    const threads = envelopeData.outbox.slice().reverse(); // 最新在最上面
    if (threads.length === 0) {
        listBody.innerHTML = `
            <div class="board-empty">
                <i class="fas fa-pen-fancy" style="font-size:48px; opacity:0.3; display:block; margin-bottom:12px;"></i>
                <p>还没有留言</p>
                <span style="font-size:12px; opacity:0.6;">点击下方按钮开始写点什么吧~</span>
            </div>`;
        return;
    }

    let html = '';
    threads.forEach(letter => {
        const isPending = letter.status === 'pending';
        const dateStr = new Date(letter.sentTime || letter.receivedTime || Date.now())
            .toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        // 获取第一句作为预览
        const preview = letter.content
            ? (letter.content.length > 50 ? letter.content.substring(0, 50) + '…' : letter.content)
            : '(空内容)';

        const statusBadge = isPending
            ? '<span class="board-card-status pending">等待回复</span>'
            : '<span class="board-card-status replied">已回复</span>';

        html += `
            <div class="board-card" onclick="openThreadDetail('${letter.id}', 'outbox')" style="cursor:pointer;">
                <div class="board-card-top-line"></div>
                <div class="board-card-body">
                    <div class="board-card-preview" title="${escapeHtml(letter.content || '')}">${escapeHtml(preview)}</div>
                    <div class="board-card-meta">
                        <span class="board-card-date">${dateStr}</span>
                        ${statusBadge}
                    </div>
                </div>
            </div>`;
    });

    listBody.innerHTML = html;
}

window.openBoardList = function() {
    renderBoardThreads();
    hideModal(document.getElementById('envelope-modal')); // 防止同时显示两个模态框
    showModal(document.getElementById('envelope-board-modal'));
};