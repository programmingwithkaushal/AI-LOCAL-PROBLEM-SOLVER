# SolvIt Backend

Backend API server for the SolvIt AI Problem Solver platform.

## Structure

```
backend/
├── src/
│   ├── controllers/        # Route controllers
│   │   ├── authController.js
│   │   ├── problemController.js
│   │   └── chatController.js
│   ├── middleware/         # Express middleware
│   │   └── auth.js
│   ├── routes/            # API route definitions
│   │   ├── auth.js
│   │   ├── problems.js
│   │   └── chat.js
│   ├── utils/             # Utility functions
│   │   ├── database.js
│   │   └── problemAnalyzer.js
│   └── app.js             # Express app configuration
├── data/                  # JSON data storage
│   ├── users.json
│   ├── problems.json
│   └── chat.json
├── server.js              # Server entry point
└── package.json           # Backend dependencies
```

## Development

Install dependencies:
```bash
npm install
```

Run the development server:
```bash
npm run dev
```

Or run in production:
```bash
npm start
```

The server will start on http://localhost:3000

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile

### Problems
- `GET /api/problems` - Get all problems
- `GET /api/problems/:id` - Get single problem
- `POST /api/problems` - Create new problem (with image upload)
- `POST /api/problems/:id/comments` - Add comment
- `POST /api/problems/:id/vote` - Vote for problem
- `PATCH /api/problems/:id/status` - Update problem status

### Chat
- `GET /api/chat` - Get recent messages
- `GET /api/chat/rooms` - Get available rooms
- `GET /api/chat/room/:room` - Get room messages
- `POST /api/chat` - Send message
- `DELETE /api/chat/:id` - Delete own message

## Features

- JWT-based authentication
- File upload handling for problem images
- AI-powered problem categorization and solution generation
- Real-time chat functionality
- JSON-based data storage
- Modular architecture with separation of concerns

## Technologies

- Node.js with Express.js
- JWT for authentication
- Multer for file uploads
- bcryptjs for password hashing
- JSON file-based storage
- Modular MVC architecture
