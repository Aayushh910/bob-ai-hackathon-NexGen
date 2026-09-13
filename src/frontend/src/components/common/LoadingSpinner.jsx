import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ message = 'Loading status...' }) {
  return (
    <div className="loading-container">
      <Loader2 className="spinner-icon animate-spin" size={28} />
      <span className="loading-text">{message}</span>
    </div>
  );
}
