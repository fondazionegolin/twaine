# twAIne Backend Server

Backend API server for the twAIne interactive story platform.

## Prerequisites

- Node.js 18+ 
- MongoDB (local or cloud like MongoDB Atlas)

## Setup

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/twaine
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/twaine

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# JWT Expiration
JWT_EXPIRES_IN=7d

# Server Port
PORT=3001

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Node Environment
NODE_ENV=development
```

### 3. Start MongoDB

If using local MongoDB:

```bash
# macOS with Homebrew
brew services start mongodb-community

# Or run directly
mongod --dbpath /path/to/data/db
```

### 4. Run the Server

Development mode (with hot reload):
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/refresh` | Refresh JWT token |
| PUT | `/api/auth/password` | Change password |

### Stories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stories` | Get all user stories |
| GET | `/api/stories/:id` | Get single story |
| POST | `/api/stories` | Create new story |
| PUT | `/api/stories/:id` | Update story |
| DELETE | `/api/stories/:id` | Delete story |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |

## Authentication

All story endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Rate Limiting

- General: 100 requests per 15 minutes per IP
- Auth endpoints: 20 requests per 15 minutes per IP

## MongoDB Setup Options

### Option 1: Local MongoDB

Install MongoDB Community Edition:

```bash
# macOS
brew tap mongodb/brew
brew install mongodb-community

# Start service
brew services start mongodb-community
```

### Option 2: MongoDB Atlas (Cloud)

1. Create free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a cluster
3. Get connection string and add to `.env`

### Option 3: Docker

```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

## Project Structure

```
server/
├── src/
│   ├── config/
│   │   └── database.ts      # MongoDB connection
│   ├── middleware/
│   │   └── auth.ts          # JWT authentication
│   ├── models/
│   │   ├── User.ts          # User model
│   │   └── Story.ts         # Story model
│   ├── routes/
│   │   ├── auth.ts          # Auth routes
│   │   └── stories.ts       # Story routes
│   └── index.ts             # Server entry point
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```
