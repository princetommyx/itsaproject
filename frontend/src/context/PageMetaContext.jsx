import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const PageMetaContext = createContext({ title: null, setTitle: () => {} })

/**
 * Lets a page hand its title up to the app bar.
 *
 * The bar is where "where am I" belongs — it is on screen at all times and is
 * otherwise carrying three icons. Every page used to print its own heading
 * instead, which left the bar empty and the answer scrolled off the top of a
 * long page.
 */
export function PageMetaProvider({ children }) {
  const [title, setTitle] = useState(null)
  const value = useMemo(() => ({ title, setTitle }), [title])

  return <PageMetaContext.Provider value={value}>{children}</PageMetaContext.Provider>
}

export function usePageMeta() {
  return useContext(PageMetaContext)
}

/**
 * Publish a title from a page. Cleared on unmount so a page that sets no
 * title doesn't inherit the last one's.
 */
export function usePublishTitle(title) {
  const { setTitle } = usePageMeta()

  useEffect(() => {
    if (title == null) return undefined

    setTitle(title)
    return () => setTitle(null)
  }, [title, setTitle])
}
