import type { VercelRequest, VercelResponse } from '@vercel/node'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  const { action, email, instruction, emails } = req.body

  let systemPrompt = ''
  let userPrompt = ''

  switch (action) {
    case 'summarize':
      systemPrompt = `Tu es un assistant qui résume des emails de façon concise. Réponds en français. Donne un résumé en 2-3 phrases maximum. Si c'est un email commercial/newsletter, dis-le en une phrase.`
      userPrompt = `Résume cet email :\n\nDe: ${email.from}\nObjet: ${email.subject}\n\n${email.body}`
      break

    case 'draft_reply':
      systemPrompt = `Tu es Sofiane Coly, avocat au cabinet DAIRIA Avocats. Tu rédiges des réponses professionnelles mais naturelles en français. Tu utilises "Cordialement" pour conclure. Tu ne mets jamais de formule trop longue. Tu vas droit au but.`
      userPrompt = `Rédige une réponse à cet email.\n\nDe: ${email.from} <${email.fromEmail}>\nObjet: ${email.subject}\n\nContenu:\n${email.body}\n\n${instruction ? `Instructions : ${instruction}` : 'Rédige une réponse appropriée.'}`
      break

    case 'classify':
      systemPrompt = `Tu es un assistant qui trie des emails. Pour chaque email, donne une catégorie parmi : URGENT, A_REPONDRE, NEWSLETTER, NOTIFICATION, SPAM, INFO. Réponds UNIQUEMENT avec un JSON array.`
      userPrompt = `Classe ces emails :\n${emails.map((e: any, i: number) => `${i + 1}. De: ${e.from} | Objet: ${e.subject} | Extrait: ${e.snippet}`).join('\n')}\n\nRéponds avec un JSON array de la forme [{"id": "...", "category": "...", "reason": "..."}]`
      break

    case 'smart_compose':
      systemPrompt = `Tu es Sofiane Coly, avocat au cabinet DAIRIA Avocats. Tu rédiges des emails professionnels en français. Tu es concis et direct. Signature : Sofiane Coly.`
      userPrompt = `Rédige un email à partir de cette instruction : ${instruction}`
      break

    default:
      return res.status(400).json({ error: 'Unknown action' })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return res.status(response.status).json({ error })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ''

    return res.status(200).json({ text })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to call Claude API' })
  }
}
