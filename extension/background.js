import { APP_URL, shareUrl } from './share-url.js'

const open = (url) =>
  chrome.windows.create({ url, type: 'popup', width: 480, height: 720, focused: true })

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'link', title: 'Save link to Scratch-Pad', contexts: ['link'] })
  chrome.contextMenus.create({ id: 'page', title: 'Save page to Scratch-Pad', contexts: ['page'] })
  chrome.contextMenus.create({
    id: 'selection',
    title: 'Save link in selection',
    contexts: ['selection'],
  })
  chrome.contextMenus.create({ id: 'library', title: 'Open Scratch-Pad', contexts: ['action'] })
})

chrome.action.onClicked.addListener((tab) => open(shareUrl({ url: tab.url, title: tab.title })))

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'link') open(shareUrl({ url: info.linkUrl, title: info.linkText }))
  if (info.menuItemId === 'page') open(shareUrl({ url: tab?.url, title: tab?.title }))
  if (info.menuItemId === 'selection') open(shareUrl({ text: info.selectionText }))
  if (info.menuItemId === 'library') chrome.tabs.create({ url: APP_URL })
})
