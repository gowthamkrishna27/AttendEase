import fs from 'fs';
import path from 'path';
import { Router, Request, Response } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

let knowledgeBaseText = '';

async function initKnowledgeBase() {
  try {
    const pdfPath = path.resolve(process.cwd(), 'knowledge-base.pdf');
    if (fs.existsSync(pdfPath)) {
      const dataBuffer = fs.readFileSync(pdfPath);
      let pdfParser: any = null;
      try {
        // @ts-ignore
        const mod = await import('pdf-parse');
        pdfParser = (mod as any).default || mod;
      } catch (e) {
        console.warn('pdf-parse module not loaded, fallback to plain text parsing if needed');
      }
      if (typeof pdfParser === 'function') {
        const parsed = await pdfParser(dataBuffer);
        knowledgeBaseText = String(parsed.text || '').trim();
        console.log(`🤖 Chatbot loaded knowledge base (${knowledgeBaseText.length} chars)`);
      }
    } else {
      console.warn('⚠️ knowledge-base.pdf not found in backend directory');
    }
  } catch (err) {
    console.error('❌ Failed to load knowledge base PDF:', err);
  }
}

// Initialize Knowledge Base on startup
initKnowledgeBase();

/**
 * POST /api/chat
 * OpenRouter LLM Powered Support Agent Grounded on AttendEase Knowledge Base
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { messages } = req.body as { messages?: { role: string; content: string }[] };

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Request body must include a messages array' });
      return;
    }

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;

    if (openRouterApiKey) {
      const modelsToTry = [
        'meta-llama/llama-3.3-70b-instruct',
        'deepseek/deepseek-chat',
        'openai/gpt-4o-mini',
      ];

      const systemPrompt = `You are the AttendEase AI Support Assistant for SAGI RAMAKRISHNAM RAJU (SRKR) ENGINEERING COLLEGE.
You help students, faculty, and HODs with attendance tracking, permission requests, exemption slips, and portal features.

=== BEGIN ATTENDEASE KNOWLEDGE CONTEXT ===
${knowledgeBaseText.slice(0, 8000)}
=== END ATTENDEASE KNOWLEDGE CONTEXT ===

Instructions:
- Be polite, concise, helpful, and clear.
- Provide accurate step-by-step guidance for student permission applications, faculty period attendance marking (P1-P8), HOD direct exemptions, and WhatsApp export formatting.
- Keep answers concise and directly actionable.`;

      for (const model of modelsToTry) {
        try {
          const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openRouterApiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://attendease.srkrec.edu.in',
              'X-Title': 'AttendEase AI Assistant',
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: systemPrompt },
                ...messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
              ],
              temperature: 0.4,
              max_tokens: 500,
            }),
          });

          if (openRouterResponse.ok) {
            const data: any = await openRouterResponse.json();
            const reply = data.choices?.[0]?.message?.content?.trim();
            if (reply) {
              res.json({ reply, success: true, model });
              return;
            }
          } else {
            const errorText = await openRouterResponse.text();
            console.warn(`OpenRouter ${model} error:`, errorText);
          }
        } catch (llmErr) {
          console.warn(`OpenRouter call error on ${model}:`, llmErr);
        }
      }
    }

    // Fallback response if LLM call is unavailable
    const fallbackReply = knowledgeBaseText.length > 0
      ? `AttendEase Assistant: I can help you with student permission requests, faculty attendance tracking, HOD direct exemptions, and real-time status updates. How can I assist you today?`
      : `Welcome to AttendEase Support! Please sign in to access attendance and permission management tools.`;

    res.json({ reply: fallbackReply, success: true, fallback: true });
  } catch (err: any) {
    console.error('Error in /api/chat route:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

/**
 * GET /api/chat/support (Compatibility route)
 */
router.get('/support', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'AttendEase AI Assistant is online & ready to help.',
    knowledgeLoaded: Boolean(knowledgeBaseText),
  });
});

export default router;
