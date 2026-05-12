// Layer 2 formula card content. Reads the live state and returns FormulaPanelProps.
// All numeric values come from useLayer2State's tested derivations; this module only formats.

import type { FormulaPanelProps, NumericPreviewValue } from '../components/common/FormulaPanel';
import { dot, norm } from '../math/linalg';
import type { Layer2State } from './layer2Store';

const COSINE_FORMULA = '\\cos(q, d) = \\dfrac{q \\cdot d}{\\lVert q \\rVert \\, \\lVert d \\rVert}';
const LEVEL_SET_FORMULA = '\\{ \\, q : \\cos(q, d) = c \\, \\}';

export function getLayer2Formula(state: Layer2State): FormulaPanelProps {
  const { selectedIndex, selectedDocument, selectedCosine, selectedGradient } = state;
  const activeQuery = state.activeQuery;
  const dimSuffix = state.mode === '3d' ? ' The same formula applies in any dimension.' : '';

  // Level-set view takes priority when both selection and overlay are active. 3D mode forces
  // the overlay off in the store, so this branch only fires in 2D.
  if (state.showLevelSet && selectedDocument && selectedCosine !== null) {
    const cosVal = selectedCosine;
    const description = state.selectedLevelSetDegenerate
      ? 'c is at the boundary (|c| ≈ 1). The level set degenerates to a single ray; the overlay is suppressed.'
      : 'In 2D this is a pair of rays from the origin at angles ±arccos(c) from d. Rotating q radially keeps cos(q, d) at c — only direction matters.';
    return {
      mvTag: 'MV 2.6',
      title: `Level set · ${state.selectedLabel ?? ''}`.trim(),
      formula: LEVEL_SET_FORMULA,
      description,
      numericPreview: {
        c: cosVal,
        d: selectedDocument,
        '||d||': norm(selectedDocument),
      },
    };
  }

  if (selectedIndex !== null && selectedDocument && selectedCosine !== null) {
    const qDotD = dot(activeQuery, selectedDocument);
    const qNorm = norm(activeQuery);
    const dNorm = norm(selectedDocument);
    const angleDeg = state.selectedAngleRad !== null ? (state.selectedAngleRad * 180) / Math.PI : null;

    const numeric: Record<string, NumericPreviewValue> = {
      q: activeQuery,
      d: selectedDocument,
      'q · d': qDotD,
      '||q||': qNorm,
      '||d||': dNorm,
      'cos(q, d)': selectedCosine,
    };
    if (angleDeg !== null) numeric['theta (deg)'] = angleDeg;
    if (selectedGradient) numeric['grad_q cos'] = selectedGradient;

    return {
      mvTag: 'MV 2.3 / MV 2.4',
      title: `Selected · ${state.selectedLabel ?? ''}`.trim(),
      formula: COSINE_FORMULA,
      description:
        'The teal arrow at the tip of q points in the local direction of steepest increase of cos(q, d). It is orthogonal to q-hat and lies in the plane of q and d.' +
        dimSuffix,
      numericPreview: numeric,
    };
  }

  return {
    mvTag: 'MV 2.3 / MV 2.4',
    title: 'Cosine Similarity',
    formula: COSINE_FORMULA,
    description:
      'Click a document on the plane or in the leaderboard to inspect its cosine, gradient, and chain-rule decomposition. Drag the q tip (2D) or use the x/y/z sliders (3D) to move the query.' +
      dimSuffix,
    numericPreview: {
      q: activeQuery,
      '||q||': norm(activeQuery),
      documents: `${state.activeDocuments.length} fixed`,
    },
  };
}
