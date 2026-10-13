Scratch-Pad logo

svg/
  scratch-pad-icon.svg      App icon, vector (also works as favicon.svg)
  scratch-pad-lockup.svg    Icon + "Scratch-Pad" wordmark + tagline

png/
  scratch-pad-icon-*.png    Rounded app icon, transparent corners (32 to 1024 px)
  scratch-pad-maskable-*.png  Full-bleed square for the PWA manifest ("purpose": "maskable")
  apple-touch-icon.png      180 x 180, full-bleed (iOS rounds it itself)
  favicon.ico               16, 32, 48 px

Colors
  Matte pink (ground)  #C98F9C
  Mauve (rings, link)  #8A4E5E
  Paper                #F6ECE9
  Wordmark plum        #4E2833
  Tagline              #7A4D59

Font: Bricolage Grotesque (free, Google Fonts). The lockup SVG loads it from
Google Fonts; install the font if you open the SVG in a design tool offline.

PWA manifest snippet:
  "icons": [
    { "src": "/scratch-pad-icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/scratch-pad-icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/scratch-pad-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
