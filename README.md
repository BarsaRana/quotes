# Material Dashboard - React

A modern, responsive React dashboard for material management with PostgreSQL integration capabilities.

## Features

- 🎨 **Modern UI Design**: Clean, professional interface with smooth animations
- 📱 **Responsive Layout**: Works perfectly on desktop, tablet, and mobile devices
- 🔄 **Real-time Updates**: React state management for instant UI updates
- 📊 **Material Management**: Add, edit, delete, and view materials
- 🖼️ **Image Upload**: Drag & drop image upload functionality
- 📈 **Statistics Dashboard**: Real-time statistics and metrics
- 🎯 **Search Functionality**: Quick search through materials
- 🎨 **Beautiful Modal**: 2-column layout modal for adding materials

## Screenshots

### Desktop View
- Modern sidebar navigation
- Clean table layout
- Professional color scheme
- Smooth hover effects

### Mobile View
- Responsive design
- Touch-friendly interface
- Optimized for small screens

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd material-dashboard-react
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## Project Structure

```
material-dashboard-react/
├── src/
│   └── main.jsx          # React entry point
├── App.jsx               # Main App component
├── MaterialModal.jsx     # Material modal component
├── App.css              # Main styles
├── MaterialModal.css    # Modal styles
├── package.json         # Dependencies
├── vite.config.js       # Vite configuration
└── index.html           # HTML template
```

## Components

### App.jsx
Main application component with:
- Sidebar navigation
- Material table
- Search functionality
- Statistics dashboard

### MaterialModal.jsx
Modal component for adding materials with:
- 2-column responsive layout
- Form validation
- Image upload
- Modern styling

## Styling

The application uses:
- **CSS Variables** for consistent theming
- **Flexbox & Grid** for responsive layouts
- **CSS Animations** for smooth interactions
- **Mobile-first** responsive design

## PostgreSQL Integration

To integrate with PostgreSQL:

1. **Backend Setup**
   ```javascript
   // Example API endpoint
   POST /api/materials
   {
     "id": "M01",
     "salesPartNo": "10-DG094",
     "description": "Generator",
     "site": "3DT01",
     "price": 4545.45,
     "image": "base64_or_url"
   }
   ```

2. **Database Schema**
   ```sql
   CREATE TABLE materials (
     id VARCHAR(10) PRIMARY KEY,
     sales_part_no VARCHAR(50) NOT NULL,
     description TEXT,
     site VARCHAR(20),
     price DECIMAL(10,2),
     image_url TEXT,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Technologies Used

- **React 18** - UI framework
- **Vite** - Build tool
- **CSS3** - Styling
- **PostgreSQL** - Database (integration ready)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this project for your own purposes.

## Support

For support or questions, please open an issue in the repository.
