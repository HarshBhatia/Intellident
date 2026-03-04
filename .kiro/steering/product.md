# Product Overview

IntelliDent is a multi-tenant Dental Patient Management Platform designed for dental clinics to manage patient records, treatments, financials, and AI-assisted clinical notes.

## Core Features

- Patient record management with legacy and normalized clinical data
- Visit tracking and consultation records
- Financial management (payments and expenses)
- AI-powered audio-to-clinical-note conversion using Google Gemini
- Multi-tenant architecture with strict clinic-level data isolation
- Clerk-based authentication and authorization

## Applications

- **Dashboard**: Main web interface for clinic staff (Next.js)
- **Landing**: Marketing/public website
- **Mobile**: Patient-facing mobile app (Expo/React Native)

## Key Principles

- Strict multi-tenancy: All data is partitioned by `clinic_id`
- Security-first: Every query must filter by `clinic_id`
- Modern stack: React 19, Next.js 16, Tailwind CSS v4
