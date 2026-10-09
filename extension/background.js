import { APP_URL, shareUrl } from './share-url.js'

const open = (url) =>
  chrome.windows.create({ url, type: 'popup', width: 480, height: 720, focused: true })

export function installMenus() {
  // Menus survive background restarts; replace them on installation or update.
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'link',
      title: 'Save link to Scratch-Pad',
      contexts: ['link'],
    })
    chrome.contextMenus.create({
      id: 'page',
      title: 'Save page to Scratch-Pad',
      contexts: ['page'],
    })
    chrome.contextMenus.create({
      id: 'selection',
      title: 'Save link in selection',
      contexts: ['selection'],
    })
    chrome.contextMenus.create({ id: 'library', title: 'Open Scratch-Pad', contexts: ['action'] })
  })
}

export function savePage(tab) {
  return open(shareUrl({ url: tab?.url, title: tab?.title }))
}

export function handleContextMenu(info, tab) {
  if (info.menuItemId === 'link') return open(shareUrl({ url: info.linkUrl, title: info.linkText }))
  if (info.menuItemId === 'page') return savePage(tab)
  if (info.menuItemId === 'selection') return open(shareUrl({ text: info.selectionText }))
  if (info.menuItemId === 'library') return chrome.tabs.create({ url: APP_URL })
}

chrome.runtime.onInstalled.addListener(installMenus)
chrome.action.onClicked.addListener(savePage)
chrome.contextMenus.onClicked.addListener(handleContextMenu)
