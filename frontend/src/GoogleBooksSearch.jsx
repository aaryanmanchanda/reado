import React, { useState } from 'react';

const GoogleBooksSearch = () => {
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState([]);

  const searchBooks = async () => {
    if (!query) return;
    
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=AIzaSyArpbY-S0-pLZ3JIX1Rj45BFDVqmhF9baY`
      );
      const data = await response.json();
      setBooks(data.items || []);
    } catch (error) {
      console.error('Error fetching books:', error);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Google Books Search</h1>
      <div className="mb-4">
        <input
          type="text"
          value={query}
          onChange={e => {
            e.preventDefault()
            setQuery(e.target.value)
            searchBooks()}}
          placeholder="Enter book title or author"
          className="border p-2 w-full"
          
        />
        <button
          className="bg-blue-500 text-white p-2 mt-2 rounded"
        >
          Search
        </button>
      </div>
      <ul>
        {books.map(book => (
          <li key={book.id} className="mb-2">
            <strong>{book.volumeInfo.title}</strong> by {book.volumeInfo.authors?.join(', ') || 'Unknown'}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GoogleBooksSearch;
