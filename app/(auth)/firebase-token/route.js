// app/api/auth/firebase-token/route.js
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import admin from 'firebase-admin';

// Check if Firebase Admin is already initialized
if (!admin.apps.length) {
  const serviceAccount = {
    projectId: "women-saftey-10c68",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://women-saftey-10c68-default-rtdb.firebaseio.com" // Check this URL
  });
}

export async function POST(request) {
  try {
    // Get current Clerk user
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create a custom token for Firebase
    const firebaseToken = await admin.auth().createCustomToken(userId);
    
    return NextResponse.json({ firebaseToken });
  } catch (error) {
    console.error('Error creating Firebase token:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message }, 
      { status: 500 }
    );
  }
}