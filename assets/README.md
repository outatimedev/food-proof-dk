# Assets

Brand assets that ship with the app live here.

## Required before shipping

| File | Size | Notes |
|---|---|---|
| `icon.png` | 1024×1024 | App icon. Used by Expo to generate per-platform icons. No transparency on iOS. |
| `adaptive-icon.png` | 1024×1024 | Android foreground layer. Place glyph in central 66 % safe zone. |
| `splash.png` | 2208×2208 | Splash screen. White or `#FFFFFF` background recommended. |
| `favicon.png` | 48×48 | Web build. |

When adding these, also add the corresponding entries to `app.json`:

```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#FFFFFF"
    },
    "ios": { "icon": "./assets/icon.png" },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#C8102E"
      }
    },
    "web": { "favicon": "./assets/favicon.png" }
  }
}
```

## Versioned data

- `rules.v1.json` — Sundhedsstyrelsen / Nøglehullet thresholds, loaded at
  app startup. Bump the version string and create `rules.v2.json` rather
  than mutating in place; sessions in flight rely on the version number to
  remain meaningful.
