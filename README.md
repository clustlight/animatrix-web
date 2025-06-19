# Animatrix Web

Animatrix Web is a web application for browsing and playing ABM archives. 

## Project Structure

```
├── app/                # Application source code
│   ├── components/     # React components (player, UI, etc.)
│   ├── lib/            # Utility libraries (API config, etc.)
│   └── routes/         # Route components (home, series, episode)
├── public/             # Static assets (config.json, etc.)
├── build/              # Production build output
├── package.json
├── tailwind.config.js
└── README.md
```

## Configuration

API base URL and other settings are loaded from `public/config.json`.  
Edit this file to point to your backend API.
