import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAuthenticated())) return Response.json({ error: "未登录" }, { status: 401 });
  const body = await request.json();
  const prompt = String(body.prompt || "").slice(0, 4000);
  const context = String(body.context || "").slice(0, 50000);
  const scope = String(body.scope || "selection");
  if (!prompt) return Response.json({ error: "请输入问题" }, { status: 400 });

  const key = process.env.OPENAI_API_KEY;
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  if (!key) {
    return new Response(`AI 尚未配置。你正在使用“${scope}”上下文，已准备好 ${context.length} 个字符的原文；管理员配置服务端模型后即可开始对话。`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  const upstream = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      stream: true,
      temperature: 0.35,
      messages: [
        { role: "system", content: "你是严谨的中文阅读教练。只根据给出的书籍上下文回答；区分原文与推断，引用原文时保持简短，并在结尾给出可继续思考的一个问题。" },
        { role: "user", content: `上下文范围：${scope}\n\n书籍上下文：\n${context}\n\n问题：${prompt}` },
      ],
    }),
  });
  if (!upstream.ok || !upstream.body) return new Response("AI 服务暂时不可用，请稍后重试。", { status: 502 });

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
          try {
            const delta = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          } catch { /* incomplete provider event */ }
        }
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" } });
}
