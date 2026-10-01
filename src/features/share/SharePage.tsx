import { Navigate, useLocation } from 'react-router-dom'
import { parseShare } from '../../lib/share'

export function SharePage() {
  const { search } = useLocation()
  return <Navigate to="/" replace state={{ share: parseShare(new URLSearchParams(search)) }} />
}
