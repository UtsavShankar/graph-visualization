# BookGraph

A modern web application for visualizing and managing academic book collections as interactive graphs. Built with React, TypeScript, and Cytoscape.js for powerful graph visualization capabilities.

## 🚀 Features

### Graph Visualization
- **Interactive Network Graph**: Visualize books and their relationships using Cytoscape.js
- **Tag-based Organization**: Books are organized in circular clusters by academic tags
- **Dynamic Filtering**: Filter books by tags or search by title, tags, and authors
- **Hover Interactions**: Hover over edges to see connection details
- **Node Selection**: Click nodes to view detailed book information in an enhanced sidebar
- **World Map Background**: Optional world map overlay that pans and zooms with the graph

### Book Management
- **Add New Books**: Complete form for adding books with metadata including multiple URL fields
- **Publisher Information**: Track publisher details and related websites
- **Connection Management**: Create relationships between books with custom labels and weights
- **Flexible URL Fields**: Separate fields for publisher site, companion website, and relevant media
- **Import/Export**: JSON import/export functionality for data portability
- **Book Deletion**: Remove books and their connections

### User Interface
- **Dual View System**: Separate Explore and Edit views
- **Responsive Design**: Modern dark theme with Tailwind CSS
- **Enhanced Search**: Search across titles, tags, and authors simultaneously
- **Tag Filtering**: Quick access to specific academic categories
- **Improved Details Sidebar**: Larger fonts and better metadata display formatting
- **Optional Tags**: Flexible tag system with no validation requirements

## 🛠️ Technology Stack

- **Frontend**: React 19.1.1 with TypeScript
- **Build Tool**: Vite 7.1.3
- **Styling**: Tailwind CSS 4.1.12
- **Graph Visualization**: Cytoscape.js 3.33.1 with fcose layout
- **Database**: Supabase (PostgreSQL)
- **Deployment**: GitHub Pages
- **Development**: ESLint, TypeScript, PostCSS

## 📁 Project Structure

```
src/
├── App.tsx              # Main application component with routing
├── App.css              # Global styles
├── main.tsx              # Application entry point
├── index.css            # Tailwind CSS imports
├── ExploreView.tsx      # Graph visualization and exploration
├── EditView.tsx         # Book management interface
└── seed/
    └── book-graph-120.json  # Sample data with 120 books
```

## 🎯 Core Components

### App.tsx
- **Main Application Logic**: Handles tab navigation between Explore and Edit views
- **Data Management**: Uses localStorage for data persistence
- **State Management**: Manages graph data, search queries, and UI state
- **Type Definitions**: Defines TypeScript interfaces for nodes, edges, and graph data

### ExploreView.tsx
- **Graph Visualization**: Renders interactive Cytoscape.js graph
- **Layout Management**: Organizes books in circular clusters by academic tags
- **Interactive Features**:
  - Node selection and neighborhood highlighting
  - Edge hover tooltips with connection details
  - Multi-field search (titles, tags, authors)
  - Smooth animations for layout changes
  - Optional world map background with synchronized pan and zoom
- **Visual Styling**: Custom node and edge styles with hover effects
- **Enhanced Details**: Improved sidebar with better metadata formatting

### EditView.tsx
- **Book Management Interface**: Form for adding new books
- **Connection Management**: Interface for creating relationships between books
- **Data Operations**: Import/export functionality and book deletion
- **Form Validation**: Error handling and input validation

## 📊 Data Structure

### Node (Book) Properties
```typescript
{
  id: string;                    // Unique identifier (slugified title)
  title: string;                 // Book title
  author?: string;               // Author name
  year?: number;                 // Publication year
  tags?: string[];               // Academic categories (e.g., "AN1101", "SC2209") - optional
  abstract?: string;             // Book description
  publisher?: string;            // Publisher name
  publisher_site?: string;       // Publisher website URL
  companion_website?: string;    // Companion website URL
  relevant_media?: string;       // Related media URL
  notes?: string;                // Personal notes
  color?: string;                // Custom node color
}
```

### Edge (Connection) Properties
```typescript
{
  id?: string;          // Unique edge identifier
  source: string;       // Source node ID
  target: string;       // Target node ID
  relation?: string;    // Relationship type (e.g., "influences", "debates")
  weight?: number;      // Connection strength (1-8)
}
```

## 🎨 Visual Design

### Color Scheme
- **Background**: Dark slate theme (`slate-950`)
- **Accent Colors**: Sky blue (`sky-500`) for highlights
- **Tag Colors**: Predefined palette for academic categories
- **Interactive States**: Hover effects and selection highlighting

### Layout System
- **Tag-based Clustering**: Books grouped in circles by academic tags
- **Responsive Grid**: 12-column grid system for layout
- **Circular Arrangement**: Books arranged in circles with configurable spacing
- **Animation**: Smooth transitions for layout changes and filtering

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn package manager

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd bookgraph

# Install dependencies
npm install

# Set up environment variables
# Create a .env file in the root directory with:
# VITE_SUPABASE_URL=your_supabase_project_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Start development server
npm run dev
```

### Supabase Setup

This application requires a Supabase database. Follow these steps:

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com) and create a new project
   - Note your project URL and anon/public key

2. **Configure Environment Variables**
   - Create a `.env` file in the root directory
   - Add your Supabase credentials:
     ```
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key-here
     ```

3. **Apply Database Schema and RLS Policies**
   - Go to your Supabase project's SQL Editor
   - Copy and paste the contents of `supabase-rls-policies.sql`
   - Run the SQL to create the necessary RLS policies
   - This enables anonymous users to read, create, update, and delete data

4. **Verify Policies**
   - Navigate to Authentication > Policies in your Supabase dashboard
   - Ensure policies exist for `courses`, `nodes`, and `edges` tables
   - Each table should have policies for SELECT, INSERT, UPDATE, and DELETE

**Important**: The `.env` file is gitignored and should never be committed to version control. Each developer needs to create their own `.env` file with their Supabase credentials.

### Available Scripts
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## 📚 Usage

### Exploring the Graph
1. **Navigate**: Use the "Explore" tab to view the graph
2. **Search**: Use the search bar to filter books by title, tags, or author
3. **Filter by Tag**: Select a tag from the dropdown to focus on specific categories
4. **Toggle World Map**: Click "Show World Map" to display a geographic background
5. **Interact**:
   - Click nodes to see detailed book information in the sidebar
   - Hover over edges to see connection information
   - Use mouse wheel to zoom, drag to pan
   - World map pans and zooms synchronously with the graph

### Managing Books
1. **Add Books**: Switch to "Edit" tab and fill out the book form
   - Add title, author, year, publisher, and abstract
   - Include URLs for publisher site, companion website, and relevant media
   - Tags are optional - add them only if relevant
2. **Create Connections**: Select existing books to connect with the new book
3. **Set Relationships**: Define the type of relationship and connection strength
4. **Import/Export**: Use JSON import/export for data backup and sharing

### Academic Categories
The system supports flexible academic tags including:
- **AN1101**: Cultural Anthropology (filtered from tag options)
- **AN2203**: Southeast Asian Studies
- **SC2209**: Economic Anthropology
- **SC3204**: Gender Studies

Note: Tags are completely optional and you can add custom tags as needed.

## 🔧 Configuration

### Customization Options
- **Tag Colors**: Modify `TAG_COLORS` array in `App.tsx`
- **Layout Parameters**: Adjust circle spacing and radius in `ExploreView.tsx`
- **Visual Styles**: Customize node and edge appearance in Cytoscape styles
- **Tag Categories**: Add new academic categories to `TAG_FILTER_OPTIONS`

### Data Persistence
- **Supabase Database**: All data stored in PostgreSQL via Supabase
- **Real-time Sync**: Changes are immediately synced across users
- **Backup**: Use export functionality for data backup

## 🎯 Use Cases

### Academic Research
- **Literature Mapping**: Visualize connections between academic texts
- **Research Organization**: Organize reading lists by topic and relationships
- **Knowledge Discovery**: Identify patterns and gaps in academic literature

### Educational Applications
- **Course Planning**: Map curriculum connections and dependencies
- **Student Projects**: Help students understand academic discourse networks
- **Research Collaboration**: Share and explore academic knowledge graphs

## 🔮 Future Enhancements

### Potential Features
- **Advanced Search**: Full-text search across abstracts and notes
- **Collaborative Features**: Multi-user editing and sharing
- **Analytics**: Graph metrics and analysis tools
- **Export Options**: PDF, image, and other format exports
- **Mobile Support**: Responsive design for mobile devices

### Technical Improvements
- **Performance**: Optimize for larger datasets (1000+ books)
- **Accessibility**: Enhanced keyboard navigation and screen reader support
- **Offline Support**: Progressive Web App capabilities
- **Data Validation**: Enhanced schema validation and error handling

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

## 📞 Support

For questions or support, please open an issue in the repository or contact the development team.