// Grok provider stub. Throws on invocation by design — forces a real design
// conversation when Grok lands instead of silent inheritance of another
// provider's rules.

const NOT_IMPLEMENTED = 'Grok provider not yet implemented. Design module in prompts/grok.ts before enabling.'

export function buildGrokSystemPrompt(): never {
  throw new Error(NOT_IMPLEMENTED)
}

export function buildGrokGreeting(): never {
  throw new Error(NOT_IMPLEMENTED)
}
