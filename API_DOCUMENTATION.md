# API Documentation

## Overview

The Project & Task Management System API is a RESTful service built with Express.js and MongoDB. It provides endpoints for managing projects, tasks, and AI-powered features.

## Base URL

- **Development**: `http://localhost:5000/api`
- **Production**: `https://your-domain.com/api`

## Authentication

Currently, the API does not implement authentication. All endpoints are publicly accessible. Future versions will include JWT-based authentication.

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "details": {
      // Additional error context
    }
  }
}
```

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid request data |
| 404 | Not Found - Resource not found |
| 422 | Unprocessable Entity - Validation error |
| 500 | Internal Server Error - Server error |
| 503 | Service Unavailable - External service error |

## Projects API

### List All Projects

**Endpoint**: `GET /api/projects`

**Description**: Retrieve all projects with their basic information and column configurations.

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Website Redesign",
      "description": "Complete redesign of company website",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "columns": [
        {
          "id": "todo",
          "title": "To Do",
          "order": 0
        },
        {
          "id": "inprogress",
          "title": "In Progress",
          "order": 1
        },
        {
          "id": "done",
          "title": "Done",
          "order": 2
        }
      ]
    }
  ]
}
```

### Create Project

**Endpoint**: `POST /api/projects`

**Description**: Create a new project with default columns.

**Request Body**:
```json
{
  "name": "New Project Name",
  "description": "Optional project description"
}
```

**Validation Rules**:
- `name`: Required, string, max 100 characters
- `description`: Optional, string, max 500 characters

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "New Project Name",
    "description": "Optional project description",
    "createdAt": "2024-01-15T11:00:00.000Z",
    "columns": [
      {
        "id": "todo",
        "title": "To Do",
        "order": 0
      },
      {
        "id": "inprogress",
        "title": "In Progress",
        "order": 1
      },
      {
        "id": "done",
        "title": "Done",
        "order": 2
      }
    ]
  }
}
```

### Get Project by ID

**Endpoint**: `GET /api/projects/:id`

**Description**: Retrieve a specific project by its ID.

**Parameters**:
- `id`: MongoDB ObjectId of the project

**Response**: Same as create project response

**Error Responses**:
- `404`: Project not found

### Update Project

**Endpoint**: `PUT /api/projects/:id`

**Description**: Update an existing project's name and description.

**Request Body**:
```json
{
  "name": "Updated Project Name",
  "description": "Updated description"
}
```

**Response**: Updated project object

### Delete Project

**Endpoint**: `DELETE /api/projects/:id`

**Description**: Delete a project and all its associated tasks.

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "Project and associated tasks deleted successfully"
  }
}
```

## Tasks API

### Get Project Tasks

**Endpoint**: `GET /api/projects/:projectId/tasks`

**Description**: Retrieve all tasks for a specific project, ordered by status and order field.

**Parameters**:
- `projectId`: MongoDB ObjectId of the project

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "projectId": "507f1f77bcf86cd799439011",
      "title": "Design homepage mockup",
      "description": "Create wireframes and mockups for the new homepage",
      "status": "todo",
      "order": 0,
      "createdAt": "2024-01-15T12:00:00.000Z",
      "updatedAt": "2024-01-15T12:00:00.000Z"
    }
  ]
}
```

### Create Task

**Endpoint**: `POST /api/projects/:projectId/tasks`

**Description**: Create a new task within a project.

**Request Body**:
```json
{
  "title": "Task Title",
  "description": "Optional task description",
  "status": "todo"
}
```

**Validation Rules**:
- `title`: Required, string, max 200 characters
- `description`: Optional, string, max 1000 characters
- `status`: Optional, enum ['todo', 'inprogress', 'done'], defaults to 'todo'

**Response**: Created task object

### Get Task by ID

**Endpoint**: `GET /api/tasks/:id`

**Description**: Retrieve a specific task by its ID.

**Response**: Task object with all fields

### Update Task

**Endpoint**: `PUT /api/tasks/:id`

**Description**: Update an existing task's properties.

**Request Body**:
```json
{
  "title": "Updated Task Title",
  "description": "Updated description",
  "status": "inprogress"
}
```

**Response**: Updated task object

### Delete Task

**Endpoint**: `DELETE /api/tasks/:id`

**Description**: Delete a specific task.

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "Task deleted successfully"
  }
}
```

### Reorder Tasks (Drag & Drop)

**Endpoint**: `PATCH /api/projects/:projectId/tasks/reorder`

**Description**: Update task order and status when moving tasks between columns or within columns.

**Request Body**:
```json
{
  "taskId": "507f1f77bcf86cd799439013",
  "sourceStatus": "todo",
  "destinationStatus": "inprogress",
  "sourceIndex": 0,
  "destinationIndex": 1
}
```

**Parameters**:
- `taskId`: ID of the task being moved
- `sourceStatus`: Original column/status
- `destinationStatus`: Target column/status
- `sourceIndex`: Original position in source column
- `destinationIndex`: Target position in destination column

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "Task reordered successfully",
    "updatedTasks": [
      // Array of tasks with updated order values
    ]
  }
}
```

## AI API

### Generate Project Summary

**Endpoint**: `POST /api/ai/summary`

**Description**: Generate an AI-powered summary of project progress and task distribution.

**Request Body**:
```json
{
  "projectId": "507f1f77bcf86cd799439011"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": "Your project has 8 tasks total: 3 in To Do, 2 in Progress, and 3 completed. Recent activity shows good momentum with 2 tasks completed this week. The project appears to be 60% complete based on task distribution.",
    "metadata": {
      "tokensUsed": 245,
      "costEstimate": "$0.003",
      "generatedAt": "2024-01-15T14:30:00.000Z",
      "projectId": "507f1f77bcf86cd799439011",
      "taskCount": 8
    }
  }
}
```

### Ask Question

**Endpoint**: `POST /api/ai/question`

**Description**: Ask a question about the project and get an AI-generated answer based on project context.

**Request Body**:
```json
{
  "question": "What tasks are currently blocking progress?",
  "projectId": "507f1f77bcf86cd799439011"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "answer": "Based on your project data, there are 2 tasks in the 'In Progress' column that might need attention: 'API Integration' and 'Database Setup'. These have been in progress for several days without recent updates.",
    "question": "What tasks are currently blocking progress?",
    "metadata": {
      "tokensUsed": 180,
      "costEstimate": "$0.002",
      "answeredAt": "2024-01-15T14:35:00.000Z",
      "projectId": "507f1f77bcf86cd799439011",
      "contextUsed": ["tasks", "project", "timeline"]
    }
  }
}
```

## Health Check API

### Health Check

**Endpoint**: `GET /api/health`

**Description**: Check the health status of the API server.

**Response**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T15:00:00.000Z",
    "uptime": 3600,
    "version": "1.0.0"
  }
}
```

### Detailed Health Check

**Endpoint**: `GET /api/health/detailed`

**Description**: Get detailed health information including database and external service status.

**Response**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T15:00:00.000Z",
    "uptime": 3600,
    "version": "1.0.0",
    "services": {
      "database": {
        "status": "connected",
        "responseTime": "15ms"
      },
      "geminiAI": {
        "status": "available",
        "responseTime": "250ms"
      }
    },
    "memory": {
      "used": "45MB",
      "total": "512MB"
    }
  }
}
```

## Error Handling

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Request validation failed | 400 |
| `RESOURCE_NOT_FOUND` | Requested resource not found | 404 |
| `DATABASE_ERROR` | Database operation failed | 500 |
| `AI_SERVICE_ERROR` | Gemini AI service error | 503 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |

### Example Error Response

```json
{
  "success": false,
  "error": {
    "message": "Project not found",
    "code": "RESOURCE_NOT_FOUND",
    "details": {
      "projectId": "507f1f77bcf86cd799439011",
      "timestamp": "2024-01-15T15:30:00.000Z"
    }
  }
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General endpoints**: 100 requests per 15 minutes per IP
- **AI endpoints**: 10 requests per minute per IP
- **Health check**: 60 requests per minute per IP

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642262400
```

## Pagination

Currently, the API does not implement pagination. All results are returned in a single response. Future versions will include pagination for large datasets.

## Versioning

The API currently does not use versioning. Future versions will implement semantic versioning in the URL path (e.g., `/api/v1/projects`).

## SDK and Client Libraries

Currently, no official SDKs are available. The frontend application serves as a reference implementation for API integration using Axios.

## Testing the API

### Using cURL

```bash
# Get all projects
curl -X GET http://localhost:5000/api/projects

# Create a project
curl -X POST http://localhost:5000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project","description":"A test project"}'

# Get project tasks
curl -X GET http://localhost:5000/api/projects/PROJECT_ID/tasks
```

### Using Postman

Import the API collection (if available) or manually create requests using the endpoints documented above.

## Support

For API-related questions or issues:
1. Check this documentation
2. Review the error response for details
3. Create an issue in the project repository
4. Ensure all required environment variables are configured