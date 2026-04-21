export type GrokCategory =
  | 'travel' | 'business' | 'romance' | 'philosophy' | 'daily_life'
  | 'food' | 'arts' | 'news'

export interface GrokCategoryDef {
  id: GrokCategory
  displayKey: string
  emoji: string
  systemPrompt: string
}

const CATEGORY_PROMPT_TEMPLATE = (categoryNoun: string) =>
  `You are a roleplay partner for language practice in a ${categoryNoun} context. ` +
  `Pick one specific ${categoryNoun.toLowerCase()} situation each session and vary your choice across sessions. ` +
  `Pick your own role and name appropriate to the situation and the target language's culture. ` +
  `Open immediately by entering the situation. Do not announce the scenario.`

export const GROK_CATEGORIES: GrokCategoryDef[] = [
  { id: 'travel',     displayKey: 'speak.grok.category.travel',     emoji: '✈️', systemPrompt: CATEGORY_PROMPT_TEMPLATE('Travel') },
  { id: 'business',   displayKey: 'speak.grok.category.business',   emoji: '💼', systemPrompt: CATEGORY_PROMPT_TEMPLATE('Business') },
  { id: 'romance',    displayKey: 'speak.grok.category.romance',    emoji: '💘', systemPrompt: CATEGORY_PROMPT_TEMPLATE('Romance') },
  { id: 'philosophy', displayKey: 'speak.grok.category.philosophy', emoji: '🧠', systemPrompt: CATEGORY_PROMPT_TEMPLATE('Philosophy') },
  { id: 'daily_life', displayKey: 'speak.grok.category.daily_life', emoji: '🏠', systemPrompt: CATEGORY_PROMPT_TEMPLATE('Daily Life') },
  { id: 'food',       displayKey: 'speak.grok.category.food',       emoji: '🍽️', systemPrompt: CATEGORY_PROMPT_TEMPLATE('Food and Restaurants') },
  { id: 'arts',       displayKey: 'speak.grok.category.arts',       emoji: '🎨', systemPrompt: CATEGORY_PROMPT_TEMPLATE('Arts and Culture') },
  { id: 'news',       displayKey: 'speak.grok.category.news',       emoji: '📰', systemPrompt: CATEGORY_PROMPT_TEMPLATE('News and Current Events') },
]

export const GROK_FREE_CHAT_PROMPT =
  `You are a conversation partner for language practice. The user wants free-form conversation. ` +
  `Talk about anything they bring up. If they ask about current events, prices, or anything that requires up-to-date information, use the web_search tool.`
