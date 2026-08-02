# Firebase Configuration

This project is now connected to Firebase with the following configuration:

## Firebase Project Details
- **Project ID:** bcare-v2-app
- **Auth Domain:** bcare-v2-app.firebaseapp.com
- **Database URL:** https://bcare-v2-app-default-rtdb.firebaseio.com

## Environment Variables
All Firebase configuration is managed through environment variables for security:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL`

## Setup Instructions

### For Local Development
1. Copy `.env.local.example` to `.env.local`
2. Add your Firebase configuration values

### For Vercel Deployment
All environment variables have been configured in Vercel project settings.

## Last Updated
November 30, 2025 - Firebase integration completed
