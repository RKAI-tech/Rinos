import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { TestCaseInSuite } from '../../../types/testsuites';
import { Action } from '../../../types/actions';
import { ActionService } from '../../../services/actions';
import { TestCaseService } from '../../../services/testcases';
import { TestCaseDataVersion } from '../../../types/testcases';
import { ActionDataGeneration } from '../../../types/actions';
import { toast } from 'react-toastify';
import EditVersionModal from './EditVersionModal';
import NewVersionModal from './NewVersionModal';
import { truncateText } from '../../../utils/textUtils';
import './TestcaseDataVersionModal.css';

interface TestcaseDataVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  testcase: TestCaseInSuite | null;
  testSuiteId?: string | null;
}

type ActionTypeFilter = 'all' | 'data-driven' | 'static';

const TestcaseDataVersionModal: React.FC<TestcaseDataVersionModalProps> = ({
  isOpen,
  onClose,
  testcase,
  testSuiteId,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [actions, setActions] = useState<Action[]>([]);
  const [dataVersions, setDataVersions] = useState<TestCaseDataVersion[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Version selection states
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [localActions, setLocalActions] = useState<Action[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Filter states
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedActionTypes, setSelectedActionTypes] = useState<ActionTypeFilter[]>(['all', 'data-driven', 'static']);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [tempActionTypes, setTempActionTypes] = useState<ActionTypeFilter[]>(['all', 'data-driven', 'static']);
  const [tempVersions, setTempVersions] = useState<string[]>([]);

  // Search states
  const [searchText, setSearchText] = useState('');
  const [appliedSearchText, setAppliedSearchText] = useState('');

  // Version menu states
  const [openMenuVersionId, setOpenMenuVersionId] = useState<string | null>(null);
  const menuWrapperRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Edit version modal states
  const [isEditVersionModalOpen, setIsEditVersionModalOpen] = useState(false);
  const [versionToEdit, setVersionToEdit] = useState<TestCaseDataVersion | null>(null);

  // New version modal states
  const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);

  const filterWrapperRef = useRef<HTMLDivElement>(null);
  const filterModalRef = useRef<HTMLDivElement>(null);

  const actionService = useMemo(() => new ActionService(), []);
  const testCaseService = useMemo(() => new TestCaseService(), []);

  // Reset filters and search when modal opens/closes
  useEffect(() => {
    if (!isOpen || !testcase) {
      setActions([]);
      setDataVersions([]);
      setError(null);
      setSelectedVersionId(null);
      setLocalActions([]);
      setIsSaving(false);
      setSelectedActionTypes(['all', 'data-driven', 'static']);
      setSelectedVersions([]);
      setTempActionTypes(['all', 'data-driven', 'static']);
      setTempVersions([]);
      setSearchText('');
      setAppliedSearchText('');
      setIsFilterModalOpen(false);
      setOpenMenuVersionId(null);
      setIsEditVersionModalOpen(false);
      setVersionToEdit(null);
      setIsNewVersionModalOpen(false);
      return;
    }
    void loadData();
  }, [isOpen, testcase]);

  // Initialize temp filters when filter modal opens
  useEffect(() => {
    if (isFilterModalOpen) {
      setTempActionTypes(selectedActionTypes);
      setTempVersions(selectedVersions);
    }
  }, [isFilterModalOpen, selectedActionTypes, selectedVersions]);

  // Get currentVersion from actions
  const getCurrentVersionFromActions = useCallback((actionsToCheck: Action[]): string | null => {
    for (const action of actionsToCheck) {
      if (action.action_datas && action.action_datas.length > 0) {
        const firstActionData = action.action_datas[0];
        if (firstActionData.value && typeof firstActionData.value === 'object' && firstActionData.value.currentVersion) {
          return String(firstActionData.value.currentVersion);
        }
      }
    }
    return null;
  }, []);

  // Update currentVersion for all actions
  const updateActionsCurrentVersion = useCallback((actionsToUpdate: Action[], versionName: string, version: TestCaseDataVersion): Action[] => {
    return actionsToUpdate.map(action => {
      // Chỉ cập nhật actions có action_data_generation
      if (!action.action_data_generation || action.action_data_generation.length === 0) {
        return action;
      }

      // Tìm generation ID từ version cho action này
      let selectedGenerationId: string | null = null;
      if (version.action_data_generations) {
        for (const gen of version.action_data_generations) {
          if (gen.action_data_generation_id) {
            const genInAction = action.action_data_generation?.find(
              g => g.action_data_generation_id === gen.action_data_generation_id
            );
            if (genInAction) {
              selectedGenerationId = gen.action_data_generation_id;
              break;
            }
          }
        }
      }

      // Nếu không tìm thấy, dùng generation đầu tiên
      if (!selectedGenerationId && action.action_data_generation.length > 0) {
        selectedGenerationId = action.action_data_generation[0].action_data_generation_id || null;
      }

      // Lấy value từ generation
      const selectedGeneration = action.action_data_generation.find(
        g => g.action_data_generation_id === selectedGenerationId
      );

      const generationValue = selectedGeneration?.value?.value || 
        (selectedGeneration?.value && typeof selectedGeneration.value === 'string' ? selectedGeneration.value : '');

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
  }, []);

  // Normalize actions for save
  const normalizeActionsForSave = useCallback((actionsToNormalize: Action[]): Action[] => {
    return actionsToNormalize.map(action => ({
      ...action,
      // Normalize elements: set order_index theo thứ tự mới (1, 2, 3, ...)
      elements: (action.elements || []).map((el, idx) => ({
        ...el,
        order_index: idx + 1,
      })),
      // Đảm bảo tất cả generations có version_number
      action_data_generation: action.action_data_generation?.map((gen, idx) => ({
        ...gen,
        version_number: idx + 1,
      })),
    }));
  }, []);

  const loadData = async () => {
    if (!testcase) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch actions and data versions in parallel
      const [actionsResp, versionsResp] = await Promise.all([
        actionService.getActionsByTestCase(testcase.testcase_id, 1000, 0),
        testCaseService.getTestCaseDataVersions(testcase.testcase_id),
      ]);
      console.log('actionsResp', actionsResp);
      console.log('versionsResp', versionsResp);

      // Check if testcase was deleted (both API calls return empty data or 404)
      const isTestcaseDeleted = 
        (!actionsResp.success && actionsResp.error && (
          actionsResp.error.toLowerCase().includes('404') || 
          actionsResp.error.toLowerCase().includes('not found') ||
          actionsResp.error.toLowerCase().includes('does not exist')
        )) ||
        (!versionsResp.success && versionsResp.error && (
          versionsResp.error.toLowerCase().includes('404') || 
          versionsResp.error.toLowerCase().includes('not found') ||
          versionsResp.error.toLowerCase().includes('does not exist')
        ));

      if (isTestcaseDeleted) {
        console.info(`[TestcaseDataVersionModal] Testcase ${testcase.testcase_id} not found (likely deleted), closing modal`);
        onClose();
        return;
      }

      if (actionsResp.success && actionsResp.data) {
        const loadedActions = actionsResp.data.actions || [];
        setActions(loadedActions);
        setLocalActions(JSON.parse(JSON.stringify(loadedActions)));
      } else {
        setActions([]);
        setLocalActions([]);
        setSelectedVersionId(null);
        if (actionsResp.error) {
          toast.error(actionsResp.error);
        }
      }

      if (versionsResp.success && versionsResp.data) {
        const versions = versionsResp.data.testcase_data_versions || [];
        setDataVersions(versions);
        
        // Khởi tạo selectedVersions với tất cả version IDs (mặc định check tất cả)
        const allVersionIds = versions
          .map(v => v.testcase_data_version_id || v.version || '')
          .filter(id => id !== '');
        setSelectedVersions(allVersionIds);
        setTempVersions(allVersionIds);

        // Xác định selectedVersionId từ currentVersion của actions
        // currentVersion là version name, cần tìm version ID tương ứng
        if (actionsResp.success && actionsResp.data) {
          const loadedActions = actionsResp.data.actions || [];
          const currentVersionName = getCurrentVersionFromActions(loadedActions);
          if (currentVersionName) {
            const matchedVersion = versions.find(v => v.version === currentVersionName);
            if (matchedVersion) {
              setSelectedVersionId(matchedVersion.testcase_data_version_id || matchedVersion.version || null);
            }
          }
        }
      } else {
        setDataVersions([]);
        setSelectedVersions([]);
        setTempVersions([]);
        if (versionsResp.error) {
          toast.error(versionsResp.error);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'An unexpected error occurred';
      setError(msg);
      toast.error(msg);
      setActions([]);
      setDataVersions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Get value for a specific action and version
  const getValueForActionAndVersion = useCallback((actionId: string | undefined, version: TestCaseDataVersion): string => {
    if (!actionId || !version.action_data_generations) {
      return '—';
    }

    // Find the ActionDataGeneration for this action_id in this version
    const generation = version.action_data_generations.find(
      (gen) => gen.action_id === actionId
    );

    if (!generation || !generation.value) {
      return '—';
    }

    // Format the value
    if (typeof generation.value === 'string') {
      return generation.value;
    } else if (typeof generation.value === 'object') {
      // Check if it's a value object with a "value" property (common pattern)
      if (generation.value.value !== undefined) {
        return String(generation.value.value);
      }
      // Otherwise stringify the object
      return JSON.stringify(generation.value, null, 2);
    } else {
      return String(generation.value);
    }
  }, []);

  // Check if action is data-driven
  const isDataDrivenAction = useCallback((action: Action): boolean => {
    // Check if action has action_data_generation
    if (action.action_data_generation && action.action_data_generation.length > 0) {
      return true;
    }
    
    // Check if action has generation_data_function_code in action_datas
    if (action.action_datas) {
      for (const ad of action.action_datas) {
        const v: any = ad.value;
        if (v && typeof v === 'object' && v.generation_data_function_code) {
          return true;
        }
      }
    }
    
    return false;
  }, []);

  // Get action label parts (number and name)
  const getActionLabelParts = useCallback((action: Action, actionIndex: number): { number: string; name: string } => {
    const actionNumber = `#${actionIndex + 1}`;
    const actionName = action.description || action.action_type;
    return { number: actionNumber, name: actionName };
  }, []);

  // Get full action label for title attribute
  const getActionLabel = useCallback((action: Action, actionIndex: number): string => {
    const parts = getActionLabelParts(action, actionIndex);
    return `${parts.number}. ${parts.name}`;
  }, [getActionLabelParts]);

  // Filter and search logic - use localActions if available, otherwise actions
  const filteredActions = useMemo(() => {
    const actionsToFilter = localActions.length > 0 ? localActions : actions;
    return actionsToFilter.filter((action, actionIndex) => {
      // Filter by action type
      if (selectedActionTypes.length > 0 && !selectedActionTypes.includes('all')) {
        const isDataDriven = isDataDrivenAction(action);
        const shouldInclude =
          (selectedActionTypes.includes('data-driven') && isDataDriven) ||
          (selectedActionTypes.includes('static') && !isDataDriven);
        if (!shouldInclude) return false;
      }

      // Search by actions
      if (appliedSearchText) {
        const actionLabel = getActionLabel(action, actionIndex).toLowerCase();
        if (!actionLabel.includes(appliedSearchText.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [actions, localActions, selectedActionTypes, appliedSearchText, isDataDrivenAction, getActionLabel]);

  const filteredVersions = useMemo(() => {
    return dataVersions.filter((version) => {
      // Filter by selected versions
      if (selectedVersions.length > 0) {
        const versionId = version.testcase_data_version_id || version.version || '';
        if (!selectedVersions.includes(versionId)) {
          return false;
        }
      }

      return true;
    });
  }, [dataVersions, selectedVersions]);

  // Handle filter modal click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isFilterModalOpen &&
        filterWrapperRef.current &&
        !filterWrapperRef.current.contains(event.target as Node)
      ) {
        setIsFilterModalOpen(false);
      }
    };

    if (isFilterModalOpen) {
      document.addEventListener('mousedown', handleClickOutside, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isFilterModalOpen]);

  // Handle version menu click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuVersionId) {
        const wrapper = menuWrapperRefs.current.get(openMenuVersionId);
        if (wrapper && !wrapper.contains(event.target as Node)) {
          setOpenMenuVersionId(null);
        }
      }
    };

    if (openMenuVersionId) {
      document.addEventListener('mousedown', handleClickOutside, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [openMenuVersionId]);

  // Handle filter actions
  const handleActionTypeToggle = (type: ActionTypeFilter) => {
    if (type === 'all') {
      // Khi click "All": nếu đang chọn thì bỏ chọn tất cả, nếu chưa chọn thì chọn tất cả
      if (tempActionTypes.includes('all')) {
        setTempActionTypes([]);
      } else {
        setTempActionTypes(['all', 'data-driven', 'static']);
      }
    } else {
      // Khi click "Data driven" hoặc "Static"
      let newTypes: ActionTypeFilter[];
      if (tempActionTypes.includes(type)) {
        // Bỏ chọn type này
        newTypes = tempActionTypes.filter(t => t !== type);
        // Nếu đang có "all", cũng bỏ "all"
        newTypes = newTypes.filter(t => t !== 'all');
      } else {
        // Chọn type này
        newTypes = [...tempActionTypes.filter(t => t !== 'all'), type];
        // Kiểm tra xem cả "data-driven" và "static" đều được chọn chưa
        const hasDataDriven = newTypes.includes('data-driven');
        const hasStatic = newTypes.includes('static');
        if (hasDataDriven && hasStatic) {
          // Nếu cả 2 đều được chọn, tự động thêm "all"
          newTypes = ['all', 'data-driven', 'static'];
        }
      }
      setTempActionTypes(newTypes.length > 0 ? newTypes : []);
    }
  };

  const handleVersionToggle = (versionId: string) => {
    setTempVersions(prev =>
      prev.includes(versionId)
        ? prev.filter(id => id !== versionId)
        : [...prev, versionId]
    );
  };

  const handleApplyFilter = () => {
    setSelectedActionTypes(tempActionTypes);
    setSelectedVersions(tempVersions);
    setIsFilterModalOpen(false);
  };

  const handleResetFilter = () => {
    setTempActionTypes(['all', 'data-driven', 'static']);
    // Reset về tất cả versions
    const allVersionIds = dataVersions
      .map(v => v.testcase_data_version_id || v.version || '')
      .filter(id => id !== '');
    setTempVersions(allVersionIds);
  };

  // Handle search
  const handleSearch = () => {
    setAppliedSearchText(searchText);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle version selection
  const handleVersionSelect = useCallback((versionId: string) => {
    const version = dataVersions.find(v => (v.testcase_data_version_id || v.version) === versionId);
    if (!version || !version.version) return;

    setSelectedVersionId(versionId);
    const updatedActions = updateActionsCurrentVersion(actions, version.version, version);
    setLocalActions(updatedActions);
  }, [actions, dataVersions, updateActionsCurrentVersion]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!testcase || isSaving) return;

    try {
      setIsSaving(true);
      setError(null);

      const actionsToSave = localActions.length > 0 ? localActions : actions;
      
      if (actionsToSave.length === 0) {
        toast.warning('No actions to save');
        setIsSaving(false);
        return;
      }

      // Normalize actions before saving
      const normalizedActions = normalizeActionsForSave(actionsToSave);

      // Convert versions to save format
      const versionsToSave = dataVersions.length > 0
        ? dataVersions.map((v) => ({
            testcase_data_version_id: v.testcase_data_version_id,
            version: v.version,
            action_data_generation_ids: v.action_data_generations
              ?.map(gen => gen.action_data_generation_id)
              .filter((id): id is string => !!id) || [],
          }))
        : undefined;

      const response = await actionService.batchCreateActions(normalizedActions, versionsToSave, testcase?.project_id);

      if (response.success) {
        toast.success('Actions saved successfully');
        // Reload data
        await loadData();
      } else {
        const errorMsg = response.error || 'Failed to save actions';
        toast.error(errorMsg);
        setError(errorMsg);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'An unexpected error occurred';
      toast.error(msg);
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  }, [testcase, localActions, actions, dataVersions, actionService, normalizeActionsForSave, isSaving]);

  // Handle version menu toggle
  const handleVersionMenuToggle = (versionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuVersionId(openMenuVersionId === versionId ? null : versionId);
  };

  // Handle Edit version
  const handleEditVersion = (version: TestCaseDataVersion) => {
    setVersionToEdit(version);
    setIsEditVersionModalOpen(true);
    setOpenMenuVersionId(null);
  };

  // Handle update version from EditVersionModal
  const handleUpdateVersion = useCallback(async (updatedVersion: { version: string; action_data_generation_ids: string[] }) => {
    if (!versionToEdit || !testcase) return;

    try {
      setIsSaving(true);
      setError(null);

      // Convert from save format to API format
      const updatedVersionAPI: TestCaseDataVersion = {
        ...versionToEdit,
        version: updatedVersion.version,
        action_data_generations: updatedVersion.action_data_generation_ids
          .map(genId => {
            // Find the generation object from actions
            for (const action of localActions.length > 0 ? localActions : actions) {
              const gen = action.action_data_generation?.find(g => g.action_data_generation_id === genId);
              if (gen) return gen;
            }
            return null;
          })
          .filter((gen): gen is NonNullable<typeof gen> => gen !== null),
      };
      
      // Update dataVersions
      setDataVersions(prev => prev.map(v => {
        const versionId = v.testcase_data_version_id || v.version || '';
        const editVersionId = versionToEdit.testcase_data_version_id || versionToEdit.version || '';
        if (versionId === editVersionId) {
          return updatedVersionAPI;
        }
        return v;
      }));
      
      // If version is currently active, update actions with new version data
      const currentVersionName = getCurrentVersionFromActions(localActions.length > 0 ? localActions : actions);
      const isVersionActive = currentVersionName === versionToEdit.version;
      
      if (isVersionActive) {
        const updatedActions = updateActionsCurrentVersion(
          localActions.length > 0 ? localActions : actions,
          updatedVersion.version,
          updatedVersionAPI
        );
        setLocalActions(updatedActions);
      }

      // Save changes
      const actionsToSave = localActions.length > 0 ? localActions : actions;
      const normalizedActions = normalizeActionsForSave(actionsToSave);

      const versionsToSave = dataVersions.map((v) => {
        const versionId = v.testcase_data_version_id || v.version || '';
        const editVersionId = versionToEdit.testcase_data_version_id || versionToEdit.version || '';
        if (versionId === editVersionId) {
          return {
            testcase_data_version_id: updatedVersionAPI.testcase_data_version_id,
            version: updatedVersionAPI.version,
            action_data_generation_ids: updatedVersion.action_data_generation_ids,
          };
        }
        return {
          testcase_data_version_id: v.testcase_data_version_id,
          version: v.version,
          action_data_generation_ids: v.action_data_generations
            ?.map(gen => gen.action_data_generation_id)
            .filter((id): id is string => !!id) || [],
        };
      });

      const response = await actionService.batchCreateActions(normalizedActions, versionsToSave, testcase?.project_id);

      if (response.success) {
        toast.success('Test Data updated successfully');
        setIsEditVersionModalOpen(false);
        setVersionToEdit(null);
        // Reload data
        await loadData();
      } else {
        const errorMsg = response.error || 'Failed to update Test Data';
        toast.error(errorMsg);
        setError(errorMsg);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'An unexpected error occurred';
      toast.error(msg);
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  }, [versionToEdit, testcase, localActions, actions, dataVersions, actionService, updateActionsCurrentVersion, normalizeActionsForSave, getCurrentVersionFromActions, loadData]);

  // Handle create new version from NewVersionModal
  const handleCreateNewVersion = useCallback(async (newVersion: { version: string; action_data_generation_ids: string[] }) => {
    if (!testcase) return;

    try {
      setIsSaving(true);
      setError(null);

      // Convert from save format to API format
      const newVersionAPI: TestCaseDataVersion = {
        version: newVersion.version,
        action_data_generations: newVersion.action_data_generation_ids
          .map(genId => {
            // Find the generation object from actions
            for (const action of localActions.length > 0 ? localActions : actions) {
              const gen = action.action_data_generation?.find(g => g.action_data_generation_id === genId);
              if (gen) return gen;
            }
            return null;
          })
          .filter((gen): gen is NonNullable<typeof gen> => gen !== null),
      };
      
      // Add new version to dataVersions
      const updatedDataVersions = [...dataVersions, newVersionAPI];
      setDataVersions(updatedDataVersions);

      // Save changes
      const actionsToSave = localActions.length > 0 ? localActions : actions;
      const normalizedActions = normalizeActionsForSave(actionsToSave);

      const versionsToSave = updatedDataVersions.map((v) => ({
        testcase_data_version_id: v.testcase_data_version_id,
        version: v.version,
        action_data_generation_ids: v.action_data_generations
          ?.map(gen => gen.action_data_generation_id)
          .filter((id): id is string => !!id) || [],
      }));

      const response = await actionService.batchCreateActions(normalizedActions, versionsToSave, testcase?.project_id);

      if (response.success) {
        toast.success('Test Data created successfully');
        setIsNewVersionModalOpen(false);
        // Reload data
        await loadData();
      } else {
        const errorMsg = response.error || 'Failed to create Test Data';
        toast.error(errorMsg);
        setError(errorMsg);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'An unexpected error occurred';
      toast.error(msg);
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  }, [testcase, localActions, actions, dataVersions, actionService, normalizeActionsForSave, loadData]);

  // Handle Record version
  const handleRecordVersion = useCallback(async (version: TestCaseDataVersion) => {
    if (!testcase || !version.version) {
      toast.error('Invalid testcase or version');
      return;
    }

    setOpenMenuVersionId(null);

    try {
      setIsSaving(true);
      setError(null);

      // Update actions with the selected version
      const updatedActions = updateActionsCurrentVersion(actions, version.version, version);
      
      // Normalize actions before saving
      const normalizedActions = normalizeActionsForSave(updatedActions);

      // Convert versions to save format
      const versionsToSave = dataVersions.length > 0
        ? dataVersions.map((v) => ({
            testcase_data_version_id: v.testcase_data_version_id,
            version: v.version,
            action_data_generation_ids: v.action_data_generations
              ?.map(gen => gen.action_data_generation_id)
              .filter((id): id is string => !!id) || [],
          }))
        : undefined;

      const response = await actionService.batchCreateActions(normalizedActions, versionsToSave, testcase?.project_id);

      if (response.success) {
        toast.success('Actions saved successfully');
        
        // Open recorder window
        const projectId = testcase.project_id;
        const testcaseName = testcase.name || '';
        const browserType = testcase.browser_type || 'chrome';
        
        try {
          const token = await (window as any).tokenStore?.get?.();
          (window as any).browserAPI?.browser?.setAuthToken?.(token);
          
          const result = await (window as any).screenHandleAPI?.openRecorder?.(
            testcase.testcase_id,
            projectId,
            testcaseName,
            browserType,
            testSuiteId || undefined
          );
          
          if (result?.alreadyOpen) {
            toast.warning('Recorder for this testcase is already open.');
          } else if (result?.created) {
            toast.success('Recorder opened successfully');
          }
        } catch (err) {
          console.error('[TestcaseDataVersionModal] openRecorder error:', err);
          toast.error('Failed to open recorder');
        }
      } else {
        const errorMsg = response.error || 'Failed to save actions';
        toast.error(errorMsg);
        setError(errorMsg);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'An unexpected error occurred';
      toast.error(msg);
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  }, [testcase, actions, dataVersions, actionService, updateActionsCurrentVersion, normalizeActionsForSave]);

  // Handle Run version
  const handleRunVersion = useCallback(async (version: TestCaseDataVersion) => {
    if (!testcase || !version.version) {
      toast.error('Invalid testcase or version');
      return;
    }

    setOpenMenuVersionId(null);

    try {
      setIsSaving(true);
      setError(null);

      // Select version tương ứng trước
      const versionId = version.testcase_data_version_id || version.version || '';
      setSelectedVersionId(versionId);
      
      // Update actions with the selected version
      const updatedActions = updateActionsCurrentVersion(actions, version.version, version);
      setLocalActions(updatedActions);
      
      // Đợi một chút để UI cập nhật selectedVersionId trước khi save
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Normalize actions before saving
      const normalizedActions = normalizeActionsForSave(updatedActions);

      // Convert versions to save format
      const versionsToSave = dataVersions.length > 0
        ? dataVersions.map((v) => ({
            testcase_data_version_id: v.testcase_data_version_id,
            version: v.version,
            action_data_generation_ids: v.action_data_generations
              ?.map(gen => gen.action_data_generation_id)
              .filter((id): id is string => !!id) || [],
          }))
        : undefined;

      // Gọi API lưu
      const response = await actionService.batchCreateActions(normalizedActions, versionsToSave, testcase?.project_id);

      if (response.success) {
        toast.success('Actions saved successfully');
        
        // Đóng cửa sổ trước
        setActions([]);
        setDataVersions([]);
        setError(null);
        setSelectedVersionId(null);
        setLocalActions([]);
        setIsSaving(false);
        setSelectedActionTypes(['all', 'data-driven', 'static']);
        setSelectedVersions([]);
        setSearchText('');
        setAppliedSearchText('');
        setIsFilterModalOpen(false);
        setOpenMenuVersionId(null);
        setIsEditVersionModalOpen(false);
        setVersionToEdit(null);
        onClose();
        
        // Sau đó mới gọi API run testcase
        const executeResponse = await testCaseService.executeTestCase({
          testcase_id: testcase.testcase_id,
          test_suite_id: testSuiteId || undefined
        });

        if (executeResponse.success) {
        } else {
          toast.error(executeResponse.error || 'Failed to execute testcase');
        }
      } else {
        const errorMsg = response.error || 'Failed to save actions';
        toast.error(errorMsg);
        setError(errorMsg);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'An unexpected error occurred';
      toast.error(msg);
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  }, [testcase, actions, dataVersions, actionService, testCaseService, updateActionsCurrentVersion, normalizeActionsForSave, onClose, testSuiteId]);

  const handleClose = () => {
    setActions([]);
    setDataVersions([]);
    setError(null);
    setSelectedVersionId(null);
    setLocalActions([]);
    setIsSaving(false);
    setSelectedActionTypes(['all', 'data-driven', 'static']);
    setSelectedVersions([]);
    setSearchText('');
    setAppliedSearchText('');
    setIsFilterModalOpen(false);
    setOpenMenuVersionId(null);
    setIsEditVersionModalOpen(false);
    setVersionToEdit(null);
    setIsNewVersionModalOpen(false);
    onClose();
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="tdvm-overlay" onClick={handleClose}>
      <div className="tdvm-container" onClick={(e) => e.stopPropagation()}>
        <div className="tdvm-header">
          <h2 className="tdvm-title">
            Test Data - {testcase?.name || 'Testcase'}
          </h2>
          <div className="tdvm-header-actions">
            <button 
              className="tdvm-reload" 
              onClick={loadData} 
              disabled={isLoading}
              aria-label="Reload"
              title="Reload data"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 11a8.1 8.1 0 0 0-15.5-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 5v4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 13a8.1 8.1 0 0 0 15.5 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 19v-4h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button 
              className="tdvm-new" 
              onClick={() => setIsNewVersionModalOpen(true)}
              disabled={isLoading}
              aria-label="New Test Data"
              title="Create new Test Data"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              New
            </button>
            <button className="tdvm-close" onClick={handleClose} aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        <div className="tdvm-body">
          {/* Search and Filter Controls */}
          {!isLoading && !error && (
            <div className="tdvm-controls">
              {/* Search Bar */}
              <div className="tdvm-search-wrapper">
                <div className="tdvm-search-input-wrapper">
                  <div className="tdvm-search-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    className="tdvm-search-input"
                    placeholder="Search actions..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                  />
                  <button
                    className="tdvm-search-btn"
                    onClick={handleSearch}
                    aria-label="Search"
                  >
                    Search
                  </button>
                </div>
              </div>

              {/* Filter Button */}
              <div className="tdvm-filter-wrapper" ref={filterWrapperRef}>
                <button
                  className="tdvm-filter-button"
                  onClick={() => setIsFilterModalOpen(!isFilterModalOpen)}
                  aria-haspopup="true"
                  aria-expanded={isFilterModalOpen}
                >
                  <span className="tdvm-filter-icon" aria-hidden>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                  </span>
                  Filter
                </button>
                {isFilterModalOpen && (
                  <div className="tdvm-filter-modal" ref={filterModalRef}>
                    <div className="tdvm-filter-content">
                      {/* Action Type Filter */}
                      <div className="tdvm-filter-group">
                        <label className="tdvm-filter-label">Action Type</label>
                        <div className="tdvm-filter-checkboxes">
                          <label className="tdvm-filter-checkbox">
                            <input
                              type="checkbox"
                              checked={tempActionTypes.includes('all')}
                              onChange={() => handleActionTypeToggle('all')}
                            />
                            <span>All</span>
                          </label>
                          <label className="tdvm-filter-checkbox">
                            <input
                              type="checkbox"
                              checked={tempActionTypes.includes('data-driven')}
                              onChange={() => handleActionTypeToggle('data-driven')}
                            />
                            <span>Data driven</span>
                          </label>
                          <label className="tdvm-filter-checkbox">
                            <input
                              type="checkbox"
                              checked={tempActionTypes.includes('static')}
                              onChange={() => handleActionTypeToggle('static')}
                            />
                            <span>Static</span>
                          </label>
                        </div>
                      </div>

                      {/* Version Filter */}
                      <div className="tdvm-filter-group">
                        <label className="tdvm-filter-label">Test Data</label>
                        <div className="tdvm-filter-checkboxes tdvm-filter-checkboxes-scrollable">
                          {dataVersions.map((version) => {
                            const versionId = version.testcase_data_version_id || version.version || '';
                            const versionName = version.version || 'Unnamed Version';
                            return (
                              <label key={versionId} className="tdvm-filter-checkbox">
                                <input
                                  type="checkbox"
                                  checked={tempVersions.includes(versionId)}
                                  onChange={() => handleVersionToggle(versionId)}
                                />
                                <span>{versionName}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="tdvm-filter-actions">
                        <button
                          className="tdvm-filter-reset-btn"
                          onClick={handleResetFilter}
                          type="button"
                        >
                          Reset
                        </button>
                        <button
                          className="tdvm-filter-apply-btn"
                          onClick={handleApplyFilter}
                          type="button"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="tdvm-loading">
              <div className="tdvm-spinner"></div>
              <span>Loading Test Data...</span>
            </div>
          )}

          {error && !isLoading && (
            <div className="tdvm-error">
              <p>{error}</p>
              <button className="tdvm-retry-btn" onClick={loadData}>
                Retry
              </button>
            </div>
          )}

          {!isLoading && !error && (
            <>
              {dataVersions.length === 0 ? (
                <div className="tdvm-empty">
                  <div className="tdvm-empty-icon">📊</div>
                  <div className="tdvm-empty-text">No Test Data found for this testcase.</div>
                </div>
              ) : actions.length === 0 ? (
                <div className="tdvm-empty">
                  <div className="tdvm-empty-icon">🔧</div>
                  <div className="tdvm-empty-text">No actions found in this testcase.</div>
                </div>
              ) : (
                <>
                  {(filteredActions.length === 0 || filteredVersions.length === 0) ? (
                    <div className="tdvm-empty">
                      <div className="tdvm-empty-icon">🔍</div>
                      <div className="tdvm-empty-text">
                        {filteredActions.length === 0 && filteredVersions.length === 0
                          ? 'No results match your filters and search criteria.'
                          : filteredActions.length === 0
                          ? 'No actions match your filters and search criteria.'
                          : 'No versions match your filters and search criteria.'}
                      </div>
                    </div>
                  ) : (
                    <div className="tdvm-table-wrapper">
                      <table className="tdvm-table">
                        <thead>
                          <tr>
                            <th className="tdvm-th-action">Action</th>
                            {filteredVersions.map((version) => {
                              const versionId = version.testcase_data_version_id || version.version || '';
                              const isMenuOpen = openMenuVersionId === versionId;
                              return (
                                <th key={versionId} className="tdvm-th-version">
                                  <div className="tdvm-version-header">
                                    <span>{version.version || 'Unnamed Version'}</span>
                                    <input
                                      type="radio"
                                      name="version-selection"
                                      checked={selectedVersionId === versionId}
                                      onChange={() => handleVersionSelect(versionId)}
                                      className="tdvm-version-radio"
                                    />
                                    <div 
                                      className="tdvm-version-menu-wrapper"
                                      ref={(el) => {
                                        if (el) {
                                          menuWrapperRefs.current.set(versionId, el);
                                        } else {
                                          menuWrapperRefs.current.delete(versionId);
                                        }
                                      }}
                                    >
                                      <button
                                        className="tdvm-version-menu-btn"
                                        onClick={(e) => handleVersionMenuToggle(versionId, e)}
                                        aria-label="Test Data menu"
                                        title="Test Data options"
                                      >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                          <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
                                          <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                                          <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
                                        </svg>
                                      </button>
                                      {isMenuOpen && (
                                        <div className="tdvm-version-menu-dropdown">
                                          <button
                                            className="tdvm-version-menu-item"
                                            onClick={() => handleEditVersion(version)}
                                            title="Edit Test Data"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            className="tdvm-version-menu-item"
                                            onClick={() => handleRecordVersion(version)}
                                            disabled={isSaving}
                                            title="Record with this dataset"
                                          >
                                            Record
                                          </button>
                                          <button
                                            className="tdvm-version-menu-item"
                                            onClick={() => handleRunVersion(version)}
                                            disabled={isSaving}
                                            title="Run with this dataset"
                                          >
                                            Run
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredActions.map((action, actionIndex) => {
                            const actionsToSearch = localActions.length > 0 ? localActions : actions;
                            const originalIndex = actionsToSearch.findIndex(a => a.action_id === action.action_id);
                            const labelParts = getActionLabelParts(action, originalIndex >= 0 ? originalIndex : actionIndex);
                            return (
                              <tr key={action.action_id || actionIndex}>
                                <td className="tdvm-td-action" title={getActionLabel(action, originalIndex >= 0 ? originalIndex : actionIndex)}>
                                  <span className="tdvm-action-number">{labelParts.number}</span>
                                  {'. '}
                                  <span className="tdvm-action-name">{labelParts.name}</span>
                                </td>
                                {filteredVersions.map((version) => {
                                  const fullValue = getValueForActionAndVersion(action.action_id, version);
                                  return (
                                    <td
                                      key={version.testcase_data_version_id || version.version}
                                      className="tdvm-td-value"
                                      title={fullValue}
                                    >
                                      <div className="tdvm-cell-content">
                                        {truncateText(fullValue, 50)}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <div className="tdvm-footer">
          <button 
            className="tdvm-btn tdvm-btn-save" 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button className="tdvm-btn" onClick={handleClose}>
            Close
          </button>
        </div>
      </div>

      {/* Edit Version Modal */}
      {isEditVersionModalOpen && versionToEdit && (
        <EditVersionModal
          actions={localActions.length > 0 ? localActions : actions}
          version={versionToEdit}
          onClose={() => {
            setIsEditVersionModalOpen(false);
            setVersionToEdit(null);
          }}
          onUpdateVersion={handleUpdateVersion}
          onActionsChange={(updater) => {
            const currentActions = localActions.length > 0 ? localActions : actions;
            const updated = updater(currentActions);
            setLocalActions(updated);
            setActions(updated);
          }}
          testcaseDataVersions={dataVersions}
          onTestCaseDataVersionsChange={(updater) => {
            setDataVersions(updater(dataVersions));
          }}
        />
      )}

      {/* New Version Modal */}
      {isNewVersionModalOpen && (
        <NewVersionModal
          actions={localActions.length > 0 ? localActions : actions}
          onClose={() => setIsNewVersionModalOpen(false)}
          onCreateVersion={handleCreateNewVersion}
          onActionsChange={(updater) => {
            const currentActions = localActions.length > 0 ? localActions : actions;
            const updated = updater(currentActions);
            setLocalActions(updated);
            setActions(updated);
          }}
          testcaseDataVersions={dataVersions}
          onTestCaseDataVersionsChange={(updater) => {
            setDataVersions(updater(dataVersions));
          }}
        />
      )}
    </div>
  );
};

export default TestcaseDataVersionModal;

