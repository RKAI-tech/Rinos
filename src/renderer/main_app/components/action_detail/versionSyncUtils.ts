import { Action } from '../../types/actions';
import { TestCaseDataVersion } from '../../types/testcases';

/**
 * Tìm version đang được sử dụng trong actions (có currentVersion trong action_datas)
 */
const findActiveVersionInActions = (
  actions: Action[]
): string | null => {
  for (const action of actions) {
    for (const ad of action.action_datas || []) {
      if (ad.value && typeof ad.value === 'object' && ad.value.currentVersion) {
        return String(ad.value.currentVersion);
      }
    }
  }
  return null;
};

/**
 * Sync: Khi edit action value → cập nhật version metadata
 */
const syncVersionMetadataOnActionEdit = (
  testcaseDataVersions: TestCaseDataVersion[],
  generationId: string,
  updatedGeneration: any
): TestCaseDataVersion[] => {
  return testcaseDataVersions.map(version => {
    if (!version.action_data_generations) return version;
    
    // Kiểm tra xem version có chứa generation này không
    const hasGeneration = version.action_data_generations.some(
      gen => gen.action_data_generation_id === generationId
    );
    
    if (hasGeneration) {
      // Cập nhật generation object trong version
      return {
        ...version,
        action_data_generations: version.action_data_generations.map(gen =>
          gen.action_data_generation_id === generationId
            ? { ...gen, ...updatedGeneration }
            : gen
        ),
      };
    }
    
    return version;
  });
};

/**
 * Sync: Khi user chọn generation khác trong action detail → cập nhật version đang được chọn
 */
const syncVersionOnGenerationChange = (
  testcaseDataVersions: TestCaseDataVersion[],
  actionId: string,
  oldGenerationId: string | null,
  newGenerationId: string,
  actions: Action[]
): { updatedVersions: TestCaseDataVersion[]; affectedVersionName: string | null } => {
  // Tìm version đang được sử dụng (có currentVersion trong action_datas)
  const activeVersionName = findActiveVersionInActions(actions);
  
  if (!activeVersionName) {
    // Không có version nào đang active, không cần sync
    return { updatedVersions: testcaseDataVersions, affectedVersionName: null };
  }
  
  // Tìm version object
  const activeVersion = testcaseDataVersions.find(v => v.version === activeVersionName);
  
  if (!activeVersion || !activeVersion.action_data_generations) {
    return { updatedVersions: testcaseDataVersions, affectedVersionName: null };
  }
  
  // Kiểm tra xem version có chứa generation cũ của action này không
  const hasOldGeneration = oldGenerationId && activeVersion.action_data_generations.some(
    gen => gen.action_data_generation_id === oldGenerationId
  );
  
  // Kiểm tra xem generation mới có thuộc về action này không
  const newGeneration = actions
    .find(a => a.action_id === actionId)
    ?.action_data_generation
    ?.find(g => g.action_data_generation_id === newGenerationId);
  
  if (!newGeneration) {
    return { updatedVersions: testcaseDataVersions, affectedVersionName: null };
  }
  
  // Nếu version đang dùng generation cũ, thay thế bằng generation mới
  if (hasOldGeneration && oldGenerationId) {
    const updatedVersions = testcaseDataVersions.map(version => {
      if (version.version === activeVersionName) {
        return {
          ...version,
          action_data_generations: version.action_data_generations!.map(gen =>
            gen.action_data_generation_id === oldGenerationId
              ? newGeneration
              : gen
          ),
        };
      }
      return version;
    });
    
    return { updatedVersions, affectedVersionName: activeVersionName };
  }
  
  // Nếu version chưa có generation cho action này, thêm generation mới
  // (chỉ nếu version chưa có generation nào cho action này)
  const hasAnyGenerationForAction = activeVersion.action_data_generations.some(gen => {
    return actions
      .find(a => a.action_id === actionId)
      ?.action_data_generation
      ?.some(g => g.action_data_generation_id === gen.action_data_generation_id);
  });
  
  if (!hasAnyGenerationForAction) {
    const updatedVersions = testcaseDataVersions.map(version => {
      if (version.version === activeVersionName) {
        return {
          ...version,
          action_data_generations: [...(version.action_data_generations || []), newGeneration],
        };
      }
      return version;
    });
    
    return { updatedVersions, affectedVersionName: activeVersionName };
  }
  
  return { updatedVersions: testcaseDataVersions, affectedVersionName: null };
};

/**
 * Detect changes trong action và sync version khi Save
 */
export const syncVersionOnActionSave = (
  originalAction: Action,
  updatedAction: Action,
  testcaseDataVersions: TestCaseDataVersion[],
  allActions: Action[]
): { 
  updatedVersions: TestCaseDataVersion[]; 
  affectedVersionNames: string[];
} => {
  const affectedVersionNames: string[] = [];
  let updatedVersions = testcaseDataVersions;

  if (!originalAction.action_id || !updatedAction.action_id) {
    return { updatedVersions, affectedVersionNames };
  }

  // 1. Kiểm tra thay đổi generation được chọn (từ action_datas)
  const originalCurrentVersion = originalAction.action_datas?.find(
    ad => ad.value && typeof ad.value === 'object' && ad.value.currentVersion
  )?.value?.currentVersion;

  const updatedCurrentVersion = updatedAction.action_datas?.find(
    ad => ad.value && typeof ad.value === 'object' && ad.value.currentVersion
  )?.value?.currentVersion;

  // Tìm generation ID mới từ updatedAction dựa trên value trong action_datas
  let newGenerationId: string | null = null;
  if (updatedCurrentVersion && updatedAction.action_data_generation) {
    const updatedValue = updatedAction.action_datas?.find(
      ad => ad.value && typeof ad.value === 'object' && ad.value.value !== undefined
    )?.value?.value;

    if (updatedValue !== undefined && updatedAction.action_data_generation) {
      for (const gen of updatedAction.action_data_generation) {
        const genValue = gen.value?.value || 
          (typeof gen.value === 'string' ? gen.value : '');
        if (String(genValue) === String(updatedValue)) {
          newGenerationId = gen.action_data_generation_id || null;
          break;
        }
      }
    }
  }

  // Tìm generation ID cũ từ originalAction
  let oldGenerationId: string | null = null;
  if (originalCurrentVersion) {
    const versionName = String(originalCurrentVersion);
    const version = testcaseDataVersions.find(v => v.version === versionName);
    if (version?.action_data_generations) {
      for (const gen of version.action_data_generations) {
        if (gen.action_data_generation_id) {
          const genInAction = originalAction.action_data_generation?.find(
            g => g.action_data_generation_id === gen.action_data_generation_id
          );
          if (genInAction) {
            oldGenerationId = gen.action_data_generation_id;
            break;
          }
        }
      }
    }
  }

  // Sync nếu generation thay đổi
  if (newGenerationId && newGenerationId !== oldGenerationId && updatedAction.action_id) {
    const { updatedVersions: newVersions, affectedVersionName } = syncVersionOnGenerationChange(
      updatedVersions,
      updatedAction.action_id,
      oldGenerationId,
      newGenerationId,
      allActions
    );
    updatedVersions = newVersions;
    if (affectedVersionName && !affectedVersionNames.includes(affectedVersionName)) {
      affectedVersionNames.push(affectedVersionName);
    }
  }

  // 2. Kiểm tra thay đổi value trong action_data_generation
  if (originalAction.action_data_generation && updatedAction.action_data_generation) {
    for (const updatedGen of updatedAction.action_data_generation) {
      if (!updatedGen.action_data_generation_id) continue;
      
      const originalGen = originalAction.action_data_generation.find(
        g => g.action_data_generation_id === updatedGen.action_data_generation_id
      );

      if (originalGen) {
        const originalValue = originalGen.value?.value || 
          (typeof originalGen.value === 'string' ? originalGen.value : '');
        const updatedValue = updatedGen.value?.value || 
          (typeof updatedGen.value === 'string' ? updatedGen.value : '');

        // Nếu value thay đổi, sync version metadata
        if (String(originalValue) !== String(updatedValue)) {
          updatedVersions = syncVersionMetadataOnActionEdit(
            updatedVersions,
            updatedGen.action_data_generation_id,
            updatedGen
          );

          // Tìm version chứa generation này
          const version = updatedVersions.find(v => 
            v.action_data_generations?.some(
              gen => gen.action_data_generation_id === updatedGen.action_data_generation_id
            )
          );
          if (version && !affectedVersionNames.includes(version.version || '')) {
            affectedVersionNames.push(version.version || '');
          }
        }
      }
    }
  }

  return { updatedVersions, affectedVersionNames };
};

