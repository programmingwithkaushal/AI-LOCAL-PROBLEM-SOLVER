# SolvIt Frontend

Frontend application for the SolvIt AI Problem Solver platform.

## Structure

```
frontend/
├── src/
│   ├── pages/          # HTML pages
│   │   ├── index.html  # Main application
│   │   └── login.html  # Login/Register page
│   ├── styles/         # CSS styles
│   │   └── style.css   # Main stylesheet
│   ├── utils/          # JavaScript utilities
│   │   └── app.js      # Main application logic
│   ├── components/     # Reusable components (future)
│   └── utils/          # Helper functions (future)
├── public/             # Static assets
│   └── uploads/        # User uploaded images
└── package.json        # Frontend configuration
```

## Development

Run the frontend development server:
```bash
npm run dev
```

This will start a local server on http://localhost:8080

## Features

- User authentication (login/register)
- Problem submission with AI-powered solutions
- Community browsing and voting
- Real-time chat functionality
- Image uploads for problem evidence
- Interactive maps for location tagging

## Technologies

- Vanilla JavaScript (ES6+)
- HTML5 with semantic markup
- CSS3 with modern features
- Leaflet.js for mapping
- Marked.js for markdown rendering
