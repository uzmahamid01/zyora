# Backend Server

## Quick Start

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Set Environment Variables:**
   Create a `.env` file with:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
   GCP_PROJECT_ID=your-project-id
   GCP_REGION=us-central1
   PORT=5000
   ```

3. **Start Server:**
   ```bash
   npm start
   ```

## Endpoints

- `GET /health` - Health check
- `POST /exchange-token` - Exchange Google token for Firebase token
- `POST /generate-look` - Generate AI look
- `GET /fetch-image` - Fetch image by URL

## Environment Variables

- `GOOGLE_APPLICATION_CREDENTIALS_JSON` - Firebase service account JSON
- `GCP_PROJECT_ID` - Google Cloud Project ID
- `GCP_REGION` - Google Cloud Region (default: us-central1)
- `PORT` - Server port (default: 5000)

## Troubleshooting

- **CORS errors**: Server allows Chrome extensions and localhost
- **Firebase errors**: Check GOOGLE_APPLICATION_CREDENTIALS_JSON
- **Token exchange fails**: Verify Google OAuth setup
