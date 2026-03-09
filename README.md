# Billionaire & Company Profile Generator

A Next.js application that generates detailed, high-signal profiles of billionaires and companies using AI-powered analysis. The app focuses on tracing wealth creation timelines, identifying replicable patterns, and providing actionable insights.

## Features

- **AI-Powered Profiles**: Uses OpenRouter (GPT-4o) to generate detailed analyses
- **Money Trail Tracking**: Chronological wealth timeline from first venture to current net worth
- **Auto-FAQ**: Questions automatically answered with case-specific insights
- **Strict N/A Policy**: No generic filler - only factual information or explicit N/A
- **Profile Persistence**: Saves generated profiles to database for reuse
- **Tag-Based Filtering**: Filter companies by tags (YC, AI, India, etc.)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **AI**: OpenRouter API (configurable model)
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- OpenRouter API key

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd windsurf-project
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
OPENROUTER_API_KEY="your-openrouter-api-key"
OPENROUTER_MODEL="openai/gpt-4o"  # Optional, defaults to gpt-4o
```

4. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

5. Seed the database (optional):
```bash
npx tsx prisma/seed.ts
```

6. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Project Structure

```
├── app/
│   ├── api/serve/          # Profile generation API
│   ├── billionaires/       # Billionaire profiles UI
│   ├── companies/          # Company profiles UI
│   └── layout.tsx
├── lib/
│   ├── masterPrompt.ts     # AI generation prompt
│   ├── profileGenerator.ts # Fallback generator & normalization
│   ├── openrouter.ts       # OpenRouter API integration
│   └── prisma.ts           # Prisma client
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Database seeding
└── public/
```

## Key Sections in Profiles

- **Key Facts**: Hard data (net worth, age, country, industry)
- **Education**: Educational background and skill formation
- **When They Started**: Age, initial capital, early circumstances
- **Money Trail**: Chronological wealth timeline with specific events
- **Value Creation**: First profitable product/service and distribution
- **Core Advantage**: The unfair advantage that enabled success
- **Key Decisions**: Critical pivots and strategic moves
- **What to Learn**: Replicable patterns and insights
- **FAQ / Key Insights**: Auto-generated Q&A based on profile analysis

## Configuration

### Changing the AI Model

Set `OPENROUTER_MODEL` in your `.env` file:
```env
OPENROUTER_MODEL="google/gemma-3-12b-it:free"  # Free alternative
```

### Custom Master Prompt

You can override the default prompt via environment variable:
```env
MASTER_PROMPT="Your custom prompt here"
```

Or use a file:
```env
MASTER_PROMPT_FILE="/path/to/prompt.txt"
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms

Ensure your hosting platform supports:
- Node.js 18+
- PostgreSQL database
- Environment variables

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
