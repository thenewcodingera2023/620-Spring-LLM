import { StepController } from '../components/common/StepController';
import { EncodingPanel } from '../components/layer1/EncodingPanel';
import { NetworkGraph } from '../components/layer1/NetworkGraph';
import { TextInputPanel } from '../components/layer1/TextInputPanel';
import { TokenizationPanel } from '../components/layer1/TokenizationPanel';
import { WeightUpdatePanel } from '../components/layer1/WeightUpdatePanel';
import { useLayer1State } from '../state/layer1Store';

export function LayerOnePage() {
  const state = useLayer1State();

  return (
    <section
      id="panel-layer-one"
      role="tabpanel"
      aria-labelledby="tab-layer-one"
      className="flex flex-col gap-6"
    >
      <div className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-1">
          <TextInputPanel state={state} />
        </div>
        <div className="md:col-span-2">
          <TokenizationPanel state={state} />
        </div>
      </div>

      <EncodingPanel state={state} />

      <div className="panel p-6 flex flex-col gap-5">
        <div className="flex justify-center">
          <div className="w-full">
            <NetworkGraph state={state} />
          </div>
        </div>

        <StepController
          currentStep={state.step}
          maxStep={state.maxStep}
          isPlaying={state.isPlaying}
          onReset={state.reset}
          onStepBack={state.rewind}
          onPlayPause={state.togglePlay}
          onStepForward={state.advance}
          onScrub={state.setStep}
        />
      </div>

      <WeightUpdatePanel state={state} />
    </section>
  );
}
