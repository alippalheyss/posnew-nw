# Deploying to Vercel

## Prerequisites

- GitHub account
- Vercel account (sign up at [vercel.com](https://vercel.com))
- Supabase project set up and configured
- Code pushed to a GitHub repository

## Step 1: Push Your Code to GitHub

If you haven't already:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Add Supabase integration"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/your-username/your-repo-name.git
git branch -M main
git push -u origin main
```

## Step 2: Import Project to Vercel

1. Go to [vercel.com](https://vercel.com) and log in
2. Click "Add New..." > "Project"
3. Import your GitHub repository
4. Vercel will auto-detect it's a Vite project

## Step 3: Configure Build Settings

Vercel should auto-detect these, but verify:

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## Step 4: Add Environment Variables

In the "Environment Variables" section, add:

1. **VITE_SUPABASE_URL**
   - Value: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
   
2. **VITE_SUPABASE_ANON_KEY**
   - Value: Your Supabase anon/public key

**Important**: Add these for all environments (Production, Preview, Development)

## Step 5: Deploy

1. Click "Deploy"
2. Wait for the build to complete (~1-2 minutes)
3. Once deployed, you'll get a URL like: `https://your-project.vercel.app`

## Step 6: Test Your Deployment

1. Visit your Vercel URL
2. Try logging in with your admin credentials
3. Test all major features:
   - POS functionality
   - Adding products
   - Creating sales
   - Managing customers
   - Viewing reports

## Step 7: Configure Custom Domain (Optional)

1. Go to your project settings in Vercel
2. Click "Domains"
3. Add your custom domain
4. Follow Vercel's instructions to configure DNS

## Updating Your Deployment

Every time you push to your main branch, Vercel will automatically:
1. Build your project
2. Run tests (if configured)
3. Deploy the new version

For manual deployments:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

## Troubleshooting

### Build Fails

**Check build logs** in Vercel dashboard for specific errors.

Common issues:
- Missing dependencies: Make sure all packages are in `package.json`
- TypeScript errors: Fix any type errors before deploying
- Environment variables: Ensure they're set correctly

### App Loads But Features Don't Work

1. **Check browser console** for errors
2. **Verify environment variables** are set in Vercel
3. **Check Supabase RLS policies** - make sure they allow access
4. **Verify Supabase project** isn't paused (free tier)

### "Failed to fetch" Errors

- Check Supabase URL is correct in environment variables
- Verify Supabase project is active
- Check network tab in browser dev tools for specific errors

### Authentication Issues

- Verify Supabase anon key is correct
- Check that users exist in Supabase Authentication
- Ensure RLS policies are properly configured

## Performance Optimization

### Enable Caching

Vercel automatically caches static assets. For API responses:

1. Use Supabase's built-in caching
2. Implement client-side caching with React Query (already included)

### Enable Analytics

1. Go to your project in Vercel
2. Click "Analytics"
3. Enable Web Analytics to track performance

## Security Best Practices

1. **Never commit `.env.local`** to git (it's in `.gitignore`)
2. **Use environment variables** for all sensitive data
3. **Enable RLS** in Supabase (already done in schema)
4. **Regularly update dependencies**: `npm audit fix`
5. **Monitor Supabase logs** for suspicious activity

## Monitoring

### Vercel Dashboard
- Monitor deployments
- View build logs
- Check analytics
- Review error logs

### Supabase Dashboard
- Monitor database usage
- Check authentication logs
- Review API usage
- Set up alerts for errors

## Rollback

If something goes wrong:

1. Go to your project in Vercel
2. Click "Deployments"
3. Find a previous working deployment
4. Click "..." > "Promote to Production"

## Cost Considerations

### Vercel Free Tier Includes:
- Unlimited deployments
- 100 GB bandwidth/month
- Automatic HTTPS
- Preview deployments

### Supabase Free Tier Includes:
- 500 MB database
- 1 GB file storage
- 50,000 monthly active users
- 2 GB bandwidth

Both should be sufficient for small to medium applications.

## Next Steps

1. Set up continuous deployment
2. Configure custom domain
3. Enable analytics
4. Set up monitoring alerts
5. Create staging environment (optional)

---

**Congratulations!** Your MVPOS application is now live on Vercel! 🎉
