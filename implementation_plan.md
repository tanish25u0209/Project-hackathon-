# Project-Based File Storage Implementation Plan

## Goal
Transform the standalone file storage into a multi-tenant, project-based system where users can create projects, invite members, and collaboratively manage files (upload, edit, delete). Files will track who uploaded them and when, and projects will be strictly isolated to their members.

## User Context
The user stated: "the chatbot is already built i want it as it is just remove the login and registration fromit and keep it as a page". This means the main website *needs* its own authentication system to support the RBAC (Role-Based Access Control) requested for the project/file storage features.

## Proposed Changes

### 1. Database Schema (`research_backend/src/db/migrations/001_init_rbac.sql`)
We need to create the following relational tables in PostgreSQL:
- **`users`**: id, username, password_hash, created_at
- **`projects`**: id, name, created_by (user_id), created_at
- **`project_members`**: project_id, user_id, role ('owner', 'member')
- **`project_files`**: id, project_id, google_file_id, file_name, size, uploaded_by (user_id), uploaded_at

### 2. Backend Orchestration (`research_backend`)
- Add **Authentication Middleware**: JWT generation and parsing on API routes.
- **`POST /auth/register` & `/auth/login`**: Simple auth endpoints.
- **`GET /projects`**: List projects the user is a member of.
- **`POST /projects`**: Create a new project (auto-adds creator to `project_members` as owner).
- **`POST /projects/:id/members`**: Invite a new user by username to the project.
- **`GET /projects/:id/files`**: List all files for the project.
- **`POST /projects/:id/files`**: Link a Google Drive file ID (returned by `storage` service) to the project.
- **`DELETE /projects/:id/files/:fileId`**: Remove file from the project.

### 3. Website Frontend Updates (`website`)
- **Login/Register Page**: Replace the default entry route with an auth gateway.
- **Projects Dashboard**: The new home upon login. Users can see their projects or create a new one.
- **Project Detail Page**: Replaces the generic [StoragePage.jsx](file:///d:/Projects/New%20folder%20%282%29/website/src/pages/StoragePage.jsx). It will have:
  - **Members Tab**: List of members, input to invite new users.
  - **Files Tab**: Drag-and-drop uploader. Table of files showing name, size, uploader name, and timestamp.
- **Storage Fixing**: The "X Error" is likely due to expired Google OAuth refresh tokens in the `storage` microservice's [.env](file:///d:/Projects/New%20folder%20%282%29/storage/.env). We will adjust the auth methodology or verify the keys in `storage` so drops succeed.

## Verification Plan
1. **Database Check**: Run `node src/db/migrate.js` to ensure the new tables are created without errors.
2. **Auth Flow**: Perform a visual test in the browser to register and login.
3. **RBAC Isolation Check**: Create Project A with User 1. Note the ID. Login as User 2 and attempt to directly access `/api/v1/projects/<ID>/files`. Verify the server rejects the request with a 403 Forbidden.
4. **Member Invitation Test**: User 1 invites User 2. Verify User 2 now sees Project A on their dashboard.
5. **Upload Test**: User 2 uploads a file to Project A. Check the UI to ensure the file lists "User 2" and the current timestamp correctly. Ensure no API errors occur with the storage backend running on port 8000.
