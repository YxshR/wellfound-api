import { render, screen } from '@testing-library/react';
import App from './App';

test('renders TaskFlow brand', () => {
  render(<App />);
  const brandElement = screen.getByText('TaskFlow');
  expect(brandElement).toBeInTheDocument();
});

test('renders Projects navigation link', () => {
  render(<App />);
  const projectsLink = screen.getByRole('link', { name: /projects/i });
  expect(projectsLink).toBeInTheDocument();
});