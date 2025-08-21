# MovieBarcode

A web app that looks up movie information from barcodes. Scan movie barcodes or enter them manually to get detailed movie information including ratings, cast, and plot summaries.

## Features

- 📱 **Mobile-friendly** - Works great on phones and tablets
- 📷 **Camera Scanner** - Scan barcodes directly with your camera
- ⌨️ **Manual Entry** - Type barcodes manually for testing
- 🎬 **Movie Database** - Comprehensive movie information from TMDb and OMDB
- 🔍 **Multiple UPC Sources** - Tries multiple barcode databases for better coverage
- 📊 **Ratings** - IMDb, Rotten Tomatoes, and TMDb ratings
- 🎭 **Cast & Crew** - Director and genre information

## How to Use

1. **Open the app** in your web browser
2. **Choose your method:**
   - **Camera Scanner**: Point your camera at a movie barcode
   - **Manual Entry**: Type a barcode number (e.g., 043396275294 for Casino Royale)
3. **View Results**: Get detailed movie information instantly

## Test Barcodes

Try these known movie barcodes:
- `043396275294` - Casino Royale
- `883929822355` - Inception  
- `085391163627` - The Dark Knight
- `024543602400` - Avatar

## Installation

```bash
# Clone the repository
git clone https://github.com/brucewinter/movie_barcode1.git
cd movie_barcode1

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Technologies

- **Frontend**: React + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui
- **Barcode Scanning**: @zxing/library
- **Movie Data**: TMDb API + OMDB API
- **UPC Lookup**: Multiple free APIs with fallbacks

## License

MIT License - feel free to use and modify!
