// 1. 初始化LeanCloud（使用你新应用的凭证，无需修改）
const APP_ID = "fOBsKDDgCA4Yw5R2ZEPkdE5d-gzGzoHsz";
const APP_KEY = "SlsMBfcSTkJkp544pTXwBEcw";
const SERVER_URL = "https://fobskddg.lc-cn-n1-shared.com";

AV.init({
    appId: APP_ID,
    appKey: APP_KEY,
    serverURL: SERVER_URL
});

// 2. 定义全局变量（无修改）
const SensitiveWord = AV.Object.extend('SensitiveWord'); // 敏感词表
const Message = AV.Object.extend('Message'); // 消息表
let sensitiveWords = []; // 缓存敏感词库（仍需存储具体词，用于过滤消息）

// 3. DOM元素获取（修改：获取敏感词数量显示容器，替换原列表）
const sensitiveInput = document.getElementById('sensitiveInput');
const addSensitiveBtn = document.getElementById('addSensitiveBtn');
const sensitiveWordCount = document.getElementById('sensitiveWordCount'); // 新元素
const messageInput = document.getElementById('messageInput');
const sendMsgBtn = document.getElementById('sendMsgBtn');
const messageContainer = document.getElementById('messageContainer');
const clearAllBtn = document.getElementById('clearAllBtn');

// 4. 初始化：加载敏感词库+加载历史消息（无修改）
window.onload = async () => {
    await loadSensitiveWords(); // 加载敏感词（仍获取具体词，仅前端不显示）
    await loadMessages(); // 加载历史消息
    // 定时同步（1秒刷新一次，确保多用户实时同步）
    setInterval(async () => {
        await loadSensitiveWords();
        await loadMessages();
    }, 1000);
};

// 5. 加载敏感词库（无修改：仍获取所有敏感词，用于过滤）
async function loadSensitiveWords() {
    const query = new AV.Query(SensitiveWord);
    try {
        const results = await query.find(); // 查询所有敏感词
        sensitiveWords = results.map(item => item.get('word').trim()); // 缓存具体词（用于过滤）
        renderSensitiveWordCount(); // 关键修改：调用显示数量的函数，而非渲染具体词
    } catch (err) {
        alert('加载敏感词失败：' + err.message);
    }
}

// 6. 关键修改：渲染敏感词数量（不显示具体内容）
function renderSensitiveWordCount() {
    const uniqueWordCount = [...new Set(sensitiveWords)].length; // 去重后的敏感词数量
    if (uniqueWordCount === 0) {
        sensitiveWordCount.textContent = "暂无敏感词";
    } else {
        sensitiveWordCount.textContent = `已设置敏感词 ${uniqueWordCount} 个`; // 仅显示数量
    }
}

// 7. 添加敏感词（无修改：仍校验重复，提示已存在，但不显示具体词）
addSensitiveBtn.addEventListener('click', async () => {
    const word = sensitiveInput.value.trim();
    if (!word) {
        alert('请输入敏感词');
        return;
    }
    if (sensitiveWords.includes(word)) {
        alert('该敏感词已存在');
        sensitiveInput.value = '';
        return;
    }

    const sensitiveWord = new SensitiveWord();
    sensitiveWord.set('word', word);

    // 关键添加：设置对象级ACL，允许所有人读写删除
    const acl = new AV.ACL();
    acl.setPublicReadAccess(true); // 所有人可读
    acl.setPublicWriteAccess(true); // 所有人可写（含删除）
    sensitiveWord.setACL(acl);

    try {
        await sensitiveWord.save();
        alert('敏感词添加成功！');
        sensitiveInput.value = '';
        await loadSensitiveWords();
    } catch (err) {
        alert('添加敏感词失败：' + err.message);
    }
});
// 8. 过滤消息（无修改：仍用具体敏感词替换，功能正常）
function filterMessage(content) {
    let filteredContent = content;
    let isFiltered = false;

    sensitiveWords.forEach(word => {
        if (filteredContent.includes(word)) {
            isFiltered = true;
            const replaceStr = '*'.repeat(word.length);
            filteredContent = filteredContent.replace(new RegExp(word, 'g'), replaceStr);
        }
    });

    return { filteredContent, isFiltered };
}

// 9. 发送消息（修改：添加对象ACL，允许所有人删除）
sendMsgBtn.addEventListener('click', async () => {
    const content = messageInput.value.trim();
    if (!content) {
        alert('请输入消息内容');
        return;
    }

    const { filteredContent, isFiltered } = filterMessage(content);

    const message = new Message();
    message.set('content', filteredContent);
    message.set('isFiltered', isFiltered);

    // 关键添加：设置对象级ACL，允许所有人读写删除
    const acl = new AV.ACL();
    acl.setPublicReadAccess(true);
    acl.setPublicWriteAccess(true);
    message.setACL(acl);

    try {
        await message.save();
        messageInput.value = '';
        await loadMessages();
    } catch (err) {
        alert('发送消息失败：' + err.message);
    }
});

// 10. 加载历史消息（无修改）
async function loadMessages() {
    const query = new AV.Query(Message);
    query.descending('createdAt');
    query.limit(50);
    try {
        const results = await query.find();
        renderMessages(results);
    } catch (err) {
        alert('加载消息失败：' + err.message);
    }
}

// 11. 渲染消息（无修改）
function renderMessages(messages) {
    messageContainer.innerHTML = '';
    if (messages.length === 0) {
        messageContainer.innerHTML = '<div class="message-item"><p class="content">暂无消息，快来发送第一条吧～</p></div>';
        return;
    }

    messages.reverse().forEach(msg => {
        const content = msg.get('content');
        const isFiltered = msg.get('isFiltered');
        const createdAt = msg.get('createdAt');

        const timeStr = new Date(createdAt).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        const msgItem = document.createElement('div');
        msgItem.className = `message-item ${isFiltered ? 'filtered' : ''}`;
        msgItem.innerHTML = `
            <div class="time">${timeStr}</div>
            <div class="content">${content} ${isFiltered ? '[已过滤敏感词]' : ''}</div>
        `;
        messageContainer.appendChild(msgItem);
    });

    messageContainer.scrollTop = messageContainer.scrollHeight;
}

// 12. 清空所有数据（无修改：仍清空敏感词和消息）
// 12. 清空所有数据（修改后，确保批量删除生效）
clearAllBtn.addEventListener('click', async () => {
    if (!confirm('确定要清空所有敏感词和聊天记录吗？此操作不可恢复！')) {
        return;
    }

    try {
        // 清空敏感词表（使用destroyAll批量删除）
        const sensitiveQuery = new AV.Query(SensitiveWord);
        const sensitiveResults = await sensitiveQuery.find();
        await AV.Object.destroyAll(sensitiveResults); // 批量删除所有敏感词

        // 清空消息表（使用destroyAll批量删除）
        const messageQuery = new AV.Query(Message);
        const messageResults = await messageQuery.find();
        await AV.Object.destroyAll(messageResults); // 批量删除所有消息

        alert('所有数据已清空！');
        await loadSensitiveWords();
        await loadMessages();
    } catch (err) {
        console.error('清空失败详细原因：', err); // 控制台打印详细错误
        alert('清空失败：' + err.message);
    }
});

// 快捷键支持（无修改）
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMsgBtn.click();
    }
});