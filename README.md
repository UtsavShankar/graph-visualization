# BookGraph

A modern web application for visualizing and managing academic book collections as interactive graphs. Built with React, TypeScript, and Cytoscape.js for powerful graph visualization capabilities.

## 🚀 Features

### Graph Visualization
- **Interactive Network Graph**: Visualize books and their relationships using Cytoscape.js
- **Tag-based Organization**: Books are organized in circular clusters by academic tags
- **Dynamic Filtering**: Filter books by tags or search by title
- **Hover Interactions**: Hover over edges to see connection details
- **Node Selection**: Click nodes to view detailed book information

### Book Management
- **Add New Books**: Complete form for adding books with metadata
- **Connection Management**: Create relationships between books with custom labels and weights
- **Import/Export**: JSON import/export functionality for data portability
- **Book Deletion**: Remove books and their connections

### User Interface
- **Dual View System**: Separate Explore and Edit views
- **Responsive Design**: Modern dark theme with Tailwind CSS
- **Real-time Search**: Instant filtering as you type
- **Tag Filtering**: Quick access to specific academic categories

## 🛠️ Technology Stack

- **Frontend**: React 19.1.1 with TypeScript
- **Build Tool**: Vite 7.1.3
- **Styling**: Tailwind CSS 4.1.12
- **Graph Visualization**: Cytoscape.js 3.33.1 with fcose layout
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
  - Search and tag filtering
  - Smooth animations for layout changes
- **Visual Styling**: Custom node and edge styles with hover effects

### EditView.tsx
- **Book Management Interface**: Form for adding new books
- **Connection Management**: Interface for creating relationships between books
- **Data Operations**: Import/export functionality and book deletion
- **Form Validation**: Error handling and input validation

## 📊 Data Structure

### Node (Book) Properties
```typescript
{
  id: string;           // Unique identifier (slugified title)
  title: string;        // Book title
  author?: string;      // Author name
  year?: number;        // Publication year
  tags?: string[];      // Academic categories (e.g., "AN1101", "SC2209")
  abstract?: string;    // Book description
  url?: string;         // External link
  notes?: string;       // Personal notes
  color?: string;       // Custom node color
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

# Start development server
npm run dev
```

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
2. **Search**: Use the search bar to filter books by title
3. **Filter by Tag**: Select a tag from the dropdown to focus on specific categories
4. **Interact**: 
   - Click nodes to see book details in the sidebar
   - Hover over edges to see connection information
   - Use mouse wheel to zoom, drag to pan

### Managing Books
1. **Add Books**: Switch to "Edit" tab and fill out the book form
2. **Create Connections**: Select existing books to connect with the new book
3. **Set Relationships**: Define the type of relationship and connection strength
4. **Import/Export**: Use JSON import/export for data backup and sharing

### Academic Categories
The system includes predefined academic tags:
- **AN1101**: Cultural Anthropology
- **AN2203**: Southeast Asian Studies  
- **SC2209**: Economic Anthropology
- **SC3204**: Gender Studies

## 🔧 Configuration

### Customization Options
- **Tag Colors**: Modify `TAG_COLORS` array in `App.tsx`
- **Layout Parameters**: Adjust circle spacing and radius in `ExploreView.tsx`
- **Visual Styles**: Customize node and edge appearance in Cytoscape styles
- **Tag Categories**: Add new academic categories to `TAG_FILTER_OPTIONS`

### Data Persistence
- **Local Storage**: Data automatically saved to browser localStorage
- **Storage Key**: `bookGraph:v4:123` (configurable in `App.tsx`)
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