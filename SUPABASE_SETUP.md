# Supabase Setup Instructions

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Fill in the project details:
   - **Name**: MVPOS (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the closest region to your users
5. Click "Create new project" and wait for it to initialize (~2 minutes)

## Step 2: Get Your API Credentials

1. Once your project is ready, go to **Settings** (gear icon in sidebar)
2. Click on **API** in the settings menu
3. Copy the following values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (a long string starting with `eyJ...`)

## Step 3: Run the Database Schema

1. In your Supabase project, go to the **SQL Editor** (in the sidebar)
2. Click "New Query"
3. Copy the entire contents of `supabase-schema.sql` from this project
4. Paste it into the SQL editor
5. Click "Run" or press `Ctrl+Enter`
6. You should see a success message: "MVPOS database schema created successfully!"

## Step 4: Configure Environment Variables

1. Open the `.env.local` file in your project root
2. Replace the placeholder values with your actual credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
3. Save the file

## Step 5: Create Your First Admin User

You have two options:

### Option A: Using Supabase Dashboard (Recommended)
1. Go to **Authentication** > **Users** in your Supabase dashboard
2. Click "Add user" > "Create new user"
3. Fill in:
   - **Email**: your-email@example.com
   - **Password**: Choose a strong password
   - **User Metadata** (click "Add field" for each):
     - `name_en`: "Administrator"
     - `name_dv`: "އެޑްމިނިސްޓްރޭޓަރ"
     - `role`: "admin"
     - `permissions`: `{"canAccessPOS":true,"canAccessProducts":true,"canAccessStock":true,"canAccessCustomers":true,"canAccessSales":true,"canAccessReports":true,"canAccessAdmin":true,"canEditProducts":true,"canDeleteProducts":true,"canEditCustomers":true,"canDeleteCustomers":true,"canMakeSales":true,"canMakeCreditSales":true,"canEditSales":true,"canDeleteSales":true,"canViewReports":true,"canExportData":true,"canManageUsers":true,"canEditSettings":true}`
4. Click "Create user"
5. Check "Auto Confirm User" if you don't want to verify email

### Option B: Using SQL
Run this in the SQL Editor (replace with your details):
```sql
-- Create admin user
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    uuid_generate_v4(),
    'authenticated',
    'authenticated',
    'admin@example.com',
    crypt('your-password-here', gen_salt('bf')),
    NOW(),
    '{"name_en":"Administrator","name_dv":"އެޑްމިނިސްޓްރޭޓަރ","role":"admin","permissions":{"canAccessPOS":true,"canAccessProducts":true,"canAccessStock":true,"canAccessCustomers":true,"canAccessSales":true,"canAccessReports":true,"canAccessAdmin":true,"canEditProducts":true,"canDeleteProducts":true,"canEditCustomers":true,"canDeleteCustomers":true,"canMakeSales":true,"canMakeCreditSales":true,"canEditSales":true,"canDeleteSales":true,"canViewReports":true,"canExportData":true,"canManageUsers":true,"canEditSettings":true}}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
);
```

## Step 6: Test the Connection

1. Restart your development server:
   ```bash
   npm run dev
   ```
2. Open your browser to `http://localhost:8080`
3. Try logging in with the admin credentials you created
4. If successful, you should see the POS interface!

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env.local` exists and has the correct values
- Restart your dev server after adding environment variables

### "Invalid API key"
- Double-check you copied the **anon/public** key, not the service_role key
- Make sure there are no extra spaces in the `.env.local` file

### "Failed to fetch"
- Check your Supabase project URL is correct
- Verify your project is not paused (free tier projects pause after inactivity)
- Check your internet connection

### Authentication errors
- Verify RLS policies are enabled (they should be from the schema)
- Check that the user was created successfully in Authentication > Users
- Try creating a new user through the Supabase dashboard

## Next Steps

Once everything is working:
1. You can migrate your existing localStorage data using the migration script (coming next)
2. Deploy to Vercel
3. Configure environment variables on Vercel
4. Test in production!
