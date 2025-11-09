import React from 'react';
import { useParams } from 'react-router-dom';

function BookProfile() {
  const { id } = useParams();

  return (
    <div style={{ padding: '2rem', fontFamily: 'Playfair Display' }}>
      <h1>Book Profile</h1>
      <p>Book ID: {id}</p>
      <p><strong>% Read:</strong> [Placeholder]</p>
      <p><strong>Predictions:</strong> [Placeholder]</p>
      <p><strong>Rating:</strong> [Placeholder]</p>
      <p><strong>Notes:</strong> [Placeholder]</p>
    </div>
  );
}

export default BookProfile;
