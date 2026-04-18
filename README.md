# Railway Ticket Booking Application

A full-stack railway ticket booking system with AI-powered booking via Model Context Protocol (MCP).

## Features

- **Web Interface**: Complete React-based frontend for manual booking
- **REST API**: Comprehensive backend APIs for train search, booking, and payments
- **AI Booking**: MCP server enabling AI assistants (like Claude) to book tickets
- **Payment Integration**: Razorpay UPI Collect for secure payments
- **Email Notifications**: Automated ticket confirmations
- **Real-time Search**: Live train data from Indian Railways

## Architecture

```
├── frontend/          # React application
├── backend/           # Node.js/Express API server
│   ├── models/        # MongoDB schemas
│   ├── routes/        # API endpoints
│   ├── services/      # Business logic
│   └── config/        # Configuration files
└── mcp-server/        # MCP server for AI booking
```

## Recent Changes (AI Booking Integration)

### 1. Booking Session Management
- Added `BookingSession` model for AI conversation state
- New API endpoints: `/api/booking-sessions/*`
- Maintains booking state during AI interactions

### 2. Payment Integration (UPI Collect)
- Modified payment flow to use Razorpay Payment Links
- Added webhook handler for automatic confirmation
- UPI collect requires user approval, no sensitive data stored

### 3. MCP Server
- New `/mcp-server/` directory with dedicated MCP tools
- API key authentication and rate limiting
- Tools: search-trains, check-availability, create-booking-session, initiate-payment, confirm-booking

### 4. Security & Production Ready
- Environment variables for all secrets
- Health check endpoint (`/health`)
- Proper CORS configuration
- Input validation and error handling

## Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Razorpay account (test mode)

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm start
```

### 2. MCP Server Setup
```bash
cd mcp-server
npm install
cp .env.example .env
# Edit .env with MCP configuration
npm start
```

### 3. Frontend Setup
```bash
cd ..
npm install
npm run dev
```

## Environment Variables

### Backend (.env)
```env
MONGO_URI=mongodb://localhost:27017/railway-db
JWT_SECRET=your-secret-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=your-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
MCP_API_KEY=your-mcp-key
FRONTEND_URL=http://localhost:5173
```

### MCP Server (.env)
```env
MCP_API_KEY=your-mcp-api-key
BACKEND_URL=http://localhost:5000
MCP_PORT=3001
```

## API Endpoints

### Web Booking Flow
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `GET /api/trains/live-search` - Search trains
- `POST /api/payment/create-order` - Create payment order
- `POST /api/payment/verify` - Verify payment and create ticket

### AI Booking Flow
- `POST /api/booking-sessions` - Create booking session
- `POST /api/payment/create-intent` - Create UPI collect intent
- `POST /api/payment/webhook` - Handle payment webhooks
- `POST /api/booking-sessions/:id/confirm` - Confirm booking

### MCP Tools
- `POST /mcp/search-trains` - Search trains
- `POST /mcp/check-availability` - Check seat availability
- `POST /mcp/create-booking-session` - Create booking session
- `POST /mcp/initiate-payment` - Initiate UPI payment
- `POST /mcp/confirm-booking` - Confirm booking

## Deployment

### Backend (Railway/Render)
```bash
npm install
npm start
```
- Set environment variables in hosting platform
- Database: MongoDB Atlas
- Port: Auto-assigned

### MCP Server (Separate Service)
```bash
npm install
npm start
```
- Deploy as separate service
- Configure API key authentication

### Frontend (Vercel/Netlify)
```bash
npm install
npm run build
```
- Static hosting with backend API calls

## Security Notes

- All payments require explicit user approval via UPI
- No sensitive payment data stored in application
- API key authentication for MCP server
- Rate limiting on AI booking requests
- Input validation on all endpoints

## Testing AI Booking

1. Start all services (backend, MCP server, frontend)
2. Use Claude or other MCP-compatible AI
3. Configure MCP server endpoint and API key
4. AI can now search trains, check availability, and book tickets

## Support

For issues related to AI booking integration, check:
1. MCP server logs
2. Backend payment webhook logs
3. Booking session status in database