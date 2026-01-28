# Creating Your First Admin User in Supabase

Since you've set up Supabase and the database schema is running, you need to create your first admin user. Here's how:

## Method 1: Using Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard
2. Click on **Authentication** in the left sidebar
3. Click on **Users**
4. Click **Add user** button (top right)
5. Select **Create new user**
6. Fill in the form:
   - **Email**: Use your email (this will be your username)
   - **Password**: Choose a strong password
   - **Auto Confirm User**: ✅ Check this box (so you don't need to verify email)

7. Click **User Metadata** section to expand it
8. Add the following metadata fields (click "+ Add field" for each):

   | Key | Value |
   |-----|-------|
   | `name_en` | `Administrator` |
   | `name_dv` | `އެޑްމިނިސްޓްރޭޓަރ` |
   | `role` | `admin` |
   | `permissions` | Copy the JSON below ⬇️ |

   **Permissions JSON** (copy this exactly):
   ```json
   {"canAccessPOS":true,"canAccessProducts":true,"canAccessStock":true,"canAccessCustomers":true,"canAccessSales":true,"canAccessReports":true,"canAccessAdmin":true,"canEditProducts":true,"canDeleteProducts":true,"canEditCustomers":true,"canDeleteCustomers":true,"canMakeSales":true,"canMakeCreditSales":true,"canEditSales":true,"canDeleteSales":true,"canViewReports":true,"canExportData":true,"canManageUsers":true,"canEditSettings":true}
   ```

9. Click **Create user**

## Method 2: Using SQL Editor

1. Go to **SQL Editor** in your Supabase dashboard
2. Click **New Query**
3. Paste this SQL (replace with your email and password):

```sql
-- Create admin user
SELECT auth.create_user(
  jsonb_build_object(
    'email', 'your-email@example.com',
    'password', 'your-password-here',
    'email_confirm', true,
    'user_metadata', jsonb_build_object(
      'name_en', 'Administrator',
      'name_dv', 'އެޑްމިނިސްޓްރޭޓަރ',
      'role', 'admin',
      'permissions', '{"canAccessPOS":true,"canAccessProducts":true,"canAccessStock":true,"canAccessCustomers":true,"canAccessSales":true,"canAccessReports":true,"canAccessAdmin":true,"canEditProducts":true,"canDeleteProducts":true,"canEditCustomers":true,"canDeleteCustomers":true,"canMakeSales":true,"canMakeCreditSales":true,"canEditSales":true,"canDeleteSales":true,"canViewReports":true,"canExportData":true,"canManageUsers":true,"canEditSettings":true}'::jsonb
    )
  )
);
```

4. Click **Run** or press `Ctrl+Enter`

## Verify User Was Created

1. Go to **Authentication** > **Users**
2. You should see your new user in the list
3. Check that the user has:
   - ✅ Email confirmed
   - ✅ User metadata with role and permissions

## Login to Your App

1. Go to http://localhost:8080
2. Enter your credentials:
   - **Username**: The email you used
   - **Password**: The password you set
3. Click **Login**

## Troubleshooting

### "Invalid credentials" error
- Double-check your email and password
- Make sure the user was created successfully in Supabase
- Check that "Auto Confirm User" was enabled

### User created but can't login
- Verify the user has `is_active = true` in the users table
- Check that the trigger created the user in the `public.users` table:
  ```sql
  SELECT * FROM public.users;
  ```
- If the user is not in the `public.users` table, the trigger might not have fired. Manually insert:
  ```sql
  INSERT INTO public.users (id, username, name_en, name_dv, role, permissions, is_active)
  SELECT 
    id,
    email,
    'Administrator',
    'އެޑްމިނިސްޓްރޭޓަރ',
    'admin',
    '{"canAccessPOS":true,"canAccessProducts":true,"canAccessStock":true,"canAccessCustomers":true,"canAccessSales":true,"canAccessReports":true,"canAccessAdmin":true,"canEditProducts":true,"canDeleteProducts":true,"canEditCustomers":true,"canDeleteCustomers":true,"canMakeSales":true,"canMakeCreditSales":true,"canEditSales":true,"canDeleteSales":true,"canViewReports":true,"canExportData":true,"canManageUsers":true,"canEditSettings":true}'::jsonb,
    true
  FROM auth.users
  WHERE email = 'your-email@example.com';
  ```

### Still having issues?
- Check browser console for errors (F12)
- Verify your `.env.local` has the correct Supabase URL and key
- Make sure you restarted the dev server after adding credentials
- Check Supabase logs in the dashboard for any errors
