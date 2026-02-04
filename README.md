# IntelliDent

IntelliDent is a modern Dental Patient Management Platform designed for dental clinics to manage patient records, treatments, financials, and more.

## Features

- **Patient Records**: Manage and view all clinic patients with ease.
- **Odontogram**: Visual dental chart for tracking procedures.
- **Financials**: Track earnings, expenses, and net profit with intuitive charts.
- **Expense Tracking**: Categorize and log clinic expenses.
- **Clinic Profile**: Customize clinic information and settings.
- **Dark Mode**: Fully supported dark mode for better user experience.
- **PWA Support**: Add to Home Screen support for mobile devices.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database (Neon/Netlify Neon recommended)

### Environment Variables

Create a `.env` file in the root directory and add the following:

```env
DATABASE_URL=your_postgresql_url
```

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/HarshBhatia/Intellident.git
   cd intellident2
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## Tech Stack

- **Framework**: Next.js 15
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL (Neon)
- **Charts**: Recharts
- **Components**: React 19

## License

This project is private and intended for clinic use.