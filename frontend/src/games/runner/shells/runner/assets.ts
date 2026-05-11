const cardModules = import.meta.glob('../../assets/card-art/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});

export function resolveCardArt(word: string, fallback: string): string {
  const match = Object.entries(cardModules).find(([path]) => path.endsWith(`/${word}.svg`));
  return (match?.[1] as string | undefined) ?? fallback;
}
