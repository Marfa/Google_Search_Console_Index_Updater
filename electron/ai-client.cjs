function normalizeBaseUrl(baseUrl) {
  if (typeof baseUrl !== 'string' || !baseUrl.trim()) {
    throw new Error('AI base URL is required');
  }
  return baseUrl.trim().replace(/\/+$/, '');
}

function assertAllowedAiBaseUrl(baseUrl) {
  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error('AI base URL is invalid');
  }

  if (url.protocol === 'https:') {
    return;
  }

  if (
    url.protocol === 'http:' &&
    (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
  ) {
    return;
  }

  throw new Error('AI base URL must use https (or http://localhost)');
}

function buildSystemPrompt(locale) {
  const language = locale === 'en' ? 'English' : 'Russian';
  return [
    'You are an SEO analyst. Analyze only the Search Console baseline JSON provided by the user.',
    'Tie every major recommendation to exact numbers from the baseline.',
    'Label each point as FACT (from data) or HYPOTHESIS (inference).',
    'Prioritize by business impact (clicks first, then impressions/CTR/position).',
    'Do not invent pages, queries, or metrics that are not in the baseline.',
    'Do not suggest changing Google Search Console settings you cannot verify from the data.',
    `Respond in ${language}.`,
    'Use markdown with sections: Summary, Top issues, Opportunities, Validation.',
  ].join(' ');
}

async function analyzeAuditBaseline({
  baseUrl,
  apiKey,
  model,
  baseline,
  locale = 'ru',
}) {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  assertAllowedAiBaseUrl(normalizedBase);

  if (!apiKey || !String(apiKey).trim()) {
    throw new Error('AI API key is required');
  }

  if (!model || !String(model).trim()) {
    throw new Error('AI model is required');
  }

  const endpoint = `${normalizedBase}/chat/completions`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${String(apiKey).trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: String(model).trim(),
      temperature: 0.2,
      messages: [
        { role: 'system', content: buildSystemPrompt(locale) },
        {
          role: 'user',
          content: `Search Console baseline JSON:\n${JSON.stringify(baseline)}`,
        },
      ],
    }),
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    const message = extractAiErrorMessage(data, response.status);
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('AI response did not include text content');
  }

  return content.trim();
}

function extractAiErrorMessage(data, status) {
  const err = data?.error;
  if (typeof err === 'string' && err.trim()) {
    return err.trim();
  }
  if (err && typeof err === 'object') {
    const parts = [err.message, err.code, err.type].filter(
      (part) => typeof part === 'string' && part.trim()
    );
    if (parts.length > 0) {
      return parts.join(' · ');
    }
  }
  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message.trim();
  }
  if (typeof data?.raw === 'string' && data.raw.trim()) {
    return data.raw.trim().slice(0, 300);
  }
  return `AI HTTP ${status}`;
}

module.exports = {
  normalizeBaseUrl,
  assertAllowedAiBaseUrl,
  analyzeAuditBaseline,
  buildSystemPrompt,
  extractAiErrorMessage,
};
