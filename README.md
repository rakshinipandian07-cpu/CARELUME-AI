# CareLume AI 🏥

**AI-Powered Fertility Clinic Management Platform**

CareLume AI is a web-based clinic management platform designed to simplify routine fertility clinic operations. It helps clinic staff manage patient records, appointments, required documents, and support requests while providing AI-powered assistance for routine patient queries.

## ✨ Features

- **Patient Management** — Maintain patient profiles and treatment-stage information.
- **Appointment Management** — Manage appointment schedules and patient booking requests.
- **Document Tracking** — Track required documents and their submission status.
- **AI Assistant** — Answer routine questions using available clinic records.
- **Role-Based Access** — Separate staff and patient access to authorized information.
- **Support Tickets** — Allow patients to raise queries and clinic staff to manage and resolve them.
- **Secure Patient Activation** — Support invitation-based account activation and password creation.
- **Human Handover** — Route medical advice requests and uncertain questions to clinic staff.
- **Responsive Interface** — Access the platform through a modern web interface.

## 🛠️ Tech Stack

**Frontend**
- React
- Vite
- JavaScript
- CSS

**Backend**
- Node.js
- Express.js
- MongoDB
- Mongoose
- JSON Web Tokens (JWT)

**Additional Services**
- Cloudinary for file management
- Email and notification services, depending on configuration

## 📁 Project Structure

```text
CARELUME-AI/
├── client/          # React + Vite frontend
├── server/          # Express backend
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── seed/
│   ├── services/
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── .gitignore
└── README.md
```

## 🚀 Getting Started

### Prerequisites

Install the following:
- Node.js and npm
- MongoDB Atlas account or a local MongoDB instance
- Git

### 1. Clone the repository

```bash
git clone https://github.com/rakshinipandian07-cpu/CARELUME-AI.git
cd CARELUME-AI
```

### 2. Configure the backend

```bash
cd server
npm install
```

Create a `.env` file using `.env.example` and configure the required environment variables.

Typical configuration includes:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_strong_secret
CLIENT_URL=http://localhost:5173
```

Add Cloudinary or email service variables if required by your configuration. Never commit actual credentials.

### 3. Start the backend

```bash
npm run dev
```

The API is expected to run at:

`http://localhost:5000`

### 4. Configure the frontend

Open a new terminal:

```bash
cd client
npm install
```

Configure the frontend API URL using the environment variable expected by the existing application.

For example, if the project uses `VITE_API_URL`:

```env
VITE_API_URL=http://localhost:5000
```

### 5. Start the frontend

```bash
npm run dev
```

Open the local URL shown by Vite, typically:

`http://localhost:5173`

## 🔐 Security

- Authentication is handled through the application's configured authentication system.
- Patient records and support tickets should be accessible only to authorized users.
- Passwords and secrets must not be committed to version control.
- Private patient documents should remain protected by server-side authorization.
- Medical advice requests should be handled by qualified clinic staff rather than answered as a diagnosis by the AI assistant.

Use fictional data for demonstrations and testing.

## 🧪 Testing

Run the frontend production build:

```bash
cd client
npm run build
```

Run backend tests using the test command defined in `server/package.json`, if configured.

## 🎯 Project Goal

CareLume AI aims to reduce repetitive administrative work in fertility clinics, improve access to routine clinic information, and help staff spend more time supporting patients.

## 👨‍💻 Development

Contributions and suggestions are welcome. For local development, configure environment variables, use authorized demo accounts, and avoid uploading real patient information.

## 📄 License

A license has not yet been specified for this repository.
