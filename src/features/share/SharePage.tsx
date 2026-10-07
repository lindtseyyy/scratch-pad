import { Navigate, useLocation } from 'react-router-dom'
import { parseShare } from '../../lib/share'

export function SharePage() {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  return (
    <Navigate
      to="/"
      replace
      state={{ share: parseShare(params), popup: params.get('popup') === '1' }}
    />
  )
}
