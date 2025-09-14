# Tender - Multi-User Setup Guide

This guide will help you set up Tender with real user accounts, authentication, and database functionality using Supabase.

## Prerequisites

1. A Supabase account (free at [supabase.com](https://supabase.com))
2. Node.js and npm installed

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `tender-yacht-crew`
   - **Database Password**: Choose a strong password
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for the project to be created (2-3 minutes)

## Step 2: Get Supabase Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

## Step 3: Set Up Environment Variables

1. Create a `.env.local` file in your project root:
```bash
cp .env.example .env.local
```

2. Edit `.env.local` and replace the placeholder values:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 4: Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste the entire contents of `supabase-schema.sql`
4. Click "Run" to execute the SQL

This will create:
- `profiles` table for user profiles
- `photos` table for profile photos
- `matches` table for user matches
- `messages` table for chat messages
- Row Level Security policies
- Automatic profile creation trigger

## Step 5: Configure Authentication

1. In Supabase dashboard, go to **Authentication** → **Settings**
2. Under **Site URL**, add: `http://localhost:3000`
3. Under **Redirect URLs**, add: `http://localhost:3000/**`
4. Save changes

## Step 6: Install Dependencies and Run

```bash
npm install
npm run dev
```

## Step 7: Test the Application

1. Open `http://localhost:3000`
2. Click "Sign Up" to create a new account
3. Complete your profile setup
4. Start swiping and matching with other users!

## Features Now Available

### ✅ User Authentication
- Sign up with email/password
- Sign in/out functionality
- Automatic profile creation

### ✅ Profile Management
- Complete profile setup flow
- Add languages, certifications, interests
- Bio and availability information

### ✅ Real Matching System
- Swipe on real user profiles
- Persistent matches stored in database
- Match notifications

### ✅ Real-time Chat
- Chat with matched users
- Message history persistence
- Real-time message updates

### ✅ Data Persistence
- All user data stored in Supabase
- Photos can be uploaded to Supabase Storage
- Matches and messages persist between sessions

## Next Steps

### Add Photo Upload
1. Enable Supabase Storage in your dashboard
2. Create a storage bucket called `profile-photos`
3. Update the photo upload functionality

### Add Real-time Features
1. Enable real-time subscriptions for chat
2. Add online/offline status
3. Add typing indicators

### Add Advanced Features
1. Push notifications for matches/messages
2. Advanced matching algorithms
3. Profile verification system
4. Reporting and blocking features

## Troubleshooting

### Common Issues

1. **"Invalid API key" error**
   - Check your `.env.local` file has the correct Supabase URL and key
   - Make sure there are no extra spaces or quotes

2. **"Row Level Security" errors**
   - Make sure you ran the SQL schema file completely
   - Check that RLS policies are enabled

3. **Authentication not working**
   - Verify Site URL and Redirect URLs in Supabase settings
   - Check browser console for errors

4. **Database connection issues**
   - Verify your Supabase project is active
   - Check your internet connection
   - Try refreshing the Supabase dashboard

### Getting Help

- Check the [Supabase Documentation](https://supabase.com/docs)
- Join the [Supabase Discord](https://discord.supabase.com)
- Check the browser console for detailed error messages

## Production Deployment

When ready to deploy:

1. Update environment variables with production Supabase project
2. Update Site URL and Redirect URLs in Supabase settings
3. Deploy to Vercel, Netlify, or your preferred platform
4. Set up custom domain if needed

Your Tender app is now ready for real users! 🚀
