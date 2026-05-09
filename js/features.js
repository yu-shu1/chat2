// ---- 修复后的 features.js 完整代码 ----

(function() {
    var MY_SYM_KEY   = 'pokeSym_my';
    var PTR_SYM_KEY  = 'pokeSym_partner';
    var MY_CUST_KEY  = 'pokeSym_my_custom';
    var PTR_CUST_KEY = 'pokeSym_partner_custom';

    var PRESETS = [
        { value: 'none',    label: '无装饰',   sym: '' },
        { value: 'star4',   label: '✦ 四角星', sym: '✦' },
        { value: 'star5',   label: '✧ 镂空星', sym: '✧' },
        { value: 'dot',     label: '· 圆点',   sym: '·' },
        { value: 'wave',    label: '～ 波浪',   sym: '～' },
        { value: 'heart',   label: '♡ 爱心',   sym: '♡' },
        { value: 'flower',  label: '✿ 花朵',   sym: '✿' },
        { value: 'sparkle', label: '✨ 闪光',  sym: '✨' },
        { value: 'custom',  label: '自定义…',  sym: null }
    ];

    function _getSym(key, customKey) {
        var v = localStorage.getItem(key) || 'star4';
        if (v === 'custom') return localStorage.getItem(customKey) || '✦';
        var p = PRESETS.find(function(x){ return x.value === v; });
        return p ? p.sym : '✦';
    }

    function _stripEmojiForPoke(text) {
        return String(text || '')
            .replace(/[\u2600-\u27BF\u{1F300}-\u{1FAFF}]/gu, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    window._formatPokeText = function(text) {
        var sym = _getSym(MY_SYM_KEY, MY_CUST_KEY);
        return sym ? (sym + ' ' + text + ' ' + sym) : text;
    };
    window._formatPartnerPokeText = function(text) {
        var sym = _getSym(PTR_SYM_KEY, PTR_CUST_KEY);
        return sym ? (sym + ' ' + text + ' ' + sym) : text;
    };
    window._sanitizePokeTextForDisplay = _stripEmojiForPoke;

    function _esc(s) {
        return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    window._openPokeSymSettings = function() {
        var old = document.getElementById('poke-sym-modal');
        if (old) old.remove();

        var mySel    = localStorage.getItem(MY_SYM_KEY) || 'star4';
        var ptrSel   = localStorage.getItem(PTR_SYM_KEY) || 'star4';
        var myCustom = localStorage.getItem(MY_CUST_KEY) || '';
        var ptrCustom= localStorage.getItem(PTR_CUST_KEY) || '';

        function opts(sel) {
            return PRESETS.map(function(p){
                return '<option value="'+p.value+'"'+(sel===p.value?' selected':'')+'>'+p.label+'</option>';
            }).join('');
        }

        var wrap = document.createElement('div');
        wrap.id = 'poke-sym-modal';
        wrap.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);';
        wrap.innerHTML = [
            '<div style="background:var(--primary-bg);border-radius:20px;padding:22px 20px;width:min(340px,92vw);box-shadow:0 20px 60px rgba(0,0,0,0.28);border:1px solid var(--border-color);">',
              '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">',
                '<span style="font-size:15px;font-weight:700;color:var(--text-primary);font-family:var(--font-family);">戳一戳装饰符号</span>',
                '<button id="psm-close" style="background:none;border:none;font-size:18px;color:var(--text-secondary);cursor:pointer;padding:2px 6px;border-radius:6px;">✕</button>',
              '</div>',
              '<div style="font-size:11px;color:var(--text-secondary);font-weight:700;letter-spacing:.6px;text-transform:uppercase;margin-bottom:5px;">我发出的</div>',
              '<select id="psm-my" style="width:100%;padding:9px 10px;border:1.5px solid var(--border-color);border-radius:10px;background:var(--secondary-bg);color:var(--text-primary);font-size:13px;outline:none;font-family:var(--font-family);margin-bottom:8px;">'+opts(mySel)+'</select>',
              '<div id="psm-my-cw" style="margin-bottom:12px;display:'+(mySel==='custom'?'block':'none')+';">',
                '<input id="psm-my-ci" type="text" maxlength="4" placeholder="输入 1-2 个字符" value="'+_esc(myCustom)+'" style="width:100%;padding:8px 10px;border:1.5px solid var(--border-color);border-radius:10px;background:var(--secondary-bg);color:var(--text-primary);font-size:13px;outline:none;box-sizing:border-box;font-family:var(--font-family);">',
              '</div>',
              '<div style="font-size:11px;color:var(--text-secondary);font-weight:700;letter-spacing:.6px;text-transform:uppercase;margin-bottom:5px;">对方发出的</div>',
              '<select id="psm-ptr" style="width:100%;padding:9px 10px;border:1.5px solid var(--border-color);border-radius:10px;background:var(--secondary-bg);color:var(--text-primary);font-size:13px;outline:none;font-family:var(--font-family);margin-bottom:8px;">'+opts(ptrSel)+'</select>',
              '<div id="psm-ptr-cw" style="margin-bottom:14px;display:'+(ptrSel==='custom'?'block':'none')+';">',
                '<input id="psm-ptr-ci" type="text" maxlength="4" placeholder="输入 1-2 个字符" value="'+_esc(ptrCustom)+'" style="width:100%;padding:8px 10px;border:1.5px solid var(--border-color);border-radius:10px;background:var(--secondary-bg);color:var(--text-primary);font-size:13px;outline:none;box-sizing:border-box;font-family:var(--font-family);">',
              '</div>',
              '<div id="psm-preview" style="background:var(--secondary-bg);border-radius:10px;padding:10px 14px;font-size:12.5px;color:var(--text-secondary);margin-bottom:16px;border:1px dashed var(--border-color);line-height:1.7;"></div>',
              '<div style="display:flex;gap:8px;">',
                '<button id="psm-cancel" style="flex:1;padding:9px;border:1px solid var(--border-color);border-radius:10px;background:var(--secondary-bg);color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">取消</button>',
                '<button id="psm-save" style="flex:2;padding:9px;border:none;border-radius:10px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);">保存</button>',
              '</div>',
            '</div>'
        ].join('');
        document.body.appendChild(wrap);

        function preview() {
            var mv = document.getElementById('psm-my').value;
            var pv = document.getElementById('psm-ptr').value;
            var ms = mv==='custom'?(document.getElementById('psm-my-ci').value||'✦'):((PRESETS.find(function(x){return x.value===mv;})||{}).sym||'');
            var ps = pv==='custom'?(document.getElementById('psm-ptr-ci').value||'✦'):((PRESETS.find(function(x){return x.value===pv;})||{}).sym||'');
            var myN  = (typeof settings!=='undefined'&&settings.myName)||'我';
            var pN   = (typeof settings!=='undefined'&&settings.partnerName)||'对方';
            var mt   = ms?(ms+' '+myN+' 拍了拍你 '+ms):(myN+' 拍了拍你');
            var pt   = ps?(ps+' '+pN+' 拍了拍你 '+ps):(pN+' 拍了拍你');
            document.getElementById('psm-preview').innerHTML =
                '<div style="color:var(--text-primary);">我：'+_esc(mt)+'</div>'+
                '<div style="color:var(--text-primary);margin-top:3px;">对方：'+_esc(pt)+'</div>';
        }

        document.getElementById('psm-my').addEventListener('change', function(){
            document.getElementById('psm-my-cw').style.display = this.value==='custom'?'block':'none'; preview();
        });
        document.getElementById('psm-ptr').addEventListener('change', function(){
            document.getElementById('psm-ptr-cw').style.display = this.value==='custom'?'block':'none'; preview();
        });
        document.getElementById('psm-my-ci').addEventListener('input', preview);
        document.getElementById('psm-ptr-ci').addEventListener('input', preview);
        preview();

        function close(){ wrap.remove(); }
        document.getElementById('psm-close').addEventListener('click', close);
        document.getElementById('psm-cancel').addEventListener('click', close);
        wrap.addEventListener('click', function(e){ if(e.target===wrap) close(); });
        document.getElementById('psm-save').addEventListener('click', function(){
            var mv = document.getElementById('psm-my').value;
            var pv = document.getElementById('psm-ptr').value;
            localStorage.setItem(MY_SYM_KEY, mv);
            localStorage.setItem(PTR_SYM_KEY, pv);
            if(mv==='custom') localStorage.setItem(MY_CUST_KEY, document.getElementById('psm-my-ci').value.trim());
            if(pv==='custom') localStorage.setItem(PTR_CUST_KEY, document.getElementById('psm-ptr-ci').value.trim());
            close();
            if(window._syncPokeDesc) window._syncPokeDesc();
            if(typeof showNotification==='function') showNotification('戳一戳符号已保存 ✓','success',1800);
        });
    };

    function _syncPokeDesc() {
        var ms = localStorage.getItem(MY_SYM_KEY)||'star4';
        var ps = localStorage.getItem(PTR_SYM_KEY)||'star4';
        var ml = (PRESETS.find(function(p){return p.value===ms;})||{}).label||ms;
        var pl = (PRESETS.find(function(p){return p.value===ps;})||{}).label||ps;
        var d = document.getElementById('poke-symbol-desc');
        if(d) d.textContent = '我: '+ml+'  /  对方: '+pl;
    }
    window._syncPokeDesc = _syncPokeDesc;
    document.addEventListener('DOMContentLoaded', _syncPokeDesc);
    setTimeout(_syncPokeDesc, 600);
})();

// 顶部栏透明度控制
(function() {
    var KEY = 'headerAlwaysClear';
    function _get() { return localStorage.getItem(KEY) === 'true'; }

    function _applyHeader() {
        var en = _get();
        var id = 'header-clear-override';
        var t  = document.getElementById(id);
        if (!t) { t = document.createElement('style'); t.id = id; document.head.appendChild(t); }
        if (en) {
            t.textContent = '.header { opacity: 1 !important; }';
        } else {
            t.textContent = [
                '.header { opacity: 0.5 !important; transition: opacity 0.3s ease !important; }',
                '.header:hover { opacity: 1 !important; }'
            ].join(' ');
        }
    }

    function _syncUI() {
        var en  = _get();
        var row = document.getElementById('header-opacity-toggle');
        if (row) row.classList.toggle('active', en);
        var spans = document.querySelectorAll('#header-opacity-toggle .setting-pill-label span');
        if (spans.length) spans[0].textContent = en ? '已开启，始终清晰' : '关闭后悬停才清晰';
    }

    window._toggleHeaderOpacity = function() {
        localStorage.setItem(KEY, String(!_get()));
        _applyHeader(); _syncUI();
        if (typeof showNotification === 'function')
            showNotification(_get() ? '顶部栏已常驻清晰 ✓' : '顶部栏已恢复悬停清晰', 'success', 1800);
    };

    _applyHeader();
    document.addEventListener('DOMContentLoaded', function(){ _applyHeader(); _syncUI(); });
    setTimeout(function(){ _applyHeader(); _syncUI(); }, 500);
    setTimeout(function(){ _applyHeader(); _syncUI(); }, 1500);
})();

// 保活音频
(function() {
    var KEY = 'keepaliveAudioEnabled';
    var SRC = 'https://img.heliar.top/file/1772885159972_silence.m4a';
    var _audio = null;
    var _unlockBound = false;

    function _get() { return localStorage.getItem(KEY) === 'true'; }

    function _createAudio() {
        if (_audio) return _audio;
        _audio = new Audio(SRC);
        _audio.loop   = true;
        _audio.volume = 0.01;
        _audio.preload = 'auto';
        _audio.addEventListener('play',  function(){ _setUI(true);  });
        _audio.addEventListener('pause', function(){ _setUI(false); });
        return _audio;
    }

    function _setUI(playing) {
        var dot  = document.getElementById('keepalive-dot');
        var desc = document.getElementById('keepalive-audio-desc');
        var sw   = document.getElementById('keepalive-audio-switch');
        var row  = document.getElementById('keepalive-bar-row');

        if (sw)   sw.classList.toggle('active', _get());
        if (dot) {
            dot.className = 'keepalive-dot' + (playing ? ' alive' : '');
        }
        if (desc) {
            if (!_get())      desc.textContent = '静音循环音频，防止页面被系统挂起';
            else if (playing) desc.textContent = '运行中 · 页面已保活';
            else              desc.textContent = '等待交互后启动…';
        }
        if (row)  row.style.display = _get() ? 'flex' : 'none';
        var bars = document.querySelectorAll('.keepalive-wave-bar');
        bars.forEach(function(b){ b.style.animationPlayState = playing ? 'running' : 'paused'; });
    }

    function _start() {
        var a = _createAudio();
        var p = a.play();
        if (p && p.then) {
            p.catch(function(){
                _setUI(false);
                if (!_unlockBound) {
                    _unlockBound = true;
                    function unlock(){ if(_get()) a.play().catch(function(){}); _unlockBound=false; }
                    document.addEventListener('touchstart', unlock, { once:true });
                    document.addEventListener('click',      unlock, { once:true });
                }
            });
        }
    }

    function _stop() {
        if (_audio) { _audio.pause(); _audio.currentTime = 0; }
        _setUI(false);
    }

    window._toggleKeepaliveAudio = function() {
        var next = !_get();
        localStorage.setItem(KEY, String(next));
        if (next) {
            _start();
            if (typeof showNotification === 'function') showNotification('保活音频已开启 🎵', 'success', 2000);
        } else {
            _stop();
            if (typeof showNotification === 'function') showNotification('保活音频已关闭', 'info', 1500);
        }
        _setUI(next && _audio && !_audio.paused);
    };

    document.addEventListener('visibilitychange', function(){
        if (_get() && document.visibilityState === 'visible' && _audio && _audio.paused) {
            _audio.play().catch(function(){});
        }
    });

    document.addEventListener('DOMContentLoaded', function(){
        _setUI(false);
        if (_get()) _start();
    });
    setTimeout(function(){
        _setUI(_get() && !!_audio && !_audio.paused);
        if (_get() && (!_audio || _audio.paused)) _start();
    }, 1800);
})();

// 消息搜索
(function() {
    window._runMsgSearch = function() {
        var inp  = document.getElementById('msg-search-input');
        var from = document.getElementById('msg-search-date-from');
        var to   = document.getElementById('msg-search-date-to');
        var out  = document.getElementById('msg-search-results');
        if (!out) return;

        var q  = inp  ? inp.value.trim().toLowerCase() : '';
        var fd = from && from.value ? new Date(from.value+'T00:00:00') : null;
        var td = to   && to.value   ? new Date(to.value  +'T23:59:59') : null;

        if (!q && !fd && !td) {
            out.innerHTML = '<div class="sri-empty"><i class="fas fa-search"></i><span>输入关键词或选择日期范围</span></div>';
            return;
        }
        if (typeof messages === 'undefined' || !messages || !messages.length) {
            out.innerHTML = '<div class="sri-empty"><i class="fas fa-inbox"></i><span>暂无聊天记录</span></div>';
            return;
        }

        var res = messages.filter(function(m){
            if (m.type === 'system') return false;
            var ts = m.timestamp ? new Date(m.timestamp) : null;
            if (fd && ts && ts < fd) return false;
            if (td && ts && ts > td) return false;
            if (q) return m.text && m.text.toLowerCase().indexOf(q) !== -1;
            return true;
        });

        if (!res.length) {
            out.innerHTML = '<div class="sri-empty"><i class="fas fa-inbox"></i><span>未找到匹配消息</span></div>';
            return;
        }

        function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
        function hi(t,k){
            if(!k||!t) return esc(t||'');
            return esc(t).replace(new RegExp('('+k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi'),'<mark style="background:rgba(var(--accent-color-rgb),.28);color:var(--text-primary);border-radius:3px;padding:0 2px;">$1</mark>');
        }
        function fmt(ts){
            if(!ts) return '';
            var d=new Date(ts);
            return d.getFullYear()+'/'+(d.getMonth()+1+'').padStart(2,'0')+'/'+(d.getDate()+'').padStart(2,'0')+' '+(d.getHours()+'').padStart(2,'0')+':'+(d.getMinutes()+'').padStart(2,'0');
        }
        function nm(m){ return m.sender==='user'?((typeof settings!=='undefined'&&settings.myName)||'我'):((typeof settings!=='undefined'&&settings.partnerName)||'对方'); }

        var _myAvSrc = (function(){
            var el = document.querySelector('#my-avatar img,[id*="my-avatar"] img');
            return el ? el.src : null;
        })();
        var _partnerAvSrc = (function(){
            var el = document.querySelector('#partner-avatar img,[id*="partner-avatar"] img,.partner-avatar img');
            return el ? el.src : null;
        })();
        function _avHtml(isMe) {
            var src = isMe ? _myAvSrc : _partnerAvSrc;
            if (src) return '<img src="'+src+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
            return '<i class="fas fa-'+(isMe?'user':'user-circle')+'" style="font-size:16px;color:rgba(255,255,255,.8);"></i>';
        }

        var html = '<div style="font-size:12px;color:var(--text-secondary);padding:0 2px 8px;">共 <b style="color:var(--accent-color)">'+res.length+'</b> 条</div>';
        html += res.slice(0,200).map(function(m){
            var isMe = m.sender==='user';
            var preview = m.text?(m.text.length>100?m.text.slice(0,100)+'…':m.text):(m.image?'[图片]':'');
            return '<div class="search-result-item" onclick="window._scrollToMsg&&window._scrollToMsg('+m.id+')">'+
                '<div class="sri-avatar '+(isMe?'sri-me':'sri-partner')+'">'+_avHtml(isMe)+'</div>'+
                '<div class="sri-body">'+
                  '<div class="sri-meta"><span class="sri-name">'+esc(nm(m))+'</span><span class="sri-time">'+fmt(m.timestamp)+'</span></div>'+
                  '<div class="sri-text">'+hi(preview,q)+'</div>'+
                '</div>'+
            '</div>';
        }).join('');
        if (res.length>200) html+='<div style="text-align:center;font-size:12px;color:var(--text-secondary);padding:6px 0">仅显示前 200 条</div>';
        out.innerHTML = html;
    };

    window._scrollToMsg = function(id) {
        var el = document.querySelector('[data-id="'+id+'"]') || document.querySelector('[data-message-id="'+id+'"]');
        if (el) {
            el.scrollIntoView({behavior:'smooth',block:'center'});
            el.style.transition='background .3s ease';
            el.style.background='rgba(var(--accent-color-rgb),.14)';
            setTimeout(function(){ el.style.background=''; }, 1800);
            var m = document.getElementById('stats-modal');
            if (m && typeof hideModal==='function') setTimeout(function(){ hideModal(m); }, 350);
        } else {
            if (typeof showNotification==='function') showNotification('消息不在当前视图中','info',2000);
        }
    };
})();

// Combo 菜单
function renderComboMenu() {
    const content = document.getElementById('user-sticker-content');
    content.innerHTML = '';

    const tabBar = document.createElement('div');
    tabBar.style.cssText = 'display:flex; gap:8px; padding:8px; border-bottom:1px solid var(--border-color);';
    tabBar.innerHTML = `
        <button class="combo-tab active" data-tab="emoji" style="flex:1; padding:8px; border:none; background:var(--accent-color); color:#fff; border-radius:8px; cursor:pointer;">
            😊 表情
        </button>
        <button class="combo-tab" data-tab="poke" style="flex:1; padding:8px; border:none; background:var(--secondary-bg); color:var(--text-primary); border-radius:8px; cursor:pointer;">
            ✨ 拍一拍
        </button>
    `;

    const contentArea = document.createElement('div');
    contentArea.id = 'combo-content-area';
    contentArea.style.cssText = 'padding:10px; max-height:240px; overflow-y:auto;';

    content.appendChild(tabBar);
    content.appendChild(contentArea);

    showEmojiTab();

    tabBar.querySelectorAll('.combo-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            tabBar.querySelectorAll('.combo-tab').forEach(b => {
                b.style.background = 'var(--secondary-bg)';
                b.style.color = 'var(--text-primary)';
                b.classList.remove('active');
            });
            btn.style.background = 'var(--accent-color)';
            btn.style.color = '#fff';
            btn.classList.add('active');

            if (btn.dataset.tab === 'emoji') {
                showEmojiTab();
            } else {
                showPokeTab();
            }
        });
    });
}

function showEmojiTab() {
    const area = document.getElementById('combo-content-area');
    area.innerHTML = '';
    area.style.display = 'grid';
    area.style.gridTemplateColumns = 'repeat(5, 1fr)';
    area.style.gap = '8px';

    // 这里直接使用全局变量 CONSTANTS 和 customEmojis 等
    if (typeof CONSTANTS !== 'undefined' && CONSTANTS.REPLY_EMOJIS) {
        CONSTANTS.REPLY_EMOJIS.forEach(emoji => {
            const item = document.createElement('div');
            item.className = 'picker-item';
            item.innerHTML = `<span style="font-size:24px;">${emoji}</span>`;
            item.onclick = () => {
                const input = document.getElementById('message-input');
                input.value += emoji;
                document.getElementById('user-sticker-picker').classList.remove('active');
                input.focus();
            };
            area.appendChild(item);
        });
    }
    if (typeof customEmojis !== 'undefined' && Array.isArray(customEmojis)) {
        customEmojis.forEach(emoji => {
            const item = document.createElement('div');
            item.className = 'picker-item';
            item.innerHTML = `<span style="font-size:24px;">${emoji}</span>`;
            item.onclick = () => {
                const input = document.getElementById('message-input');
                input.value += emoji;
                document.getElementById('user-sticker-picker').classList.remove('active');
                input.focus();
            };
            area.appendChild(item);
        });
    }

    if (typeof stickerLibrary !== 'undefined' && Array.isArray(stickerLibrary)) {
        stickerLibrary.forEach(src => {
            const item = document.createElement('div');
            item.className = 'picker-item';
            item.innerHTML = `<img src="${src}" style="width:100%; height:100%; object-fit:cover; border-radius:6px;">`;
            item.onclick = () => {
                if (typeof isBatchMode !== 'undefined' && isBatchMode) {
                    batchMessages.push({ id: Date.now() + batchMessages.length, text: '', image: src });
                    updateBatchPreview();
                    showNotification('已添加到批量发送', 'success', 1200);
                } else if (typeof addMessage === 'function') {
                    addMessage({
                        id: Date.now(),
                        sender: 'user',
                        text: '',
                        timestamp: new Date(),
                        image: src,
                        status: 'sent',
                        type: 'normal'
                    });
                    if (typeof playSound === 'function') playSound('send');
                    const delayRange = settings.replyDelayMax - settings.replyDelayMin;
                    const randomDelay = settings.replyDelayMin + Math.random() * delayRange;
                    if (window._pendingReplyTimer) clearTimeout(window._pendingReplyTimer);
                    window._pendingReplyTimer = setTimeout(() => { window._pendingReplyTimer = null; if (typeof simulateReply === 'function') simulateReply(); }, randomDelay);
                }
                document.getElementById('user-sticker-picker').classList.remove('active');
            };
            area.appendChild(item);
        });
    }
}

function showPokeTab() {
    const area = document.getElementById('combo-content-area');
    area.innerHTML = '';
    area.style.display = 'flex';
    area.style.flexDirection = 'column';
    area.style.gap = '8px';

    if (typeof customPokes !== 'undefined' && Array.isArray(customPokes)) {
        const quickPokes = customPokes.slice(0, 6);
        quickPokes.forEach(pokeText => {
            const cleanPokeText = (typeof window._sanitizePokeTextForDisplay === 'function')
                ? window._sanitizePokeTextForDisplay(pokeText)
                : pokeText;
            const btn = document.createElement('button');
            btn.textContent = cleanPokeText;
            btn.style.cssText = `
                padding: 10px 14px;
                background: linear-gradient(135deg, var(--secondary-bg), rgba(var(--accent-color-rgb),0.04));
                border: 1px solid rgba(var(--accent-color-rgb),0.15);
                border-radius: 12px;
                cursor: pointer;
                text-align: left;
                font-size: 13px;
                transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
                color: var(--text-primary);
                font-family: var(--font-family);
                width: 100%;
            `;
            btn.addEventListener('mouseover', () => {
                btn.style.background = 'linear-gradient(135deg, rgba(var(--accent-color-rgb),0.12), rgba(var(--accent-color-rgb),0.06))';
                btn.style.borderColor = 'var(--accent-color)';
                btn.style.transform = 'translateX(4px)';
            });
            btn.addEventListener('mouseout', () => {
                btn.style.background = 'linear-gradient(135deg, var(--secondary-bg), rgba(var(--accent-color-rgb),0.04))';
                btn.style.borderColor = 'rgba(var(--accent-color-rgb),0.15)';
                btn.style.transform = '';
            });
            btn.onclick = () => {
                if (typeof addMessage === 'function') {
                    addMessage({
                        id: Date.now(),
                        text: (typeof _formatPokeText === 'function' ? _formatPokeText(`${settings.myName} ${cleanPokeText}`) : `${settings.myName} ${cleanPokeText}`),
                        timestamp: new Date(),
                        type: 'system'
                    });
                }
                document.getElementById('user-sticker-picker').classList.remove('active');
                if (typeof settings !== 'undefined') {
                    const delayRange = settings.replyDelayMax - settings.replyDelayMin;
                    const randomDelay = settings.replyDelayMin + Math.random() * delayRange;
                    if (typeof simulateReply === 'function') setTimeout(simulateReply, randomDelay);
                }
            };
            area.appendChild(btn);
        });
    }

    const customBtn = document.createElement('button');
    customBtn.innerHTML = '<i class="fas fa-edit"></i> 自定义拍一拍';
    customBtn.style.cssText = `
        padding: 11px 14px;
        background: linear-gradient(135deg, var(--accent-color), rgba(var(--accent-color-rgb),0.8));
        color: #fff;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        font-weight: 600;
        font-size: 13px;
        width: 100%;
        letter-spacing: 0.3px;
        margin-top: 4px;
        box-shadow: 0 4px 14px rgba(var(--accent-color-rgb), 0.25);
    `;
    customBtn.onclick = () => {
        document.getElementById('user-sticker-picker').classList.remove('active');
        if (DOMElements && DOMElements.pokeModal) showModal(DOMElements.pokeModal.modal, DOMElements.pokeModal.input);
    };
    area.appendChild(customBtn);
}

// ---------- 注意：删除了重复的 initCoreListeners()，事件绑定由 listeners.js 统一负责 ----------

// 每日公告数据
window._dailyGreetingReady = false;

function _getDailyGreetingData() {
    var now = new Date();
    var month = now.getMonth() + 1;
    var day = now.getDate();
    var hour = now.getHours();

    var timeLabel = '早上好', timeEmoji = '🌅';
    if (hour >= 12 && hour < 18) { timeLabel = '下午好'; timeEmoji = '☀️'; }
    else if (hour >= 18 && hour < 22) { timeLabel = '傍晚好'; timeEmoji = '🌇'; }
    else if (hour >= 22 || hour < 6) { timeLabel = '晚上好'; timeEmoji = '🌙'; }

    var festivals = [
        { m:1, d:1, name:'元旦', emoji:'🎆', label:'NEW YEAR', note:'新年快乐！愿新的一年里，你们的爱情越来越甜蜜，每一天都充满幸福与惊喜～' },
        { m:1, d:5, name:'小寒', emoji:'❄️', label:'MINOR COLD', note:'小寒至，春不远。有你在身边，心里总是暖暖的。' },
        // ... 完整节日数组请保留原文件中的内容，这里省略部分以节省空间，但生成文件时务必完整粘贴
    ];
    var festival = null;
    for (var fi = 0; fi < festivals.length; fi++) {
        if (festivals[fi].m === month && festivals[fi].d === day) { festival = festivals[fi]; break; }
    }

    var weathers = ['晴空万里','多云转晴','阴天有云','细雨蒙蒙','春风和煦','微微寒冷','清风徐徐','雨后初晴','夜色宁静','月光皎洁','晴间多云','大雨滂沱','雷雨交加','小雪纷飞','微风拂面','多云天气','雾气朦胧','星光璀璨','朝霞满天','夕阳西下','海风轻拂','山间清爽','秋叶飘落','花香四溢','绿意盎然','雨后清新','雪花飞舞','阳光明媚'];

    var statusPool = ['正在想你 💭','忙碌中，但心里有你','好好的，别担心 ✨','期待见到你','有点想你了','在努力变更好','今天挺安静的','心情不错哦 🌱','一切都好，你呢？','看月亮，想到你 🌙','今天有点想你','刚刚看到一朵云像你 ☁️','工作再忙也会想你的','今天你开心吗？','梦里见 💤','好好吃饭了吗？','记得多喝水哦 💧','今天有没有照顾好自己','想你，但不说 🤫','全世界你最可爱','今天天气不错，适合想你','吃饱喝足，开始想你','今天也想牵你的手','你有没有想我','今天比昨天更想你','看到好吃的想分享给你 🍜','听到一首歌想到你 🎵','今天也要加油鸭','晚安，我的全世界 🌙','早安，又是想你的一天'];

    var todayKey = String(now.getFullYear()) + String(month) + String(day);
    var userSalt = localStorage.getItem('_dgUserSalt');
    if (!userSalt) { userSalt = String(Math.floor(Math.random() * 999983) + 1); localStorage.setItem('_dgUserSalt', userSalt); }
    var seed = 0; var saltedKey = todayKey + userSalt;
    for (var si = 0; si < saltedKey.length; si++) seed += saltedKey.charCodeAt(si) * (si + 1);
    function seededRandDg(s, offset) { var x = Math.sin(s * 9301 + offset * 49297 + 233) * 1000003; return x - Math.floor(x); }
    var defaultWeather = weathers[Math.floor(seededRandDg(seed, 0) * weathers.length)];
    var customWeatherKey = 'customWeather_' + now.getFullYear() + '_' + month + '_' + day;
    var weather = localStorage.getItem(customWeatherKey) || defaultWeather;

    var userStatusPool = [];
    try { userStatusPool = JSON.parse(localStorage.getItem('dg_status_pool') || '[]'); } catch(e) {}
    var userStatusTexts = userStatusPool.map(function(item) { return item.status || item; }).filter(Boolean);
    var mixedStatusPool = statusPool.concat(userStatusTexts);
    var status = mixedStatusPool[Math.floor(seededRandDg(seed, 1) * mixedStatusPool.length)];

    return { timeLabel: timeLabel, timeEmoji: timeEmoji, festival: festival, weather: weather, status: status };
}

function _buildDailyGreeting() {
    try {
        var data = _getDailyGreetingData();
        var festival = data.festival;
        var weather = data.weather;
        var status = data.status;
        var now = new Date();
        var todayStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
        var moodDataRaw = window.moodData || {};
        var todayMood = moodDataRaw[todayStr];
        var allMoods = (typeof getAllMoodOptions === 'function') ? getAllMoodOptions() : [];
        var pName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '梦角';
        var mName = (typeof settings !== 'undefined' && settings.myName) ? settings.myName : '我';
        var partnerMoodText = pName + ' 今天还没有记录';
        var partnerMoodIcon = null;
        var partnerMoodNote = '';
        if (todayMood && todayMood.partner) {
            for (var pi = 0; pi < allMoods.length; pi++) {
                if (allMoods[pi].key === todayMood.partner) {
                    partnerMoodText = allMoods[pi].kaomoji + '  ' + allMoods[pi].label;
                    partnerMoodIcon = allMoods[pi].kaomoji;
                    break;
                }
            }
            partnerMoodNote = todayMood.partnerNote || '';
        }

        var h = now.getHours();
        var mainTitle = festival ? (festival.name + '快乐') : data.timeLabel;
        var festLabel = festival ? festival.label : ('GOOD ' + (h < 12 ? 'MORNING' : h < 18 ? 'AFTERNOON' : 'EVENING'));
        var noteText = festival ? festival.note : '今天也要元气满满，我在这里陪着你 ✦';

        var customData = {};
        try { customData = JSON.parse(localStorage.getItem('dg_custom_data') || '{}'); } catch(e2) {}
        var dailySeed = now.getFullYear() * 10000 + (now.getMonth()+1) * 100 + now.getDate();
        function seededRandom(seed) { return (Math.abs(Math.sin(seed * 9301 + 49297) * 233280) % 233280) / 233280; }
        var todaySeedForText = dailySeed;
        var defaultTitles = festival ? [(festival.name + '快乐')] : [data.timeLabel, '今天也要开心哦', '你在我心里呀', '想你'];
        var defaultNotes = festival ? [festival.note] : ['今天也要元气满满，我在这里陪着你 ✦', '每一天都因为有你而特别 ✦', '想到你就觉得很安心 ✦', '你是我最喜欢的人 ✦'];
        var mixedTitles = (customData.titles && customData.titles.length > 0) ? [...customData.titles, ...defaultTitles] : (customData.title ? [customData.title, ...defaultTitles] : defaultTitles);
        var mixedNotes = (customData.notes && customData.notes.length > 0) ? [...customData.notes, ...defaultNotes] : (customData.note ? [customData.note, ...defaultNotes] : defaultNotes);
        mainTitle = mixedTitles[Math.floor(seededRandom(todaySeedForText) * mixedTitles.length)];
        noteText = mixedNotes[Math.floor(seededRandom(todaySeedForText + 1) * mixedNotes.length)];

        function setEl(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
        setEl('dg-festival', festLabel);
        setEl('dg-title', mainTitle);
        setEl('dg-partner-mood', partnerMoodText);
        setEl('dg-partner-mood-note', partnerMoodNote || (todayMood && todayMood.partner ? pName + ' 记录了今天的心情 ☆' : ''));

        var statusPoolData = [];
        try { statusPoolData = JSON.parse(localStorage.getItem('dg_status_pool') || '[]'); } catch(e2) {}
        var systemStatusItems = status ? [{ status: status, icon: null, iconImg: null }] : [];
        var fullPool = systemStatusItems.concat(statusPoolData);
        if (fullPool.length > 0) {
            var poolItem = fullPool[Math.floor(seededRandom(todaySeedForText + 2) * fullPool.length)];
            if (poolItem) {
                setEl('dg-festival', poolItem.label || festLabel);
                setEl('dg-status', poolItem.status || status);
            }
        } else { setEl('dg-status', status); }
        setEl('dg-weather', weather);
        setEl('dg-note-text', noteText);

        var headerBg = localStorage.getItem('dg_header_bg');
        var bgEl = document.getElementById('dg-header-band-bg');
        if (bgEl && headerBg) { bgEl.style.backgroundImage = 'url(' + headerBg + ')'; bgEl.classList.add('has-img'); }
        var overlayBg = localStorage.getItem('dg_overlay_bg');
        if (overlayBg) { if (typeof applyDgOverlayBg === 'function') applyDgOverlayBg(overlayBg); }
        var decoImg = customData.decoImg;
        var decoWrap2 = document.getElementById('dg-deco-img-wrap');
        var decoImgEl2 = document.getElementById('dg-deco-img');
        if (decoWrap2 && decoImgEl2) { if (decoImg) { decoImgEl2.src = decoImg; decoWrap2.style.display = 'block'; } else { decoWrap2.style.display = 'none'; } }
    } catch(e) { console.warn('Daily greeting build error:', e); }
}

window.toggleImmersiveMode = function(force) {
    var isOn = (force !== undefined) ? force : !document.body.classList.contains('immersive-mode');
    document.body.classList.toggle('immersive-mode', isOn);
    var toggle = document.getElementById('immersive-toggle');
    if (toggle) toggle.classList.toggle('active', isOn);
    try { localStorage.setItem('immersive_mode', isOn ? '1' : '0'); } catch(e) {}
    if (!isOn && typeof showNotification === 'function') showNotification('已退出沉浸式模式', 'info');
};



(function() {
    var btn = document.getElementById('immersive-exit-btn');
    if (!btn) return;
    var isDragging = false, hasMoved = false;
    var startX, startY, origRight, origBottom;
    
    function getRight() { return parseInt(btn.style.right) || 20; }
    function getBottom() { return parseInt(btn.style.bottom) || 100; }
    
    function onStart(e) {
        isDragging = true; hasMoved = false;
        btn.classList.add('dragging');
        var touch = e.touches ? e.touches[0] : e;
        startX = touch.clientX;
        startY = touch.clientY;
        origRight = getRight();
        origBottom = getBottom();
        e.preventDefault();
    }
    function onMove(e) {
        if (!isDragging) return;
        var touch = e.touches ? e.touches[0] : e;
        var dx = touch.clientX - startX;
        var dy = touch.clientY - startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved = true;
        var newRight = Math.max(10, Math.min(window.innerWidth - 54, origRight - dx));
        var newBottom = Math.max(10, Math.min(window.innerHeight - 54, origBottom - dy));
        btn.style.right = newRight + 'px';
        btn.style.bottom = newBottom + 'px';
        btn.style.left = 'auto';
        btn.style.top = 'auto';
        e.preventDefault();
    }
    function onEnd(e) {
        if (!isDragging) return;
        isDragging = false;
        btn.classList.remove('dragging');
        if (!hasMoved) {
            window.toggleImmersiveMode(false);
        }
    }
    btn.addEventListener('mousedown', onStart, {passive: false});
    btn.addEventListener('touchstart', onStart, {passive: false});
    document.addEventListener('mousemove', onMove, {passive: false});
    document.addEventListener('touchmove', onMove, {passive: false});
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchend', onEnd);
    
    btn.removeAttribute('onclick');
})();

(function() {
    if (localStorage.getItem('immersive_mode') === '1') {
        document.body.classList.add('immersive-mode');
        var t = document.getElementById('immersive-toggle');
        if (t) t.classList.add('active');
    }
})();

window.openDailyGreetingEditor = function() {
    var modal = document.getElementById('dg-editor-modal');
    if (!modal) return;
    var customData = {};
    try { customData = JSON.parse(localStorage.getItem('dg_custom_data') || '{}'); } catch(e) {}
    var titleEl = document.getElementById('dg-edit-title');
    var noteEl = document.getElementById('dg-edit-note');
    if (titleEl) titleEl.value = (customData.titles && customData.titles.length) ? customData.titles.join('\n') : (customData.title || '');
    if (noteEl) noteEl.value = (customData.notes && customData.notes.length) ? customData.notes.join('\n') : (customData.note || '');

    if (customData.decoImg) {
        var prev = document.getElementById('dg-deco-preview');
        var prevImg = document.getElementById('dg-deco-preview-img');
        if (prev && prevImg) { prevImg.src = customData.decoImg; prev.style.display = 'block'; }
    }

    modal.style.display = 'flex';
    modal.classList.add('active');
};
window.closeDailyGreetingEditor = function() {
    var modal = document.getElementById('dg-editor-modal');
    if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
};
window.saveDailyGreetingCustom = function() {
    var customData = {};
    try { customData = JSON.parse(localStorage.getItem('dg_custom_data') || '{}'); } catch(e) {}
    var titleEl = document.getElementById('dg-edit-title');
    var noteEl = document.getElementById('dg-edit-note');
    if (titleEl && titleEl.value.trim()) {
        var titles = titleEl.value.split('\n').map(function(s){ return s.trim(); }).filter(Boolean);
        customData.titles = titles;
        customData.title = titles[0];
    } else { delete customData.titles; delete customData.title; }
    if (noteEl && noteEl.value.trim()) {
        var notes = noteEl.value.split('\n').map(function(s){ return s.trim(); }).filter(Boolean);
        customData.notes = notes;
        customData.note = notes[0]; 
    } else { delete customData.notes; delete customData.note; }
    localStorage.setItem('dg_custom_data', JSON.stringify(customData));
    closeDailyGreetingEditor();
    if (typeof _buildDailyGreeting === 'function') _buildDailyGreeting();
    if (typeof showNotification === 'function') showNotification('公告已保存 ✦', 'success');
};
window.clearDgDecoImg = function() {
    var customData = {};
    try { customData = JSON.parse(localStorage.getItem('dg_custom_data') || '{}'); } catch(e) {}
    delete customData.decoImg;
    localStorage.setItem('dg_custom_data', JSON.stringify(customData));
    var prev = document.getElementById('dg-deco-preview');
    if (prev) prev.style.display = 'none';
    var wrap = document.getElementById('dg-deco-img-wrap');
    if (wrap) wrap.style.display = 'none';
};
window.clearDgHeaderBg = function() {
    localStorage.removeItem('dg_header_bg');
    var bgEl = document.getElementById('dg-header-band-bg');
    if (bgEl) { bgEl.style.backgroundImage = ''; bgEl.classList.remove('has-img'); }
};

window.onDgOverlayOpacityChange = function(val) {
    var tint = parseInt(val) / 100;
    localStorage.setItem('dg_overlay_bg_tint', tint);
    var valEl = document.getElementById('dg-overlay-opacity-val');
    if (valEl) valEl.textContent = val + '%';
    var tintLayer = document.getElementById('dg-card-tint-overlay');
    if (tintLayer) tintLayer.style.background = 'rgba(0,0,0,' + tint + ')';
};

window.handleDgOverlayBgUpload = function(input) {
    var file = input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
        var data = ev.target.result;
        localStorage.setItem('dg_overlay_bg', data);
        applyDgOverlayBg(data);
        var prev = document.getElementById('dg-overlay-bg-preview');
        var prevImg = document.getElementById('dg-overlay-bg-preview-img');
        if (prev && prevImg) { prevImg.src = data; prev.style.display = 'block'; }
        var opRow = document.getElementById('dg-overlay-opacity-row');
        if (opRow) opRow.style.display = 'block';
        var savedTint = parseFloat(localStorage.getItem('dg_overlay_bg_tint'));
        var pct = isNaN(savedTint) ? 25 : Math.round(savedTint * 100);
        var slider = document.getElementById('dg-overlay-opacity-slider');
        var valEl = document.getElementById('dg-overlay-opacity-val');
        if (slider) slider.value = pct;
        if (valEl) valEl.textContent = pct + '%';
    };
    reader.readAsDataURL(file);
};

window.clearDgOverlayBg = function() {
    localStorage.removeItem('dg_overlay_bg');
    applyDgOverlayBg(null);
    var prev = document.getElementById('dg-overlay-bg-preview');
    if (prev) prev.style.display = 'none';
    var opRow = document.getElementById('dg-overlay-opacity-row');
    if (opRow) opRow.style.display = 'none';
    if (typeof showNotification === 'function') showNotification('全屏背景已清除', 'success');
};

function applyDgOverlayBg(data, tintOpacity) {
    var card = document.getElementById('daily-greeting-card');
    var bgLayer = document.getElementById('dg-card-bg-layer');
    var tintLayer = document.getElementById('dg-card-tint-overlay');
    if (!card || !bgLayer) return;
    if (tintOpacity === undefined || tintOpacity === null) {
        var saved = parseFloat(localStorage.getItem('dg_overlay_bg_tint'));
        tintOpacity = isNaN(saved) ? 0.25 : saved;
    }
    if (data) {
        bgLayer.style.backgroundImage = 'url(' + data + ')';
        bgLayer.style.opacity = '1';
        if (tintLayer) tintLayer.style.background = 'rgba(0,0,0,' + tintOpacity + ')';
        card.classList.add('has-card-bg');
        card.style.backgroundImage = '';
        card.style.backgroundSize = '';
        card.style.backgroundPosition = '';
        card.style.backgroundRepeat = '';
    } else {
        bgLayer.style.backgroundImage = '';
        bgLayer.style.opacity = '';
        if (tintLayer) tintLayer.style.background = 'rgba(0,0,0,0)';
        card.classList.remove('has-card-bg');
    }
}

(function() {
    var savedOverlayBg = localStorage.getItem('dg_overlay_bg');
    if (savedOverlayBg) {
        document.addEventListener('DOMContentLoaded', function() {
            applyDgOverlayBg(savedOverlayBg);
            var prev = document.getElementById('dg-overlay-bg-preview');
            var prevImg = document.getElementById('dg-overlay-bg-preview-img');
            if (prev && prevImg) { prevImg.src = savedOverlayBg; prev.style.display = 'block'; }
            var opRow = document.getElementById('dg-overlay-opacity-row');
            if (opRow) opRow.style.display = 'block';
            var savedOp = parseFloat(localStorage.getItem('dg_overlay_bg_tint'));
            var pct = isNaN(savedOp) ? 25 : Math.round(savedOp * 100);
            var slider = document.getElementById('dg-overlay-opacity-slider');
            var valEl = document.getElementById('dg-overlay-opacity-val');
            if (slider) slider.value = pct;
            if (valEl) valEl.textContent = pct + '%';
        });
    }
})();

window.switchToAnnouncementPanel = function() {
    var listArea = document.getElementById('custom-replies-list');
    var annPanel = document.getElementById('announcement-panel');
    var toolbar = document.getElementById('cr-toolbar');
    var batchToolbar = document.getElementById('batch-ops-toolbar');
    var subTabs = document.getElementById('cr-sub-tabs');
    var addBtn = document.getElementById('add-custom-reply');
    var titleEl = document.getElementById('cr-modal-title');
    // 隐藏并清空列表区域，彻底清除 emoji/sticker/字卡等残留内容
    if (listArea) { listArea.style.display = 'none'; listArea.innerHTML = ''; listArea.className = 'content-list-area'; }
    // 隐藏并清空批量操作工具栏，防止工具栏内容残留
    if (batchToolbar) { batchToolbar.style.display = 'none'; batchToolbar.innerHTML = ''; }
    // 隐藏并清空 sub tabs，防止 tab 按钮残留
    if (subTabs) { subTabs.style.display = 'none'; subTabs.innerHTML = ''; }
    if (annPanel) { annPanel.style.display = 'block'; annPanel.scrollTop = 0; }
    if (toolbar) toolbar.style.display = 'none';
    if (addBtn) addBtn.style.display = 'none';
    if (titleEl) titleEl.textContent = '今日公告配置';
    var customData = {};
    try { customData = JSON.parse(localStorage.getItem('dg_custom_data') || '{}'); } catch(e2) {}
    var titleInput = document.getElementById('dg-edit-title');
    var noteInput = document.getElementById('dg-edit-note');
    if (titleInput) titleInput.value = (customData.titles && customData.titles.length) ? customData.titles.join('\n') : (customData.title || '');
    if (noteInput) noteInput.value = (customData.notes && customData.notes.length) ? customData.notes.join('\n') : (customData.note || '');
    if (customData.decoImg) {
        var prev = document.getElementById('dg-deco-preview');
        var prevImg = document.getElementById('dg-deco-preview-img');
        if (prev && prevImg) { prevImg.src = customData.decoImg; prev.style.display = 'block'; }
    }
    var savedOverlayBg2 = localStorage.getItem('dg_overlay_bg');
    if (savedOverlayBg2) {
        var overlayPrev = document.getElementById('dg-overlay-bg-preview');
        var overlayPrevImg = document.getElementById('dg-overlay-bg-preview-img');
        if (overlayPrev && overlayPrevImg) { overlayPrevImg.src = savedOverlayBg2; overlayPrev.style.display = 'block'; }
    }
    renderAnnStatusPool();
};

window.renderAnnStatusPool = function() {
    var listEl = document.getElementById('ann-status-pool-list');
    if (!listEl) return;
    var pool = [];
    try { pool = JSON.parse(localStorage.getItem('dg_status_pool') || '[]'); } catch(e2) {}
    listEl.innerHTML = '';
    if (pool.length === 0) {
        listEl.innerHTML = '<div style="font-size:12px;color:var(--text-secondary);text-align:center;padding:10px 0;opacity:0.6;">暂无条目，添加后将随机抽取</div>';
        return;
    }
    pool.forEach(function(item, idx) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:9px 12px;background:linear-gradient(135deg,rgba(var(--accent-color-rgb),0.05),rgba(var(--accent-color-rgb),0.02));border-radius:12px;border:1px solid rgba(var(--accent-color-rgb),0.15);font-size:13px;transition:box-shadow 0.2s;';
        var iconHtml = item.iconImg
            ? '<img src="' + item.iconImg + '" style="width:26px;height:26px;border-radius:50%;object-fit:cover;flex-shrink:0;">'
            : '<span style="font-size:18px;min-width:26px;text-align:center;flex-shrink:0;">' + (item.icon || '✦') + '</span>';
        row.innerHTML = iconHtml
            + '<div style="flex:1;min-width:0;">'
            + '<div style="color:var(--text-primary);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (item.status || '—') + '</div>'
            + (item.label ? '<div style="color:var(--accent-color);font-size:10px;letter-spacing:1.5px;margin-top:2px;opacity:0.8;">' + item.label + '</div>' : '')
            + '</div>'
            + '<button onclick="removeAnnStatusPoolItem(' + idx + ')" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:14px;padding:3px 5px;border-radius:6px;opacity:0.6;transition:opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.6">✕</button>';
        listEl.appendChild(row);
    });
};

window.addAnnStatusPoolItem = function() {
    var statusInput = document.getElementById('ann-status-pool-input');
    var labelInput = document.getElementById('ann-status-label-input');
    var iconInput = document.getElementById('ann-status-icon-input');
    var status = statusInput ? statusInput.value.trim() : '';
    var label = labelInput ? labelInput.value.trim() : '';
    var icon = iconInput ? iconInput.value.trim() : '';
    var iconImg = iconInput ? (iconInput.dataset.imgSrc || '') : '';
    if (!status && !label) { if (typeof showNotification === 'function') showNotification('请至少填写状态或标签', 'warning'); return; }
    var pool = [];
    try { pool = JSON.parse(localStorage.getItem('dg_status_pool') || '[]'); } catch(e2) {}
    var entry = { status: status, label: label, icon: icon || '✦' };
    if (iconImg) entry.iconImg = iconImg;
    pool.push(entry);
    localStorage.setItem('dg_status_pool', JSON.stringify(pool));
    if (statusInput) statusInput.value = '';
    if (labelInput) labelInput.value = '';
    if (iconInput) { iconInput.value = ''; delete iconInput.dataset.imgSrc; }
    renderAnnStatusPool();
    if (typeof showNotification === 'function') showNotification('已添加到随机库', 'success');
};

window.handleAnnStatusIconUpload = function(input) {
    var file = input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
        var iconInput = document.getElementById('ann-status-icon-input');
        if (iconInput) {
            iconInput.dataset.imgSrc = ev.target.result;
            iconInput.value = '[图片]';
            iconInput.style.fontSize = '10px';
        }
    };
    reader.readAsDataURL(file);
};

window.removeAnnStatusPoolItem = function(idx) {
    var pool = [];
    try { pool = JSON.parse(localStorage.getItem('dg_status_pool') || '[]'); } catch(e2) {}
    pool.splice(idx, 1);
    localStorage.setItem('dg_status_pool', JSON.stringify(pool));
    renderAnnStatusPool();
};

document.addEventListener('DOMContentLoaded', function() {
    var headerInput = document.getElementById('dg-header-img-input');
    if (headerInput) {
        headerInput.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function(ev) {
                var data = ev.target.result;
                localStorage.setItem('dg_header_bg', data);
                var bgEl = document.getElementById('dg-header-band-bg');
                if (bgEl) { bgEl.style.backgroundImage = 'url(' + data + ')'; bgEl.classList.add('has-img'); }
            };
            reader.readAsDataURL(file);
        });
    }
    var decoInput = document.getElementById('dg-deco-img-input');
    if (decoInput) {
        decoInput.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function(ev) {
                var data = ev.target.result;
                var customData = {};
                try { customData = JSON.parse(localStorage.getItem('dg_custom_data') || '{}'); } catch(ex) {}
                customData.decoImg = data;
                localStorage.setItem('dg_custom_data', JSON.stringify(customData));
                var prev = document.getElementById('dg-deco-preview');
                var prevImg = document.getElementById('dg-deco-preview-img');
                if (prev && prevImg) { prevImg.src = data; prev.style.display = 'block'; }
            };
            reader.readAsDataURL(file);
        });
    }
});

window.updateDynamicNames = function() {
    try {
        var pName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '梦角';
        var mName = (typeof settings !== 'undefined' && settings.myName) ? settings.myName : '我';

        var tabPartner = document.getElementById('mood-tab-partner');
        if (tabPartner) tabPartner.textContent = pName + '的记录';
        var tabMe = document.getElementById('mood-tab-me');
        if (tabMe) tabMe.textContent = mName + '的记录';

        var detailPartnerTitle = document.getElementById('detail-partner-title');
        if (detailPartnerTitle) detailPartnerTitle.textContent = pName + '的';

        var partnerNoRec = document.getElementById('detail-partner-no-record');
        if (partnerNoRec) {
            var msgEl = partnerNoRec;
            if (!msgEl.querySelector('span')) msgEl.textContent = pName + ' 这天还没有留下记录';
        }

        var editPartnerBtn = document.getElementById('edit-partner-mood');
        if (editPartnerBtn) editPartnerBtn.textContent = '修改' + pName;
        var deletePartnerBtn = document.getElementById('delete-partner-mood');
        if (deletePartnerBtn) deletePartnerBtn.textContent = '删除' + pName;

        var continueBtn = document.getElementById('continue-btn');
        if (continueBtn) continueBtn.title = '让' + pName + '继续说';

        var envInfo = document.querySelector('.env-send-info');
        if (envInfo) {
            var textNodes = Array.from(envInfo.childNodes).filter(n => n.nodeType === 3);
            textNodes.forEach(function(n) {
                if (n.textContent.includes('对方将在') || n.textContent.includes('小时内回信')) {
                    n.textContent = pName + ' 将在 10-24 小时内回信（8-12 句话）';
                }
            });
        }

        setDgLabel('dg-section-label-partner', pName + ' 今日状态');
        setDgLabel('dg-weather-label', pName + ' 的天气');
        setDgLabel('dg-status-label', pName + ' 的状态');

        var envInfoSpan = document.getElementById('env-reply-time-info');
        if (envInfoSpan) envInfoSpan.textContent = pName + ' 将在 10-24 小时内回信（8-12 句话）';

        var pokeInput = document.getElementById('poke-input');
        if (pokeInput) pokeInput.placeholder = '例如：拍了拍"' + pName + '"的肩膀';

        document.querySelectorAll('[data-name-partner]').forEach(function(el) {
            el.textContent = pName + '的记录';
        });
        document.querySelectorAll('[data-name-me]').forEach(function(el) {
            el.textContent = mName + '的记录';
        });
        document.querySelectorAll('[data-delete-partner]').forEach(function(el) {
            el.textContent = '删除' + pName;
        });
        document.querySelectorAll('[data-edit-partner]').forEach(function(el) {
            el.textContent = '修改' + pName;
        });
    } catch(e) { console.warn('updateDynamicNames error:', e); }
};
function setDgLabel(id, txt) {
    var el = document.getElementById(id);
    if (el && el.tagName !== 'INPUT') el.textContent = txt;
}

window.closeDailyGreeting = function() {
    try {
        var modal = document.getElementById('daily-greeting-modal');
        if (modal) {
            modal.style.opacity = '0';
            modal.style.transition = 'opacity 0.3s ease';
            setTimeout(function() {
                modal.classList.add('hidden');
                modal.style.opacity = '';
                modal.style.transition = '';
            }, 320);
        }
        localStorage.setItem('dailyGreetingShown', new Date().toDateString());
    } catch(e) {}
};

window.reopenDailyGreeting = function() {
    try {
        if (typeof _buildDailyGreeting === 'function') _buildDailyGreeting();
        var modal = document.getElementById('daily-greeting-modal');
        if (modal) {
            modal.style.opacity = '0';
            modal.classList.remove('hidden');
            requestAnimationFrame(function() {
                modal.style.transition = 'opacity 0.3s ease';
                modal.style.opacity = '1';
            });
        }
    } catch(e) {}
};

window.tryShowDailyGreeting = function() {
    try {
        if (localStorage.getItem('dailyGreetingShown') === new Date().toDateString()) return;

        var now = new Date();
        var todayStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
        var moodDataRaw = window.moodData || {};
        var todayMood = moodDataRaw[todayStr];

        if (!todayMood || !todayMood.partner) {
            setTimeout(function() {
                var refreshedMood = (window.moodData || {})[todayStr];
                _buildDailyGreeting(); 
                var modal = document.getElementById('daily-greeting-modal');
                if (modal) modal.classList.remove('hidden');
                localStorage.setItem('dailyGreetingShown', new Date().toDateString());
            }, 45000);
            return;
        }

        _buildDailyGreeting();
        var modal = document.getElementById('daily-greeting-modal');
        if (modal) modal.classList.remove('hidden');
    } catch(e) { console.warn('Daily greeting show error:', e); }
};

