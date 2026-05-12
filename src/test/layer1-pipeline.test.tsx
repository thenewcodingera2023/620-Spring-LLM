// Integration test for the live text -> tokens -> x pipeline on Layer 1.
// We exercise the real js-tiktoken tokenizer via the same adapter the UI uses.

import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import App from '../App';
import { sampleInputText } from '../data/sampleNetwork';
import { TOKEN_ID_NORMALIZER, tokenize } from '../data/tokenizer';
import { encodeTokens } from '../math/tokenEncoding';

function getTextInput(): HTMLTextAreaElement {
  return screen.getByLabelText(/Layer 1 text input/i) as HTMLTextAreaElement;
}

describe('Layer 1 text-input pipeline', () => {
  it('renders the editable text input pre-filled with the sample text', () => {
    render(<App />);
    const input = getTextInput();
    expect(input.value).toBe(sampleInputText);
  });

  it('shows the actual cl100k_base token ids, count, and mean for the default input', () => {
    const { ids } = tokenize(sampleInputText);
    const mean = ids.reduce((acc, id) => acc + id, 0) / ids.length;
    render(<App />);
    const tokenization = screen.getByLabelText('Tokenization');
    expect(within(tokenization).getByTestId('token-count').textContent).toBe(String(ids.length));
    expect(within(tokenization).getByTestId('mean-token-id').textContent).toBe(mean.toFixed(2));
    expect(within(tokenization).getByTestId('token-ids').textContent).toBe(`[${ids.join(', ')}]`);
  });

  it('shows the encoded x[0] and x[1] matching encodeTokens on the same ids', () => {
    const { ids } = tokenize(sampleInputText);
    const { x } = encodeTokens(ids, TOKEN_ID_NORMALIZER);
    render(<App />);
    const encoding = screen.getByLabelText('Encoding to x');
    const x0 = within(encoding).getByTestId('x0-value').textContent ?? '';
    const x1 = within(encoding).getByTestId('x1-value').textContent ?? '';
    expect(x0).toContain((x[0] >= 0 ? '+' : '') + x[0].toFixed(3));
    expect(x1).toContain((x[1] >= 0 ? '+' : '') + x[1].toFixed(3));
  });

  it('typing into the input recomputes tokens, count, and x', () => {
    render(<App />);
    const input = getTextInput();
    const newText = 'hello world';
    fireEvent.change(input, { target: { value: newText } });

    const { ids } = tokenize(newText);
    const { x } = encodeTokens(ids, TOKEN_ID_NORMALIZER);

    const tokenization = screen.getByLabelText('Tokenization');
    expect(within(tokenization).getByTestId('token-count').textContent).toBe(String(ids.length));
    expect(within(tokenization).getByTestId('token-ids').textContent).toBe(`[${ids.join(', ')}]`);

    const encoding = screen.getByLabelText('Encoding to x');
    const x0 = within(encoding).getByTestId('x0-value').textContent ?? '';
    const x1 = within(encoding).getByTestId('x1-value').textContent ?? '';
    expect(x0).toContain((x[0] >= 0 ? '+' : '') + x[0].toFixed(3));
    expect(x1).toContain((x[1] >= 0 ? '+' : '') + x[1].toFixed(3));
  });

  it('empty input is handled (no crash; renders the documented zero-token edge case)', () => {
    render(<App />);
    const input = getTextInput();
    fireEvent.change(input, { target: { value: '' } });
    const tokenization = screen.getByLabelText('Tokenization');
    expect(within(tokenization).getByTestId('token-count').textContent).toBe('0');
    expect(within(tokenization).getByTestId('mean-token-id').textContent).toContain('—');
  });

  it('shows the gradient-descent update panel only after the user reaches step 10', () => {
    render(<App />);
    expect(screen.queryByLabelText('Gradient descent update')).not.toBeInTheDocument();
    const fwdBtn = screen.getByRole('button', { name: /Step forward/i });
    for (let i = 0; i < 10; i++) fireEvent.click(fwdBtn);
    expect(screen.getByLabelText('Gradient descent update')).toBeInTheDocument();
    // With the default text every hidden unit is dead, so every W_1 row is tagged "no update".
    const noUpdateMarkers = screen.getAllByText(/no update · dead node/i);
    expect(noUpdateMarkers.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the teaching labels "factual question" and "command" near the output column', () => {
    render(<App />);
    expect(screen.getByText(/"factual question"/)).toBeInTheDocument();
    expect(screen.getByText(/"command"/)).toBeInTheDocument();
  });

  it('renders the target y = [+1, 0] annotation near the loss column', () => {
    render(<App />);
    expect(screen.getByText(/target y = \[\+1, 0\]/)).toBeInTheDocument();
  });
});
