# IELTS Speaking Practice - Frontend

Next.js frontend with Tailwind CSS for the IELTS Speaking Practice platform.

## Setup

1. Install dependencies:
```bash
npm install
# or
yarn install
```

2. Create `.env.local` file:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id-here
```

**Note:** Google Sign-In is optional. If `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is not set, the Google Sign-In button will be hidden. To enable it:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Set application type to "Web application"
6. Add authorized JavaScript origins: `http://localhost:3000` (and your production domain)
7. Add authorized redirect URIs: `http://localhost:3000` (and your production domain)
8. Copy the Client ID and paste it in `.env.local` as `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

3. Run the development server:
```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- Homepage with progress tracking
- Practice by question (Part 1, 2, 3)
- Mock test functionality
- User authentication
- Progress tracking and streaks
- Activity calendar

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Axios for API calls
- Zustand for state management

