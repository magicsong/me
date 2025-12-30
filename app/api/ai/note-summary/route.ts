export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { noteId, title, content } = body || {};

    // TODO: 用真实的 LLM/AI 服务对 content 进行摘要/推荐理由生成
    // 目前返回示例/占位的响应，方便前端开发和展示
    const summary = content
      ? (content.length > 200 ? content.slice(0, 200) + '...' : content)
      : `对笔记 ${title ?? noteId} 的简要总结（示例）`;

    const reason = `推荐理由：这条笔记包含 ${
      (content || '').split('\n').length
    } 行内容，建议关注其中的关键点与行动项。`;

    return new Response(JSON.stringify({ summary, reason }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('note-summary API error:', err);
    return new Response(JSON.stringify({ error: 'server error' }), { status: 500 });
  }
}
