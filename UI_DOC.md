# UI/UX Style Document

## Overview
This document outlines the UI/UX styling principles derived from the "HealthySpace" dashboard reference image. The design is a modern, dark-themed dashboard with soft rounded corners and a distinct mint-green accent color.

## Color Palette
- **Background (App)**: `#121212` or `zinc-950` (Very dark, almost black)
- **Background (Cards/Panels)**: `#1E1E1E` or `zinc-900` (Slightly lighter to create depth)
- **Accent Color (Primary)**: `#6EE7B7` or `emerald-300` / `green-400` (Mint green for active states, buttons, icons, and badges)
- **Text (Primary)**: `#FFFFFF` or `zinc-50` (White for headings and main text)
- **Text (Secondary)**: `#A1A1AA` or `zinc-400` (Gray for subtext, dates, and secondary information)
- **Border/Divider**: `#27272A` or `zinc-800` (Subtle borders where necessary)

## Typography
- **Font Family**: Clean, modern Sans-serif (e.g., Inter or system default).
- **Headings**: Bold, bright white.
- **Body Text**: Regular weight, gray or white depending on importance.
- **Small Text**: Used for timestamps and metadata, usually in secondary gray.

## Shapes & Borders
- **Border Radius**: Generous rounded corners.
  - Cards/Panels: `rounded-2xl` or `rounded-3xl` (16px - 24px)
  - Buttons/Badges: `rounded-full` or `rounded-xl`
  - Avatars: `rounded-full`
- **Shadows**: Soft, subtle shadows or purely flat design relying on background color contrast for depth.
- **Borders**: Minimal usage. If used, very subtle (`border border-white/5` or `border-zinc-800`).

## Layout & Spacing
- **Padding**: Ample padding inside cards (`p-4` to `p-6`).
- **Gap**: Consistent spacing between elements (`gap-4` or `gap-6`).
- **Structure**: Dashboard-style layout with a sidebar (or side navigation) and a main content area with grid layouts for cards.

## Component Specifics
- **Buttons**:
  - Primary: Solid mint green background with dark text (e.g., `bg-green-400 text-black font-semibold rounded-full`).
  - Secondary/Outlined: Dark background with subtle border, or text-only.
- **Badges/Tags**: Small, rounded pills.
  - Active/New: Mint green background, dark text or green text on dark green background.
  - Default: Gray background, white text.
- **Icons**: Soft mint green or gray depending on active state.
- **Cards**: Dark gray background (`bg-zinc-900`), no prominent border, rounded corners.

## Aceternity UI Integration
We will leverage Aceternity UI components where applicable (e.g., for background effects, cards, or subtle animations) to enhance the modern feel while strictly adhering to this dark/mint-green theme.
