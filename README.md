## MongoDB & Prisma Setup

1. Ensure you have a MongoDB instance running. Update the `DATABASE_URL` in the `.env` file with your MongoDB connection string.

2. Install dependencies (from project root):
	```bash
	npm install
	cd backend
	npm install
	```

3. Initialize Prisma (already done):
	```bash
	npx prisma init --datasource-provider mongodb
	```

4. Edit your Prisma schema in `prisma/schema.prisma` to define your models.

5. Generate the Prisma client:
	```bash
	npx prisma generate
	```

6. Use the Prisma client in your backend code to interact with MongoDB.

7. Example test script: `backend/testPrisma.js`

For more details, see the [Prisma MongoDB docs](https://www.prisma.io/docs/orm/databases/mongodb).
# InfoCascade-app

Project goals:

1. To develop a campus navigation system that assists students in locating classrooms, laboratories, libraries, and offices using interactive maps.
2. To design a timetable management system with personalized schedules, class reminders, and real-time notifications for schedule changes.
3. To implement an AI-powered assistant using LLM and RAG for answering academic and campus-related queries accurately.

Quick start (local scaffold):

```bash
cd /home/kiranjeet-kour/Desktop/Projects/timeTableScrap
npm install
npx expo start --web
```

This README merges the existing repository description with the local Expo scaffold instructions.

## Backend Setup

1. Install dependencies (from project root):
	```bash
	npm install
	cd backend
	npm install
	```

2. Start the backend server:
	```bash
	node server.js
	```

3. The backend will run on [http://localhost:5000](http://localhost:5000) by default.

4. Test the health endpoint:
	[http://localhost:5000/health](http://localhost:5000/health)

### Backend Structure

- `backend/server.js`: Main Express server
- `backend/controllers/`: Controller logic (future expansion)
- `backend/routes/`: API route definitions (future expansion)
- `backend/models/`: Data models (future expansion)
