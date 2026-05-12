// Editable text input that drives the Layer 1 pipeline.

import type { ChangeEvent } from 'react';
import type { Layer1State } from '../../state/layer1Store';

interface TextInputPanelProps {
  state: Layer1State;
}

export function TextInputPanel({ state }: TextInputPanelProps) {
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    state.setInputText(event.target.value);
  };

  return (
    <section className="panel p-4 flex flex-col gap-2" aria-label="Text input">
      <label className="sr-only" htmlFor="layer1-text-input">
        Type any sentence to feed the network
      </label>
      <textarea
        id="layer1-text-input"
        value={state.inputText}
        onChange={handleChange}
        rows={2}
        spellCheck={false}
        autoComplete="off"
        aria-label="Layer 1 text input"
        className="w-full resize-y rounded-md border border-paper-rule bg-paper-panel px-3 py-2 font-mono text-sm leading-snug text-ink-strong focus:outline-none focus:ring-2 focus:ring-accent-forward/40 focus:border-accent-forward/40"
        placeholder="Type any sentence..."
      />
    </section>
  );
}
