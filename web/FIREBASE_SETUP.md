# Firebase Setup Guide

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter your project name (e.g., "argus-admissions")
4. Follow the setup wizard

## 2. Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Email/Password" authentication
5. Enable "Google" authentication (optional but recommended)
6. For Google auth, you'll need to configure OAuth consent screen

## 3. Create a Web App

1. In your Firebase project, click the gear icon next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (</>) to add a web app
5. Register your app with a nickname (e.g., "argus-admissions-web")
6. Copy the Firebase configuration object

## 4. Set Up Environment Variables

Create a `.env.local` file in the `web` directory with the following variables:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Server Configuration
NEXT_PUBLIC_SERVER_BASE_URL=http://localhost:3001
```

Replace the values with your actual Firebase configuration.

## 5. Enable Firestore Database

1. In your Firebase project, go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" for development
4. Select a location for your database
5. Click "Done"

## 6. Set Up Firestore Security Rules

In the Firestore Database section, go to "Rules" and update with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read and write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow reading applications (for staff)
    match /applications/{applicationId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == resource.data.studentId;
    }
  }
}
```

## 7. Test the Setup

1. Start your development server: `npm run dev`
2. Navigate to `http://localhost:3000/sign-up`
3. Try creating a new account
4. Check your Firestore database to see if the user profile was created

## Troubleshooting

- **"Firebase: Error (auth/api-key-not-valid)"**: Check your API key in `.env.local`
- **"Firebase: Error (auth/operation-not-allowed)"**: Enable Email/Password authentication in Firebase Console
- **"Firebase: Error (auth/unauthorized-domain)"**: Add your domain to authorized domains in Firebase Console

## Demo Account

For testing, you can create a demo account:
- Email: `demo@gmail.com`
- Password: `123456`

Make sure to create this account in your Firebase Authentication console. 