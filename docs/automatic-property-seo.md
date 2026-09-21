# Automatic property SEO

This branch prepares the next SEO automation without changing production.

## Safe design

1. Supabase remains the source of truth for properties.
2. Publishing a property should trigger a server-side automation.
3. The automation creates/updates a permanent crawlable property page and sitemap entry in GitHub.
4. Vercel then deploys the committed change.
5. Google discovers the URL from the sitemap and internal links; manual URL Inspection is optional.

## Security

GitHub write credentials must never be stored in browser code. They belong only in a protected server-side secret.

## Current limitation

The available project tooling can deploy Supabase Edge Functions but cannot safely create/manage the required GitHub secret from here. Do not deploy a half-configured function or database trigger. The live publishing flow should remain unchanged until the secret and end-to-end test are ready.

## Existing URLs

The 11 permanent property pages already deployed remain valid. Future automation must preserve stable URLs and update existing pages rather than create duplicates.
