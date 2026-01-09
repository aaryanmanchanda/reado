// Book cache utility to reduce Google Books API calls
// Uses localStorage for persistence across sessions

const CACHE_KEY = 'bookCloud_bookCache';
const CACHE_EXPIRY_DAYS = 7; // Cache expires after 7 days

// Get cache from localStorage
function getCache() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return {};
    const parsed = JSON.parse(cached);
    // Clean up expired entries
    const now = Date.now();
    const cleaned = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value.expiry > now) {
        cleaned[key] = value;
      }
    }
    // Save cleaned cache back
    if (Object.keys(cleaned).length !== Object.keys(parsed).length) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch (err) {
    console.error('Error reading book cache:', err);
    return {};
  }
}

// Save cache to localStorage
function saveCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.error('Error saving book cache:', err);
  }
}

// Get book info from cache by bookId
export function getCachedBookInfo(bookId) {
  if (!bookId) return null;
  const cache = getCache();
  const cached = cache[`bookId_${bookId}`];
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  return null;
}

// Cache book info by bookId
export function cacheBookInfo(bookId, bookInfo) {
  if (!bookId || !bookInfo) return;
  const cache = getCache();
  cache[`bookId_${bookId}`] = {
    data: bookInfo,
    expiry: Date.now() + (CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
  };
  saveCache(cache);
}

// Get book info from cache by title
export function getCachedBookByTitle(title) {
  if (!title) return null;
  const cache = getCache();
  const cached = cache[`title_${title.toLowerCase().trim()}`];
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  return null;
}

// Cache book info by title
export function cacheBookByTitle(title, bookInfo) {
  if (!title || !bookInfo) return;
  const cache = getCache();
  cache[`title_${title.toLowerCase().trim()}`] = {
    data: bookInfo,
    expiry: Date.now() + (CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
  };
  saveCache(cache);
}

// Fetch book info from Google Books API by bookId with caching
export async function fetchBookInfoById(bookId) {
  if (!bookId) return null;
  
  // Check cache first
  const cached = getCachedBookInfo(bookId);
  if (cached) return cached;
  
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes/${bookId}`);
    if (res.ok) {
      const data = await res.json();
      const bookInfo = {
        title: data.volumeInfo?.title || 'Unknown Title',
        thumbnail: data.volumeInfo?.imageLinks?.thumbnail || null,
        bookId: data.id || bookId
      };
      // Cache the result
      cacheBookInfo(bookId, bookInfo);
      return bookInfo;
    }
  } catch (err) {
    console.error('Error fetching book info by ID:', err);
  }
  
  return { title: 'Unknown Title', thumbnail: null, bookId };
}

// Fetch book info from Google Books API by title with caching
export async function fetchBookInfoByTitle(title) {
  if (!title) return { title, thumbnail: null, id: null };
  
  // Check cache first
  const cached = getCachedBookByTitle(title);
  if (cached) return cached;
  
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(title)}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        const book = data.items[0];
        const bookInfo = {
          title: book.volumeInfo?.title || title,
          thumbnail: book.volumeInfo?.imageLinks?.thumbnail || null,
          id: book.id,
        };
        // Cache the result
        cacheBookByTitle(title, bookInfo);
        return bookInfo;
      }
    }
  } catch (err) {
    console.error('Error fetching book info by title:', err);
  }
  
  return { title, thumbnail: null, id: null };
}

// Clear expired cache entries (can be called periodically)
export function clearExpiredCache() {
  getCache(); // This already cleans expired entries
}

