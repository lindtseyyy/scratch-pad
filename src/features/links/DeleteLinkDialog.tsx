import { useState } from 'react'
import { Button, InlineError, Modal } from '../../components/ui/primitives'
import { useToast } from '../../components/ui/Toast'
import { errorMessage } from '../../lib/errors'
import { useDeleteLink } from './hooks'
import type { SavedLink } from './api'
export function DeleteLinkDialog({ link, onClose }: { link: SavedLink; onClose: () => void }) {
  const mutation = useDeleteLink()
  const [error, setError] = useState('')
  const toast = useToast()
  return (
    <Modal
      variant="sheet"
      title="Delete this link?"
      description={`“${link.title}” will be removed from your library. Its tags will be kept.`}
      onClose={() => {
        if (!mutation.isPending) onClose()
      }}
    >
      {error && <InlineError>{error}</InlineError>}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" data-autofocus onClick={onClose} disabled={mutation.isPending}>
          Keep link
        </Button>
        <Button
          variant="danger"
          disabled={mutation.isPending}
          onClick={async () => {
            try {
              await mutation.mutateAsync(link.id)
              toast('Link deleted.')
              onClose()
            } catch (error) {
              setError(errorMessage(error))
            }
          }}
        >
          {mutation.isPending ? 'Deleting…' : 'Delete link'}
        </Button>
      </div>
    </Modal>
  )
}
