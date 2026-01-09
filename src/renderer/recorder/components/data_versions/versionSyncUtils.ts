import { Action, ActionDataGeneration } from '../../types/actions';
import { TestCaseDataVersion } from '../../types/testcase';

/**
 * Tìm version đang được sử dụng trong actions (có currentVersion trong action_datas)
 */
export const findActiveVersionInActions = (
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
 * Tìm version chứa generation ID cụ thể
 */
export const findVersionContainingGeneration = (
  testcaseDataVersions: TestCaseDataVersion[],
  generationId: string
): TestCaseDataVersion | null => {
  for (const version of testcaseDataVersions) {
    if (version.action_data_generations?.some(gen => gen.action_data_generation_id === generationId)) {
      return version;
    }
  }
  return null;
};

/**
 * Sync: Khi edit action value → cập nhật version metadata
 */
export const syncVersionMetadataOnActionEdit = (
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
 * Sync: Khi update version → cập nhật actions
 */
export const syncActionsOnVersionUpdate = (
  actions: Action[],
  versionName: string,
  versionGenerations: any[]
): Action[] => {
  return actions.map(action => {
    // Kiểm tra xem action có đang sử dụng version này không
    let isUsingThisVersion = false;
    for (const ad of action.action_datas || []) {
      if (ad.value && typeof ad.value === 'object' && ad.value.currentVersion === versionName) {
        isUsingThisVersion = true;
        break;
      }
    }
    
    if (!isUsingThisVersion || !action.action_data_generation || action.action_data_generation.length === 0) {
      return action;
    }
    
    // Tìm generation ID từ version cho action này
    let selectedGenerationId: string | null = null;
    for (const gen of versionGenerations) {
      if (gen.action_data_generation_id) {
        const genInAction = action.action_data_generation.find(
          g => g.action_data_generation_id === gen.action_data_generation_id
        );
        if (genInAction) {
          selectedGenerationId = gen.action_data_generation_id;
          break;
        }
      }
    }
    
    if (!selectedGenerationId) {
      return action;
    }
    
    // Lấy value từ generation
    const selectedGeneration = action.action_data_generation.find(
      g => g.action_data_generation_id === selectedGenerationId
    );
    
    const generationValue = selectedGeneration?.value?.value || 
      (selectedGeneration?.value && typeof selectedGeneration.value === 'string' 
        ? selectedGeneration.value : '');
    
    // Cập nhật action_datas
    const actionDatas = [...(action.action_datas || [])];
    let foundIndex = actionDatas.findIndex(ad => ad.value !== undefined);
    
    if (foundIndex === -1) {
      actionDatas.push({ 
        value: { 
          value: String(generationValue),
          currentVersion: versionName
        } 
      });
    } else {
      actionDatas[foundIndex] = {
        ...actionDatas[foundIndex],
        value: {
          ...(actionDatas[foundIndex].value || {}),
          value: String(generationValue),
          currentVersion: versionName
        }
      };
    }
    
    return {
      ...action,
      action_datas: actionDatas
    };
  });
};

/**
 * Sync: Khi user chọn generation khác trong action detail → cập nhật version đang được chọn
 */
export const syncVersionOnGenerationChange = (
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
          if (version && version.version && !affectedVersionNames.includes(version.version)) {
            affectedVersionNames.push(version.version);
          }
        }
      } else {
        // ⭐ XỬ LÝ GENERATION MỚI
        // Generation mới được thêm vào action
        const activeVersionName = findActiveVersionInActions(allActions);
        
        if (activeVersionName) {
          // Kiểm tra xem generation này có đang được chọn không
          const currentValue = updatedAction.action_datas?.find(
            ad => ad.value && typeof ad.value === 'object' && ad.value.value !== undefined
          )?.value?.value;
          
          const genValue = updatedGen.value?.value || 
            (typeof updatedGen.value === 'string' ? updatedGen.value : '');
          
          const isSelected = currentValue !== undefined && 
            String(currentValue) === String(genValue);
          
          if (isSelected) {
            // Thêm generation mới vào version đang active
            updatedVersions = updatedVersions.map(version => {
              if (version.version === activeVersionName) {
                const existingGenerations = version.action_data_generations || [];
                
                // Kiểm tra xem đã có generation nào cho action này chưa
                const hasGenerationForAction = existingGenerations.some(gen => {
                  return allActions
                    .find(a => a.action_id === updatedAction.action_id)
                    ?.action_data_generation
                    ?.some(g => g.action_data_generation_id === gen.action_data_generation_id);
                });
                
                if (!hasGenerationForAction) {
                  // Thêm generation mới
                  return {
                    ...version,
                    action_data_generations: [...existingGenerations, updatedGen],
                  };
                } else {
                  // Thay thế generation cũ bằng generation mới
                  return {
                    ...version,
                    action_data_generations: existingGenerations.map(gen => {
                      const isForThisAction = allActions
                        .find(a => a.action_id === updatedAction.action_id)
                        ?.action_data_generation
                        ?.some(g => g.action_data_generation_id === gen.action_data_generation_id);
                      
                      return isForThisAction ? updatedGen : gen;
                    }),
                  };
                }
              }
              return version;
            });
            
            const version = updatedVersions.find(v => v.version === activeVersionName);
            if (version && version.version && !affectedVersionNames.includes(version.version)) {
              affectedVersionNames.push(version.version);
            }
          }
        }
      }
    }
  }

  return { updatedVersions, affectedVersionNames };
};

/**
 * Đồng bộ 2 chiều: Đảm bảo action_data_generation trong actions và versions luôn đồng bộ
 * 
 * Nguyên tắc:
 * - Actions là source of truth cho danh sách generation
 * - Versions chỉ chứa reference đến generation từ actions
 * - Mọi thay đổi trong actions phải được phản ánh vào versions
 */
export const syncGenerationsBetweenActionsAndVersions = (
  actions: Action[],
  testcaseDataVersions: TestCaseDataVersion[],
  activeVersionName: string | null
): {
  updatedActions: Action[];
  updatedVersions: TestCaseDataVersion[];
} => {
  let updatedActions = [...actions];
  let updatedVersions = [...testcaseDataVersions];

  // 1. Xây dựng map: actionId -> generations
  const actionGenerationsMap = new Map<string, ActionDataGeneration[]>();
  actions.forEach(action => {
    if (action.action_id && action.action_data_generation) {
      actionGenerationsMap.set(action.action_id, action.action_data_generation);
    }
  });

  // 2. Đồng bộ từ actions → versions
  // Loại bỏ generation không còn tồn tại trong actions và cập nhật generation objects
  updatedVersions = updatedVersions.map(version => {
    if (!version.action_data_generations) {
      return version;
    }

    // Lọc và cập nhật generations từ actions (source of truth)
    const validGenerations: ActionDataGeneration[] = [];
    
    for (const versionGen of version.action_data_generations) {
      if (!versionGen.action_data_generation_id) continue;

      // Tìm generation này trong actions
      let foundGeneration: ActionDataGeneration | null = null;
      for (const [actionId, generations] of actionGenerationsMap) {
        const found = generations.find(
          g => g.action_data_generation_id === versionGen.action_data_generation_id
        );
        if (found) {
          foundGeneration = found; // Dùng generation từ action (source of truth)
          break;
        }
      }

      if (foundGeneration) {
        validGenerations.push(foundGeneration);
      }
    }

    return {
      ...version,
      action_data_generations: validGenerations,
    };
  });

  // 3. Thêm generation mới vào version đang active (nếu đang được chọn)
  if (activeVersionName) {
    const activeVersion = updatedVersions.find(v => v.version === activeVersionName);
    if (activeVersion) {
      const updatedActiveVersion = { ...activeVersion };
      const activeVersionGenerations = [...(updatedActiveVersion.action_data_generations || [])];

      // Duyệt qua tất cả actions
      actions.forEach(action => {
        if (!action.action_id || !action.action_data_generation) return;

        // Tìm generation đang được chọn trong action này
        const currentValue = action.action_datas?.find(
          ad => ad.value && typeof ad.value === 'object' && ad.value.value !== undefined
        )?.value?.value;

        if (currentValue === undefined) return;

        // Tìm generation có value khớp
        const selectedGeneration = action.action_data_generation.find(gen => {
          const genValue = gen.value?.value || 
            (typeof gen.value === 'string' ? gen.value : '');
          return String(genValue) === String(currentValue);
        });

        if (!selectedGeneration || !selectedGeneration.action_data_generation_id) return;

        // Kiểm tra xem version đã có generation này chưa
        const existingIndex = activeVersionGenerations.findIndex(
          g => g.action_data_generation_id === selectedGeneration.action_data_generation_id
        );

        if (existingIndex === -1) {
          // Generation chưa có trong version
          // Kiểm tra xem version đã có generation nào cho action này chưa
          const hasGenerationForAction = activeVersionGenerations.some(gen => {
            return action.action_data_generation?.some(
              g => g.action_data_generation_id === gen.action_data_generation_id
            );
          });

          if (!hasGenerationForAction) {
            // Chưa có generation nào cho action này, thêm generation mới
            activeVersionGenerations.push(selectedGeneration);
          } else {
            // Đã có generation khác cho action này, thay thế
            const indexToReplace = activeVersionGenerations.findIndex(gen => {
              return action.action_data_generation?.some(
                g => g.action_data_generation_id === gen.action_data_generation_id
              );
            });
            if (indexToReplace !== -1) {
              activeVersionGenerations[indexToReplace] = selectedGeneration;
            }
          }
        } else {
          // Generation đã có, cập nhật để đảm bảo value mới nhất
          activeVersionGenerations[existingIndex] = selectedGeneration;
        }
      });

      updatedActiveVersion.action_data_generations = activeVersionGenerations;
      updatedVersions = updatedVersions.map(v =>
        v.version === activeVersionName ? updatedActiveVersion : v
      );
    }
  }

  return { updatedActions, updatedVersions };
};
