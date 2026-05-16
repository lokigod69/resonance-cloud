import { useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'

export function useFerrariTitle(title: string) {
  const { setTitle } = useOutletContext<{ setTitle: (title: string) => void }>()

  useEffect(() => {
    setTitle(title)
  }, [title, setTitle])
}
