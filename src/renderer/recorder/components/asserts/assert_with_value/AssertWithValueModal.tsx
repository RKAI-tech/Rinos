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
import { toast } from "react-toastify";
const statementService = new StatementService();
const variableService = new VariableService();

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
    apiRequest?: ApiRequestData
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
          const rawConns: Connection[] = (resp as any).data.connections;
          const opts: ConnectionOption[] = rawConns.map((c: any) => ({
            id: c.connection_id,
            label: `${String(c.db_type).toUpperCase()} • PLANE@:${c.port}`,
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
      console.error("Error extracting value from element:", error);
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
    if (!value.trim()) {
      toast.warning("Please enter a value");
      return;
    }
    if (!hasSelectedElement) {
      toast.warning("Please select an element first");
      return;
    }
    if (!hasSelectedPage) {
      toast.warning("Please select a page first");
      return;
    }

    let statement: Statement | undefined = undefined;
    let apiRequestData: ApiRequestData | undefined = undefined;

    if (valueSourceType === "database") {
      if (!selectedConnectionId || !query.trim()) {
        toast.warning("Please select a connection and enter a query");
        return;
      }
      const connection = connectionMap[selectedConnectionId];
      if (!connection) {
        toast.warning("Please select a valid connection");
        return;
      }
      statement = {
        query: query.trim(),
        create_type: CreateType.user,
        connection: connection,
      } as Statement;
    } else if (valueSourceType === "api") {
      if (!apiRequest) {
        toast.warning("Please configure and send API request");
        return;
      }
      if (!apiResponse || apiResponse.status === 0) {
        toast.warning("Please send API request and select a value");
        return;
      }
      if (!selectedApiCellValue) {
        toast.warning("Please select a value from API response");
        return;
      }
      apiRequestData = apiRequest;
    } else if (valueSourceType === "variables") {
      if (!selectedVariableName || !selectedVariable) {
        toast.warning("Please select a variable");
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
                  port: dbConn.port !== undefined ? String(dbConn.port) : "",
                  db_name: dbConn.db_name,
                  db_type: dbConn.db_type,
                } as Connection,
              } as Statement;
            }
          } else {
            toast.warning("Failed to load statement information for variable");
          }
        } catch (error: any) {
          console.error("Error loading statement:", error);
          toast.warning("Failed to load statement information for variable");
        }
      }
    }

    onConfirm(
      value.trim(),
      selectedElement!,
      selectedPageInfo || undefined,
      statement,
      apiRequestData
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
    if (!selectedConnectionId || !query.trim()) {
      toast.error("Please select a connection and enter a query");
      return;
    }
    try {
      setIsRunningQuery(true);
      const resp = await statementService.runWithoutCreate({
        connection_id: selectedConnectionId,
        query: query.trim(),
      });

      if (!resp.success) {
        toast.error(`Query failed: ${resp.error || "Unknown error"}`);
        setQueryResultData([]);
        setSelectedCellValue("");
        return;
      }

      const data = (resp as any)?.data?.data || [];
      // Chỉ cho phép query trả về đúng 1 row
      if (data.length === 0) {
        setQueryResultData([]);
        setSelectedCellValue("");
        toast.info("Query executed successfully but returned no rows");
      } else if (data.length > 1) {
        setQueryResultData([]);
        setSelectedCellValue("");
        toast.error(
          "Query must return exactly 1 row. Please refine your WHERE condition."
        );
      } else {
        // Chính xác 1 row
        setQueryResultData(data);
        setSelectedCellValue(""); // Reset selected value
        toast.success("Query executed successfully. Returned 1 row.");
      }
    } catch (error: any) {
      toast.error(`Query failed: ${error.message || "Unknown error"}`);
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

      if (response) {
        setApiResponse(response);
        setApiRequest(data);
        setSelectedApiCellValue(""); // Reset selected value
      } else {
        const options = convertApiRequestDataToOptions(data);
        const validation = validateApiRequest(options);
        if (!validation.valid) {
          toast.error(validation.error || "Invalid API request configuration");
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
          toast.success(`API request successful: ${apiResponse.status}`);
        } else {
          setApiResponse({
            status: apiResponse.status || 0,
            data: apiResponse.error || "Unknown error",
            headers: {},
          });
          setApiRequest(data);
          toast.error(
            `API request failed: ${apiResponse.error || "Unknown error"}`
          );
        }
      }
    } catch (error: any) {
      toast.error(`API request failed: ${error.message || "Unknown error"}`);
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

    // Không cho phép chọn cả object/array; chỉ chấp nhận giá trị primitive
    if (!raw) {
      toast.warning("Please select a non-empty JSON value");
      return;
    }
    if (
      raw === "[object Object]" ||
      raw.startsWith("{") ||
      raw.startsWith("[")
    ) {
      toast.warning(
        "Please select a single primitive value in JSON (string/number/boolean), not an object/array"
      );
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
        style={{ width: "600px", maxWidth: "90vw" }}
      >
        <div
          className="css-assert-modal-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0 }}>Assert {assertType}</h3>
          <button
            onClick={handleCancel}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#6b7280",
              padding: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
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
          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#374151",
              }}
            >
              Element <span style={{ color: "#ef4444" }}>*</span>
            </label>
            {hasSelectedElement ? (
              <div
                style={{
                  padding: "12px",
                  backgroundColor: "#f9fafb",
                  borderRadius: "6px",
                  border: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: "500",
                        color: "#111827",
                        marginBottom: "4px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {getElementText()}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {selectedElement.selectors?.[0] || "No selector"}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      // Clear element và đồng thời clear luôn page đã chọn
                      onClearElement && onClearElement();
                      onClearPage && onClearPage();
                    }}
                    style={{
                      marginLeft: "8px",
                      padding: "4px 8px",
                      fontSize: "12px",
                      color: "#6b7280",
                      backgroundColor: "transparent",
                      border: "1px solid #d1d5db",
                      borderRadius: "4px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = "#f3f4f6";
                      e.currentTarget.style.color = "#374151";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "#6b7280";
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: "12px",
                  backgroundColor: "#fef3c7",
                  borderRadius: "6px",
                  border: "1px solid #fbbf24",
                  fontSize: "13px",
                  color: "#92400e",
                }}
              >
                Please click on an element in the browser to select it
              </div>
            )}
          </div>

          {/* Page Selection */}
          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#374151",
              }}
            >
              Page <span style={{ color: "#ef4444" }}>*</span>
            </label>
            {hasSelectedPage ? (
              <div
                style={{
                  padding: "8px 12px",
                  backgroundColor: "#f9fafb",
                  borderRadius: "6px",
                  border: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#111827",
                    marginBottom: "2px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {selectedPageInfo.page_title ||
                    `Page ${selectedPageInfo.page_index + 1}`}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {selectedPageInfo.page_url}
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: "12px",
                  backgroundColor: "#fef3c7",
                  borderRadius: "6px",
                  border: "1px solid #fbbf24",
                  fontSize: "13px",
                  color: "#92400e",
                }}
              >
                Please click on an element in the browser to select it (page
                will be selected automatically)
              </div>
            )}
          </div>

          {/* Value Source Type Selection */}
          <div style={{ marginBottom: "16px" }}>
            <label
              htmlFor="value-source-type"
              style={{ display: "block", marginBottom: 8 }}
            >
              Value Source <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              id="value-source-type"
              value={valueSourceType}
              onChange={(e) => {
                setValueSourceType(e.target.value as ValueSourceType);
                setValue(""); // Reset value when changing source type
                setSelectedCellValue("");
                setSelectedApiCellValue("");
                setSelectedVariableName("");
                setSelectedVariable(null);
                setSelectedVariableStatementId("");
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                color: "#111827",
                backgroundColor: "#ffffff",
                transition: "border-color 0.2s, box-shadow 0.2s",
                boxSizing: "border-box",
                cursor: "pointer",
              }}
              onFocus={(e) => {
                e.target.style.outline = "none";
                e.target.style.borderColor = "#3b82f6";
                e.target.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#d1d5db";
                e.target.style.boxShadow = "none";
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
              <label
                htmlFor="assert-value"
                style={{ display: "block", marginBottom: 8 }}
              >
                Value <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                ref={valueInputRef}
                id="assert-value"
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Enter expected value..."
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  color: "#111827",
                  backgroundColor: "#ffffff",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.outline = "none";
                  e.target.style.borderColor = "#3b82f6";
                  e.target.style.boxShadow =
                    "0 0 0 3px rgba(59, 130, 246, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#d1d5db";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>
          )}

          {/* Variables Input */}
          {valueSourceType === "variables" && (
            <div>
              <div
                style={{
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <label
                  style={{ fontSize: 14, fontWeight: 500, color: "#374151" }}
                >
                  Variables <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div>
                  <input
                    type="text"
                    placeholder="Search variable by name"
                    value={variablesSearch}
                    onChange={(e) => setVariablesSearch(e.target.value)}
                    style={{
                      outline: "none",
                      border: "1px solid #d1d5db",
                      fontSize: 11,
                      width: "100%",
                      minWidth: 0,
                      backgroundColor: "#ffffff",
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  maxHeight: 200,
                  overflow: "auto",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: 8,
                }}
              >
                {isLoadingVariables ? (
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    Loading variables...
                  </div>
                ) : !filteredVariables.length ? (
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    No variables found
                  </div>
                ) : (
                  <>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 12,
                      }}
                    >
                      <thead>
                        <tr>
                          <th
                            style={{
                              textAlign: "left",
                              padding: "6px 8px",
                              borderBottom: "1px solid #e5e7eb",
                              color: "#6b7280",
                              fontWeight: 500,
                            }}
                          >
                            Name
                          </th>
                          <th
                            style={{
                              textAlign: "right",
                              padding: "6px 8px",
                              borderBottom: "1px solid #e5e7eb",
                              color: "#6b7280",
                              fontWeight: 500,
                              width: 80,
                            }}
                          >
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedVariables.map((v) => (
                          <tr key={v.variable_id}>
                            <td
                              style={{
                                padding: "6px 8px",
                                borderBottom: "1px solid #f3f4f6",
                                maxWidth: 260,
                              }}
                              title={v.user_defined_name}
                            >
                              <div
                                style={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {v.user_defined_name}
                              </div>
                            </td>
                            <td
                              style={{
                                padding: "6px 8px",
                                borderBottom: "1px solid #f3f4f6",
                                textAlign: "right",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => handlePickVariable(v)}
                                title="Select this variable"
                                style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: 4,
                                  border: "1px solid #d1d5db",
                                  background:
                                    selectedVariableName === v.user_defined_name
                                      ? "#3b82f6"
                                      : "#ffffff",
                                  color:
                                    selectedVariableName === v.user_defined_name
                                      ? "#ffffff"
                                      : "#6b7280",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 11,
                                  padding: 0,
                                }}
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
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontSize: 11,
                          color: "#6b7280",
                        }}
                      >
                        <span>
                          Page {variablesPage} of {totalVariablePages}
                        </span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            type="button"
                            disabled={variablesPage === 1}
                            onClick={() =>
                              setVariablesPage((p) => Math.max(1, p - 1))
                            }
                            style={{
                              padding: "2px 8px",
                              borderRadius: 999,
                              border: "1px solid #d1d5db",
                              background:
                                variablesPage === 1 ? "#f9fafb" : "#ffffff",
                              color:
                                variablesPage === 1 ? "#9ca3af" : "#374151",
                              cursor:
                                variablesPage === 1 ? "default" : "pointer",
                            }}
                          >
                            Prev
                          </button>
                          <button
                            type="button"
                            disabled={variablesPage === totalVariablePages}
                            onClick={() =>
                              setVariablesPage((p) =>
                                Math.min(totalVariablePages, p + 1)
                              )
                            }
                            style={{
                              padding: "2px 8px",
                              borderRadius: 999,
                              border: "1px solid #d1d5db",
                              background:
                                variablesPage === totalVariablePages
                                  ? "#f9fafb"
                                  : "#ffffff",
                              color:
                                variablesPage === totalVariablePages
                                  ? "#9ca3af"
                                  : "#374151",
                              cursor:
                                variablesPage === totalVariablePages
                                  ? "default"
                                  : "pointer",
                            }}
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
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#374151", // giống label "Variables"
                  }}
                >
                  Selected variable <span style={{ color: "#ef4444" }}>*</span>
                </div>
              )}
              {selectedVariableName && (
                <div>
                  <input
                    type="text"
                    value={selectedVariableName}
                    readOnly
                    style={{
                      marginTop: 4,
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: 12,
                      color: "#6b7280",
                      border: "1px solid #d1d5db",
                      borderRadius: 6,
                      backgroundColor: "#e0f2fe",
                      cursor: "default",
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Database Input */}
          {valueSourceType === "database" && (
            <>
              <div style={{ marginBottom: "16px" }}>
                <label
                  htmlFor="db-connection"
                  style={{ display: "block", marginBottom: 8 }}
                >
                  Connection <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  id="db-connection"
                  value={selectedConnectionId}
                  onChange={(e) => setSelectedConnectionId(e.target.value)}
                  disabled={isLoadingConns}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    color: "#111827",
                    backgroundColor: "#ffffff",
                    cursor: isLoadingConns ? "not-allowed" : "pointer",
                    boxSizing: "border-box",
                  }}
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
              <div style={{ marginBottom: "16px" }}>
                <label
                  htmlFor="db-query"
                  style={{ display: "block", marginBottom: 8 }}
                >
                  Query <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  id="db-query"
                  rows={3}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                      e.preventDefault();
                      if (selectedConnectionId && query.trim())
                        handleRunQuery();
                    }
                  }}
                  placeholder="SELECT ..."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    color: "#111827",
                    backgroundColor: "#ffffff",
                    fontFamily: "monospace",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  onClick={handleRunQuery}
                  disabled={
                    !selectedConnectionId || !query.trim() || isRunningQuery
                  }
                  style={{
                    marginTop: "8px",
                    padding: "8px 16px",
                    backgroundColor: "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor:
                      selectedConnectionId && query.trim() && !isRunningQuery
                        ? "pointer"
                        : "not-allowed",
                    opacity:
                      selectedConnectionId && query.trim() && !isRunningQuery
                        ? 1
                        : 0.6,
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  {isRunningQuery ? "Running..." : "Run Query"}
                </button>
              </div>
              {queryResultData.length > 0 && (
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: 8 }}>
                    Query Results - Select a cell value{" "}
                    <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <QueryResultTableSelectable
                    data={queryResultData}
                    maxHeight={200}
                    onSelectCell={handleSelectCellFromQuery}
                    selectedValue={selectedCellValue}
                  />
                  {selectedCellValue && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: "8px",
                        background: "#e0f2fe",
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    >
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
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: 8 }}>
                  API Request <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div
                  style={{
                    padding: "12px",
                    backgroundColor: "#f9fafb",
                    borderRadius: "6px",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <AssertApiElementPanel
                    apiRequest={apiRequest}
                    apiResponse={apiResponse}
                    onChange={handleApiRequestChange}
                    onSendRequest={handleSendApiRequest}
                    isSending={isSendingApi}
                    selectedPageInfo={selectedPageInfo}
                  />
                </div>
              </div>
              {apiResponse && apiResponse.status > 0 && apiResponse.data && (
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: 8 }}>
                    API Response - Select a cell value{" "}
                    <span style={{ color: "#ef4444" }}>*</span>
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
                    <div
                      style={{
                        marginTop: 8,
                        padding: "8px",
                        background: "#e0f2fe",
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    >
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
              <div style={{ marginBottom: "16px", marginTop: 8 }}>
                <label style={{ display: "block", marginBottom: 8 }}>
                  Current Value
                </label>
                <input
                  type="text"
                  value={value}
                  readOnly
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: 14,
                    color: "#111827",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    backgroundColor: "#e0f2fe",
                    boxSizing: "border-box",
                    cursor: "default",
                  }}
                />
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
