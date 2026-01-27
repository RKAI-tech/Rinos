import React, { useEffect, useState, useRef } from "react";
import "./AssertWithValueModal.css";
import { StatementService } from "../../../services/statements";
import { apiRouter } from "../../../services/baseAPIRequest";
import QueryResultTableSelectable from "./QueryResultTableSelectable";
import AssertApiElementPanel from "./AssertApiElementPanel";
import {
  Connection,
  ApiRequestData,
  Statement,
  CreateType,
} from "../../../types/actions";
import {
  executeApiRequest,
  validateApiRequest,
  convertApiRequestDataToOptions,
} from "../../../utils/api_request";
import { VariableService } from "../../../services/variables";
import { Variable } from "../../../types/variables";
import { decryptObject } from "../../../services/encryption";
import { setConnectionCache } from "../../../utils/databaseConnectionCache";
const statementService = new StatementService();
const variableService = new VariableService();

/**
 * Xác định các trường cần mã hóa/giải mã trong DatabaseConnection
 * Các trường không mã hóa: project_id, db_type, security_type, ssl_mode, ssh_auth_method, connection_id, port
 */
function getFieldsToEncryptForDatabaseConnection(): string[] {
  return [
    'connection_name',
    'db_name',
    'host',
    'username',
    'password',
    'ca_certificate',
    'client_certificate',
    'client_private_key',
    'ssl_key_passphrase',
    'ssh_host',
    'ssh_username',
    'ssh_private_key',
    'ssh_key_passphrase',
    'ssh_password',
    'local_port'
  ];
}

export interface SelectedPageInfo {
  page_index: number;
  page_url: string;
  page_title: string;
}

type ValueSourceType = "manual" | "database" | "api" | "variables";

interface ConnectionOption {
  id: string;
  label: string;
}

interface AssertWithValueModalProps {
  isOpen: boolean;
  testcaseId?: string | null;
  assertType: string; // toHaveText, toContainText, toHaveValue
  onClose: () => void;
  onConfirm: (
    value: string,
    element: {
      selectors: string[];
      domHtml: string;
      value: string;
      pageIndex?: number | null;
      pageUrl?: string | null;
      pageTitle?: string | null;
      element_data?: Record<string, any>;
    },
    pageInfo?: SelectedPageInfo,
    statement?: Statement,
    apiRequest?: ApiRequestData,
    valueSourceType?: ValueSourceType
  ) => void;
  selectedPageInfo?: SelectedPageInfo | null;
  onClearPage?: () => void;
  onPageInfoChange?: (pageInfo: SelectedPageInfo) => void;
  selectedElement?: {
    selectors: string[];
    domHtml: string;
    value: string;
    pageIndex?: number | null;
    pageUrl?: string | null;
    pageTitle?: string | null;
    element_data?: Record<string, any>;
  } | null;
  onClearElement?: () => void;
}

const AssertWithValueModal: React.FC<AssertWithValueModalProps> = ({
  isOpen,
  testcaseId,
  assertType,
  onClose,
  onConfirm,
  selectedPageInfo,
  onClearPage,
  onPageInfoChange,
  selectedElement,
  onClearElement,
}) => {
  const [valueSourceType, setValueSourceType] =
    useState<ValueSourceType>("manual");
  const [value, setValue] = useState<string>("");
  const valueInputRef = useRef<HTMLInputElement>(null);

  // Database state
  const [connections, setConnections] = useState<ConnectionOption[]>([]);
  const [connectionMap, setConnectionMap] = useState<
    Record<string, Connection>
  >({});
  const [isLoadingConns, setIsLoadingConns] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [isRunningQuery, setIsRunningQuery] = useState(false);
  const [queryResultData, setQueryResultData] = useState<any[]>([]);
  const [selectedCellValue, setSelectedCellValue] = useState<string>("");

  // API state
  const [apiRequest, setApiRequest] = useState<ApiRequestData | undefined>(
    undefined
  );
  const [apiResponse, setApiResponse] = useState<
    { status: number; data: any; headers: any } | undefined
  >(undefined);
  const [isSendingApi, setIsSendingApi] = useState(false);
  const [selectedApiCellValue, setSelectedApiCellValue] = useState<string>("");

  // Variables state
  const [variables, setVariables] = useState<Variable[]>([]);
  const [isLoadingVariables, setIsLoadingVariables] = useState(false);
  const [variablesSearch, setVariablesSearch] = useState("");
  const [selectedVariableName, setSelectedVariableName] = useState<string>("");
  const [selectedVariable, setSelectedVariable] = useState<any | null>(null);
  const [selectedVariableStatementId, setSelectedVariableStatementId] = useState<string>("");
  const [variablesPage, setVariablesPage] = useState<number>(1);

  // Message states for inline display
  const [queryMessage, setQueryMessage] = useState<{ type: "success" | "error" | "info" | "warning"; text: string } | null>(null);
  const [apiMessage, setApiMessage] = useState<{ type: "success" | "error" | "info" | "warning"; text: string } | null>(null);
  const [variableMessage, setVariableMessage] = useState<{ type: "success" | "error" | "info" | "warning"; text: string } | null>(null);
  const [confirmMessage, setConfirmMessage] = useState<{ type: "success" | "error" | "info" | "warning"; text: string } | null>(null);

  // Load connections mỗi lần mở modal
  useEffect(() => {
    const loadConnections = async () => {
      try {
        setIsLoadingConns(true);
        const projectId = await (
          window as any
        ).browserAPI?.browser?.getProjectId?.();
        if (!projectId) {
          setConnections([]);
          setConnectionMap({});
          return;
        }
        const resp = await apiRouter.request<any>(
          "/database-connections/get_list",
          {
            method: "POST",
            body: JSON.stringify({ project_id: projectId }),
          }
        );
        if (resp.success && (resp as any).data?.connections) {
          let rawConns: Connection[] = (resp as any).data.connections;
          
          // Decrypt connections if needed
          const projectIdStr = String(projectId);
          try {
            const encryptionKey = await (window as any).encryptionStore?.getKey?.(projectIdStr);
            if (encryptionKey) {
              const fieldsToDecrypt = getFieldsToEncryptForDatabaseConnection();
              rawConns = await Promise.all(
                rawConns.map(async (connection) => {
                  try {
                    return await decryptObject(connection, encryptionKey, fieldsToDecrypt);
                  } catch (error) {
                    // Keep original connection if decryption fails (backward compatibility)
                    return connection;
                  }
                })
              );
            }
          } catch (error) {
            // Keep original response if decryption fails (backward compatibility)
          }
          
          setConnectionCache(rawConns);
          const opts: ConnectionOption[] = rawConns.map((c: any) => ({
            id: c.connection_id,
            label: `${c.connection_name} (${String(c.db_type).toUpperCase()} • ${c.host}:${c.port})`,
          }));
          setConnections(opts);
          const map: Record<string, Connection> = {};
          rawConns.forEach((c: any) => {
            map[c.connection_id] = c as Connection;
          });
          setConnectionMap(map);
        } else {
          setConnections([]);
          setConnectionMap({});
        }
      } finally {
        setIsLoadingConns(false);
      }
    };

    if (isOpen) {
      loadConnections();
    }
  }, [isOpen]);

  // Load variables khi mở modal hoặc khi chọn mode Variables
  useEffect(() => {
    const loadVariables = async () => {
      try {
        setIsLoadingVariables(true);
        const projectId = await (
          window as any
        ).browserAPI?.browser?.getProjectId?.();
        if (!projectId) {
          setVariables([]);
          return;
        }
        const resp = await variableService.getVariablesByProject(projectId);
        if (resp.success && resp.data && Array.isArray(resp.data.items)) {
          setVariables(resp.data.items);
        } else {
          setVariables([]);
        }
      } catch (e) {
        setVariables([]);
      } finally {
        setIsLoadingVariables(false);
      }
    };

    if (isOpen && valueSourceType === "variables") {
      loadVariables();
    }
  }, [isOpen, valueSourceType]);

  // Tự động cập nhật page info từ element khi element được chọn
  useEffect(() => {
    if (
      selectedElement &&
      selectedElement.pageIndex !== null &&
      selectedElement.pageIndex !== undefined
    ) {
      if (
        !selectedPageInfo ||
        selectedPageInfo.page_index !== selectedElement.pageIndex
      ) {
        const pageData: SelectedPageInfo = {
          page_index: selectedElement.pageIndex,
          page_url: selectedElement.pageUrl || "",
          page_title: selectedElement.pageTitle || "",
        };
        if (onPageInfoChange) {
          onPageInfoChange(pageData);
        }
      }
    }
  }, [selectedElement, selectedPageInfo, onPageInfoChange]);

  // Auto-fill value from element DOM when valueSourceType is 'manual'
  // Tự động cập nhật value mỗi khi element thay đổi
  useEffect(() => {
    if (valueSourceType !== "manual") {
      return;
    }

    if (!selectedElement) {
      return;
    }

    try {
      let valueFromElement = "";

      // Try to get from element_data
      if (selectedElement.element_data) {
        const elementData = selectedElement.element_data;

        // For toHaveValue: get value attribute or input value
        if (assertType === "toHaveValue") {
          valueFromElement =
            elementData.value ||
            elementData.inputValue ||
            (elementData.attributes &&
              (elementData.attributes.value ||
                elementData.attributes["value"])) ||
            "";
        } else {
          // For toHaveText, toContainText: get text content
          valueFromElement =
            elementData.textContent ||
            elementData.innerText ||
            elementData.text ||
            "";
        }
      }

      // Fallback: try to parse from DOM HTML
      if (!valueFromElement && selectedElement.domHtml) {
        if (assertType === "toHaveValue") {
          // Try to extract value attribute from HTML
          const valueMatch = selectedElement.domHtml.match(
            /value\s*=\s*["']([^"']*)["']/i
          );
          if (valueMatch) {
            valueFromElement = valueMatch[1];
          }
        } else {
          // For text, use value from selectedElement
          valueFromElement = selectedElement.value || "";
        }
      }

      // Luôn cập nhật value theo element khi chọn Manual Input
      if (valueFromElement && valueFromElement.trim()) {
        setValue(valueFromElement.trim());
      } else {
        // Nếu không tìm thấy value, set về rỗng
        setValue("");
      }
    } catch (error) {
      /* console.error("Error extracting value from element:", error); */
      setValue("");
    }
  }, [valueSourceType, selectedElement, assertType]);

  const getElementTypeFromDom = (html?: string): string | undefined => {
    try {
      const m = (html || "").match(/^\s*<\s*([a-zA-Z0-9-]+)/);
      return m ? m[1].toLowerCase() : undefined;
    } catch {
      return undefined;
    }
  };

  const getElementText = (): string => {
    if (!selectedElement) return "";
    const raw = (selectedElement.value || "").trim();
    if (raw) return raw;
    const tag = getElementTypeFromDom(selectedElement.domHtml);
    if (tag) return `<${tag}>`;
    return "(No text available)";
  };

  const hasSelectedElement =
    !!selectedElement &&
    selectedElement.selectors &&
    selectedElement.selectors.length > 0;
  const hasSelectedPage = !!selectedPageInfo;

  const handleConfirm = async () => {
    setConfirmMessage(null);
    
    if (!value.trim()) {
      setConfirmMessage({ type: "warning", text: "Please enter a value" });
      return;
    }
    if (!hasSelectedElement) {
      setConfirmMessage({ type: "warning", text: "Please select an element first" });
      return;
    }
    if (!hasSelectedPage) {
      setConfirmMessage({ type: "warning", text: "Please select a page first" });
      return;
    }

    let statement: Statement | undefined = undefined;
    let apiRequestData: ApiRequestData | undefined = undefined;

    if (valueSourceType === "database") {
      if (!selectedConnectionId || !query.trim()) {
        setConfirmMessage({ type: "warning", text: "Please select a connection and enter a query" });
        return;
      }
      const connection = connectionMap[selectedConnectionId];
      if (!connection) {
        setConfirmMessage({ type: "warning", text: "Please select a valid connection" });
        return;
      }
      statement = {
        query: query.trim(),
        create_type: CreateType.user,
        connection: connection,
      } as Statement;
    } else if (valueSourceType === "api") {
      if (!apiRequest) {
        setConfirmMessage({ type: "warning", text: "Please configure and send API request" });
        return;
      }
      if (!apiResponse || apiResponse.status === 0) {
        setConfirmMessage({ type: "warning", text: "Please send API request and select a value" });
        return;
      }
      if (!selectedApiCellValue) {
        setConfirmMessage({ type: "warning", text: "Please select a value from API response" });
        return;
      }
      apiRequestData = apiRequest;
    } else if (valueSourceType === "variables") {
      if (!selectedVariableName || !selectedVariable) {
        setVariableMessage({ type: "warning", text: "Please select a variable" });
        return;
      }

      // Nếu variable có statement_id, lấy thông tin statement đầy đủ (query + connection)
      if (selectedVariableStatementId) {
        try {
          const resp = await statementService.getStatementById(selectedVariableStatementId);
          if (resp.success && resp.data) {
            const stmt = resp.data;
            if (stmt.connection) {
              const dbConn = stmt.connection;
              statement = {
                statement_id: stmt.statement_id,
                query: stmt.statement_text || "",
                create_type: CreateType.user,
                connection: {
                  connection_id: dbConn.connection_id,
                  username: dbConn.username,
                  password: dbConn.password,
                  host: dbConn.host,
                  port: dbConn.port !== undefined ? dbConn.port : 0,
                  db_name: dbConn.db_name,
                  db_type: dbConn.db_type,
                } as Connection,
              } as Statement;
            }
          } else {
          setVariableMessage({ type: "warning", text: "Failed to load statement information for variable" });
        }
      } catch (error: any) {
        /* console.error("Error loading statement:", error); */
        setVariableMessage({ type: "warning", text: "Failed to load statement information for variable" });
        }
      }
    }

    onConfirm(
      value.trim(),
      selectedElement!,
      selectedPageInfo || undefined,
      statement,
      apiRequestData,
      valueSourceType
    );
    setValue("");
    setValueSourceType("manual");
    setQuery("");
    setSelectedConnectionId("");
    setQueryResultData([]);
    setSelectedCellValue("");
    setApiRequest(undefined);
    setApiResponse(undefined);
    setSelectedApiCellValue("");
    setVariables([]);
    setSelectedVariableName("");
    setSelectedVariable(null);
    setSelectedVariableStatementId("");
    setVariablesSearch("");
    setQueryMessage(null);
    setApiMessage(null);
    setVariableMessage(null);
    setConfirmMessage(null);
    onClose();
  };

  const handleCancel = () => {
    setValue("");
    setValueSourceType("manual");
    setQuery("");
    setSelectedConnectionId("");
    setQueryResultData([]);
    setSelectedCellValue("");
    setApiRequest(undefined);
    setApiResponse(undefined);
    setSelectedApiCellValue("");
    setVariables([]);
    setSelectedVariableName("");
    setSelectedVariable(null);
    setSelectedVariableStatementId("");
    setVariablesSearch("");
    setQueryMessage(null);
    setApiMessage(null);
    setVariableMessage(null);
    setConfirmMessage(null);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (
        valueSourceType === "database" &&
        selectedConnectionId &&
        query.trim()
      ) {
        handleRunQuery();
      } else if (valueSourceType === "manual") {
        handleConfirm();
      }
    } else if (e.key === "Enter" && valueSourceType === "manual") {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const handleRunQuery = async () => {
    setQueryMessage(null);
    
    if (!selectedConnectionId || !query.trim()) {
      setQueryMessage({ type: "error", text: "Please select a connection and enter a query" });
      return;
    }
    try {
      setIsRunningQuery(true);
      const connection_payload = {
        connection_id: selectedConnectionId,
        query: query.trim(),
      }
      console.log('connection_payload', connection_payload);
      const connection = connectionMap[selectedConnectionId];
      console.log('connection', connection);
      const resp = await statementService.runWithoutCreate(connection_payload, connection);

      if (!resp.success) {
        setQueryMessage({ type: "error", text: `Query failed: ${resp.error || "Unknown error"}` });
        setQueryResultData([]);
        setSelectedCellValue("");
        return;
      }

      const data = (resp as any)?.data?.data || [];
      // Chỉ cho phép query trả về đúng 1 row
      if (data.length === 0) {
        setQueryResultData([]);
        setSelectedCellValue("");
        setQueryMessage({ type: "info", text: "Query executed successfully but returned no rows" });
      } else if (data.length > 1) {
        setQueryResultData([]);
        setSelectedCellValue("");
        setQueryMessage({ type: "error", text: "Query must return exactly 1 row. Please refine your WHERE condition." });
      } else {
        // Chính xác 1 row
        setQueryResultData(data);
        setSelectedCellValue(""); // Reset selected value
        setQueryMessage({ type: "success", text: "Query executed successfully. Returned 1 row." });
      }
    } catch (error: any) {
      setQueryMessage({ type: "error", text: `Query failed: ${error.message || "Unknown error"}` });
      setQueryResultData([]);
      setSelectedCellValue("");
    } finally {
      setIsRunningQuery(false);
    }
  };

  const handleSelectCellFromQuery = (cell: {
    value: string;
    column: string;
  }) => {
    setSelectedCellValue(cell.value);
    // Với DB: value lưu tên cột được dùng để lấy dữ liệu
    setValue(cell.column);
  };

  const handleApiRequestChange = (data: ApiRequestData) => {
    setApiRequest(data);
  };

  const handleSendApiRequest = async (
    data: ApiRequestData,
    response?: { status: number; data: any; headers: any }
  ) => {
    try {
      setIsSendingApi(true);
      setApiMessage(null);

      if (response) {
        setApiResponse(response);
        setApiRequest(data);
        setSelectedApiCellValue(""); // Reset selected value
      } else {
        const options = convertApiRequestDataToOptions(data);
        const validation = validateApiRequest(options);
        if (!validation.valid) {
          setApiMessage({ type: "error", text: validation.error || "Invalid API request configuration" });
          return;
        }

        const apiResponse = await executeApiRequest(options);

        if (apiResponse.success) {
          setApiResponse({
            status: apiResponse.status,
            data: apiResponse.data,
            headers: apiResponse.headers,
          });
          setApiRequest(data);
          setSelectedApiCellValue(""); // Reset selected value
          setApiMessage({ type: "success", text: `API request successful: ${apiResponse.status}` });
        } else {
          setApiResponse({
            status: apiResponse.status || 0,
            data: apiResponse.error || "Unknown error",
            headers: {},
          });
          setApiRequest(data);
          setApiMessage({ type: "error", text: `API request failed: ${apiResponse.error || "Unknown error"}` });
        }
      }
    } catch (error: any) {
      setApiMessage({ type: "error", text: `API request failed: ${error.message || "Unknown error"}` });
      setApiResponse({
        status: 0,
        data: error.message || "Unknown error",
        headers: {},
      });
      setApiRequest(data);
    } finally {
      setIsSendingApi(false);
    }
  };

  const handleSelectCellFromApi = (cell: { value: string; column: string }) => {
    const raw = (cell.value || "").trim();
    setApiMessage(null);

    // Không cho phép chọn cả object/array; chỉ chấp nhận giá trị primitive
    if (!raw) {
      setApiMessage({ type: "warning", text: "Please select a non-empty JSON value" });
      return;
    }
    if (
      raw === "[object Object]" ||
      raw.startsWith("{") ||
      raw.startsWith("[")
    ) {
      setApiMessage({ type: "warning", text: "Please select a single primitive value in JSON (string/number/boolean), not an object/array" });
      return;
    }

    // selectedApiCellValue: giá trị thực tế người dùng bấm (hiển thị dưới bảng)
    setSelectedApiCellValue(raw);
    // value lưu tên trường JSON (giống cách DB lưu tên cột)
    setValue(cell.column);
  };

  const disabled =
    !value.trim() ||
    !hasSelectedElement ||
    !hasSelectedPage ||
    (valueSourceType === "database" &&
      (!selectedConnectionId || !query.trim() || !selectedCellValue)) ||
    (valueSourceType === "api" &&
      (!apiRequest ||
        !apiResponse ||
        apiResponse.status === 0 ||
        !selectedApiCellValue));

  // Auto-focus on input when modal opens
  useEffect(() => {
    if (isOpen && valueInputRef.current && valueSourceType === "manual") {
      setTimeout(() => {
        valueInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, valueSourceType]);

  const filteredVariables = variables.filter((v) => {
    const term = variablesSearch.trim().toLowerCase();
    if (!term) return true;
    return (
      v.user_defined_name.toLowerCase().includes(term) ||
      v.original_name.toLowerCase().includes(term)
    );
  });

  // Reset về trang 1 khi filter thay đổi
  useEffect(() => {
    setVariablesPage(1);
  }, [variablesSearch]);

  const pageSize = 10;
  const totalVariablePages = Math.max(
    1,
    Math.ceil(filteredVariables.length / pageSize)
  );
  const paginatedVariables = filteredVariables.slice(
    (variablesPage - 1) * pageSize,
    variablesPage * pageSize
  );

  if (!isOpen) return null;

  const handlePickVariable = (v: Variable) => {
    // Toggle chọn / bỏ chọn biến
    if (selectedVariableName === v.user_defined_name) {
      setSelectedVariableName("");
      setSelectedVariable(null);
      setSelectedVariableStatementId("");
      setValue("");
      return;
    }
    // Dùng original_name làm value assert (giống logic variablesPanel)
    setSelectedVariableName(v.user_defined_name);
    setValue(v.original_name);
    setSelectedVariable(v as any);
    // Lưu statement_id từ variable để sau này lấy thông tin statement đầy đủ
    setSelectedVariableStatementId(v.statement_id || "");
  };

  return (
    <div className="css-assert-modal-overlay">
      <div
        className="css-assert-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="css-assert-modal-header">
          <h3>Assert {assertType}</h3>
          <button
            onClick={handleCancel}
            className="css-assert-modal-close-btn"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <line
                x1="18"
                y1="6"
                x2="6"
                y2="18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="6"
                y1="6"
                x2="18"
                y2="18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="css-assert-modal-body">
          {/* Element Selection */}
          <div className="assert-section">
            <label className="assert-label">
              Element <span className="assert-label-required">*</span>
            </label>
            {hasSelectedElement ? (
              <div className="assert-selected-box">
                <div className="assert-selected-content">
                  <div className="assert-selected-text">
                    <div className="assert-selected-title">
                      {getElementText()}
                    </div>
                    <div className="assert-selected-subtitle">
                      {selectedElement.selectors?.[0] || "No selector"}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      // Clear element và đồng thời clear luôn page đã chọn
                      onClearElement && onClearElement();
                      onClearPage && onClearPage();
                    }}
                    className="assert-clear-btn"
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <div className="assert-warning-box">
                Please click on an element in the browser to select it
              </div>
            )}
          </div>

          {/* Page Selection */}
          <div className="assert-section">
            <label className="assert-label">
              Page <span className="assert-label-required">*</span>
            </label>
            {hasSelectedPage ? (
              <div className="assert-selected-box-small">
                <div className="assert-selected-title-small">
                  {selectedPageInfo.page_title ||
                    `Page ${selectedPageInfo.page_index + 1}`}
                </div>
                <div className="assert-selected-subtitle">
                  {selectedPageInfo.page_url}
                </div>
              </div>
            ) : (
              <div className="assert-warning-box">
                Please click on an element in the browser to select it (page
                will be selected automatically)
              </div>
            )}
          </div>

          {/* Value Source Type Selection */}
          <div className="assert-section-small">
            <label htmlFor="value-source-type" className="assert-label">
              Value Source <span className="assert-label-required">*</span>
            </label>
            <select
              id="value-source-type"
              className="assert-select"
              value={valueSourceType}
              onChange={(e) => {
                setValueSourceType(e.target.value as ValueSourceType);
                setValue(""); // Reset value when changing source type
                setSelectedCellValue("");
                setSelectedApiCellValue("");
                setSelectedVariableName("");
                setSelectedVariable(null);
                setSelectedVariableStatementId("");
                // Reset messages when changing source type
                setQueryMessage(null);
                setApiMessage(null);
                setVariableMessage(null);
                setConfirmMessage(null);
              }}
            >
              <option value="manual">Manual Input</option>
              <option value="database">From Database</option>
              <option value="api">From API</option>
              <option value="variables">From Variables</option>
            </select>
          </div>

          {/* Manual Input */}
          {valueSourceType === "manual" && (
            <div>
              <label htmlFor="assert-value" className="assert-label">
                Value <span className="assert-label-required">*</span>
              </label>
              <input
                ref={valueInputRef}
                id="assert-value"
                type="text"
                className="assert-input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Enter expected value..."
              />
            </div>
          )}

          {/* Variables Input */}
          {valueSourceType === "variables" && (
            <div>
              <div className="assert-variables-header">
                <label className="assert-label">
                  Variables <span className="assert-label-required">*</span>
                </label>
                <div>
                  <input
                    type="text"
                    className="assert-variables-search"
                    placeholder="Search variable by name"
                    value={variablesSearch}
                    onChange={(e) => setVariablesSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="assert-variables-list">
                {isLoadingVariables ? (
                  <div className="assert-loading-text">
                    Loading variables...
                  </div>
                ) : !filteredVariables.length ? (
                  <div className="assert-empty-text">
                    No variables found
                  </div>
                ) : (
                  <>
                    <table className="assert-variables-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedVariables.map((v) => (
                          <tr key={v.variable_id}>
                            <td
                              className="assert-variables-cell"
                              title={v.user_defined_name}
                            >
                              {v.user_defined_name}
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => handlePickVariable(v)}
                                title="Select this variable"
                                className={`assert-variable-select-btn ${
                                  selectedVariableName === v.user_defined_name
                                    ? "selected"
                                    : ""
                                }`}
                              >
                                {selectedVariableName === v.user_defined_name
                                  ? "✓"
                                  : ""}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {totalVariablePages > 1 && (
                      <div className="assert-variables-pagination">
                        <span>
                          Page {variablesPage} of {totalVariablePages}
                        </span>
                        <div className="assert-variables-pagination-buttons">
                          <button
                            type="button"
                            className="assert-pagination-btn"
                            disabled={variablesPage === 1}
                            onClick={() =>
                              setVariablesPage((p) => Math.max(1, p - 1))
                            }
                          >
                            Prev
                          </button>
                          <button
                            type="button"
                            className="assert-pagination-btn"
                            disabled={variablesPage === totalVariablePages}
                            onClick={() =>
                              setVariablesPage((p) =>
                                Math.min(totalVariablePages, p + 1)
                              )
                            }
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              {selectedVariableName && (
                <label className="assert-label assert-label-mt">
                  Selected variable <span className="assert-label-required">*</span>
                </label>
              )}
              {selectedVariableName && (
                <input
                  type="text"
                  className="assert-selected-variable-input"
                  value={selectedVariableName}
                  readOnly
                />
              )}
              {variableMessage && (
                <div
                  className={`assert-message assert-message-${variableMessage.type}`}
                >
                  {variableMessage.text}
                </div>
              )}
            </div>
          )}

          {/* Database Input */}
          {valueSourceType === "database" && (
            <>
              <div className="assert-section-small">
                <label htmlFor="db-connection" className="assert-label">
                  Connection <span className="assert-label-required">*</span>
                </label>
                <select
                  id="db-connection"
                  className="assert-select"
                  value={selectedConnectionId}
                  onChange={(e) => {
                    setSelectedConnectionId(e.target.value);
                    setQueryMessage(null); // Reset message when connection changes
                  }}
                  disabled={isLoadingConns}
                >
                  <option value="">
                    {isLoadingConns ? "Loading..." : "Select a connection"}
                  </option>
                  {connections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="assert-section-small">
                <label htmlFor="db-query" className="assert-label">
                  Query <span className="assert-label-required">*</span>
                </label>
                <textarea
                  id="db-query"
                  className="assert-textarea"
                  rows={3}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setQueryMessage(null); // Reset message when query changes
                  }}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                      e.preventDefault();
                      if (selectedConnectionId && query.trim())
                        handleRunQuery();
                    }
                  }}
                  placeholder="SELECT ..."
                />
                <button
                  className="assert-action-btn"
                  onClick={handleRunQuery}
                  disabled={
                    !selectedConnectionId || !query.trim() || isRunningQuery
                  }
                >
                  {isRunningQuery ? "Running..." : "Run Query"}
                </button>
                {queryMessage && (
                  <div
                    className={`assert-message assert-message-${queryMessage.type}`}
                  >
                    {queryMessage.text}
                  </div>
                )}
              </div>
              {queryResultData.length > 0 && (
                <div className="assert-section-small">
                  <label className="assert-label">
                    Query Results - Select a cell value{" "}
                    <span className="assert-label-required">*</span>
                  </label>
                  <QueryResultTableSelectable
                    data={queryResultData}
                    maxHeight={200}
                    onSelectCell={handleSelectCellFromQuery}
                    selectedValue={selectedCellValue}
                  />
                  {selectedCellValue && (
                    <div className="assert-selected-value">
                      Selected: <strong>{selectedCellValue}</strong>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* API Input */}
          {valueSourceType === "api" && (
            <>
              <div className="assert-section-small">
                <label className="assert-label">
                  API Request <span className="assert-label-required">*</span>
                </label>
                <div className="assert-api-panel">
                  <AssertApiElementPanel
                    apiRequest={apiRequest}
                    apiResponse={apiResponse}
                    onChange={handleApiRequestChange}
                    onSendRequest={handleSendApiRequest}
                    isSending={isSendingApi}
                    selectedPageInfo={selectedPageInfo}
                  />
                </div>
                {apiMessage && (
                  <div
                    className={`assert-message assert-message-${apiMessage.type}`}
                  >
                    {apiMessage.text}
                  </div>
                )}
              </div>
              {apiResponse && apiResponse.status > 0 && apiResponse.data && (
                <div className="assert-section-small">
                  <label className="assert-label">
                    API Response - Select a cell value{" "}
                    <span className="assert-label-required">*</span>
                  </label>
                  <QueryResultTableSelectable
                    data={
                      Array.isArray(apiResponse.data)
                        ? apiResponse.data
                        : [apiResponse.data]
                    }
                    maxHeight={200}
                    onSelectCell={handleSelectCellFromApi}
                    selectedValue={selectedApiCellValue}
                  />
                  {selectedApiCellValue && (
                    <div className="assert-selected-value">
                      Selected: <strong>{selectedApiCellValue}</strong>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Display current value if set from DB/API/Variables */}
          {(valueSourceType === "database" ||
            valueSourceType === "api" ||
            valueSourceType === "variables") &&
            value && (
              <div className="assert-current-value">
                <label className="assert-label">Current Value</label>
                <input
                  type="text"
                  className="assert-current-value-input"
                  value={value}
                  readOnly
                />
              </div>
            )}
          
          {/* Confirm Message */}
          {confirmMessage && (
            <div
              className={`assert-confirm-message assert-message-${confirmMessage.type}`}
            >
              {confirmMessage.text}
            </div>
          )}
        </div>
        <div className="css-assert-modal-footer">
          <button className="css-assert-modal-cancel" onClick={handleCancel}>
            Cancel
          </button>
          <button
            className="css-assert-modal-confirm"
            onClick={handleConfirm}
            disabled={disabled}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssertWithValueModal;
