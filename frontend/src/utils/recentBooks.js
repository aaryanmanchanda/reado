// Utility to manage recently read books in localStorage

const RECENT_BOOKS_KEY = 'bookCloud_recentBooks';
const MAX_RECENT_BOOKS = 10;

// Get recently read books from localStorage
export function getRecentBooks() {
  try {
    const recent = localStorage.getItem(RECENT_BOOKS_KEY);
    if (!recent) return [];
    return JSON.parse(recent);
  } catch (err) {
    console.error('Error reading recent books:', err);
    return [];
  }
}

// Add a book to recently read list
export function addRecentBook(book) {
  if (!book || !book.bookId) return;
  
  try {
    const recent = getRecentBooks();
    // Remove if already exists (to move to top)
    const filtered = recent.filter(b => b.bookId !== book.bookId);
    // Add to beginning
    const updated = [{
      bookId: book.bookId,
      title: book.title || 'Unknown Title',
      thumbnail: book.thumbnail || null,
      pageCount: book.pageCount || 100,
    }, ...filtered].slice(0, MAX_RECENT_BOOKS);
    
    localStorage.setItem(RECENT_BOOKS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error saving recent book:', err);
  }
}

// Clear recent books
export function clearRecentBooks() {
  try {
    localStorage.removeItem(RECENT_BOOKS_KEY);
  } catch (err) {
    console.error('Error clearing recent books:', err);
  }
}

