import { useState, useEffect } from 'react'

export function useHashRoute(defaultRoute = 'dashboard') {
  const [route, setRoute] = useState(() => {
    const hash = window.location.hash.replace('#', '')
    return hash || defaultRoute
  })

  useEffect(() => {
    function handleHashChange() {
      const hash = window.location.hash.replace('#', '')
      setRoute(hash || defaultRoute)
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [defaultRoute])

  function navigate(newRoute) {
    window.location.hash = newRoute
  }

  return { route, navigate }
}
