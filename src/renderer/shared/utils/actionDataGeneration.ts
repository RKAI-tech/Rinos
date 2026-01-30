type ActionLike = {
  action_datas?: any[];
  action_data_generation?: any[];
};

type BrowserVariableFetcher = (browserVariableId: string) => Promise<any | null>;

export const getSelectedValueId = (action: ActionLike): string | null => {
  for (const ad of action.action_datas || []) {
    const selectedValueId = ad?.value?.selected_value_id;
    if (selectedValueId) {
      return String(selectedValueId);
    }
  }
  return null;
};

export const getSelectedGeneration = (action: ActionLike) => {
  if (!action.action_data_generation || action.action_data_generation.length === 0) {
    return null;
  }
  const selectedValueId = getSelectedValueId(action);
  if (!selectedValueId) {
    return null;
  }
  return (
    action.action_data_generation.find(
      gen => gen.action_data_generation_id === selectedValueId
    ) || null
  );
};

export const getSelectedGenerationValue = (action: ActionLike) => {
  const selectedGeneration = getSelectedGeneration(action);
  if (!selectedGeneration) {
    return null;
  }
  const genValue = selectedGeneration.value;
  if (genValue && typeof genValue === 'object' && 'value' in genValue) {
    return (genValue as any).value;
  }
  return genValue ?? null;
};

export const resolveSelectedGenerationValue = async (
  action: ActionLike,
  fetchBrowserVariable?: BrowserVariableFetcher
) => {
  const selectedGeneration = getSelectedGeneration(action);
  if (!selectedGeneration) {
    return null;
  }

  const genValue = selectedGeneration.value;
  if (genValue && typeof genValue === 'object' && 'value' in genValue) {
    const innerValue = (genValue as any).value;
    if (innerValue !== null && innerValue !== undefined) {
      return innerValue;
    }
    const browserVariableId = selectedGeneration.browser_variable_id;
    if (browserVariableId && fetchBrowserVariable) {
      return await fetchBrowserVariable(String(browserVariableId));
    }
    return innerValue ?? null;
  }

  if (genValue !== null && genValue !== undefined) {
    return genValue;
  }

  const browserVariableId = selectedGeneration.browser_variable_id;
  if (browserVariableId && fetchBrowserVariable) {
    return await fetchBrowserVariable(String(browserVariableId));
  }

  return genValue ?? null;
};
