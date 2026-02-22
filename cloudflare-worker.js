/**
 * Cloudflare Worker：将表单留言转发到 Telegram
 * 
 * 部署步骤：
 * 1. 登录 Cloudflare Dashboard，进入 Workers & Pages
 * 2. 创建 Worker，复制此代码粘贴
 * 3. 在 Worker 设置中添加环境变量（Settings -> Variables）：
 *    - TELEGRAM_BOT_TOKEN: 你的 Bot Token（从 @BotFather 获取）
 *    - TELEGRAM_CHAT_ID: 你的 Chat ID（用于接收消息）
 * 4. 部署后，将表单的 action 改为你的 Worker 地址
 */

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const token = env.TELEGRAM_BOT_TOKEN;
    const chatId = env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return jsonResponse({ error: 'Server config missing' }, 500);
    }

    try {
      const formData = await request.formData();
      const name = formData.get('昵称') || formData.get('name') || '匿名';
      const email = formData.get('邮箱') || formData.get('email') || '未留';
      const message = formData.get('留言内容') || formData.get('message') || '';

      const text = `📩 *新留言 · 晋港双城记*\n\n` +
        `👤 昵称：${escapeMarkdown(name)}\n` +
        `📧 邮箱：${escapeMarkdown(email)}\n\n` +
        `💬 留言：\n${escapeMarkdown(message)}`;

      const tgResponse = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown',
          }),
        }
      );

      const tgResult = await tgResponse.json();

      if (!tgResult.ok) {
        console.error('Telegram API error:', tgResult);
        return jsonResponse({ error: 'Failed to send' }, 500);
      }

      return jsonResponse({ ok: true });
    } catch (err) {
      console.error(err);
      return jsonResponse({ error: 'Server error' }, 500);
    }
  },
};

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function escapeMarkdown(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}
