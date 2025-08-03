import React from "react"

export function useFetch<T = any>(url: string) {
  const [data, setData] = React.useState<T | undefined>(undefined)
  const [loading, setLoading] = React.useState<boolean>(false)
  const [error, setError] = React.useState<any>(null)

  React.useEffect(() => {
    let isMounted = true
    setLoading(true)
    setError(null)
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error("Network response was not ok")
        return res.json()
      })
      .then(json => {
        if (isMounted) setData(json)
      })
      .catch(err => {
        if (isMounted) setError(err)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [url])

  return { data, loading, error }
}
