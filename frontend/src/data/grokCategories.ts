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
  `For a new conversation, choose a specific situation, role and name. Enter the situation without announcing it. ` +
  `Follow the level's language mix throughout, including your opening.`

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
  `You are a conversation partner for ${targetLang} language practice. Follow the learner's interests and the level's language mix.`
