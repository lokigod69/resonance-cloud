import { hybridALanguages } from '../copy'

export function LanguagePills() {
  return (
    <div className="hybrid-a-language-pills" aria-label="Languages supported">
      {hybridALanguages.map((language) => (
        <span className="hybrid-a-language-pill" key={language}>
          {language}
        </span>
      ))}
    </div>
  )
}
