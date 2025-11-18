# Lifeline Finder

Lifeline Finder is a small web application for connecting blood donors with seekers. It provides donor and seeker dashboards, user profiles, and blood request management.

This README covers what the project does, how to run it locally, and how to contribute.

## Features

- Donor and Seeker dashboards
- User authentication and profiles
- Create and manage blood requests
- Search and filter donors by blood group and location
- Notifications and request status tracking

## Tech stack

- React + TypeScript (Vite)
- Tailwind CSS + shadcn-ui
- Supabase (auth + database)

## Quick start (development)

Prerequisites:

- Node.js (v16+ recommended) and npm or pnpm
- A Supabase project (if you want full functionality)

Steps:

1. Install dependencies

```cmd
npm install
```

2. Create a `.env` file (copy from `.env.example` if present) and set your Supabase URL and anon key. Example env variables used by this project:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

3. Run the dev server

```cmd
npm run dev
```

4. Open http://localhost:5173 (or the port Vite shows)

Notes:

- If you don't configure Supabase, some pages (like auth-protected dashboards) will be limited or show placeholder content.

## Environment & Supabase

- The project reads Supabase config from `src/integrations/supabase/client.ts` and `supabase/config.toml` for migrations.
- To enable authentication and database features, create a Supabase project and update the env variables.

## Scripts

- `npm run dev` — start dev server
- `npm run build` — build for production
- `npm run preview` — locally preview the production build

## Contributing

1. Fork the repo and create a feature branch
2. Make changes and add tests where appropriate
3. Commit with clear messages: `git commit -m "feat: short description"`
4. Push to your fork and open a Pull Request

If you want me to help with a PR template or contribution guidelines, I can add those.

## Deployment

You can deploy the built app to static hosts like Vercel, Netlify, or a container on any cloud provider. Typical steps for Vercel/Netlify:

1. Connect your GitHub repo to the hosting provider
2. Set environment variables (Supabase URL / ANON KEY)
3. Use the build command `npm run build` and publish the `dist` / `build` output

## License

Specify your license here (e.g., MIT). If you want, I can add an `LICENSE` file.

## Contact

If you have questions or want help improving the project, open an issue or a PR.

---

Happy coding — and thanks for building something that helps save lives.
