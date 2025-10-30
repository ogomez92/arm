# Accessibility Report Manager

A localized (English/Spanish) Svelte 5 application for managing accessibility reports with WCAG 2.2 criteria tracking.

## Features

- ✅ **Fully Accessible**: Keyboard navigation, screen reader support, high contrast mode
- 🌍 **Bilingual**: English and Spanish localization for all strings
- 📊 **WCAG 2.2 Criteria**: Complete list of all WCAG 2.2 success criteria
- 💾 **Local Storage**: All reports stored as JSON files for easy portability
- 📸 **Screenshot Support**: Embed screenshots with issues (stored as base64)
- 📋 **Export Options**: Download reports as JSON database or HTML
- 🎯 **Page Filtering**: Organize issues by page and filter views
- 📄 **Copy to Clipboard**: Copy issue details for pasting into Jira or other tools

## Getting Started

### Running the Development Server

```powershell
cd a11y-reporter
npm run dev
```

The app will be available at `http://localhost:5173`

### Building for Production

```powershell
npm run build
npm run preview
```

## Usage

### Creating a New Report

1. Click "Create New Report"
2. Enter a report name
3. Start adding issues

### Uploading an Existing Report

1. Click "Upload Report"
2. Select a previously saved `.json` report file

### Adding Issues

1. Click "Add New Issue"
2. Fill in the required fields:
   - **Page**: Select existing page or create new one
   - **WCAG Criterion**: Select from WCAG 2.2 criteria
   - **Issue Title**: Brief title describing the issue
   - **Issue Description**: Detailed description (multiline)
   - **Issue Location**: Text description of where the issue is found
   - **Screenshot**: Optional image upload
   - **Notes and Solutions**: Recommendations and notes (multiline)

### Filtering Issues

Use the page filter dropdown to view:
- All pages
- Specific page issues

### Copying Issues

Click the 📋 icon on any issue to copy its details to the clipboard in a human-readable format suitable for Jira tickets.

### Downloading Reports

- **Download Database**: Saves the report as a JSON file you can reload later
- **Download HTML Report**: Creates a standalone HTML file with all issues and embedded screenshots

## Accessibility Features

### Keyboard Navigation
- Tab through all interactive elements
- Enter/Space to activate buttons
- Arrow keys for dropdowns and selections

### Screen Reader Support
- Proper ARIA labels and roles
- Live region announcements for dynamic content
- Descriptive form labels with required/optional indicators

### Visual Accessibility
- WCAG AA contrast ratios (4.5:1 for text)
- Focus indicators with 3px outline
- Responsive design for all screen sizes
- Support for high contrast mode
- Respects reduced motion preferences

## Data Storage

Reports are stored as JSON files with the following structure:

```json
{
  "id": "uuid",
  "name": "Report Name",
  "pages": ["Homepage", "Settings", "..."],
  "issues": [
    {
      "id": "uuid",
      "page": "Homepage",
      "criterionNumber": "1.1.1",
      "title": "Missing alt text",
      "description": "Images lack alternative text",
      "location": "Header logo",
      "screenshot": "data:image/png;base64,...",
      "notes": "Add descriptive alt text",
      "createdAt": "ISO date",
      "updatedAt": "ISO date"
    }
  ],
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

## Technology Stack

- **Svelte 5**: Latest Svelte with runes syntax
- **TypeScript**: Full type safety
- **SvelteKit**: Server-side rendering framework
- **Vite**: Fast build tool
- **WCAG 2.2**: Complete success criteria data

## File Structure

```
a11y-reporter/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── Announcer.svelte      # Screen reader announcements
│   │   │   ├── IssueForm.svelte      # Add/Edit issue form
│   │   │   └── IssuesTable.svelte    # Issues data table
│   │   ├── i18n/
│   │   │   ├── index.ts              # i18n utilities
│   │   │   └── translations.ts       # English/Spanish strings
│   │   ├── services/
│   │   │   ├── clipboard.ts          # Copy to clipboard
│   │   │   ├── html-export.ts        # HTML report generation
│   │   │   ├── screenshot.ts         # Image processing
│   │   │   └── storage.ts            # Report CRUD operations
│   │   ├── types.ts                  # TypeScript interfaces
│   │   └── wcag-criteria.ts          # WCAG 2.2 data
│   ├── routes/
│   │   ├── +layout.svelte            # Layout wrapper
│   │   └── +page.svelte              # Main page
│   ├── App.svelte                    # Main application component
│   ├── app.css                       # Global accessible styles
│   └── app.html                      # HTML template
└── package.json
```

## License

This project is created for accessibility specialists to track and report accessibility issues.
