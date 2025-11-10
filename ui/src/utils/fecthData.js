
// Function to initialize App Bridge and get the session token
export const fetchData = async (endpoint) => {
  try {
    // Call the backend API with the session token
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }

    const result = await response.json();
    return result; // Return the data from the API call

  } catch (error) {
    throw error; // Propagate the error
  }
};
