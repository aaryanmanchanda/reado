/**
 * Helper function for making authenticated API calls
 * Automatically includes JWT token from localStorage and Content-Type header
 * 
 * @param {string} url - The API endpoint URL
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<Response>} - The fetch response
 */
const apiFetch = async (url, options = {}) => {
  // Get JWT token from localStorage
  const token = localStorage.getItem("token");
  
  // Prepare headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers, // Merge any existing headers
  };
  
  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Merge options with our headers
  const fetchOptions = {
    ...options,
    headers,
  };
  
  return fetch(url, fetchOptions);
};

export default apiFetch;

