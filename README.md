# Project & Task Management System

A modern, full-stack web application built with the MERN stack, featuring an intuitive Kanban-style interface and AI-powered task analysis using Google's Gemini AI. This system provides comprehensive project and task management capabilities with intelligent insights and seamless user experience across all devices.

## 🚀 Features

### Core Functionality
- **Project Management**: Create, edit, and delete projects with descriptions and metadata
- **Kanban Board Interface**: Visual task management with customizable columns
- **Drag & Drop**: Intuitive task organization between different status columns
- **Task Management**: Full CRUD operations for tasks with rich descriptions
- **Real-time Updates**: Optimistic UI updates with error rollback

### AI-Powered Features
- **Project Summarization**: AI-generated insights about project progress and status
- **Intelligent Q&A**: Ask questions about your projects and get contextual answers
- **Cost Tracking**: Monitor AI API usage and cost estimation
- **Context-Aware Responses**: AI understands your project structure and task relationships

### User Experience
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Loading States**: Smooth loading indicators for all async operations
- **Form Validation**: Real-time validation with helpful error messages
- **Toast Notifications**: Non-intrusive success and error notifications

## 🛠 Tech Stack

### Frontend
- **React.js 18** - Modern React with hooks and functional components
- **React Router 6** - Client-side routing and navigation
- **@hello-pangea/dnd** - Drag and drop functionality
- **Axios** - HTTP client for API communication
- **React Hot Toast** - Toast notifications
- **CSS Modules** - Scoped styling

### Backend
- **Node.js** - JavaScript runtime environment
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database for data persistence
- **Mongoose** - MongoDB object modeling
- **Google Gemini AI** - AI integration for intelligent features
- **Express Rate Limit** - API rate limiting
- **Helmet** - Security middleware

### Development & Testing
- **Jest** - Unit and integration testing
- **Cypress** - End-to-end testing
- **Supertest** - API testing
- **MongoDB Memory Server** - In-memory database for testing
- **Concurrently** - Parallel development servers

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** - Package manager (comes with Node.js)
- **MongoDB** - Either local installation or MongoDB Atlas account
- **Google Gemini API Key** - [Get your API key](https://makersuite.google.com/app/apikey)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd project-task-management-system
```

2. **Install dependencies for all packages**
```bash
npm run install-deps
```
This command installs dependencies for the root, backend, and frontend packages.

3. **Set up environment variables**

**Backend Environment:**
```bash
cp backend/.env.example backend/.env
```
Edit `backend/.env` with your configuration:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/task-management
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/task-management

GEMINI_API_KEY=your_gemini_api_key_here
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

**Frontend Environment:**
```bash
cp frontend/.env.example frontend/.env
```
Edit `frontend/.env` if needed:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

4. **Start the development servers**
```bash
npm run dev
```

This starts both servers concurrently:
- Backend API: http://localhost:5000
- Frontend App: http://localhost:3000

### Alternative Setup Methods

**Start servers individually:**
```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend  
npm run client
```

**Using Docker (if available):**
```bash
docker-compose up -d
```

### 📋 Available Scripts

#### Development
- `npm run dev` - Start both frontend and backend in development mode
- `npm run server` - Start only the backend server (port 5000)
- `npm run client` - Start only the frontend development server (port 3000)
- `npm run install-deps` - Install dependencies for all packages

#### Testing
- `npm run test` - Run all tests (frontend and backend)
- `npm run test:frontend` - Run frontend tests only
- `npm run test:backend` - Run backend tests only
- `npm run test:e2e` - Run Cypress end-to-end tests
- `npm run test:e2e:open` - Open Cypress test runner

#### Production
- `npm run build` - Build frontend for production
- `npm run start:prod` - Start production server
- `npm run deploy` - Deploy to production (if configured)

#### Utilities
- `npm run lint` - Run ESLint on all code
- `npm run format` - Format code with Prettier
- `npm run health-check` - Check backend server health

## Project Structure

```
project-task-management-system/
├── frontend/                 # React frontend application
│   ├── public/              # Static files
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   ├── pages/          # Page-level components
│   │   ├── api/            # API service functions
│   │   └── utils/          # Utility functions
│   └── package.json
├── backend/                 # Express backend application
│   ├── routes/             # API route handlers
│   ├── models/             # Mongoose schemas
│   ├── services/           # Business logic layer
│   ├── middleware/         # Express middleware
│   ├── tests/              # Backend tests
│   └── package.json
└── package.json            # Root package.json for development scripts
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `5000` | No |
| `MONGODB_URI` | MongoDB connection string | - | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | - | Yes |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` | No |
| `NODE_ENV` | Environment mode | `development` | No |
| `JWT_SECRET` | JWT signing secret (if auth added) | - | No |

#### Frontend (.env)
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `REACT_APP_API_URL` | Backend API URL | `http://localhost:5000/api` | No |
| `REACT_APP_ENV` | Environment mode | `development` | No |

### MongoDB Setup

#### Local MongoDB
1. Install MongoDB Community Edition
2. Start MongoDB service:
```bash
# macOS (with Homebrew)
brew services start mongodb-community

# Linux (systemd)
sudo systemctl start mongod

# Windows
net start MongoDB
```

#### MongoDB Atlas (Cloud)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get connection string from "Connect" → "Connect your application"
4. Add to `MONGODB_URI` in backend/.env

### Google Gemini API Setup
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add to `GEMINI_API_KEY` in backend/.env

## 📚 API Documentation

### Base URL
- Development: `http://localhost:5000/api`
- Production: `https://your-domain.com/api`

### Authentication
Currently, the API doesn't require authentication. All endpoints are publicly accessible.

### Projects API

#### Get All Projects
```http
GET /api/projects
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "project_id",
      "name": "Project Name",
      "description": "Project description",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "columns": [
        { "id": "todo", "title": "To Do", "order": 0 },
        { "id": "inprogress", "title": "In Progress", "order": 1 },
        { "id": "done", "title": "Done", "order": 2 }
      ]
    }
  ]
}
```

#### Create Project
```http
POST /api/projects
Content-Type: application/json

{
  "name": "New Project",
  "description": "Project description (optional)"
}
```

#### Get Project by ID
```http
GET /api/projects/:id
```

#### Update Project
```http
PUT /api/projects/:id
Content-Type: application/json

{
  "name": "Updated Project Name",
  "description": "Updated description"
}
```

#### Delete Project
```http
DELETE /api/projects/:id
```

### Tasks API

#### Get Project Tasks
```http
GET /api/projects/:projectId/tasks
```

#### Create Task
```http
POST /api/projects/:projectId/tasks
Content-Type: application/json

{
  "title": "Task Title",
  "description": "Task description (optional)",
  "status": "todo"
}
```

#### Get Task by ID
```http
GET /api/tasks/:id
```

#### Update Task
```http
PUT /api/tasks/:id
Content-Type: application/json

{
  "title": "Updated Task Title",
  "description": "Updated description",
  "status": "inprogress"
}
```

#### Delete Task
```http
DELETE /api/tasks/:id
```

#### Reorder Tasks (Drag & Drop)
```http
PATCH /api/projects/:projectId/tasks/reorder
Content-Type: application/json

{
  "taskId": "task_id",
  "sourceStatus": "todo",
  "destinationStatus": "inprogress",
  "sourceIndex": 0,
  "destinationIndex": 1
}
```

### AI API

#### Generate Project Summary
```http
POST /api/ai/summary
Content-Type: application/json

{
  "projectId": "project_id"
}
```

#### Ask Question
```http
POST /api/ai/question
Content-Type: application/json

{
  "question": "What tasks are in progress?",
  "projectId": "project_id"
}
```

### Health Check
```http
GET /api/health
```

### Error Responses
All endpoints return errors in this format:
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

## 🚀 Deployment

### Frontend Deployment (Vercel/Netlify)

#### Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Build the frontend: `cd frontend && npm run build`
3. Deploy: `vercel --prod`

#### Netlify
1. Build the frontend: `cd frontend && npm run build`
2. Deploy the `frontend/build` folder to Netlify

### Backend Deployment (Railway/Render/Heroku)

#### Railway
1. Install Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Deploy: `railway up`

#### Render
1. Connect your GitHub repository
2. Set build command: `cd backend && npm install`
3. Set start command: `cd backend && npm start`

#### Environment Variables for Production
Set these in your deployment platform:
```env
NODE_ENV=production
MONGODB_URI=your_production_mongodb_uri
GEMINI_API_KEY=your_gemini_api_key
FRONTEND_URL=https://your-frontend-domain.com
PORT=5000
```

### Database Setup for Production
1. Use MongoDB Atlas for production database
2. Configure IP whitelist and database users
3. Use connection string with authentication

## 🧪 Testing

### Running Tests

#### Unit Tests
```bash
# All tests
npm run test

# Frontend tests only
cd frontend && npm test

# Backend tests only
cd backend && npm test
```

#### End-to-End Tests
```bash
# Run E2E tests (requires servers to be running)
npm run test:e2e

# Open Cypress test runner
npm run test:e2e:open
```

### Test Coverage
- Frontend: Jest + React Testing Library
- Backend: Jest + Supertest
- E2E: Cypress
- Target coverage: 80%+ for critical paths

## 🔧 Development

### Project Structure
```
project-task-management-system/
├── frontend/                 # React frontend application
│   ├── public/              # Static files and index.html
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   │   ├── AiAssistant.js
│   │   │   ├── Column.js
│   │   │   ├── TaskCard.js
│   │   │   └── TaskModal.js
│   │   ├── pages/          # Page-level components
│   │   │   ├── ProjectList.js
│   │   │   └── ProjectBoard.js
│   │   ├── api/            # API service functions
│   │   ├── utils/          # Utility functions
│   │   └── App.js          # Main application component
│   ├── cypress/            # E2E tests
│   └── package.json
├── backend/                 # Express backend application
│   ├── routes/             # API route handlers
│   ├── models/             # Mongoose schemas
│   │   ├── Project.js
│   │   └── Task.js
│   ├── services/           # Business logic layer
│   │   └── AIService.js
│   ├── middleware/         # Express middleware
│   ├── tests/              # Backend tests
│   └── server.js           # Main server file
├── scripts/                # Deployment and utility scripts
└── package.json            # Root package.json for development scripts
```

### Code Style and Standards
- **ESLint** - Code linting and style enforcement
- **Prettier** - Code formatting
- **Conventional Commits** - Commit message format
- **Component Structure** - Functional components with hooks
- **Error Handling** - Comprehensive error boundaries and validation

### Adding New Features
1. Create feature branch: `git checkout -b feature/feature-name`
2. Implement frontend components in `frontend/src/components/`
3. Add API endpoints in `backend/routes/`
4. Write tests for new functionality
5. Update documentation
6. Submit pull request

## 🐛 Troubleshooting

### Common Issues

#### MongoDB Connection Issues
```bash
# Check if MongoDB is running
mongosh --eval "db.adminCommand('ismaster')"

# For Atlas, verify connection string and IP whitelist
```

#### Gemini API Issues
```bash
# Verify API key is set
echo $GEMINI_API_KEY

# Check API quota and billing in Google Cloud Console
```

#### Port Already in Use
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

#### CORS Issues
- Ensure `FRONTEND_URL` is set correctly in backend/.env
- Check that frontend is making requests to correct API URL

### Getting Help
- Check the [Issues](link-to-issues) page for known problems
- Review the [API Documentation](#api-documentation) for endpoint details
- Ensure all environment variables are properly configured

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section above
- Review the API documentation

## 🎯 Roadmap

- [ ] User authentication and authorization
- [ ] Real-time collaboration with WebSockets
- [ ] Advanced AI features (task suggestions, deadline predictions)
- [ ] Mobile app development
- [ ] Integration with external tools (Slack, GitHub, etc.)
- [ ] Advanced reporting and analytics