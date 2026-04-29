export type GrokCategory =
  | 'travel' | 'business' | 'romance' | 'philosophy' | 'daily_life'
  | 'food' | 'arts' | 'news'

export interface GrokCategoryDef {
  id: GrokCategory
  displayKey: string
  emoji: string
  systemPrompt: (targetLang: string) => string
}

const CATEGORY_PROMPT_TEMPLATE = (categoryNoun: string, targetLang: string) =>
  `You are a roleplay partner for ${targetLang} language practice in a ${categoryNoun} context. ` +
  `Pick one specific ${categoryNoun.toLowerCase()} situation each session and vary your choice across sessions. ` +
  `Pick your own role and name appropriate to the situation. The character you play speaks ${targetLang} as the primary language of this conversation, even if the student opens or replies in their native language at first. ` +
  `Open immediately by entering the situation in ${targetLang}. Do not announce the scenario.`

export const GROK_CATEGORIES: GrokCategoryDef[] = [
  { id: 'travel',     displayKey: 'speak.grok.category.travel',     emoji: '✈️', systemPrompt: (tl) => CATEGORY_PROMPT_TEMPLATE('Travel', tl) },
  { id: 'business',   displayKey: 'speak.grok.category.business',   emoji: '💼', systemPrompt: (tl) => CATEGORY_PROMPT_TEMPLATE('Business', tl) },
  { id: 'romance',    displayKey: 'speak.grok.category.romance',    emoji: '💘', systemPrompt: (tl) => CATEGORY_PROMPT_TEMPLATE('Romance', tl) },
  { id: 'philosophy', displayKey: 'speak.grok.category.philosophy', emoji: '🧠', systemPrompt: (tl) => CATEGORY_PROMPT_TEMPLATE('Philosophy', tl) },
  { id: 'daily_life', displayKey: 'speak.grok.category.daily_life', emoji: '🏠', systemPrompt: (tl) => CATEGORY_PROMPT_TEMPLATE('Daily Life', tl) },
  { id: 'food',       displayKey: 'speak.grok.category.food',       emoji: '🍽️', systemPrompt: (tl) => CATEGORY_PROMPT_TEMPLATE('Food and Restaurants', tl) },
  { id: 'arts',       displayKey: 'speak.grok.category.arts',       emoji: '🎨', systemPrompt: (tl) => CATEGORY_PROMPT_TEMPLATE('Arts and Culture', tl) },
  { id: 'news',       displayKey: 'speak.grok.category.news',       emoji: '📰', systemPrompt: (tl) => CATEGORY_PROMPT_TEMPLATE('News and Current Events', tl) },
]

export const GROK_FREE_CHAT_PROMPT = (targetLang: string) =>
  `You are a conversation partner for ${targetLang} language practice. The user wants free-form conversation. ` +
  `Talk about anything they bring up, following the language mix the level instructions specify. ` +
  `If they ask about current events, prices, or anything that requires up-to-date information, use the web_search tool.`
