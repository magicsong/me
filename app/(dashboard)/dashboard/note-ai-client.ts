export async function getNoteAISummary(noteId: number | string, content?: string, title?: string) {
  try {
    const res = await fetch('/api/ai/note-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteId, content, title }),
    });

    if (!res.ok) {
      throw new Error(`AI接口返回 ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error('getNoteAISummary error', error);
    return { summary: '', reason: '' };
  }
}
