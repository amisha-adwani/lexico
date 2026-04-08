import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app brand in navbar', () => {
  render(<App />);
  expect(screen.getByText(/lexico ai/i)).toBeInTheDocument();
});
