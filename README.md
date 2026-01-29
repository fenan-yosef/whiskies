# Whisky Inventory Management Application

A professional full-stack whisky inventory management application built with Next.js 16, React 19, and MySQL. Features a clean admin interface with search, filtering, pagination, and complete CRUD operations.

## Features

- ✅ **Browse & Search**: Real-time search across whisky name, distillery, region, and description
- ✅ **Create**: Add new whiskies with comprehensive form validation
- ✅ **Update**: Edit existing whisky records with modal form
- ✅ **Delete**: Remove whiskies with confirmation dialog
- ✅ **Pagination**: Navigate through large datasets efficiently (10 items per page)
- ✅ **Responsive Design**: Mobile-first design with Tailwind CSS v4
- ✅ **Error Handling**: Graceful fallback to mock data when database is unavailable
- ✅ **Professional UI**: Fixed sidebar navigation, data tables, stats cards

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **Database**: MySQL 2 (local instance)
- **API**: Next.js Route Handlers
- **Data Fetching**: SWR for client-side caching
- **Icons**: react-icons

## Prerequisites

- Node.js 18+ and npm
- MySQL Server running locally (127.0.0.1:3306)
- Default MySQL user: `root` with no password (or configure via environment variables)

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Database Connection

Create a `.env.local` file in the project root:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your MySQL connection details:

```env
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=
DB_NAME=whisky_scraper
```

### 3. Initialize the Database

Run the initialization script to create the database and table:

```bash
node scripts/init_db.js
```

You should see:
```
[v0] Connecting to MySQL server...
[v0] Creating database if it does not exist...
[v0] ✓ Database created or already exists
[v0] Creating whiskies table...
[v0] ✓ Whiskies table created or already exists
[v0] ✓ Database initialization completed successfully!
```

### 4. Start the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Usage

### Dashboard

The main dashboard displays:
- **Stats Cards**: Total items, total pages, and current page
- **Search Bar**: Real-time search with 500ms debounce
- **Data Table**: Responsive table with whisky records
- **Pagination**: Navigate through pages efficiently
- **Refresh Button**: Manually refresh data

### Add Whisky

Click the "Add Whisky" button to open the modal form:
- Fill in required fields (Name, Price, Distillery, Region)
- Add optional details (Volume, ABV, Age, Cask Type, Description, etc.)
- Click "Save Whisky" to submit

### Edit Whisky

Click the edit (pencil) icon on any whisky row to open the edit modal:
- Modify any field
- Click "Save Whisky" to update

### Delete Whisky

Click the delete (trash) icon on any whisky row:
- Confirm deletion in the alert dialog
- The record will be removed

### Search

Type in the search bar to filter whiskies by:
- Name
- Distillery
- Region
- Description

Results update automatically with 500ms debounce.

## Database Schema

```sql
CREATE TABLE whiskies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    price VARCHAR(32),
    url VARCHAR(512),
    image_url VARCHAR(512),
    image_data LONGBLOB,
    volume VARCHAR(32),
    abv VARCHAR(32),
    description TEXT,
    distillery VARCHAR(128),
    region VARCHAR(128),
    age VARCHAR(32),
    cask_type VARCHAR(128),
    tasting_notes TEXT,
    source VARCHAR(32),
    month VARCHAR(16),
    scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_url_source (url, source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## Mock Data Fallback

If the MySQL database is unavailable (connection refused), the application automatically:
- Switches to mock data mode
- Displays an amber warning banner
- Continues to provide full CRUD functionality with in-memory storage
- Logs database errors to the console

This ensures the application remains functional even if the database is down.

## API Routes

### GET /api/whiskies
Fetch whiskies with pagination and search

**Query Parameters:**
- `search` (optional): Search term
- `page` (optional): Page number (default: 1)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "total": 100,
  "page": 1,
  "totalPages": 10,
  "usingMockData": false,
  "error": null
}
```

### POST /api/whiskies
Create a new whisky record

**Request Body:**
```json
{
  "name": "Glenmorangie The Original",
  "price": "$45.99",
  "distillery": "Glenmorangie",
  "region": "Highlands",
  ...
}
```

### PUT /api/whiskies
Update an existing whisky record

**Request Body:**
```json
{
  "id": 1,
  "name": "Updated Name",
  ...
}
```

### DELETE /api/whiskies
Delete a whisky record

**Query Parameters:**
- `id` (required): Whisky ID to delete

## Project Structure

```
.
├── app/
│   ├── api/
│   │   └── whiskies/
│   │       └── route.ts          # API routes for CRUD operations
│   ├── layout.tsx                # Root layout with Toaster
│   ├── page.tsx                  # Main dashboard page
│   └── globals.css               # Global styles
├── components/
│   ├── Sidebar.tsx               # Fixed sidebar navigation
│   ├── SearchBar.tsx             # Search input component
│   ├── WhiskyModal.tsx           # Add/Edit modal form
│   ├── WhiskyTable.tsx           # Data table component
│   ├── PaginationComponent.tsx    # Pagination controls
│   └── ui/                       # shadcn/ui components
├── lib/
│   ├── db.ts                     # MySQL connection pool
│   ├── mockData.ts               # Mock data and fallback logic
│   └── utils.ts                  # Utility functions
├── scripts/
│   └── init_db.js                # Database initialization script
├── .env.local.example            # Environment variables template
├── package.json
├── tsconfig.json
└── next.config.mjs
```

## Troubleshooting

### Database Connection Error

**Problem**: "Database connection failed" warning appears

**Solution**:
1. Ensure MySQL is running: `mysql -u root`
2. Check connection details in `.env.local`
3. Run initialization script: `node scripts/init_db.js`
4. Check console logs for specific error messages

### Port Already in Use

**Problem**: Port 3306 (MySQL) or 3000 (Node) is already in use

**Solution**:
- For MySQL: Find and stop the process or change DB_HOST
- For Node: Run on a different port: `npm run dev -- -p 3001`

### Table Not Found Error

**Problem**: "Table 'whisky_scraper.whiskies' doesn't exist"

**Solution**:
1. Run the initialization script: `node scripts/init_db.js`
2. Verify the database and table were created: `mysql -u root whisky_scraper -e "SHOW TABLES;"`

## Development

### Running Tests

```bash
npm run test
```

### Building for Production

```bash
npm run build
npm start
```

### Code Quality

The project uses:
- TypeScript for type safety
- ESLint for code linting
- Tailwind CSS v4 for styling
- shadcn/ui for accessible components

## License

This project is open source and available under the MIT License.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review console logs for error messages
3. Ensure all prerequisites are met
4. Contact support if problems persist
