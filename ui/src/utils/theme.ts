export const LOGO_KEY    = 'prism_custom_logo'
export const FAVICON_KEY = 'prism_custom_favicon'
export const BG_KEY      = 'prism_custom_bg'
export const AVATAR_KEY  = 'prism_custom_avatar'
export const NAME_KEY    = 'prism_custom_name'

/**
 * 获取带用户前缀的 Key，实现账号隔离
 */
export const uKey = (username: string | undefined, key: string) => 
  username ? `u_${username}_${key}` : key;

export function applyCustomSettings(username?: string) {
  const uk = (k: string) => uKey(username, k)
  
  // 1. Favicon 恢复/加载
  const fav = localStorage.getItem(uk(FAVICON_KEY)) || localStorage.getItem(FAVICON_KEY)
  let link = document.querySelector<HTMLLinkElement>('link[rel*="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'shortcut icon'
    document.head.appendChild(link)
  }
  link.href = fav || '/prism.svg'

  // 2. 背景 恢复/加载
  const bg = localStorage.getItem(uk(BG_KEY)) || localStorage.getItem(BG_KEY)
  const root = document.getElementById('root')
  if (bg && bg !== 'default' && bg !== '') {
    if (bg.startsWith('data:image') || bg.startsWith('http') || bg.startsWith('linear-gradient')) {
      document.body.style.background = bg.includes('gradient') ? bg : `url(${bg}) center/cover no-repeat fixed`
      if (root) {
        root.style.backdropFilter = 'blur(16px)'
        root.style.backgroundColor = 'rgba(8, 9, 15, 0.45)'
      }
    } else {
      document.body.style.background = bg
    }
  } else {
    // 深邃黑 (默认)
    document.body.style.background = '#08090f'
    if (root) {
      root.style.backdropFilter = 'none'
      root.style.backgroundColor = 'transparent'
    }
  }
}
