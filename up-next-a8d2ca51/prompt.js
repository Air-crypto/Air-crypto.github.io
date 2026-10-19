/* Review/copy only. This module does not send messages, open Canvas, or guess URLs. */
(function (root) {
  'use strict';
  const T = typeof module === 'object' && module.exports ? require('./time.js') : root.UpNextTime;
  const RESTRICTED = /\bno[\s-]+ai\b|\b(?:ai|artificial intelligence)\b.{0,60}\b(?:prohibited|not allowed|forbidden)\b|\b(?:do not|must not|may not|cannot|can't|can’t)\b.{0,40}\b(?:ai|artificial intelligence)\b/i;
  function restrictions(item, allItems = []) {
    return [...new Set([item, ...allItems.filter(i => item.course && i.course === item.course)]
      .flatMap(i => [i.note, i.desc]).filter(text => text && RESTRICTED.test(text)))];
  }
  function itemPrompt(i, allItems = []) {
    const rules = restrictions(i, allItems), source = i.url || i.email;
    const lines = [
      `Help me review this ${i.kind || 'schedule item'}.`,
      `Title: ${i.title}`, i.course && `Course: ${i.course}`,
      `Date: ${i.date} (America/Chicago)`, `Time: ${T.timeStr(i)}`,
      i.pts != null && `Points: ${i.pts}`, i.how && `Submit via: ${i.how}`,
      i.note && `Existing notes:\n${i.note}`, i.desc && `Existing details:\n${i.desc}`,
      source ? `Exact source URL (use this unchanged):\n${source}` : 'No exact item source URL is recorded. Ask me for it; do not guess a Canvas link.',
      i.url && i.email && `Existing email source URL:\n${i.email}`,
      i.courseUrl && `Existing course page URL (not a substitute for the item URL):\n${i.courseUrl}`,
      rules.length && `Course restrictions from the existing tracker:\n${rules.join('\n\n')}`,
      '',
      rules.length
        ? 'The existing course notes prohibit AI assistance. Do not draft, rewrite, translate, proofread, or generate a course response. Preserve those restrictions and help me understand the policy and plan my own work only.'
        : ['assignment', 'exam'].includes(i.kind)
          ? 'First check the exact source instructions and course AI rules. If permitted, help me plan the work and prepare a draft reply for my review, grounded in the readings and my own ideas. Ask for missing readings or ideas; do not invent them.'
          : 'Explain what I need to prepare and suggest next steps for my review.',
      'If this chat has access to my connected Mac, use it to read the exact source page in my existing session. Otherwise ask me to paste or attach the source. Do not claim to have opened a page you have not inspected.',
      'Do not submit, post, upload, send, or change anything in Canvas or another app. Keep any draft in this conversation for my review.'
    ];
    return lines.filter(v => v !== false && v != null).join('\n\n');
  }
  function mailPrompt(e) {
    return [`Help me review this existing email.`, `Subject: ${e.subject}`, `From: ${e.from}`,
      `Existing summary: ${e.summary}`, e.action && `Requested action: ${e.action}`,
      e.deadline && `Recorded deadline: ${e.deadline}`, e.url && `Exact source URL:\n${e.url}`,
      'Suggest next steps or a draft for my review. Do not send messages or change anything in another app.'
    ].filter(Boolean).join('\n\n');
  }
  const api = { itemPrompt, mailPrompt, restrictions };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.UpNextPrompt = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
