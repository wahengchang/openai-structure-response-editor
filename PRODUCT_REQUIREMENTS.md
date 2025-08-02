# Product Requirements: Prompt Maker

## Overview
A web-based template editor for creating, sharing, and managing structured prompts for AI models (OpenAI, GPT) with dynamic placeholders and instant sharing capabilities.

## Core Features

### Template Editor
- **Rich Text Editor**: Create prompts with dynamic placeholders `{{field_name}}`
- **Field Management**: Define input fields (text, textarea) with defaults
- **Live Preview**: Real-time preview of populated templates
- **Auto-save**: Persistent local storage of work-in-progress

### Sharing System
- **Instant Share**: Generate shareable URLs with encoded template data
- **No Authentication**: Zero-friction sharing without accounts
- **URL Import**: Load shared templates via `?data=` parameter
- **Cross-platform**: Works on any device with web browser

### Template Library
- **Pre-built Templates**: Curated collection of common prompt patterns
- **Categories**: Organized by use case (Prompt Rewrite, Seeking Answer)
- **One-click Load**: Import templates directly into editor

## Technical Requirements

### Frontend
- **Framework**: Vue.js 3 with Vue Router
- **Styling**: Tailwind CSS for responsive design
- **State Management**: Local storage for persistence
- **Build**: Static site deployment (no backend required)

### Data Handling
- **Encoding**: Base64 URL-safe encoding for share links
- **Storage**: Browser localStorage for drafts
- **Import/Export**: JSON-based template format

### User Experience
- **Responsive**: Mobile-first design
- **Dark Theme**: Modern dark UI
- **Toast Notifications**: User feedback for actions
- **Fast Loading**: CDN-based dependencies

## Success Metrics
- Template creation and sharing frequency
- Template library usage
- Cross-device sharing adoption
- User retention via localStorage usage

## Constraints
- Static hosting only (no server-side processing)
- Browser localStorage limitations
- URL length limits for sharing