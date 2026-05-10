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

    envelopeData.outbox.forEach(letter => {
        if (letter.status === 'pending' && now >= letter.replyTime) {
            letter.status = 'replied';
            const replyContent = generateEnvelopeReplyText();
            if (!letter.thread) letter.thread = [];
            const partnerReply = {
                id: 'reply_' + Date.now(),
                sender: 'partner',
                content: replyContent,
                time: Date.now(),
                isNew: true,
                parentId: letter.id
            };
            letter.thread.push(partnerReply);
            changed = true;
            playSound('message');
        }
    });
    
    if (changed) {
        saveEnvelopeData();
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
        // 兼容旧数据：确保 letter.content 存在
        const safeContent = letter.content || (letter.thread && letter.thread[0] ? letter.thread[0].content : '');
        const date = new Date(letter.sentTime || Date.now()).toLocaleDateString('zh-CN', {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'});
        const isPending = letter.status === 'pending';
        const replyTime = isPending ? new Date(letter.replyTime).toLocaleDateString('zh-CN', {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'}) : '';
        const statusIcon = isPending
            ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`
            : `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
        const statusText = isPending ? `${statusIcon} 预计 ${replyTime} 回信` : `${statusIcon} 已收到回信`;
        const preview = safeContent.length > 38 ? safeContent.substring(0, 38) + '…' : safeContent;
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
        const safeContent = letter.content || (letter.thread && letter.thread[0] ? letter.thread[0].content : '');
        const date = new Date(letter.receivedTime || Date.now()).toLocaleDateString('zh-CN', {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'});
        const preview = safeContent.length > 50 ? safeContent.substring(0, 50) + '…' : safeContent;
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
    
    const myFirstReply = {
        id: 'myreply_' + Date.now(),
        sender: 'user',
        content: text,
        time: Date.now(),
        parentId: newId
    };

    envelopeData.outbox.push({
        id: newId,
        content: text,
        subject: text.substring(0, 20),
        status: 'pending',
        replyTime: replyTime,
        sentTime: Date.now(),
        thread: [myFirstReply],
    });
    saveEnvelopeData();

    cancelEnvelopeCompose();
    switchEnvTab('outbox');
    showNotification(`信件已寄出，预计 ${Math.floor(randomHours)} 小时后收到回信 ✉️`, 'success');
}

// ===== 新版信件详情查看（支持对话串） =====
function viewEnvLetter(section, id) {
    const letters = section === 'outbox' ? envelopeData.outbox : envelopeData.inbox;
    const letter = letters.find(l => l.id === id);
    if (!letter) return;

    // 标记已读（收件箱）
    if (section === 'inbox' && letter.isNew) {
        letter.isNew = false;
        saveEnvelopeData();
        renderEnvelopeLists();
    }

    // 如果是收件箱旧数据，只做简单展示
    if (section === 'inbox') {
        document.getElementById('env-view-subject').textContent = letter.subject || '无标题';
        document.getElementById('env-view-text').textContent = letter.content || '';
        document.getElementById('env-view-edit-btn').style.display = 'none';
        document.getElementById('env-view-delete-btn').style.display = 'none';
        document.getElementById('env-view-body').style.display = 'block';
        document.getElementById('env-view-edit-area').style.display = 'none';
        document.getElementById('env-reply-thread').innerHTML = '';
        document.getElementById('env-reply-input-area').style.display = 'none';
        showModal(document.getElementById('envelope-view-modal'));
        return;
    }

    // 标题
    document.getElementById('env-view-subject').textContent = letter.subject || '无标题';

    // 正文：优先从 thread 的第一条 user 消息获取
    const bodyText = letter.thread && letter.thread.length > 0 && letter.thread[0].sender === 'user'
        ? letter.thread[0].content
        : (letter.content || '');
    document.getElementById('env-view-text').textContent = bodyText;

    // 编辑/删除按钮可见
    document.getElementById('env-view-edit-btn').style.display = '';
    document.getElementById('env-view-delete-btn').style.display = '';
    document.getElementById('env-view-body').style.display = 'block';
    document.getElementById('env-view-edit-area').style.display = 'none';
    document.getElementById('env-reply-input-area').style.display = 'flex';

    // 绑定右上角按钮
    document.getElementById('env-view-edit-btn').onclick = () => toggleEnvEdit(letter);
    document.getElementById('env-view-delete-btn').onclick = () => {
        if (confirm('确定删除这封信和所有回复吗？')) {
            deleteEnvThread(letter.id);
            hideModal(document.getElementById('envelope-view-modal'));
        }
    };

    // 渲染对话串
    renderEnvThread(letter.thread || []);

    // 绑定追加回复按钮
    document.getElementById('env-send-reply-btn').onclick = () => sendEnvReply(letter);

    // 显示弹窗
    showModal(document.getElementById('envelope-view-modal'));
}

function renderEnvThread(thread) {
    const container = document.getElementById('env-reply-thread');
    if (!container) return;
    container.innerHTML = '';

    thread.forEach(msg => {
        const isUser = msg.sender === 'user';
        const align = isUser ? 'flex-end' : 'flex-start';
        
        const bubble = document.createElement('div');
        bubble.style.cssText = `
            align-self:${align};
            background: var(--message-${isUser?'sent':'received'}-bg);
            color: var(--message-${isUser?'sent':'received'}-text);
            padding: 10px 14px;
            border-radius: 18px;
            max-width: 80%;
            word-break: break-word;
            position: relative;
        `;
        bubble.innerHTML = `
            <div style="font-size:13px;">${msg.content.replace(/\n/g, '<br>')}</div>
            <div style="font-size:10px; opacity:0.6; margin-top:4px;">${new Date(msg.time).toLocaleString()}</div>
            ${isUser ? '' : `<span onclick="window.deleteEnvReply('${msg.parentId}', '${msg.id}')" style="position:absolute; top:4px; right:8px; cursor:pointer; color:#ff4757; font-size:12px;">×</span>`}
        `;
        container.appendChild(bubble);
    });
}

function sendEnvReply(letter) {
    const input = document.getElementById('env-reply-input');
    const text = input.value.trim();
    if (!text) return;

    const newReply = {
        id: 'myreply_' + Date.now(),
        sender: 'user',
        content: text,
        time: Date.now(),
        parentId: letter.id
    };

    if (!letter.thread) letter.thread = [];
    letter.thread.push(newReply);

    // 对方会在 10-24 小时后回信
    letter.status = 'pending';
    letter.replyTime = Date.now() + (10 + Math.random() * 14) * 60 * 60 * 1000;
    
    saveEnvelopeData();
    input.value = '';
    renderEnvThread(letter.thread);
    showNotification('回复已发送，对方会在10-24小时内回信', 'success');
}

window.deleteEnvReply = function(letterId, replyId) {
    const letter = envelopeData.outbox.find(l => l.id === letterId);
    if (!letter || !letter.thread) return;
    letter.thread = letter.thread.filter(msg => msg.id !== replyId);
    saveEnvelopeData();
    renderEnvThread(letter.thread);
};

function deleteEnvThread(letterId) {
    envelopeData.outbox = envelopeData.outbox.filter(l => l.id !== letterId);
    saveEnvelopeData();
}

function toggleEnvEdit(letter) {
    const viewBody = document.getElementById('env-view-body');
    const editArea = document.getElementById('env-view-edit-area');
    const textEl = document.getElementById('env-view-text');
    const editInput = document.getElementById('env-edit-input');

    const isEditing = editArea.style.display === 'block';
    if (isEditing) {
        const newContent = editInput.value.trim();
        if (newContent) {
            if (letter.thread && letter.thread.length > 0 && letter.thread[0].sender === 'user') {
                letter.thread[0].content = newContent;
            }
            letter.content = newContent;
            textEl.textContent = newContent;
            saveEnvelopeData();
        }
        viewBody.style.display = 'block';
        editArea.style.display = 'none';
    } else {
        const initialText = letter.thread && letter.thread.length > 0 && letter.thread[0].sender === 'user'
            ? letter.thread[0].content
            : (letter.content || '');
        editInput.value = initialText;
        viewBody.style.display = 'none';
        editArea.style.display = 'block';
    }
}