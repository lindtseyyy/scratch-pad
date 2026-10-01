import { useEffect, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useToast } from './ui/Toast'

const UPDATE_INTERVAL = 60 * 60 * 1000

export function PwaUpdater() {
  const toast = useToast()
  const registration = useRef<ServiceWorkerRegistration | undefined>(undefined)
  const lastChecked = useRef(0)
  const reloadRequested = useRef(false)
  const updateActivated = useRef(false)
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onNeedReload() {
      // Another tab may activate the worker; only this tab's Reload can discard its draft.
      updateActivated.current = true
      if (reloadRequested.current) window.location.reload()
    },
    onRegisteredSW(_url, next) {
      registration.current = next
      lastChecked.current = Date.now()
    },
    onRegisterError(error) {
      console.error('Scratch-Pad service worker could not register', error)
    },
  })

  useEffect(() => {
    if (!needRefresh) return
    toast('A new version is ready.', {
      persist: true,
      action: {
        label: 'Reload',
        onClick: () => {
          reloadRequested.current = true
          if (updateActivated.current) window.location.reload()
          else
            void updateServiceWorker(true).catch(() => {
              reloadRequested.current = false
              toast('The update could not load. Try Reload again.')
            })
        },
      },
    })
  }, [needRefresh, toast, updateServiceWorker])

  useEffect(() => {
    const check = () => {
      const current = registration.current
      if (
        document.visibilityState !== 'visible' ||
        !navigator.onLine ||
        !current ||
        current.installing ||
        Date.now() - lastChecked.current < UPDATE_INTERVAL
      )
        return
      lastChecked.current = Date.now()
      // A failed check leaves the current app and any typed input intact.
      void current.update().catch(() => {})
    }
    document.addEventListener('visibilitychange', check)
    return () => document.removeEventListener('visibilitychange', check)
  }, [])
  return null
}
