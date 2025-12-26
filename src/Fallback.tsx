// This is used inside HTML (Live → React portal), so use regular React
import React from 'react';

export const makeFallback = (error: Error) => (
  <div className="error-message">{error.toString()}</div>
);